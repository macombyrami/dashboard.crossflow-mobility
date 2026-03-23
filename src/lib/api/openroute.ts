/**
 * OpenRouteService API
 * GRATUIT · 2 000 req/jour · Inscription gratuite (sans CB)
 * https://openrouteservice.org
 *
 * Clé gratuite: openrouteservice.org/dev/#/login
 * Env: NEXT_PUBLIC_ORS_API_KEY
 *
 * Données:
 * - Isochrones (zones accessibles en N minutes)
 * - Routing réel avec durée + distance
 * - Matrix distance/durée entre plusieurs points
 * - Données d'élévation pour impact vélo
 */

const BASE = 'https://api.openrouteservice.org'

function getKey(): string {
  return process.env.NEXT_PUBLIC_ORS_API_KEY ?? ''
}

export function hasORSKey(): boolean {
  return Boolean(getKey())
}

export type ORSProfile = 'driving-car' | 'driving-hgv' | 'cycling-regular' | 'cycling-electric' | 'foot-walking' | 'foot-hiking'

export interface Isochrone {
  center:     [number, number]  // [lng, lat]
  ranges:     number[]          // minutes
  profile:    ORSProfile
  features:   GeoJSON.Feature[] // polygons
}

export interface RouteResult {
  durationSec:   number
  distanceM:     number
  steps:         RouteStep[]
  geometry:      [number, number][]  // LineString coords
  summary: {
    ascent:      number  // meters
    descent:     number
  }
}

export interface RouteStep {
  instruction: string
  distanceM:   number
  durationSec: number
  type:        number
}

// ─── Isochrones ──────────────────────────────────────────────────────────

export async function fetchIsochrone(
  lng: number,
  lat: number,
  rangesMin: number[] = [5, 10, 15],
  profile: ORSProfile = 'driving-car',
): Promise<Isochrone | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(
      `${BASE}/v2/isochrones/${profile}`,
      {
        method: 'POST',
        headers: {
          Authorization:  key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations:  [[lng, lat]],
          range:      rangesMin.map(m => m * 60),  // → seconds
          range_type: 'time',
          smoothing:  0.2,
          attributes: ['area', 'reachfactor'],
        }),
        signal: AbortSignal.timeout(8000),
        next:   { revalidate: 300 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()

    return {
      center:   [lng, lat],
      ranges:   rangesMin,
      profile,
      features: data.features ?? [],
    }
  } catch {
    return null
  }
}

// ─── Route entre deux points ──────────────────────────────────────────────

export async function fetchRoute(
  from: [number, number],  // [lng, lat]
  to:   [number, number],
  profile: ORSProfile = 'driving-car',
): Promise<RouteResult | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(
      `${BASE}/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          Authorization:  key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates:  [from, to],
          instructions: true,
          elevation:    true,
          extra_info:   ['waytype', 'surface'],
        }),
        signal: AbortSignal.timeout(8000),
        next:   { revalidate: 120 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()

    const route    = data.features?.[0]
    if (!route) return null
    const summary  = route.properties?.summary ?? {}
    const segments = route.properties?.segments?.[0] ?? {}

    return {
      durationSec: Math.round(summary.duration ?? 0),
      distanceM:   Math.round(summary.distance ?? 0),
      steps: (segments.steps ?? []).map((s: any): RouteStep => ({
        instruction: s.instruction ?? '',
        distanceM:   Math.round(s.distance ?? 0),
        durationSec: Math.round(s.duration ?? 0),
        type:        s.type ?? 0,
      })),
      geometry: route.geometry?.coordinates ?? [],
      summary: {
        ascent:  Math.round(route.properties?.ascent  ?? 0),
        descent: Math.round(route.properties?.descent ?? 0),
      },
    }
  } catch {
    return null
  }
}

// ─── Matrix O/D (durée entre plusieurs points) ────────────────────────────

export interface MatrixResult {
  durations: number[][]  // seconds [origin][dest]
  distances: number[][]  // meters
}

export async function fetchMatrix(
  locations: [number, number][],  // [lng, lat][]
  profile: ORSProfile = 'driving-car',
): Promise<MatrixResult | null> {
  const key = getKey()
  if (!key) return null
  if (locations.length < 2 || locations.length > 50) return null

  try {
    const res = await fetch(
      `${BASE}/v2/matrix/${profile}`,
      {
        method: 'POST',
        headers: {
          Authorization:  key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations,
          metrics:  ['duration', 'distance'],
          resolve_locations: false,
        }),
        signal: AbortSignal.timeout(10000),
        next:   { revalidate: 300 },
      },
    )
    if (!res.ok) return null
    const data = await res.json()

    return {
      durations: data.durations ?? [],
      distances: data.distances ?? [],
    }
  } catch {
    return null
  }
}

// ─── Elevation profile ────────────────────────────────────────────────────

export interface ElevationPoint {
  lng:       number
  lat:       number
  elevation: number  // meters
}

export async function fetchElevation(
  coords: [number, number][],  // [lng, lat][]
): Promise<ElevationPoint[]> {
  const key = getKey()
  if (!key) return []

  try {
    const res = await fetch(
      `${BASE}/elevation/line`,
      {
        method: 'POST',
        headers: {
          Authorization:  key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format_in:  'geojson',
          geometry:   { coordinates: coords, type: 'LineString' },
          format_out: 'geojson',
        }),
        signal: AbortSignal.timeout(6000),
        next:   { revalidate: 86400 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.geometry?.coordinates ?? []).map(([lng, lat, elev]: number[]) => ({
      lng, lat, elevation: elev,
    }))
  } catch {
    return []
  }
}
