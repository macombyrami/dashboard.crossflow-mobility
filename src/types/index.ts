// ═══════════════════════════════════════════
// CrossFlow Mobility — Core Types
// ═══════════════════════════════════════════

export type TrafficMode = 'live' | 'predict' | 'simulate'

export type CongestionLevel = 'free' | 'slow' | 'congested' | 'critical'

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'

export type IncidentType = 'accident' | 'roadwork' | 'congestion' | 'anomaly' | 'event'

export type TransportMode = 'car' | 'pedestrian' | 'metro' | 'bus' | 'bike' | 'tram'

export type MapLayerId = 'traffic' | 'heatmap' | 'transport' | 'incidents' | 'prediction' | 'boundary'

export type HeatmapMode = 'congestion' | 'passages' | 'co2'

export type OrgPlan = 'starter' | 'pro' | 'enterprise'

// ─── Geography ────────────────────────────────────────────────────────────────

export interface LatLng {
  lat: number
  lng: number
}

export interface Bounds {
  ne: LatLng
  sw: LatLng
}

export interface City {
  id:         string
  name:       string
  fullName?:  string // e.g. "Paris, France"
  state?:     string // e.g. "Île-de-France"
  country:    string
  countryCode:string
  center:     LatLng
  zoom:       number
  timezone:   string
  bbox:       [number, number, number, number] // [west, south, east, north]
  population: number
  flag:       string
}

// ─── Traffic ──────────────────────────────────────────────────────────────────

export interface ContextFactors {
  weatherImpact:  'none' | 'minor' | 'moderate' | 'severe'
  eventIntensity: number // 0 (none) to 1 (major)
  hourOfDay:      number
  isWeekend:      boolean
  publicTransportLoad: number // 0-1
  socialPulse:    number // 0-1
}

export interface IntelligenceResult {
  score:       number
  level:       CongestionLevel
  anomalyScore:number // 0-1
  multipliers: Record<string, number>
}

export interface TrafficSegment {
  id:               string
  name?:            string
  streetName?:      string
  roadType?:        string   // motorway | trunk | primary | secondary | tertiary | residential
  coordinates:      [number, number][] // [lng, lat][]
  speedKmh:         number
  freeFlowSpeedKmh: number
  congestionScore:  number // 0-1
  level:            CongestionLevel
  flowVehiclesPerHour: number
  travelTimeSeconds:   number
  length:           number // meters
  mode:             TransportMode
  lastUpdated:      string // ISO

  // Detailed GIS Enrichment
  arrondissement?:  string   // e.g. "1er arrondissement"
  direction?:       string   // Cardinal: N, S, E, W, NE, etc.
  isIntersection?:  boolean
  hasTrafficLight?: boolean
  priorityAxis?:    number   // 0-1 (importance score)
  axisName?:        string   // e.g. "Boulevard Saint-Michel"
  flowTrend?:       'improving' | 'stable' | 'worsening'
  anomalyScore?:    number   // 0-1 (V4 Engine Delta)
}

export interface HeatmapPoint {
  lng:       number
  lat:       number
  intensity: number // 0-1
}

export interface TrafficSnapshot {
  cityId:          string
  segments:        TrafficSegment[]
  heatmap:         HeatmapPoint[]   // congestion
  heatmapPassages: HeatmapPoint[]   // vehicle count intensity
  heatmapCo2:      HeatmapPoint[]   // CO2 emission intensity
  fetchedAt:       string
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface Incident {
  id:          string
  type:        IncidentType
  severity:    IncidentSeverity
  title:       string
  description: string
  location:    LatLng
  address:     string
  startedAt:   string
  resolvedAt?: string
  source:      string
  iconColor:   string
}

// ─── Predictions ──────────────────────────────────────────────────────────────

export interface PredictionSegment {
  segmentId:       string
  congestionScore: number
  confidence:      number
  trend:           'improving' | 'stable' | 'worsening'
}

export interface Prediction {
  cityId:           string
  horizonMinutes:   number
  predictedFor:     string // ISO
  segments:         PredictionSegment[]
  globalCongestion: number
  confidence:       number
}

// ─── Simulation ───────────────────────────────────────────────────────────────

export type ScenarioType =
  | 'road_closure'
  | 'traffic_light'
  | 'bike_lane'
  | 'speed_limit'
  | 'public_transport'
  | 'event'

export interface SimulationScenario {
  type:        ScenarioType
  name:        string
  description: string
  params:      Record<string, unknown>
  affectedSegmentIds: string[]
  timeWindowStart: number // hour 0-23
  timeWindowEnd:   number
  durationHours:   number
}

export interface SimulationResult {
  id:              string
  scenarioName:    string
  status:          'running' | 'completed' | 'failed'
  progress:        number // 0-100
  before: {
    congestionRate:   number
    avgTravelMin:     number
    pollutionIndex:   number
    affectedSegments: number
  }
  after: {
    congestionRate:   number
    avgTravelMin:     number
    pollutionIndex:   number
    affectedSegments: number
  }
  delta: {
    congestionPct:  number
    travelTimePct:  number
    pollutionPct:   number
  }
  alternativePaths: number
  completedAt?: string
  /** Route comparison from the FastAPI predictive backend (optional) */
  predictive?: {
    normal:    { total_distance_m: number; total_time_s: number }
    simulated: { total_distance_m: number; total_time_s: number }
    delta:     { distance_m: number; time_s: number; avoided_edges: string[]; added_edges: string[] }
  }
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export interface CityKPIs {
  cityId:          string
  congestionRate:  number // 0-1
  avgTravelMin:    number
  pollutionIndex:  number // 0-10
  activeIncidents: number
  networkEfficiency: number // 0-1
  modalSplit: {
    car:        number
    metro:      number
    bus:        number
    bike:       number
    pedestrian: number
  }
  capturedAt: string
}

export interface ZoneStats {
  segmentCount:     number
  avgCongestion:    number  // 0-1
  avgSpeed:         number  // km/h
  totalPassages:    number  // vehicles/h summed
  avgCo2GPerKm:     number  // g/km average
  area:             string  // estimated km²
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface MapViewState {
  longitude: number
  latitude:  number
  zoom:      number
  pitch:     number
  bearing:   number
}
