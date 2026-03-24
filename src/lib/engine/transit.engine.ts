/**
 * Transit vehicle simulation engine
 * Interpolates vehicle positions along real OSM route geometries.
 * Updates every 10 seconds — vehicles "move" along their route.
 */

import type { OSMRouteGeometry } from '@/lib/api/overpass'

export interface TransitVehicle {
  id:        string
  routeId:   number
  routeType: string          // subway | tram | bus | train | ferry
  routeRef:  string          // line number label
  routeName: string
  color:     string
  lat:       number
  lng:       number
  bearing:   number          // 0-360 degrees
  speedKmh:  number
}

// ─── Speeds (km/h) by route type ──────────────────────────────────────────

const ROUTE_SPEED: Record<string, number> = {
  subway:   45,
  train:    80,
  tram:     22,
  bus:      18,
  monorail: 40,
  ferry:    30,
}

// ─── Vehicle counts by route type + time of day ───────────────────────────

function vehicleCount(routeType: string, hour: number): number {
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19)
  const base: Record<string, number> = { subway: 6, train: 3, tram: 5, bus: 4, monorail: 4, ferry: 2 }
  const b = base[routeType] ?? 3
  return isRush ? b + 3 : b
}

// ─── Route geometry helpers ───────────────────────────────────────────────

/** Great-circle distance in meters between two [lng, lat] points */
function geoDistM(a: [number, number], b: [number, number]): number {
  const R  = 6_371_000
  const φ1 = a[1] * Math.PI / 180
  const φ2 = b[1] * Math.PI / 180
  const Δφ = (b[1] - a[1]) * Math.PI / 180
  const Δλ = (b[0] - a[0]) * Math.PI / 180
  const s  = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

/** Total route length in meters */
function routeLength(coords: [number, number][]): number {
  let len = 0
  for (let i = 1; i < coords.length; i++) len += geoDistM(coords[i - 1], coords[i])
  return Math.max(len, 1)
}

/** Bearing in degrees from point a to point b */
function bearing(a: [number, number], b: [number, number]): number {
  const φ1 = a[1] * Math.PI / 180
  const φ2 = b[1] * Math.PI / 180
  const Δλ = (b[0] - a[0]) * Math.PI / 180
  const y  = Math.sin(Δλ) * Math.cos(φ2)
  const x  = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360
}

/**
 * Interpolate position along a route at fraction t ∈ [0, 1].
 * Returns { lat, lng, bearing }.
 */
function positionAt(
  coords: [number, number][],
  totalLen: number,
  t: number,
): { lat: number; lng: number; bearing: number } {
  const target = ((t % 1) + 1) % 1   // wrap to [0,1]
  let dist = target * totalLen
  for (let i = 1; i < coords.length; i++) {
    const seg = geoDistM(coords[i - 1], coords[i])
    if (dist <= seg || i === coords.length - 1) {
      const frac = seg > 0 ? Math.min(1, dist / seg) : 0
      const lng  = coords[i - 1][0] + frac * (coords[i][0] - coords[i - 1][0])
      const lat  = coords[i - 1][1] + frac * (coords[i][1] - coords[i - 1][1])
      return { lat, lng, bearing: bearing(coords[i - 1], coords[i]) }
    }
    dist -= seg
  }
  return { lat: coords[0][1], lng: coords[0][0], bearing: 0 }
}

// ─── Main simulation function ─────────────────────────────────────────────

/**
 * Returns current vehicle positions for all routes.
 * nowMs is used to advance positions deterministically — same input → same output.
 */
export function simulateTransitVehicles(
  routes: OSMRouteGeometry[],
  nowMs: number = Date.now(),
): TransitVehicle[] {
  const hour    = new Date(nowMs).getHours()
  // 10-second tick counter — vehicles move one step per tick
  const tick    = Math.floor(nowMs / 10_000)
  const results: TransitVehicle[] = []

  for (const route of routes) {
    if (route.coords.length < 4) continue
    const speed    = ROUTE_SPEED[route.route] ?? 20   // km/h
    const totalLen = routeLength(route.coords)           // meters
    const count    = vehicleCount(route.route, hour)

    // Distance a vehicle travels in one 10s tick (meters)
    const stepM    = (speed * 1000 / 3600) * 10

    for (let i = 0; i < count; i++) {
      // Each vehicle starts at a deterministic offset evenly spread on the route
      // Use a seeded hash based on route.id + vehicle index so it doesn't drift between renders
      const baseOffset = ((route.id * 997 + i * 137) % 10000) / 10000
      const traveled   = (tick * stepM) % totalLen
      const t          = (baseOffset + traveled / totalLen) % 1

      const pos = positionAt(route.coords, totalLen, t)

      results.push({
        id:        `${route.id}-v${i}`,
        routeId:   route.id,
        routeType: route.route,
        routeRef:  route.ref,
        routeName: route.name,
        color:     route.colour,
        lat:       pos.lat,
        lng:       pos.lng,
        bearing:   pos.bearing,
        speedKmh:  speed,
      })
    }
  }

  return results
}
