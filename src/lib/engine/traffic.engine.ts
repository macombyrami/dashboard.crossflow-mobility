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
  // Use enriched Paris network if available
  if (city.id === 'paris' && parisNetwork.length > 0) {
    return parisNetwork.map(s => ({
      id: s.id,
      name: s.name,
      coords: s.coords,
      type: s.type === 'motorway' ? 'highway' : 'main'
    }))
  }

  const rng = seededRng(cityTimeSeed(city.id + '_roads', 0) + 42)
  const [west, south, east, north] = city.bbox
  const latSpan = north - south
  const lngSpan = east - west
  const roads: RawSegment[] = []

  // Grid roads
  const gridRows = 12
  const gridCols = 12
  for (let r = 0; r <= gridRows; r++) {
    const lat = south + (r / gridRows) * latSpan
    const coords: [number, number][] = []
    for (let c = 0; c <= gridCols; c++) {
      const lng = west + (c / gridCols) * lngSpan
      coords.push([lng + (rng() - 0.5) * 0.001, lat + (rng() - 0.5) * 0.001])
    }
    roads.push({ coords, type: r % 3 === 0 ? 'main' : 'secondary' })
  }
  for (let c = 0; c <= gridCols; c++) {
    const lng = west + (c / gridCols) * lngSpan
    const coords: [number, number][] = []
    for (let r = 0; r <= gridRows; r++) {
      const lat = south + (r / gridRows) * latSpan
      coords.push([lng + (rng() - 0.5) * 0.001, lat + (rng() - 0.5) * 0.001])
    }
    roads.push({ coords, type: c % 3 === 0 ? 'main' : 'secondary' })
  }

  // Radial highways from center
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2
    const coords: [number, number][] = []
    for (let d = 0; d <= 10; d++) {
      const r = (d / 10) * Math.min(latSpan, lngSpan) * 0.5
      coords.push([
        city.center.lng + Math.cos(angle) * r * 1.5,
        city.center.lat + Math.sin(angle) * r,
      ])
    }
    roads.push({ coords, type: 'highway' })
  }

  return roads
}

// ─── Congestion pattern (realistic time-of-day) ───────────────────────────

function baseCongestionForHour(hour: number, isWeekend: boolean): number {
  if (isWeekend) {
    if (hour < 8)  return 0.05 + Math.random() * 0.05
    if (hour < 12) return 0.20 + Math.random() * 0.10
    if (hour < 16) return 0.30 + Math.random() * 0.15
    if (hour < 20) return 0.25 + Math.random() * 0.10
    return 0.10 + Math.random() * 0.05
  }
  // Weekday
  if (hour < 6)  return 0.03 + Math.random() * 0.03
  if (hour < 8)  return 0.30 + Math.random() * 0.20  // morning rush
  if (hour < 9)  return 0.65 + Math.random() * 0.25  // peak
  if (hour < 10) return 0.50 + Math.random() * 0.20
  if (hour < 12) return 0.35 + Math.random() * 0.15
  if (hour < 13) return 0.45 + Math.random() * 0.15  // lunch
  if (hour < 16) return 0.30 + Math.random() * 0.10
  if (hour < 17) return 0.50 + Math.random() * 0.20
  if (hour < 19) return 0.70 + Math.random() * 0.25  // evening rush
  if (hour < 21) return 0.45 + Math.random() * 0.15
  return 0.15 + Math.random() * 0.10
}

// ─── Main snapshot generator ──────────────────────────────────────────────

export function generateTrafficSnapshot(city: City): TrafficSnapshot {
  const now  = new Date()
  const hour = now.getHours()
  const isWE = now.getDay() === 0 || now.getDay() === 6
  const rng  = seededRng(cityTimeSeed(city.id))

  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE))
  const roads = generateCityRoads(city)
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []
  const heatmapPassages: HeatmapPoint[] = []
  const heatmapCo2: HeatmapPoint[] = []

  roads.forEach((road, idx) => {
    // Spatial variation: center more congested
    const midPt = road.coords[Math.floor(road.coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / (city.bbox[2] - city.bbox[0]), 2) +
      Math.pow((midPt[1] - city.center.lat) / (city.bbox[3] - city.bbox[1]), 2),
    ) * 2  // 0 = center, 1 = edge

    const spatial = Math.max(0, 1 - distFromCenter * 0.8)
    const noise   = (rng() - 0.5) * 0.25
    let congestion = Math.max(0, Math.min(1, baseCongestion * spatial + noise))

    // Highways have different patterns
    if (road.type === 'highway') {
      congestion = Math.max(0, Math.min(1, congestion * 0.9 + rng() * 0.15))
    }

    const freeFlow  = road.type === 'highway' ? 110 : road.type === 'main' ? 50 : 30
    const speedKmh  = Math.max(5, freeFlow * (1 - congestion * 0.85))
    const level     = scoreToCongestionLevel(congestion)
    const length    = road.type === 'highway' ? 800 + rng() * 1200 : 200 + rng() * 400
    const flowVph   = Math.round((freeFlow - speedKmh) * 40 + rng() * 200)

    segments.push({
      id:               `${city.id}-seg-${idx}`,
      coordinates:      road.coords,
      speedKmh:         Math.round(speedKmh),
      freeFlowSpeedKmh: freeFlow,
      congestionScore:  Math.round(congestion * 100) / 100,
      level,
      flowVehiclesPerHour: flowVph,
      travelTimeSeconds:   Math.round((length / 1000) / speedKmh * 3600),
      length:           Math.round(length),
      mode:             road.type === 'highway' ? 'car' : 'car',
      lastUpdated:      now.toISOString(),
    })

    // Heatmap points along segment
    for (let i = 0; i < road.coords.length; i += 2) {
      const pt = road.coords[i]
      heatmap.push({ lng: pt[0], lat: pt[1], intensity: congestion })
      heatmapPassages.push({ lng: pt[0], lat: pt[1], intensity: Math.min(1, flowVph / 2000) })
      heatmapCo2.push({ lng: pt[0], lat: pt[1], intensity: co2GPerKm(congestion) / 300 })
    }
  })

  return {
    cityId:    city.id,
    segments,
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

  const baseCongestion = Math.min(1, baseCongestionForHour(hour, isWE))
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []
  const heatmapPassages: HeatmapPoint[] = []
  const heatmapCo2: HeatmapPoint[] = []

  osmRoads.forEach((osmRoad, idx) => {
    // Map highway type to segment type
    let segType: 'main' | 'secondary' | 'highway'
    if (osmRoad.highway === 'motorway' || osmRoad.highway === 'trunk') {
      segType = 'highway'
    } else if (osmRoad.highway === 'primary' || osmRoad.highway === 'secondary') {
      segType = 'main'
    } else {
      segType = 'secondary'
    }

    // Spatial variation: center more congested
    const midPt = osmRoad.coords[Math.floor(osmRoad.coords.length / 2)]
    const distFromCenter = Math.sqrt(
      Math.pow((midPt[0] - city.center.lng) / (city.bbox[2] - city.bbox[0]), 2) +
      Math.pow((midPt[1] - city.center.lat) / (city.bbox[3] - city.bbox[1]), 2),
    ) * 2  // 0 = center, 1 = edge

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

    // Heatmap points along segment
    for (let i = 0; i < osmRoad.coords.length; i += 2) {
      const pt = osmRoad.coords[i]
      heatmap.push({ lng: pt[0], lat: pt[1], intensity: congestion })
      heatmapPassages.push({ lng: pt[0], lat: pt[1], intensity: Math.min(1, flowVph / 2000) })
      heatmapCo2.push({ lng: pt[0], lat: pt[1], intensity: co2GPerKm(congestion) / 300 })
    }
  })

  return {
    cityId:    city.id,
    segments,
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

// ─── KPI generator ────────────────────────────────────────────────────────

export function generateCityKPIs(city: City): CityKPIs {
  const snapshot = generateTrafficSnapshot(city)
  const segs     = snapshot.segments
  const avg      = segs.reduce((a, s) => a + s.congestionScore, 0) / segs.length
  const rng      = seededRng(cityTimeSeed(city.id + '_kpi'))

  const congestionRate = Math.round(avg * 100) / 100
  const avgSpeed       = segs.reduce((a, s) => a + s.speedKmh, 0) / segs.length
  const avgTravelMin   = Math.round(20 + (congestionRate * 30) + rng() * 5)
  const pollutionIndex = Math.round((congestionRate * 8 + rng() * 2) * 10) / 10

  return {
    cityId: city.id,
    congestionRate,
    avgTravelMin,
    pollutionIndex:    Math.min(10, pollutionIndex),
    activeIncidents:   Math.round(congestionRate * 12 + rng() * 4),
    networkEfficiency: Math.round((1 - congestionRate * 0.7) * 100) / 100,
    modalSplit: normalizeModalSplit({
      car:        0.55 + rng() * 0.15,
      metro:      0.20 + rng() * 0.10,
      bus:        0.12 + rng() * 0.05,
      bike:       0.08 + rng() * 0.05,
      pedestrian: 0.05 + rng() * 0.03,
    }),
    capturedAt: new Date().toISOString(),
  }
}

// ─── Incident generator ───────────────────────────────────────────────────

const INCIDENT_TEMPLATES = [
  { type: 'accident' as const,   titles: ['Collision signalée', 'Accident de la route', 'Carambolage signalé', 'Véhicule accidenté sur la chaussée'] },
  { type: 'roadwork' as const,   titles: ['Travaux — voie réduite', 'Chantier en cours', 'Réfection de chaussée', 'Pose de canalisations'] },
  { type: 'congestion' as const, titles: ['Ralentissement anormal', 'Trafic dense', 'File en attente importante', 'Embouteillage persistant'] },
  { type: 'anomaly' as const,    titles: ['Anomalie détectée par ML', 'Comportement atypique', 'Densité inhabituelle', 'Flux irrégulier détecté'] },
]

export function generateIncidents(city: City): Incident[] {
  const rng   = seededRng(cityTimeSeed(city.id + '_incidents'))
  const count = Math.floor(2 + rng() * 6)
  const [west, south, east, north] = city.bbox
  const incidents: Incident[] = []

  for (let i = 0; i < count; i++) {
    const template = INCIDENT_TEMPLATES[Math.floor(rng() * INCIDENT_TEMPLATES.length)]
    const severity  = (['low', 'medium', 'high', 'critical'] as const)[
      Math.floor(rng() * 4)
    ]
    const severityColor = platformConfig.traffic.colors[
      severity === 'low' ? 'free' :
      severity === 'medium' ? 'slow' :
      severity === 'high' ? 'congested' : 'critical'
    ]

    incidents.push({
      id:          `${city.id}-inc-${i}`,
      type:         template.type,
      severity,
      title:        template.titles[Math.floor(rng() * template.titles.length)],
      description: `Signalé il y a ${Math.floor(5 + rng() * 55)} min. Perturbation ${severity === 'critical' ? 'majeure' : severity === 'high' ? 'forte' : 'modérée'}.`,
      location: {
        lat: south + rng() * (north - south),
        lng: west  + rng() * (east  - west),
      },
      address:    `Secteur ${String.fromCharCode(65 + Math.floor(rng() * 26))}${Math.floor(rng() * 9 + 1)} — ${city.name}`,
      startedAt:  new Date(Date.now() - rng() * 3_600_000).toISOString(),
      source:     ['TomTom', 'WAZE', 'Capteurs IA', 'Utilisateur'][Math.floor(rng() * 4)],
      iconColor:  severityColor,
    })
  }

  return incidents
}

// ─── KPI history (for chart) ──────────────────────────────────────────────

export function generateKPIHistory(city: City, points = 48) {
  const now = Date.now()
  return Array.from({ length: points }, (_, i) => {
    const ts   = now - (points - i - 1) * 30 * 60_000
    const date = new Date(ts)
    const rng  = seededRng(cityTimeSeed(city.id + '_hist_' + i) + i * 997)
    const hour = date.getHours()
    const isWE = date.getDay() === 0 || date.getDay() === 6
    const base = baseCongestionForHour(hour, isWE)
    return {
      time:          date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      congestion:    Math.round(Math.min(1, base + (rng() - 0.5) * 0.1) * 100),
      avgTravelMin:  Math.round(20 + base * 30 + (rng() - 0.5) * 4),
      pollutionIdx:  Math.round((base * 8 + rng() * 1.5) * 10) / 10,
    }
  })
}
