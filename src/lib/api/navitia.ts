/**
 * Navitia API — Transport multimodal
 * Gratuit avec inscription · Pas de CB
 * https://www.navitia.io — Obtenir une clé: navitia.io/register
 *
 * Couvre: France entière, Europe (30+ pays)
 * Données: horaires, perturbations, itinéraires, arrêts
 */

const BASE = 'https://api.navitia.io/v1'

function getKey(): string {
  return process.env.NEXT_PUBLIC_NAVITIA_API_KEY ?? ''
}

export function hasKey(): boolean {
  return Boolean(getKey())
}

export interface NavitiaDisruption {
  id:          string
  status:      'active' | 'future' | 'past'
  severity:    { name: string; effect: string; color: string; priority: number }
  title:       string
  message:     string
  lines:       { id: string; name: string; code: string; color: string; mode: string }[]
  startDate:   string
  endDate:     string
  updatedAt:   string
}

export interface NavitiaLine {
  id:      string
  name:    string
  code:    string
  color:   string
  mode:    string
  network: string
}

export interface NavitiaDeparture {
  line:          NavitiaLine
  stopName:      string
  direction:     string
  departureTime: string
  realtime:      boolean
  delay:         number // seconds
}

// ─── Region detection ──────────────────────────────────────────────────────

function getCoverageForCoords(lat: number, lng: number): string {
  // France
  if (lat > 41 && lat < 52 && lng > -6 && lng < 10)  return 'fr-idf'
  // Île-de-France specifically
  if (lat > 48.1 && lat < 49.3 && lng > 1.4 && lng < 3.6) return 'fr-idf'
  // UK
  if (lat > 49 && lat < 61 && lng > -8 && lng < 2)   return 'gb-london'
  // Default Europe
  return 'fr-idf'
}

// ─── Disruptions in area ───────────────────────────────────────────────────

export async function fetchDisruptions(
  lat: number,
  lng: number,
  radiusM = 5000,
): Promise<NavitiaDisruption[]> {
  const key = getKey()
  if (!key) return []

  const coverage = getCoverageForCoords(lat, lng)
  try {
    const res = await fetch(
      `${BASE}/coverage/${coverage}/disruptions?count=50&since=${new Date().toISOString()}`,
      {
        headers: { Authorization: key },
        signal:  AbortSignal.timeout(6000),
        next:    { revalidate: 60 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.disruptions ?? [])
      .filter((d: any) => d.status === 'active')
      .map((d: any): NavitiaDisruption => ({
        id:       d.id,
        status:   d.status,
        severity: {
          name:     d.severity?.name ?? 'Inconnu',
          effect:   d.severity?.effect ?? '',
          color:    `#${d.severity?.color ?? 'FF6D00'}`,
          priority: d.severity?.priority ?? 5,
        },
        title:    d.messages?.[0]?.text ?? 'Perturbation',
        message:  d.messages?.[1]?.text ?? d.messages?.[0]?.text ?? '',
        lines:    (d.impacted_objects ?? [])
          .filter((o: any) => o.pt_object?.embedded_type === 'line')
          .map((o: any) => ({
            id:    o.pt_object.id,
            name:  o.pt_object.line?.name ?? '',
            code:  o.pt_object.line?.code ?? '',
            color: `#${o.pt_object.line?.color ?? '8080A0'}`,
            mode:  o.pt_object.line?.physical_modes?.[0]?.name ?? '',
          })),
        startDate: d.application_periods?.[0]?.begin ?? '',
        endDate:   d.application_periods?.[0]?.end   ?? '',
        updatedAt: d.updated_at ?? '',
      }))
      .slice(0, 20)
  } catch {
    return []
  }
}

// ─── Next departures from nearest stop ────────────────────────────────────

export async function fetchNextDepartures(
  lat: number,
  lng: number,
): Promise<NavitiaDeparture[]> {
  const key = getKey()
  if (!key) return []

  const coverage = getCoverageForCoords(lat, lng)
  try {
    const res = await fetch(
      `${BASE}/coverage/${coverage}/coords/${lng};${lat}/departures?count=10&duration=3600`,
      {
        headers: { Authorization: key },
        signal:  AbortSignal.timeout(6000),
        next:    { revalidate: 30 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.departures ?? []).map((d: any): NavitiaDeparture => {
      const route   = d.route ?? {}
      const line    = route.line ?? {}
      const display = d.display_informations ?? {}
      const st      = d.stop_date_time ?? {}

      const baseTime = st.base_departure_date_time ?? ''
      const realTime = st.departure_date_time ?? ''
      const delay    = parseTimeDiff(baseTime, realTime)

      return {
        line: {
          id:      line.id ?? '',
          name:    display.headsign ?? line.name ?? '',
          code:    display.label ?? line.code ?? '',
          color:   `#${display.color ?? line.color ?? '8080A0'}`,
          mode:    display.physical_mode ?? '',
          network: display.network ?? '',
        },
        stopName:      d.stop_point?.name ?? '',
        direction:     display.direction ?? '',
        departureTime: formatNavitiaTime(realTime),
        realtime:      st.data_freshness === 'realtime',
        delay,
      }
    })
  } catch {
    return []
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatNavitiaTime(navitiaDate: string): string {
  // Format: 20240323T143000 → 14:30
  if (!navitiaDate || navitiaDate.length < 15) return '--:--'
  const h = navitiaDate.slice(9, 11)
  const m = navitiaDate.slice(11, 13)
  return `${h}:${m}`
}

function parseTimeDiff(base: string, real: string): number {
  if (!base || !real) return 0
  const parse = (s: string) =>
    parseInt(s.slice(9, 11)) * 3600 + parseInt(s.slice(11, 13)) * 60 + parseInt(s.slice(13, 15))
  return parse(real) - parse(base)
}
