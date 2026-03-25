/**
 * HERE Traffic API
 * Gratuit: 250 000 transactions/mois · Pas de CB
 * https://developer.here.com
 *
 * Données: flux trafic, incidents, routing, ETAs
 * Complément idéal à TomTom (couverture 80+ pays)
 */

import { hereFlowLimiter, hereIncidentsLimiter } from '@/lib/utils/rateLimiter'

export function hasKey(): boolean {
  return process.env.NEXT_PUBLIC_HERE_ENABLED === 'true'
}

export interface HereFlowSegment {
  id:            string
  speed:         number   // km/h
  speedUncapped: number   // km/h free flow
  freeFlow:      number   // km/h
  jamFactor:     number   // 0-10 (10 = standstill)
  confidence:    number   // 0-1
  traversability:'open' | 'closed' | 'unknown'
  coords:        [number, number][]
}

export interface HereIncident {
  incidentId:  string
  type:        string
  criticality: 'minor' | 'major' | 'critical'
  description: string
  startTime:   string
  endTime?:    string
  location: {
    description: string
    lat:         number
    lng:         number
  }
  onOppositeDirection: boolean
  length?:     number
}

// ─── Traffic flow in bbox ─────────────────────────────────────────────────

export async function fetchHereFlow(
  bbox: [number, number, number, number],
): Promise<HereFlowSegment[]> {
  if (!hasKey()) return []

  await hereFlowLimiter.acquire()
  const [west, south, east, north] = bbox
  try {
    const res = await fetch(
      `/api/here/flow?bbox=${west},${south},${east},${north}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return []
    const results = await res.json()

    return (results ?? []).map((r: any): HereFlowSegment => {
      const loc   = r.location ?? {}
      const flow  = r.currentFlow ?? {}
      const shape = loc.shape?.links?.flatMap((l: any) =>
        (l.points ?? []).map((p: any): [number, number] => [p.lng, p.lat])
      ) ?? []

      return {
        id:            r.id ?? Math.random().toString(36).slice(2),
        speed:         flow.speed ?? 0,
        speedUncapped: flow.speedUncapped ?? 0,
        freeFlow:      flow.freeFlow ?? 0,
        jamFactor:     flow.jamFactor ?? 0,
        confidence:    flow.confidence ?? 0,
        traversability: loc.traversability ?? 'open',
        coords:        shape,
      }
    })
  } catch {
    return []
  }
}

// ─── Incidents in bbox ────────────────────────────────────────────────────

export async function fetchHereIncidents(
  bbox: [number, number, number, number],
): Promise<HereIncident[]> {
  if (!hasKey()) return []

  await hereIncidentsLimiter.acquire()
  const [west, south, east, north] = bbox
  try {
    const res = await fetch(
      `/api/here/incidents?bbox=${west},${south},${east},${north}`,
      { signal: AbortSignal.timeout(8000) },
    )
    if (!res.ok) return []
    const items = await res.json()

    return (Array.isArray(items) ? items : [items]).map((item: any): HereIncident => {
      const loc  = item.LOCATION?.GEO_NODE ?? {}
      const info = item.TRAFFIC_ITEM_DESCRIPTION?.[0] ?? {}

      return {
        incidentId:  item.TRAFFIC_ITEM_ID?.toString() ?? '',
        type:        item.TRAFFIC_ITEM_TYPE_DESC ?? 'Incident',
        criticality: mapCriticality(item.CRITICALITY?.ID),
        description: info.value ?? 'Incident signalé',
        startTime:   item.START_TIME ?? new Date().toISOString(),
        endTime:     item.END_TIME,
        location: {
          description: item.LOCATION?.POLITICAL_BOUNDARY?.NAME?.[0] ?? '',
          lat:         parseFloat(loc.LAT ?? '0'),
          lng:         parseFloat(loc.LON ?? '0'),
        },
        onOppositeDirection: Boolean(item.OPPOSITE_DIRECTION),
        length:      item.TRAFFIC_ITEM_DETAIL?.LENGTH,
      }
    })
  } catch {
    return []
  }
}

// Jam factor → congestion score (0-1)
export function jamFactorToCongestion(jamFactor: number): number {
  return Math.min(1, jamFactor / 10)
}

function mapCriticality(id?: string): HereIncident['criticality'] {
  const n = parseInt(id ?? '0')
  if (n >= 3) return 'critical'
  if (n >= 2) return 'major'
  return 'minor'
}
