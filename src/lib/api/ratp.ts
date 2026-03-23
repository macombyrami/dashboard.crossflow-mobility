/**
 * RATP API — Trafic en temps réel
 * Source: https://api-ratp.pierre-grimaud.fr (API non officielle, gratuite)
 * + data.iledefrance-mobilites.fr (officielle, GTFS-RT)
 * Lignes: Métro, RER, Tramway, Bus, Noctilien
 */

const BASE = 'https://api-ratp.pierre-grimaud.fr/v4'

export type LineType = 'metros' | 'rers' | 'tramways' | 'buses' | 'noctiliens'

export interface TrafficLine {
  id:      string
  name:    string
  type:    LineType
  status:  'normal' | 'perturbé' | 'travaux' | 'interrompu' | 'inconnu'
  message: string
  slug:    string
  color?:  string
}

export interface TrafficMessage {
  message:  string
  severity: 'info' | 'warning' | 'critical'
}

const LINE_COLORS: Record<string, string> = {
  // Métro
  '1': '#FFCD00', '2': '#003CA6', '3': '#837902', '3b': '#6EC4E8',
  '4': '#CF009E', '5': '#FF7E2E', '6': '#6ECA97', '7': '#FA9ABA',
  '7b': '#6ECA97', '8': '#E19BDF', '9': '#B6BD00', '10': '#C9910A',
  '11': '#704B1C', '12': '#007852', '13': '#6EC4E8', '14': '#62259D',
  // RER
  'A': '#E2231A', 'B': '#47A0D5', 'C': '#FFCD00', 'D': '#00814F', 'E': '#C04191',
  // Tram
  'T1': '#E85D0E', 'T2': '#2E67B1', 'T3a': '#65AE30', 'T3b': '#65AE30',
  'T4': '#E2231A', 'T5': '#694394', 'T6': '#FF7F00', 'T7': '#AA57A7',
  'T8': '#E2231A', 'T9': '#00A1E0', 'T10': '#004B9B', 'T11': '#00A99D',
  'T12': '#E85D0E', 'T13': '#00A1E0',
}

export async function fetchAllTrafficStatus(): Promise<TrafficLine[]> {
  const types: LineType[] = ['metros', 'rers', 'tramways']
  const results: TrafficLine[] = []

  await Promise.allSettled(
    types.map(async (type) => {
      try {
        const res  = await fetch(`${BASE}/traffic/${type}`, {
          next: { revalidate: 60 },
          signal: AbortSignal.timeout(5000),
        })
        if (!res.ok) return
        const data = await res.json()
        const lines = data?.result?.metros ?? data?.result?.rers ??
                      data?.result?.tramways ?? data?.result?.buses ?? []

        for (const line of lines) {
          const slug     = line.line ?? line.slug ?? ''
          const status   = parseStatus(line.title ?? '')
          const message  = line.message ?? ''

          results.push({
            id:      `${type}-${slug}`,
            name:    formatLineName(type, slug),
            type,
            status,
            message: cleanMessage(message),
            slug,
            color:   LINE_COLORS[slug.toUpperCase()] ?? LINE_COLORS[slug] ?? '#8080A0',
          })
        }
      } catch {
        // Silently fail — API non officielle peut être instable
      }
    }),
  )

  return results.sort((a, b) => {
    const order = { interrompu: 0, perturbé: 1, travaux: 2, normal: 3, inconnu: 4 }
    return order[a.status] - order[b.status]
  })
}

export async function fetchLineDetails(type: LineType, line: string): Promise<TrafficMessage | null> {
  try {
    const res  = await fetch(`${BASE}/traffic/${type}/${line}`, {
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const info = data?.result?.[0]

    if (!info) return null
    return {
      message:  cleanMessage(info.message ?? ''),
      severity: parseStatus(info.title ?? '') === 'normal' ? 'info' :
                parseStatus(info.title ?? '') === 'interrompu' ? 'critical' : 'warning',
    }
  } catch {
    return null
  }
}

// ─── GTFS-RT via Île-de-France Mobilités (officiel) ──────────────────────
// Données en temps réel pour les arrêts
export interface NextPassage {
  lineId:      string
  destination: string
  waitMinutes: number | null
  realtime:    boolean
}

export async function fetchNextPassages(stationSlug: string, lineType: LineType): Promise<NextPassage[]> {
  try {
    const res = await fetch(
      `${BASE}/schedules/${lineType}/${stationSlug}/A+R`,
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(4000) },
    )
    if (!res.ok) return []
    const data = await res.json()
    const schedules = data?.result?.schedules ?? []

    return schedules.slice(0, 4).map((s: any) => ({
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
