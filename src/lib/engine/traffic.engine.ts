/**
 * CrossFlow Traffic Engine
 * Builds traffic state from road-aligned geometries only.
 * If no real network geometry is available, it returns an empty snapshot.
 */
import type {
  City,
  CityKPIs,
  HeatmapPoint,
  Incident,
  Prediction,
  TrafficSegment,
  TrafficSnapshot,
} from '@/types'
import * as turf from '@turf/turf'
import type { OSMRoad } from '@/lib/api/overpass'
import { enrichSnapshot } from '@/lib/utils/traffic-enrichment'
import type { KPISnapshot } from '@/store/kpiHistoryStore'
import { calculateV4TrafficScore } from './TrafficScoreService'
import { enrichSegmentWithStreetMetadata } from './StreetMapper'

type ModalSplit = { car: number; metro: number; bus: number; bike: number; pedestrian: number }

const MAX_NETWORK_SEGMENTS = 520
const MAX_HEATMAP_POINTS = 420

function normalizeModalSplit(raw: ModalSplit): ModalSplit {
  const total = raw.car + raw.metro + raw.bus + raw.bike + raw.pedestrian
  return {
    car: Math.round((raw.car / total) * 100) / 100,
    metro: Math.round((raw.metro / total) * 100) / 100,
    bus: Math.round((raw.bus / total) * 100) / 100,
    bike: Math.round((raw.bike / total) * 100) / 100,
    pedestrian: Math.round((raw.pedestrian / total) * 100) / 100,
  }
}

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

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function pushSegmentHeatSeeds(
  heatmap: HeatmapPoint[],
  coords: [number, number][],
  intensity: number,
): void {
  if (heatmap.length >= MAX_HEATMAP_POINTS || coords.length === 0) return

  if (coords.length === 1) {
    const [lng, lat] = coords[0] ?? [0, 0]
    heatmap.push({ lng, lat, intensity })
    return
  }

  const midpoint = coords[Math.floor(coords.length / 2)]
  if (!midpoint) return

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

function emptySnapshot(city: City, fetchedAt: string = new Date().toISOString()): TrafficSnapshot {
  return {
    cityId: city.id,
    segments: [],
    heatmap: [],
    heatmapPassages: [],
    heatmapCo2: [],
    fetchedAt,
  }
}

function roadTypeFromHighway(highway: string | undefined): string {
  if (!highway) return 'secondary'
  if (highway.includes('motorway')) return 'motorway'
  if (highway.includes('trunk')) return 'trunk'
  if (highway.includes('primary')) return 'primary'
  if (highway.includes('secondary')) return 'secondary'
  if (highway.includes('tertiary')) return 'tertiary'
  return 'residential'
}

function roadTypeFromFrc(frc: number): string {
  if (frc <= 1) return 'motorway'
  if (frc === 2) return 'trunk'
  if (frc === 3) return 'primary'
  if (frc === 4) return 'secondary'
  return 'tertiary'
}

function freeFlowForRoadType(roadType: string): number {
  switch (roadType) {
    case 'motorway':
      return 110
    case 'trunk':
      return 90
    case 'primary':
      return 70
    case 'secondary':
      return 50
    case 'tertiary':
      return 35
    default:
      return 30
  }
}

function estimateLengthMeters(coords: [number, number][]): number {
  if (coords.length < 2) return 0
  try {
    return Math.max(25, Math.round(turf.length(turf.lineString(coords), { units: 'kilometers' }) * 1000))
  } catch {
    return 0
  }
}

function baseCongestionForHour(hour: number, isWeekend: boolean, rng: () => number): number {
  if (isWeekend) {
    if (hour < 8) return 0.05 + rng() * 0.05
    if (hour < 12) return 0.2 + rng() * 0.1
    if (hour < 16) return 0.3 + rng() * 0.15
    if (hour < 20) return 0.25 + rng() * 0.1
    return 0.1 + rng() * 0.05
  }

  if (hour < 6) return 0.03 + rng() * 0.03
  if (hour < 8) return 0.3 + rng() * 0.2
  if (hour < 9) return 0.65 + rng() * 0.25
  if (hour < 10) return 0.5 + rng() * 0.2
  if (hour < 12) return 0.35 + rng() * 0.15
  if (hour < 13) return 0.45 + rng() * 0.15
  if (hour < 16) return 0.3 + rng() * 0.1
  if (hour < 17) return 0.5 + rng() * 0.2
  if (hour < 19) return 0.7 + rng() * 0.25
  if (hour < 21) return 0.45 + rng() * 0.15
  return 0.15 + rng() * 0.1
}

function buildTrafficSegment(
  city: City,
  seedId: string,
  coords: [number, number][],
  roadType: string,
  baseCongestion: number,
  rng: () => number,
  now: Date,
  name?: string,
): TrafficSegment | null {
  if (coords.length < 2) return null

  const midpoint = coords[Math.floor(coords.length / 2)] ?? coords[0]
  const distFromCenter = Math.sqrt(
    Math.pow((midpoint[0] - city.center.lng) / 0.2, 2) +
    Math.pow((midpoint[1] - city.center.lat) / 0.1, 2),
  )
  const spatial = Math.max(0.16, 1 - distFromCenter * 0.72)
  const typicalRaw = Math.max(0, Math.min(1, baseCongestion * spatial))
  const baseRaw = Math.max(0, Math.min(1, typicalRaw + (rng() - 0.5) * 0.18))
  const freeFlow = freeFlowForRoadType(roadType)
  const length = estimateLengthMeters(coords)
  if (length < 25) return null

  const enriched = calculateV4TrafficScore(baseRaw, typicalRaw, {
    weatherImpact: 'none',
    eventIntensity: 0,
    hourOfDay: now.getHours(),
    isWeekend: now.getDay() === 0 || now.getDay() === 6,
    publicTransportLoad: roadType === 'motorway' ? 0.08 : 0.14,
    socialPulse: 0.03,
  })

  const speedKmh = Math.max(8, freeFlow * (1 - enriched.score * 0.72))

  return enrichSegmentWithStreetMetadata({
    id: seedId,
    name,
    streetName: name,
    roadType,
    coordinates: coords,
    speedKmh: Math.round(speedKmh * 10) / 10,
    freeFlowSpeedKmh: freeFlow,
    congestionScore: enriched.score,
    level: enriched.level,
    flowVehiclesPerHour: Math.round((freeFlow - speedKmh) * 28 + rng() * 90),
    travelTimeSeconds: Math.max(8, Math.round((length / 1000) / Math.max(speedKmh, 1) * 3600)),
    length,
    mode: 'car',
    lastUpdated: now.toISOString(),
    anomalyScore: enriched.anomalyScore,
  })
}

export function generateTrafficSnapshot(city: City): TrafficSnapshot {
  return emptySnapshot(city)
}

export function generateTrafficFromOSMRoads(city: City, osmRoads: OSMRoad[]): TrafficSnapshot {
  const now = new Date()
  const rng = seededRng(cityTimeSeed(city.id))
  const baseCongestion = Math.min(1, baseCongestionForHour(now.getHours(), now.getDay() === 0 || now.getDay() === 6, rng))
  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []

  osmRoads
    .filter(road => road.coords.length >= 2)
    .slice(0, MAX_NETWORK_SEGMENTS)
    .forEach((road, idx) => {
      const roadType = roadTypeFromHighway(road.highway)
      const segment = buildTrafficSegment(
        city,
        `${city.id}-osm-${road.id ?? idx}`,
        road.coords,
        roadType,
        baseCongestion,
        rng,
        now,
        road.name || undefined,
      )
      if (!segment) return

      if (road.maxspeed > 0) segment.freeFlowSpeedKmh = Math.round(road.maxspeed)
      if (road.length > 20) segment.length = Math.round(road.length)
      segment.travelTimeSeconds = Math.max(
        8,
        Math.round((segment.length / 1000) / Math.max(segment.speedKmh, 1) * 3600),
      )

      segments.push(segment)
      pushSegmentHeatSeeds(
        heatmap,
        road.coords,
        clamp01(segment.congestionScore * (0.78 + (roadType === 'motorway' || roadType === 'trunk' ? 0.18 : 0))),
      )
    })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: [],
    heatmapCo2: [],
    fetchedAt: now.toISOString(),
  }
}

export function generateTrafficFromIdfGeoJSON(city: City, geojson: any): TrafficSnapshot {
  const now = new Date()
  const rng = seededRng(cityTimeSeed(city.id))
  const baseCongestion = Math.min(1, baseCongestionForHour(now.getHours(), now.getDay() === 0 || now.getDay() === 6, rng))
  const features = Array.isArray(geojson?.features) ? geojson.features : []
  if (!features.length) return emptySnapshot(city, now.toISOString())

  const segments: TrafficSegment[] = []
  const heatmap: HeatmapPoint[] = []

  features
    .filter((feature: any) => feature?.geometry?.type === 'LineString')
    .slice(0, MAX_NETWORK_SEGMENTS)
    .forEach((feature: any, idx: number) => {
      const coords = Array.isArray(feature.geometry?.coordinates)
        ? feature.geometry.coordinates.filter((coord: any) =>
            Array.isArray(coord) &&
            coord.length >= 2 &&
            Number.isFinite(coord[0]) &&
            Number.isFinite(coord[1]),
          )
        : []
      if (coords.length < 2) return

      const props = feature.properties ?? {}
      const roadType = roadTypeFromFrc(Number(props.frc ?? 5))
      const name = props.roadName || props.roadNumber || 'Urban corridor'
      const segment = buildTrafficSegment(
        city,
        `${city.id}-idf-${props.id ?? idx}`,
        coords,
        roadType,
        baseCongestion,
        rng,
        now,
        name,
      )
      if (!segment) return

      if (Number.isFinite(props.miles)) {
        segment.length = Math.max(25, Math.round(Number(props.miles) * 1609.34))
      }
      if (Number.isFinite(props.lanes) && Number(props.lanes) > 1) {
        segment.priorityAxis = clamp01(0.45 + (Number(props.lanes) - 1) * 0.12)
      }
      segment.travelTimeSeconds = Math.max(
        8,
        Math.round((segment.length / 1000) / Math.max(segment.speedKmh, 1) * 3600),
      )

      segments.push(segment)
      pushSegmentHeatSeeds(
        heatmap,
        coords,
        clamp01(segment.congestionScore * (0.82 + (roadType === 'motorway' || roadType === 'trunk' ? 0.12 : 0))),
      )
    })

  return {
    cityId: city.id,
    segments: enrichSnapshot(segments),
    heatmap,
    heatmapPassages: [],
    heatmapCo2: [],
    fetchedAt: now.toISOString(),
  }
}

export function generatePrediction(city: City, horizonMinutes = 30): Prediction {
  const now = new Date()
  return {
    cityId: city.id,
    horizonMinutes,
    predictedFor: new Date(now.getTime() + horizonMinutes * 60000).toISOString(),
    segments: [],
    globalCongestion: 0.35,
    confidence: 0.85,
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
    modalSplit: normalizeModalSplit({
      car: 0.6,
      metro: 0.2,
      bus: 0.1,
      bike: 0.05,
      pedestrian: 0.05,
    }),
    capturedAt: new Date().toISOString(),
  }
}

export function generateIncidents(city: City): Incident[] {
  void city
  return []
}

export function generateKPIHistory(city: City, points = 48): KPISnapshot[] {
  void city
  void points
  return []
}
