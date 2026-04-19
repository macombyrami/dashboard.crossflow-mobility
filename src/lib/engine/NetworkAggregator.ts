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

  /**
   * Builds the complete road graph for a city from OSM.
   */
  static async getCityNetwork(city: City): Promise<GeoJSON.FeatureCollection> {
    if (this.cache.has(city.id)) return this.cache.get(city.id)!

    // Fetch primary, secondary, tertiary and residential roads for full coverage
    const roads = await fetchRoads(city.bbox, [
      'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'motorway_link', 'trunk_link'
    ])
    
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: roads.map(r => ({
        type: 'Feature',
        id: r.id, // Primary key for feature-state
        geometry: { type: 'LineString', coordinates: r.coords },
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
    return fc
  }

  /**
   * Snaps a raw traffic snapshot (TomTom/HERE/Synthetic) onto the OSM road graph.
   */
  static snapToNetwork(city: City, rawSnapshot: TrafficSnapshot): TrafficSnapshot {
    const osmRoads = this.osmRoadsCache.get(city.id)
    if (!osmRoads) return rawSnapshot // Fallback to raw if network not ready

    // Create a spatial index of OSM segments for fast lookups
    // For now, we'll use a simple distance check on segment midpoints to find the match
    // In a prod environment, we'd use a real spatial index (RBush)
    const snappedSegments: TrafficSegment[] = []
    
    // Track which OSM roads received data
    const matchedRoadIds = new Set<number>()

    rawSnapshot.segments.forEach(rawSeg => {
      // Find the OSM road that best matches this raw segment
      // Optimization: look for segments whose first coordinate is near the raw segment's first coordinate
      const rawMid = rawSeg.coordinates[Math.floor(rawSeg.coordinates.length / 2)]
      
      let bestRoad: OSMRoad | null = null
      let minDist = 50 // meters threshold for a match

      // Simple heuristic: find OSM road segments within 50m of the raw segment midpoint
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
        snappedSegments.push({
          ...rawSeg,
          id: String(bestRoad.id), // Snap to OSM ID
          coordinates: bestRoad.coords, // Snap to OSM Geometry
          streetName: bestRoad.name || rawSeg.streetName,
          roadType: bestRoad.highway
        })
      }
    })

    // Final result: the snapped segments
    return {
      ...rawSnapshot,
      segments: snappedSegments
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
}
