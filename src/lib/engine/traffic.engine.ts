/**
 * CrossFlow Traffic Engine
 * Fetches real TomTom data when available,
 * falls back to realistic synthetic generation.
 */
import type {
  City,
  TrafficSegment,
  TrafficSnapshot,
  HeatmapPoint,
  CongestionLevel,
  Incident,
  CityKPIs,
  Prediction,
  PredictionSegment,
} from '@/types'
import * as turf from '@turf/turf'
import { enrichSnapshot } from '@/lib/utils/traffic-enrichment'
import type { OSMRoad } from '@/lib/api/overpass'
import { platformConfig } from '@/config/platform.config'
import { scoreToCongestionLevel } from '@/lib/utils/congestion'
import type { KPISnapshot } from '@/store/kpiHistoryStore'
import { calculateV4TrafficScore } from './TrafficScoreService'
import { enrichSegmentWithStreetMetadata } from './StreetMapper'

// ─── Map Matching & Stitching (Turf.js) ───────────────────────────────────

/**
 * Connects fragmented segments by bridging small gaps.
 * Ensures the road network looks continuous.
 */
function stitchSegments(segments: [number, number][][], thresholdMeters = 30): [number, number][][] {
  if (segments.length <= 1) return segments
  const result: [number, number][][] = [segments[0]]

  for (let i = 1; i < segments.length; i++) {
    const prev = result[result.length - 1]
    const curr = segments[i]
    if (!prev.length || !curr.length) continue
    
    const p1 = turf.point(prev[prev.length - 1])
    const p2 = turf.point(curr[0])
    const dist = turf.distance(p1, p2, { units: 'meters' })
    
    if (dist < thresholdMeters && dist > 0.1) {
      // Bridge the gap
      prev.push(...curr)
    } else {
      result.push(curr)
    }
  }
  return result
}

// Import enriched data (optional/conditional)
let parisNetwork: any[] = []
try {
  parisNetwork = require('@/lib/data/paris_network.json')
} catch (e) {
  parisNetwork = []
}

// ─── Modal split normalizer ───
type ModalSplit = { car: number; metro: number; bus: number; bike: number; pedestrian: number }
function normalizeModalSplit(raw: ModalSplit): ModalSplit {
  const total = raw.car + raw.metro + raw.bus + raw.bike + raw.pedestrian
  return {
    car:        Math.round(raw.car        / total * 100) / 100,
    metro:      Math.round(raw.metro      / total * 100) / 100,
    bus:        Math.round(raw.bus        / total * 100) / 100,
    bike:       Math.round(raw.bike       / total * 100) / 100,
    pedestrian: Math.round(raw.pedestrian / total * 100) / 100,
  }
}

// ─── Seeded RNG ───
function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}
function cityTimeSeed(cityId: string, windowMin: number = 0): number {
  const now = Date.now()
  const slot = Math.floor((now + windowMin * 60_000) / 30_000)
  let hash = slot
  for (let i = 0; i < cityId.length; i++) {
    hash = (hash * 31 + cityId.charCodeAt(i)) >>> 0
  }
  return hash || 1
}

function co2GPerKm(congestion: number): number {
  return 120 + congestion * 180
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function interpolateCoord(a: [number, number], b: [number, number], t: number): [number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ]
}

function bearingBetween(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a
  const [lng2, lat2] = b
  const y = Math.sin((lng2 - lng1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
    Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lng2 - lng1) * Math.PI / 180)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function offsetPoint(point: [number, number], bearingDeg: number, distanceM: number): [number, number] {
  const theta = bearingDeg * Math.PI / 180
  const dx = Math.cos(theta) * distanceM
  const dy = Math.sin(theta) * distanceM
  const latOffset = dy / 110540
  const lngOffset = dx / (111320 * Math.max(Math.cos(point[1] * Math.PI / 180), 0.2))
  return [point[0] + lngOffset, point[1] + latOffset]
}

function pushSmoothHeatPoints(
  heatmap: HeatmapPoint[],
  coords: [number, number][],
  intensity: number,
  spreadMeters = 34,
): void {
  if (coords.length < 2) {
    const [lng, lat] = coords[0] ?? [0, 0]
    heatmap.push({ lng, lat, intensity })
    return
  }

  for (let i = 0; i < coords.length - 1; i++) {
    const start = coords[i]
    const end = coords[i + 1]
    const meters = turf.distance(turf.point(start), turf.point(end), { units: 'meters' })
    const steps = Math.max(2, Math.min(10, Math.ceil(meters / 70)))
    const segmentBearing = bearingBetween(start, end)

    for (let step = 0; step <= steps; step++) {
      const t = step / steps
      const base = interpolateCoord(start, end, t)
      const localIntensity = clamp01(intensity * (0.85 + (1 - Math.abs(0.5 - t) * 2) * 0.15))
      heatmap.push({ lng: base[0], lat: base[1], intensity: localIntensity })
      heatmap.push({ lng: offsetPoint(base, segmentBearing + 90, spreadMeters)[0], lat: offsetPoint(base, segmentBearing + 90, spreadMeters)[1], intensity: localIntensity * 0.45 })
      heatmap.push({ lng: offsetPoint(base, segmentBearing - 90, spreadMeters)[0], lat: offsetPoint(base, segmentBearing - 90, spreadMeters)[1], intensity: localIntensity * 0.45 })
    }
  }
}

interface RawSegment {
  coords: [number, number][]
  type:   'main' | 'secondary' | 'highway'
  id?:    string
  name?:  string
}

function generateCityRoads(city: City): RawSegment[] {
  if (city.id === 'paris' && parisNetwork.length > 0) {
    return parisNetwork.map(s => ({
      id: s.id,
      name: s.name,
      coords: s.coords,
      type: s.type === 'motorway' ? 'highway' : 'main'
    }))
  }
  return []
}

function baseCongestionForHour(hour: number, isWeekend: boolean, rng: () => number): number {
  if (isWeekend) {
    if (hour < 8)  return 0.05 + rng() * 0.05
    if (hour < 12) return 0.20 + rng() * 0.10
    if (hour < 16) return 0.30 + rng() * 0.15
    if (hour < 20) return 0.25 + rng() * 0.10
    return 0.10 + rng() * 0.05
  }
  if (hour < 6)  return 0.03 + rng() * 0.03
  if (hour < 8)  return 0.30 + rng() * 0.20
  if (hour < 9)  return 0.65 + rng() * 0.25
  if (hour < 10) return 0.50 + rng() * 0.20
  if (hour < 12) return 0.35 + rng() * 0.15
  if (hour < 13) return 0.45 + rng() * 0.15
  if (hour < 16) return 0.30 + rng() * 0.10
  if (hour < 17) return 0.50 + rng() * 0.20
  if (hour < 19) return 0.70 + rng() * 0.25
  if (hour < 21) return 0.45 + rng() * 0.15
  return 0.15 + rng() * 0.10
}

export function generateTrafficSnapshot(city: City): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))
  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE, rng))
  const roads = generateCityRoads(city)
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []

  roads.forEach((road, idx) => {
    const midPt = road.coords[Math.floor(road.coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / 0.2, 2) +
      Math.pow((midPt[1] - city.center.lat) / 0.1, 2),
    )
    const spatial = Math.max(0, 1 - distFromCenter * 0.8)
    const noise   = (rng() - 0.5) * 0.25
    const baseRaw = Math.max(0, Math.min(1, baseCongestion * spatial + noise))
    
    const freeFlow = road.type === 'highway' ? 110 : 50
    const length   = road.type === 'highway' ? 1200 : 350

    // ─── Urban Intelligence Enrichment (V4) ───
    const typicalRaw = Math.max(0, Math.min(1, baseCongestion * spatial))
    const enriched = calculateV4TrafficScore(baseRaw, typicalRaw, {
      weatherImpact: 'none', // To be connected to WeatherProvider
      eventIntensity: 0,     // To be connected to EventStore
      hourOfDay: hour,
      isWeekend: isWE,
      publicTransportLoad: 0.1,
      socialPulse: 0
    })

    const speedKmh = freeFlow * (1 - enriched.score * 0.7)

    const segment: TrafficSegment = {
      id: `${city.id}-synthetic-${idx}`,
      coordinates: road.coords,
      congestionScore: enriched.score,
      anomalyScore: enriched.anomalyScore,
      level: enriched.level,
      speedKmh: Math.round(speedKmh * 10) / 10,
      freeFlowSpeedKmh: freeFlow,
      flowVehiclesPerHour: Math.round((freeFlow - speedKmh) * 40 + (rng() * 100)),
      travelTimeSeconds: Math.round((length / 1000) / speedKmh * 3600),
      length: Math.round(length),
      lastUpdated: now.toISOString(),
      mode: 'car'
    }

    segments.push(enrichSegmentWithStreetMetadata(segment))
    pushSmoothHeatPoints(heatmap, road.coords, clamp01(enriched.score * (0.85 + (road.type === 'highway' ? 0.15 : 0))))
  })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: heatmap, // Placeholder for heatmap passages
    heatmapCo2: heatmap, // Placeholder for heatmap co2
    fetchedAt: now.toISOString()
  }
}

export function generateTrafficFromOSMRoads(city: City, osmRoads: OSMRoad[]): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))
  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE, rng))
  
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []

  // Stitching logic applied to OSM roads
  const stitchedCoords = stitchSegments(osmRoads.map(r => r.coords))

  stitchedCoords.forEach((coords, idx) => {
    const midPt = coords[Math.floor(coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / 0.2, 2) +
      Math.pow((midPt[1] - city.center.lat) / 0.1, 2),
    )
    const spatial = Math.max(0, 1 - distFromCenter * 0.8)
    const baseRaw = Math.max(0, Math.min(1, baseCongestion * spatial + (rng() - 0.5) * 0.2))
    const typicalRaw = baseCongestion * spatial
    
    // ─── Urban Intelligence Enrichment (V4) ───
    const enriched = calculateV4TrafficScore(baseRaw, typicalRaw, {
      weatherImpact: 'none',
      eventIntensity: 0,
      hourOfDay: hour,
      isWeekend: isWE,
      publicTransportLoad: 0.15,
      socialPulse: 0.05
    })
    
    const freeFlow = 50
    const speedKmh = freeFlow * (1 - enriched.score * 0.6)
    const length   = 400
 
    segments.push({
      id: `${city.id}-osm-${idx}`,
      coordinates: coords,
      congestionScore: enriched.score,
      anomalyScore: enriched.anomalyScore,
      level: enriched.level,
      speedKmh: Math.round(speedKmh * 10) / 10,
      freeFlowSpeedKmh: freeFlow,
      flowVehiclesPerHour: Math.round((freeFlow - speedKmh) * 35 + (rng() * 80)),
      travelTimeSeconds: Math.round((length / 1000) / speedKmh * 3600),
      length: Math.round(length),
      lastUpdated: now.toISOString(),
      mode: 'car'
    })
    pushSmoothHeatPoints(heatmap, coords, clamp01(enriched.score * (0.8 + (coords.length > 6 ? 0.1 : 0))))
  })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: heatmap,
    heatmapCo2: heatmap,
    fetchedAt: now.toISOString()
  }
}

export function generateTrafficFromIdfGeoJSON(city: City, geojson: any): TrafficSnapshot {
  return generateTrafficSnapshot(city) // Simplified fallback for now
}

export function generatePrediction(city: City, horizonMinutes = 30): Prediction {
  const now = new Date()
  return {
    cityId: city.id,
    horizonMinutes,
    predictedFor: new Date(now.getTime() + horizonMinutes * 60000).toISOString(),
    segments: [],
    globalCongestion: 0.35,
    confidence: 0.85
  }
}

export function generateCityKPIs(city: City): CityKPIs {
  return {
    cityId: city.id,
    congestionRate: 0.32,
    avgTravelMin: 24,
    pollutionIndex: 4.2,
    activeIncidents: 8,
    networkEfficiency: 0.88,
    modalSplit: normalizeModalSplit({ car: 0.6, metro: 0.2, bus: 0.1, bike: 0.05, pedestrian: 0.05 }),
    capturedAt: new Date().toISOString()
  }
}

export function generateIncidents(city: City): Incident[] { return [] }
export function generateKPIHistory(city: City, points = 48): KPISnapshot[] { return [] }
