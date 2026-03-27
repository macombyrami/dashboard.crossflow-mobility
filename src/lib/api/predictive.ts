/**
 * CrossFlow Predictive API Client
 * Typed wrapper for all /api/predictive/* calls (FastAPI proxy)
 */

const BASE = '/api/predictive'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PredTrafficLevel = 'light' | 'medium' | 'heavy' | 'blocked'
export type PredEventType = 'accident' | 'works' | 'demonstration' | 'administrative'

export interface PredLatLng { lat: number; lng: number }

export interface PredRouteSegment {
  edge_id:     string
  name?:       string
  length:      number
  travel_time: number
  status:      'normal' | 'slow' | 'blocked'
  geometry:    [number, number][]
}

export interface PredRouteResult {
  success:          boolean
  message?:         string
  path_node_ids:    string[]
  segments:         PredRouteSegment[]
  total_distance_m: number
  total_time_s:     number
  geometry:         [number, number][]
  start_node_id:    string
  end_node_id:      string
}

export interface PredRouteSummary {
  total_distance_m: number
  total_time_s:     number
  geometry:         [number, number][]
}

export interface PredRouteDelta {
  distance_m:    number
  time_s:        number
  avoided_edges: string[]
  added_edges:   string[]
}

export interface PredRouteComparison {
  normal:    PredRouteSummary
  simulated: PredRouteSummary
  delta:     PredRouteDelta | null
}

export interface PredSimulationState {
  blocked_edges:  string[]
  traffic_edges:  Record<string, number>
  events:         Record<string, unknown>[]
  affected_edges: string[]
}

export interface PredActionResult {
  success: boolean
  message: string
  state?:  PredSimulationState
}

export interface PredAnalytics {
  total_roads:         number
  total_intersections: number
  blocked_roads:       number
  slow_roads:          number
  traffic_signals:     number
  active_events:       number
  average_speed_kph:   number
  network_coverage_km: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`[predictive/${path}] ${res.status}: ${err}`)
  }
  return res.json() as Promise<T>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) throw new Error(`[predictive] GET ${path}: ${res.status}`)
  return res.json() as Promise<T>
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const predictiveApi = {
  /** Check backend health */
  health: () =>
    get<{ online: boolean; graph_loaded?: boolean; node_count?: number; edge_count?: number }>('health'),

  /** Load OSM graph (e.g. 'gennevilliers') */
  loadGraph: (citySlug: string) =>
    post<{ success: boolean; message: string }>(`graph/load-${citySlug}`, {}),

  /** Calculate optimal route (with current simulation state) */
  calculateRoute: (start: PredLatLng, end: PredLatLng, weight_mode = 'travel_time') =>
    post<PredRouteResult>('route/calculate', { start, end, weight_mode }),

  /** Compare normal vs simulated route — returns before/after/delta */
  compareRoutes: (start: PredLatLng, end: PredLatLng, weight_mode = 'travel_time') =>
    post<PredRouteComparison>('route/compare', { start, end, weight_mode }),

  /** Block a road segment by edge_id */
  blockRoad: (edge_id: string) =>
    post<PredActionResult>('simulation/block-road', { edge_id }),

  /** Apply congestion level to a segment */
  addTraffic: (edge_id: string, level: PredTrafficLevel) =>
    post<PredActionResult>('simulation/add-traffic', { edge_id, level }),

  /** Create a localized event affecting all roads in radius */
  addEvent: (center: PredLatLng, event_type: PredEventType, radius_m = 300, label?: string) =>
    post<PredActionResult>('simulation/add-event', { center, event_type, radius_m, label }),

  /** Reset all simulation state */
  resetSimulation: () =>
    post<PredActionResult>('simulation/reset', {}),

  /** Network analytics */
  getAnalytics: () =>
    get<PredAnalytics>('simulation/analytics'),

  /** Get GeoJSON of edges (filter: 'all' | 'blocked' | 'slow') */
  getEdges: (filter: 'all' | 'blocked' | 'slow' = 'all') =>
    get<GeoJSON.FeatureCollection>(`graph/edges?status_filter=${filter}`),

  /** Get GeoJSON of ALL affected edges (slow OR blocked) */
  getAffectedEdges: () =>
    get<GeoJSON.FeatureCollection>('graph/export/edges-geojson'),


  /** Get GeoJSON of all nodes */
  getNodes: () =>
    get<GeoJSON.FeatureCollection>('graph/nodes'),

  /** Get GeoJSON of active simulation events */
  getEvents: () =>
    get<GeoJSON.FeatureCollection>('simulation/state'), // Assuming the backend returns GeoJSON for events here or similar
}


// ─── Scenario → event type mapping ───────────────────────────────────────────

import type { ScenarioType } from '@/types'

export function scenarioToEventType(type: ScenarioType): PredEventType {
  switch (type) {
    case 'road_closure':     return 'administrative'  // +600s, largest penalty
    case 'event':            return 'accident'         // +300s
    case 'traffic_light':    return 'works'            // +120s
    case 'bike_lane':        return 'works'            // +120s
    case 'speed_limit':      return 'demonstration'    // +180s
    case 'public_transport': return 'demonstration'    // +180s
    default:                 return 'works'
  }
}

/** Event radius in metres scaled by magnitude (0.3–2.0) */
export function scenarioRadius(type: ScenarioType, magnitude: number): number {
  const base: Record<ScenarioType, number> = {
    road_closure:     500,
    event:            300,
    traffic_light:    200,
    bike_lane:        150,
    speed_limit:      250,
    public_transport: 350,
  }
  return Math.round((base[type] ?? 250) * Math.max(0.5, magnitude))
}
