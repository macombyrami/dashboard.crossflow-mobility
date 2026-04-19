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

const MAX_SYNTHETIC_ROADS = 180
const MAX_HEATMAP_POINTS = 420

function pushSegmentHeatSeeds(
  heatmap: HeatmapPoint[],
  coords: [number, number][],
  intensity: number,
): void {
  if (heatmap.length >= MAX_HEATMAP_POINTS) return

  if (coords.length === 0) return

  if (coords.length === 1) {
    const [lng, lat] = coords[0] ?? [0, 0]
    heatmap.push({ lng, lat, intensity })
    return
  }

  const midpoint = coords[Math.floor(coords.length / 2)]
  heatmap.push({ lng: midpoint[0], lat: midpoint[1], intensity })
  if (heatmap.length >= MAX_HEATMAP_POINTS || intensity < 0.22) return

  const quarter = coords[Math.floor((coords.length - 1) * 0.25)]
  const threeQuarter = coords[Math.floor((coords.length - 1) * 0.75)]

  if (quarter) {
    heatmap.push({ lng: quarter[0], lat: quarter[1], intensity: clamp01(intensity * 0.72) })
  }
  if (heatmap.length >= MAX_HEATMAP_POINTS || intensity < 0.52) return

  if (threeQuarter) {
    heatmap.push({ lng: threeQuarter[0], lat: threeQuarter[1], intensity: clamp01(intensity * 0.72) })
  }
}

interface RawSegment {
  coords: [number, number][]
  type:   'main' | 'secondary' | 'highway'
  id?:    string
  name?:  string
}

function generateCityRoads(city: City): RawSegment[] {
  const [minLng, minLat, maxLng, maxLat] = city.bbox ?? [
    city.center.lng - 0.08,
    city.center.lat - 0.05,
    city.center.lng + 0.08,
    city.center.lat + 0.05,
  ]

  const lngSpan = Math.max(0.02, (maxLng - minLng) * 0.5)
  const latSpan = Math.max(0.02, (maxLat - minLat) * 0.5)
  const roads: RawSegment[] = []
  const spokes = 10
  const rings = 4

  for (let i = 0; i < spokes; i++) {
    const angle = (Math.PI * 2 * i) / spokes
    const dx = Math.cos(angle) * lngSpan
    const dy = Math.sin(angle) * latSpan
    roads.push({
      id: `${city.id}-radial-${i}`,
      name: `Radial ${i + 1}`,
      type: i % 3 === 0 ? 'highway' : 'main',
      coords: [
        [city.center.lng - dx, city.center.lat - dy],
        [city.center.lng, city.center.lat],
        [city.center.lng + dx, city.center.lat + dy],
      ],
    })
  }

  for (let ring = 1; ring <= rings; ring++) {
    const ratio = ring / (rings + 1)
    const ringLng = lngSpan * ratio
    const ringLat = latSpan * ratio
    const points = 12
    for (let i = 0; i < points; i++) {
      const a1 = (Math.PI * 2 * i) / points
      const a2 = (Math.PI * 2 * (i + 1)) / points
      roads.push({
        id: `${city.id}-ring-${ring}-${i}`,
        name: `Ring ${ring}-${i + 1}`,
        type: ring % 2 === 0 ? 'secondary' : 'main',
        coords: [
          [city.center.lng + Math.cos(a1) * ringLng, city.center.lat + Math.sin(a1) * ringLat],
          [city.center.lng + Math.cos(a2) * ringLng, city.center.lat + Math.sin(a2) * ringLat],
        ],
      })
    }
  }

  return roads.slice(0, MAX_SYNTHETIC_ROADS)
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
  const roads = generateCityRoads(city).slice(0, MAX_SYNTHETIC_ROADS)
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
    pushSegmentHeatSeeds(heatmap, road.coords, clamp01(enriched.score * (0.85 + (road.type === 'highway' ? 0.15 : 0))))
  })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: [],
    heatmapCo2: [],
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
  const stitchedCoords = stitchSegments(osmRoads.slice(0, MAX_SYNTHETIC_ROADS).map(r => r.coords))

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
    pushSegmentHeatSeeds(heatmap, coords, clamp01(enriched.score * (0.8 + (coords.length > 6 ? 0.1 : 0))))
  })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: [],
    heatmapCo2: [],
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
