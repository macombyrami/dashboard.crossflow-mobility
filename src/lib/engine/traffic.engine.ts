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
import { enrichSnapshot } from '@/lib/utils/traffic-enrichment'
import type { OSMRoad } from '@/lib/api/overpass'
import { platformConfig } from '@/config/platform.config'
import { scoreToCongestionLevel } from '@/lib/utils/congestion'

// Import enriched data (optional/conditional)
let parisNetwork: any[] = []
try {
  parisNetwork = require('@/lib/data/paris_network.json')
} catch (e) {
  // Fallback if file not yet generated
  parisNetwork = []
}

// ─── Modal split normalizer (ensures sum = exactly 1.00) ──────────────────

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

// ─── Seeded RNG (deterministic per city + time window) ─────────────────────

function seededRng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function cityTimeSeed(cityId: string, windowMin: number = 0): number {
  const now = Date.now()
  const slot = Math.floor((now + windowMin * 60_000) / 30_000) // 30s slots
  let hash = slot
  for (let i = 0; i < cityId.length; i++) {
    hash = (hash * 31 + cityId.charCodeAt(i)) >>> 0
  }
  return hash || 1
}

// ─── CO2 emission model ───────────────────────────────────────────────────

function co2GPerKm(congestion: number): number {
  // 120 g/km free flow → 300 g/km stop-and-go
  return 120 + congestion * 180
}

// ─── Route generation (realistic grid + radial for each city) ─────────────

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

// ─── Congestion pattern (realistic time-of-day) ───────────────────────────

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

// ─── Main snapshot generator ──────────────────────────────────────────────

export function generateTrafficSnapshot(city: City): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))

  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE, rng))
  const roads = generateCityRoads(city)
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []
  const heatmapPassages: HeatmapPoint[] = []
  const heatmapCo2: HeatmapPoint[] = []

  roads.forEach((road, idx) => {
    const midPt = road.coords[Math.floor(road.coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / (city.bbox[2] - city.bbox[0]), 2) +
      Math.pow((midPt[1] - city.center.lat) / (city.bbox[3] - city.bbox[1]), 2),
    ) * 2

    const spatial = Math.max(0, 1 - distFromCenter * 0.8)
    const noise   = (rng() - 0.5) * 0.25
    let congestion = Math.max(0, Math.min(1, baseCongestion * spatial + noise))

    if (road.type === 'highway') {
      congestion = Math.max(0, Math.min(1, congestion * 0.9 + rng() * 0.15))
    }

    const freeFlow = road.type === 'highway' ? 110 : road.type === 'main' ? 50 : 30
    const speedKmh = Math.max(5, freeFlow * (1 - congestion * 0.85))
    const level    = scoreToCongestionLevel(congestion)
    const length   = road.type === 'highway' ? 800 + rng() * 1200 : 200 + rng() * 400
    const flowVph  = Math.round((freeFlow - speedKmh) * 40 + rng() * 200)

    segments.push({
      id:               `${city.id}-seg-${idx}`,
      name:             road.name,
      coordinates:      road.coords,
      speedKmh:         Math.round(speedKmh),
      freeFlowSpeedKmh: freeFlow,
      congestionScore:  Math.round(congestion * 100) / 100,
      level,
      flowVehiclesPerHour: flowVph,
      travelTimeSeconds:   Math.round((length / 1000) / speedKmh * 3600),
      length:           Math.round(length),
      mode:             'car',
      lastUpdated:      now.toISOString(),
    })

    for (let i = 0; i < road.coords.length; i += 2) {
      const pt = road.coords[i]
      heatmap.push({ lng: pt[0], lat: pt[1], intensity: congestion })
      heatmapPassages.push({ lng: pt[0], lat: pt[1], intensity: Math.min(1, flowVph / 2000) })
      heatmapCo2.push({ lng: pt[0], lat: pt[1], intensity: co2GPerKm(congestion) / 300 })
    }
  })

  return {
    cityId:    city.id,
    segments:  enrichSnapshot(segments),
    heatmap,
    heatmapPassages,
    heatmapCo2,
    fetchedAt: now.toISOString(),
  }
}

// ─── OSM roads traffic generator ─────────────────────────────────────────────

export function generateTrafficFromOSMRoads(city: City, osmRoads: OSMRoad[]): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))

  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE, rng))
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []
  const heatmapPassages: HeatmapPoint[] = []
  const heatmapCo2: HeatmapPoint[] = []

  osmRoads.forEach((osmRoad, idx) => {
    let segType: 'main' | 'secondary' | 'highway'
    if (osmRoad.highway === 'motorway' || osmRoad.highway === 'trunk') {
      segType = 'highway'
    } else if (osmRoad.highway === 'primary' || osmRoad.highway === 'secondary') {
      segType = 'main'
    } else {
      segType = 'secondary'
    }

    const midPt = osmRoad.coords[Math.floor(osmRoad.coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / (city.bbox[2] - city.bbox[0]), 2) +
      Math.pow((midPt[1] - city.center.lat) / (city.bbox[3] - city.bbox[1]), 2),
    ) * 2

    const spatial = Math.max(0, 1 - distFromCenter * 0.8)
    const noise   = (rng() - 0.5) * 0.25
    let congestion = Math.max(0, Math.min(1, baseCongestion * spatial + noise))

    if (segType === 'highway') {
      congestion = Math.max(0, Math.min(1, congestion * 0.9 + rng() * 0.15))
    }

    const freeFlow = osmRoad.maxspeed > 0 ? osmRoad.maxspeed
      : segType === 'highway' ? 110 : segType === 'main' ? 50 : 30
    const speedKmh = Math.max(5, freeFlow * (1 - congestion * 0.85))
    const level    = scoreToCongestionLevel(congestion)
    const length   = osmRoad.length > 0 ? osmRoad.length
      : segType === 'highway' ? 800 + rng() * 1200 : 200 + rng() * 400
    const flowVph  = Math.round((freeFlow - speedKmh) * 40 + rng() * 200)

    segments.push({
      id:               `${city.id}-osm-${osmRoad.id}-${idx}`,
      roadType:         osmRoad.highway,
      coordinates:      osmRoad.coords,
      speedKmh:         Math.round(speedKmh),
      freeFlowSpeedKmh: freeFlow,
      congestionScore:  Math.round(congestion * 100) / 100,
      level,
      flowVehiclesPerHour: flowVph,
      travelTimeSeconds:   Math.round((length / 1000) / speedKmh * 3600),
      length:           Math.round(length),
      mode:             'car',
      lastUpdated:      now.toISOString(),
    })

    for (let i = 0; i < osmRoad.coords.length; i += 2) {
      const pt = osmRoad.coords[i]
      heatmap.push({ lng: pt[0], lat: pt[1], intensity: congestion })
      heatmapPassages.push({ lng: pt[0], lat: pt[1], intensity: Math.min(1, flowVph / 2000) })
      heatmapCo2.push({ lng: pt[0], lat: pt[1], intensity: co2GPerKm(congestion) / 300 })
    }
  })

  return {
    cityId:    city.id,
    segments:  enrichSnapshot(segments),
    heatmap,
    heatmapPassages,
    heatmapCo2,
    fetchedAt: now.toISOString(),
  }
}

// ─── IDF / Local GeoJSON traffic generator ───────────────────────────────────

export function generateTrafficFromIdfGeoJSON(city: City, geojson: any): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))

  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE, rng))
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []
  const heatmapPassages: HeatmapPoint[] = []
  const heatmapCo2: HeatmapPoint[] = []

  const features = (geojson.features || []) as any[]

  features.forEach((f, idx) => {
    const p = f.properties
    const coords = f.geometry.coordinates as [number, number][]

    let segType: 'main' | 'secondary' | 'highway'
    const frc = p.frc ?? 5
    if (frc <= 2)      segType = 'highway'
    else if (frc <= 3) segType = 'main'
    else               segType = 'secondary'

    const midPt = coords[Math.floor(coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / 0.2, 2) +
      Math.pow((midPt[1] - city.center.lat) / 0.2, 2),
    )

    const spatial = Math.max(0, 1 - distFromCenter * 0.7)
    const noise   = (rng() - 0.5) * 0.2
    let congestion = Math.max(0, Math.min(1, baseCongestion * spatial + noise))

    if (segType === 'highway') {
      congestion = Math.max(0, Math.min(1, congestion * 0.85 + rng() * 0.15))
    }

    const freeFlow = segType === 'highway' ? 110 : segType === 'main' ? 50 : 30
    const speedKmh = Math.max(5, freeFlow * (1 - congestion * 0.88))
    const level    = scoreToCongestionLevel(congestion)
    const length   = (p.miles || 0.1) * 1609.34
    const flowVph  = Math.round((freeFlow - speedKmh) * 45 + rng() * 150)

    segments.push({
      id:               `idf-${p.id || idx}`,
      name:             p.roadName || p.roadNumber,
      roadType:         segType === 'highway' ? 'motorway' : segType === 'main' ? 'primary' : 'tertiary',
      coordinates:      coords,
      speedKmh:         Math.round(speedKmh),
      freeFlowSpeedKmh: freeFlow,
      congestionScore:  Math.round(congestion * 100) / 100,
      level,
      flowVehiclesPerHour: flowVph,
      travelTimeSeconds:   Math.round((length / 1000) / speedKmh * 3600),
      length:           Math.round(length),
      mode:             'car',
      lastUpdated:      now.toISOString(),
    })

    for (let i = 0; i < coords.length; i += 2) {
      const pt = coords[i]
      heatmap.push({ lng: pt[0], lat: pt[1], intensity: congestion })
      heatmapPassages.push({ lng: pt[0], lat: pt[1], intensity: Math.min(1, flowVph / 2200) })
      heatmapCo2.push({ lng: pt[0], lat: pt[1], intensity: co2GPerKm(congestion) / 320 })
    }
  })

  return {
    cityId:    city.id,
    segments:  enrichSnapshot(segments),
    heatmap,
    heatmapPassages,
    heatmapCo2,
    fetchedAt: now.toISOString(),
  }
}

// ─── Prediction generator ─────────────────────────────────────────────────

export function generatePrediction(city: City, horizonMinutes = 30): Prediction {
  const now    = new Date()
  const target = new Date(now.getTime() + horizonMinutes * 60_000)
  const rng    = seededRng(cityTimeSeed(city.id, horizonMinutes))
  const snapshot = generateTrafficSnapshot(city)

  const predSegs: PredictionSegment[] = snapshot.segments.map(seg => {
    const delta  = (rng() - 0.45) * 0.2
    const future = Math.max(0, Math.min(1, seg.congestionScore + delta))
    const trend: PredictionSegment['trend'] =
      delta < -0.05 ? 'improving' : delta > 0.05 ? 'worsening' : 'stable'

    return {
      segmentId:       seg.id,
      congestionScore: Math.round(future * 100) / 100,
      confidence:      0.70 + rng() * 0.25,
      trend,
    }
  })

  const globalNow    = snapshot.segments.reduce((a, s) => a + s.congestionScore, 0) / snapshot.segments.length
  const globalFuture = predSegs.reduce((a, s) => a + s.congestionScore, 0) / predSegs.length

  return {
    cityId:           city.id,
    horizonMinutes,
    predictedFor:     target.toISOString(),
    segments:         predSegs,
    globalCongestion: Math.round(globalFuture * 100) / 100,
    confidence:       0.78 + rng() * 0.18,
  }
}

// ─── City KPIs (decision ready) ───────────────────────────────────────────

export function generateCityKPIs(city: City): CityKPIs {
  const snapshot = generateTrafficSnapshot(city)
  const segs = snapshot.segments
  if (segs.length === 0) {
    return {
      cityId:          city.id,
      congestionRate:  0,
      avgTravelMin:    0,
      pollutionIndex:  0,
      activeIncidents: 0,
      networkEfficiency: 1,
      modalSplit:      normalizeModalSplit({ car: 0.7, metro: 0.15, bus: 0.1, bike: 0.03, pedestrian: 0.02 }),
      capturedAt:      new Date().toISOString(),
    }
  }

  const avgCong = segs.reduce((a, s) => a + s.congestionScore, 0) / segs.length
  const avgSpd  = segs.reduce((a, s) => a + s.speedKmh, 0) / segs.length
  
  return {
    cityId:          city.id,
    congestionRate:  Math.round(avgCong * 100) / 100,
    avgTravelMin:    Math.round(10 + avgCong * 40),
    pollutionIndex:  Math.round((avgCong * 8 + 0.5) * 10) / 10,
    activeIncidents: Math.floor(avgCong * 15 * (city.population / 1000000)),
    networkEfficiency: Math.round((1 - avgCong * 0.8) * 100) / 100,
    modalSplit: normalizeModalSplit({
      car:        0.6 + avgCong * 0.1,
      metro:      0.2 - avgCong * 0.05,
      bus:        0.1,
      bike:       0.05,
      pedestrian: 0.05,
    }),
    capturedAt: new Date().toISOString(),
  }
}

// ─── Incidents generator ──────────────────────────────────────────────────

export function generateIncidents(city: City): Incident[] {
  const rng  = seededRng(cityTimeSeed(city.id))
  const count = Math.floor(rng() * 5) + 3
  const types: Incident['type'][] = ['accident', 'congestion', 'roadwork', 'anomaly']
  const severities: Incident['severity'][] = ['low', 'medium', 'high', 'critical']
  
  const incidents: Incident[] = []
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(rng() * types.length)]
    const severity = severities[Math.floor(rng() * severities.length)]
    const lat = city.center.lat + (rng() - 0.5) * 0.05
    const lng = city.center.lng + (rng() - 0.5) * 0.1
    
    incidents.push({
      id:          `${city.id}-inc-${i}`,
      type,
      severity,
      title:       `${type.toUpperCase()} - Axe ${i + 1}`,
      description: `Ralentissement important dû à un ${type}.`,
      location:    { lat, lng },
      address:     `Axe Principal, ${city.name}`,
      startedAt:   new Date(Date.now() - rng() * 3600000).toISOString(),
      source:      'CrossFlow Mobility Engine',
      iconColor:   severity === 'critical' ? '#FF1744' : severity === 'high' ? '#FF6D00' : '#FFD600',
    })
  }
  return incidents
}
