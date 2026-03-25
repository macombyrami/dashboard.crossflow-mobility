/**
 * RATP API — Trafic en temps réel
 * Proxy: /api/ratp-traffic (server-side, évite CORS)
 *   - Source 1: api-ratp.pierre-grimaud.fr (non-officielle, aucune clé)
 *   - Source 2: prim.iledefrance-mobilites.fr (officielle, IDFM_API_KEY)
 */

export type LineType = 'metros' | 'rers' | 'tramways' | 'buses' | 'noctiliens'

export interface TrafficLine {
  id:      string
  name:    string
  type:    LineType
  status:  'normal' | 'perturbé' | 'travaux' | 'interrompu' | 'inconnu'
  message: string
  slug:    string
  color?:  string
  source?: string
}

export interface TrafficMessage {
  message:  string
  severity: 'info' | 'warning' | 'critical'
}

const LINE_COLORS: Record<string, string> = {
  // Métro
  '1': '#FFCD00', '2': '#003CA6', '3': '#837902', '3B': '#6EC4E8',
  '4': '#CF009E', '5': '#FF7E2E', '6': '#6ECA97', '7': '#FA9ABA',
  '7B': '#6ECA97', '8': '#E19BDF', '9': '#B6BD00', '10': '#C9910A',
  '11': '#704B1C', '12': '#007852', '13': '#6EC4E8', '14': '#62259D',
  '15': '#B90845', '16': '#F3A002', '17': '#D5C900', '18': '#00A88F',
  // RER
  'A': '#E2231A', 'B': '#47A0D5', 'C': '#FFCD00', 'D': '#00814F', 'E': '#C04191',
  // Tram
  'T1': '#E85D0E', 'T2': '#2E67B1', 'T3A': '#65AE30', 'T3B': '#65AE30',
  'T4': '#E2231A', 'T5': '#694394', 'T6': '#FF7F00', 'T7': '#AA57A7',
  'T8': '#E2231A', 'T9': '#00A1E0', 'T10': '#004B9B', 'T11': '#00A99D',
  'T12': '#E85D0E', 'T13': '#00A1E0',
}

export async function fetchAllTrafficStatus(): Promise<TrafficLine[]> {
  try {
    // Appel vers notre proxy Next.js (server-side) — pas de CORS
    const res = await fetch('/api/ratp-traffic', {
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`)

    const data = await res.json()
    const raw: { slug: string; type: LineType; title: string; message: string; source?: string }[] =
      data?.lines ?? []

    return raw
      .map(l => {
        const slug   = (l.slug ?? '').toUpperCase()
        const status = parseStatus(l.title ?? '')
        return {
          id:      `${l.type}-${slug}`,
          name:    formatLineName(l.type, slug),
          type:    l.type,
          status,
          message: cleanMessage(l.message ?? ''),
          slug,
          color:   LINE_COLORS[slug] ?? '#8080A0',
          source:  l.source,
        }
      })
      .sort((a, b) => {
        const order: Record<string, number> = { interrompu: 0, perturbé: 1, travaux: 2, normal: 3, inconnu: 4 }
        return (order[a.status] ?? 4) - (order[b.status] ?? 4)
      })
  } catch {
    return []
  }
}

export async function fetchLineDetails(type: LineType, line: string): Promise<TrafficMessage | null> {
  try {
    // Via proxy server-side pour éviter CORS
    const res = await fetch(`/api/ratp-traffic?type=${type}&line=${line}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const found = (data?.lines ?? []).find((l: { slug: string }) =>
      l.slug.toLowerCase() === line.toLowerCase(),
    )
    if (!found) return null
    return {
      message:  cleanMessage(found.message ?? ''),
      severity: parseStatus(found.title ?? '') === 'normal' ? 'info' :
                parseStatus(found.title ?? '') === 'interrompu' ? 'critical' : 'warning',
    }
  } catch {
    return null
  }
}

// ─── Prochains passages via Pierre Grimaud (proxy) ────────────────────────
export interface NextPassage {
  lineId:      string
  destination: string
  waitMinutes: number | null
  realtime:    boolean
}

export async function fetchNextPassages(stationSlug: string, lineType: LineType): Promise<NextPassage[]> {
  try {
    const res = await fetch(
      `/api/ratp-schedules?type=${lineType}&station=${encodeURIComponent(stationSlug)}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data?.schedules ?? []).slice(0, 4).map((s: { destination?: string; message?: string }) => ({
      lineId:      stationSlug.split('/')[0] ?? '',
      destination: s.destination ?? '',
      waitMinutes: parseWaitTime(s.message ?? ''),
      realtime:    s.message?.toLowerCase().includes('mn') ?? false,
    }))
  } catch {
    return []
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseStatus(title: string): TrafficLine['status'] {
  const t = title.toLowerCase()
  if (t.includes('normal') || t.includes('trafic normal'))           return 'normal'
  if (t.includes('interrompu') || t.includes('suspendu'))            return 'interrompu'
  if (t.includes('travaux'))                                         return 'travaux'
  if (t.includes('perturbé') || t.includes('ralenti') || t.includes('incident')) return 'perturbé'
  if (t.includes('info'))                                            return 'perturbé'
  return 'inconnu'
}

function cleanMessage(msg: string): string {
  return msg
    .replace(/<[^>]+>/g, '')           // strip HTML tags
    .replace(/&[a-z]+;/g, ' ')        // HTML entities
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200)
}

function formatLineName(type: LineType, slug: string): string {
  const prefix: Record<LineType, string> = {
    metros:     'Métro',
    rers:       'RER',
    tramways:   'Tram',
    buses:      'Bus',
    noctiliens: 'Noctilien',
  }
  return `${prefix[type]} ${slug.toUpperCase()}`
}

function parseWaitTime(message: string): number | null {
  const match = message.match(/(\d+)\s*mn/)
  return match ? parseInt(match[1]) : null
}
