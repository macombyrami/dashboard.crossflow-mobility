import * as turf from '@turf/turf'
import { fetchRoads, type OSMRoad } from '@/lib/api/overpass'
import type { TrafficSnapshot, TrafficSegment, City, CongestionLevel } from '@/types'

/**
 * Unified City Network Aggregator
 * Manages the canonical road graph and maps real-time traffic onto it.
 */
export class NetworkAggregator {
  private static cache = new Map<string, GeoJSON.FeatureCollection>()
  private static osmRoadsCache = new Map<string, OSMRoad[]>()
  private static readonly MAX_CACHE_CITIES = 3
  private static readonly MAX_ROADS_PER_CITY = 9000
  private static readonly MAX_COORDS_PER_ROAD = 42

  /**
   * Builds the complete road graph for a city from OSM.
   */
  static async getCityNetwork(city: City): Promise<GeoJSON.FeatureCollection> {
    if (this.cache.has(city.id)) return this.cache.get(city.id)!

    // Keep the canonical graph lean to avoid OOM on large cities.
    const roads = (await fetchRoads(city.bbox, [
      'motorway', 'trunk', 'primary', 'secondary', 'tertiary',
      'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link',
      'residential', 'unclassified', 'service', 'living_street', 'road', 'track'
    ])).slice(0, this.MAX_ROADS_PER_CITY)
    
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: roads.map(r => ({
        type: 'Feature',
        id: r.id, // Primary key for feature-state
        geometry: {
          type: 'LineString',
          coordinates: this.simplifyCoords(r.coords),
        },
        properties: {
          id: r.id,
          name: r.name || 'Rue Sans Nom',
          highway: r.highway,
          importance: this.getImportance(r.highway),
          maxspeed: r.maxspeed,
          lanes: r.lanes,
          realData: false // Initial state
        }
      }))
    }

    this.cache.set(city.id, fc)
    this.osmRoadsCache.set(city.id, roads)
    this.trimCache()
    return fc
  }

  /**
   * Snaps a raw traffic snapshot (TomTom/HERE/Synthetic) onto the OSM road graph.
   */
  static snapToNetwork(city: City, rawSnapshot: TrafficSnapshot): TrafficSnapshot {
    const osmRoads = this.osmRoadsCache.get(city.id)
    if (!osmRoads) return rawSnapshot // Fallback to raw if network not ready

    const snappedSegments: TrafficSegment[] = []
    const matchedRoadIds = new Set<number>()
    const matchedSegments: TrafficSegment[] = []

    rawSnapshot.segments.forEach(rawSeg => {
      const rawMid = rawSeg.coordinates[Math.floor(rawSeg.coordinates.length / 2)]

      let bestRoad: OSMRoad | null = null
      let minDist = 120

      for (const road of osmRoads) {
        const roadMid = road.coords[Math.floor(road.coords.length / 2)]
        const d = this.distMeters(rawMid, roadMid)
        if (d < minDist) {
          minDist = d
          bestRoad = road
        }
      }

      if (bestRoad) {
        matchedRoadIds.add(bestRoad.id)
        const snapped = {
          ...rawSeg,
          id: String(bestRoad.id), // Snap to OSM ID
          coordinates: bestRoad.coords, // Snap to OSM Geometry
          streetName: bestRoad.name || rawSeg.streetName,
          roadType: bestRoad.highway,
          observedTraffic: rawSeg.observedTraffic ?? true,
          estimatedTraffic: false,
        }
        snappedSegments.push(snapped)
        matchedSegments.push(snapped)
      }
    })

    const averageCongestion =
      matchedSegments.length > 0
        ? matchedSegments.reduce((sum, segment) => sum + segment.congestionScore, 0) / matchedSegments.length
        : 0.26

    const averageFlow =
      matchedSegments.length > 0
        ? matchedSegments.reduce((sum, segment) => sum + segment.flowVehiclesPerHour, 0) / matchedSegments.length
        : 420

    const estimatedSegments = osmRoads
      .filter(road => road.coords.length >= 2 && !matchedRoadIds.has(road.id))
      .map((road) => this.estimateSegmentFromNearby(city, road, matchedSegments, averageCongestion, averageFlow, rawSnapshot.fetchedAt))
      .filter((segment): segment is TrafficSegment => segment !== null)

    return {
      ...rawSnapshot,
      segments: [...snappedSegments, ...estimatedSegments]
    }
  }

  private static getImportance(highway: string): number {
    const map: Record<string, number> = {
      motorway: 5, motorway_link: 4,
      trunk: 4, trunk_link: 3,
      primary: 3, primary_link: 2,
      secondary: 2, tertiary: 1,
      residential: 0,
    }
    return map[highway] ?? 0
  }

  private static estimateSegmentFromNearby(
    city: City,
    road: OSMRoad,
    matchedSegments: TrafficSegment[],
    averageCongestion: number,
    averageFlow: number,
    fetchedAt: string,
  ): TrafficSegment | null {
    if (road.coords.length < 2) return null

    const roadMid = road.coords[Math.floor(road.coords.length / 2)]
    const neighbors = matchedSegments
      .map(segment => {
        const segmentMid = segment.coordinates[Math.floor(segment.coordinates.length / 2)]
        return {
          segment,
          distance: this.distMeters(roadMid, segmentMid),
        }
      })
      .filter(entry => entry.distance <= 900)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)

    const roadType = road.highway
    const freeFlow = Math.max(25, road.maxspeed || this.defaultFreeFlowForRoad(roadType))
    const length = road.length > 0 ? Math.round(road.length) : this.estimateLengthMeters(road.coords)
    if (length < 20) return null

    let congestion = averageCongestion
    let speedRatio = Math.max(0.26, 1 - congestion * 0.78)
    let anomalyScore = 0.08

    if (neighbors.length > 0) {
      let weightedCongestion = 0
      let weightedSpeedRatio = 0
      let weightedAnomaly = 0
      let weightTotal = 0

      neighbors.forEach(({ segment, distance }) => {
        const weight = 1 / Math.max(distance, 30)
        const localSpeedRatio = segment.speedKmh / Math.max(segment.freeFlowSpeedKmh, 1)
        weightedCongestion += segment.congestionScore * weight
        weightedSpeedRatio += localSpeedRatio * weight
        weightedAnomaly += (segment.anomalyScore ?? 0.08) * weight
        weightTotal += weight
      })

      congestion = weightedCongestion / Math.max(weightTotal, 1e-6)
      speedRatio = weightedSpeedRatio / Math.max(weightTotal, 1e-6)
      anomalyScore = weightedAnomaly / Math.max(weightTotal, 1e-6)
    } else {
      const centerDistance = this.distMeters(
        roadMid,
        [city.center.lng, city.center.lat],
      )
      const centerFactor = Math.max(0.78, 1.22 - centerDistance / 12000)
      congestion = Math.min(0.92, averageCongestion * centerFactor)
      speedRatio = Math.max(0.3, 1 - congestion * 0.72)
    }

    const normalizedCongestion = Math.max(0.06, Math.min(0.95, congestion))
    const normalizedSpeedRatio = Math.max(0.22, Math.min(0.98, speedRatio))
    const speedKmh = Math.max(8, Math.round(freeFlow * normalizedSpeedRatio * 10) / 10)

    return {
      id: String(road.id),
      name: road.name || 'Estimated corridor',
      streetName: road.name || 'Estimated corridor',
      roadType,
      coordinates: road.coords,
      speedKmh,
      freeFlowSpeedKmh: freeFlow,
      congestionScore: Math.round(normalizedCongestion * 100) / 100,
      level: this.levelFromCongestion(normalizedCongestion),
      flowVehiclesPerHour: Math.max(120, Math.round(averageFlow * (1 - normalizedCongestion * 0.38))),
      travelTimeSeconds: Math.max(8, Math.round((length / 1000) / Math.max(speedKmh, 1) * 3600)),
      length,
      mode: 'car',
      lastUpdated: fetchedAt,
      anomalyScore: Math.round(Math.min(0.35, anomalyScore) * 100) / 100,
      flowTrend: 'stable',
      direction: '',
      arrondissement: '',
      priorityAxis: this.defaultPriorityForRoad(roadType),
      axisName: road.name || '',
      observedTraffic: false,
      estimatedTraffic: true,
    }
  }

  private static distMeters(p1: [number, number], p2: [number, number]): number {
    const R = 6371e3
    const φ1 = p1[1] * Math.PI / 180
    const φ2 = p2[1] * Math.PI / 180
    const Δφ = (p2[1] - p1[1]) * Math.PI / 180
    const Δλ = (p2[0] - p1[0]) * Math.PI / 180
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private static estimateLengthMeters(coords: [number, number][]): number {
    if (coords.length < 2) return 0
    try {
      return Math.max(25, Math.round(turf.length(turf.lineString(coords), { units: 'kilometers' }) * 1000))
    } catch {
      return 0
    }
  }

  private static defaultFreeFlowForRoad(highway: string): number {
    if (highway.includes('motorway')) return 110
    if (highway.includes('trunk')) return 90
    if (highway.includes('primary')) return 70
    if (highway.includes('secondary')) return 50
    if (highway.includes('tertiary')) return 35
    return 30
  }

  private static defaultPriorityForRoad(highway: string): number {
    if (highway.includes('motorway')) return 1
    if (highway.includes('trunk')) return 0.86
    if (highway.includes('primary')) return 0.72
    if (highway.includes('secondary')) return 0.58
    if (highway.includes('tertiary')) return 0.44
    return 0.28
  }

  private static levelFromCongestion(score: number): CongestionLevel {
    if (score >= 0.72) return 'critical'
    if (score >= 0.5) return 'congested'
    if (score >= 0.24) return 'slow'
    return 'free'
  }

  private static simplifyCoords(coords: [number, number][]): [number, number][] {
    if (coords.length <= this.MAX_COORDS_PER_ROAD) return coords

    const step = Math.ceil(coords.length / this.MAX_COORDS_PER_ROAD)
    const simplified = coords.filter((_, idx) => idx % step === 0)
    const last = coords[coords.length - 1]
    if (simplified[simplified.length - 1] !== last) simplified.push(last)
    return simplified
  }

  private static trimCache(): void {
    while (this.cache.size > this.MAX_CACHE_CITIES) {
      const oldest = this.cache.keys().next().value as string | undefined
      if (!oldest) break
      this.cache.delete(oldest)
      this.osmRoadsCache.delete(oldest)
    }
  }
}
