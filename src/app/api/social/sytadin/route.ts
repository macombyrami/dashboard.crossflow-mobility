import { NextResponse } from 'next/server'
import { fetchSytadinRaw } from '@/lib/api/sytadin'

interface SocialPost {
  id:       string
  type:     'alert' | 'congestion' | 'info'
  text:     string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  tags:     string[]
  km?:      number
}

interface FeedData {
  posts:     SocialPost[]
  fetchedAt: string
}

// ─── Parse a Sytadin title string into a structured post ──────────────────
function parseTitle(raw: string, index: number): SocialPost {
  const upper = raw.toUpperCase()

  // Severity detection
  let severity: SocialPost['severity'] = 'low'
  if (raw.startsWith('!FLASH') || upper.includes('ACCIDENT')) severity = 'critical'
  else if (raw.startsWith('FLASH'))                           severity = 'high'
  else if (upper.includes('ALERTE'))                          severity = 'medium'

  // Type detection
  let type: SocialPost['type'] = 'info'
  if (upper.includes('ACCIDENT') || raw.startsWith('!FLASH')) type = 'alert'
  else if (upper.includes('BOUCHON') || upper.includes('RALENTISSEMENT') || upper.includes('CONGESTION')) type = 'congestion'

  // Extract road / axis (e.g. A1, A86, BP, N118)
  const axisMatch = raw.match(/\/(A\d+|N\d+|D\d+|RN\d+|BP|B[0-9]|M\d+|ROCADE)\b/i)
  const axis      = axisMatch ? axisMatch[1].toUpperCase() : ''

  // Extract km from congestion figure (e.g. "18 km")
  const kmMatch = raw.match(/(\d+)\s*km/i)
  const km      = kmMatch ? parseInt(kmMatch[1], 10) : undefined

  // Build human-readable location from the title
  const cleaned = raw
    .replace(/^[!]?(FLASH|INFO|ALERTE)\/[A-Z0-9]+\s*/i, '')
    .replace(/^(Direction|Extérieur|Intérieur)\s+/i, '')
    .trim()

  // Tags
  const tags: string[] = []
  if (axis) tags.push(axis)
  if (type === 'congestion') tags.push('Trafic')
  if (type === 'alert')      tags.push('Incident')
  if (type === 'info')       tags.push('Info')
  if (km !== undefined)      tags.push(`${km}km`)

  const location = cleaned.split(/[,–\-]/)[0].trim() || `Île-de-France${axis ? ' · ' + axis : ''}`

  return {
    id:        `sytadin-${index}-${Date.now()}`,
    type,
    text:      cleaned || raw,
    location,
    severity,
    timestamp: new Date().toISOString(),
    tags,
    km,
  }
}

// ─── GET /api/social/sytadin ──────────────────────────────────────────────
export async function GET(): Promise<NextResponse> {
  try {
    // ─── DIRECT FETCH (No circular HTTP call to proxy) ──────────────────────
    const { html, degraded } = await fetchSytadinRaw('alerts')

    if (!html) throw new Error('Empty Sytadin response')

    // Extract <a title="..."> values
    const titleRegex = /title="([^"]+)"/g
    const posts: SocialPost[] = []
    let m: RegExpExecArray | null
    let i = 0

    while ((m = titleRegex.exec(html)) !== null) {
      const raw = (m[1] ?? '').trim()
      if (!raw || raw.length < 5) continue
      posts.push(parseTitle(raw, i++))
      if (posts.length >= 20) break
    }

    const feed: FeedData & { degraded: boolean } = {
      posts,
      fetchedAt: new Date().toISOString(),
      degraded,
    }

    return NextResponse.json(feed, {
      headers: {
        'Cache-Control':        'public, s-maxage=180, stale-while-revalidate=60',
        'X-Sytadin-Degraded':   degraded ? 'true' : 'false',
      },
    })
  } catch (err) {
    console.error('[social/sytadin] fetch error:', err)
    const fallback: FeedData & { degraded: boolean } = {
      posts: [
        parseTitle('INFO/A86 Extérieur Travaux à Nanterre (Flux de secours)', 0),
        parseTitle('FLASH/A1 Direction Paris Bouchon à Saint-Denis (Flux de secours)', 1),
        parseTitle('!FLASH/BP Extérieur Accident à Porte de Bagnolet (Flux de secours)', 2),
      ],
      fetchedAt: new Date().toISOString(),
      degraded:  true,
    }
    return NextResponse.json(fallback, {
      headers: {
        'Cache-Control':      'no-store',
        'X-Sytadin-Degraded': 'true',
      },
    })
  }
}
