import { NextRequest, NextResponse } from 'next/server'

const PARIS_BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets'

interface IncidentPost {
  id:          string
  title:       string
  type:        'accident' | 'travaux' | 'fermeture' | 'événement' | 'congestion' | 'incident'
  severity:    'low' | 'medium' | 'high' | 'critical'
  address:     string
  district?:   string
  lat:         number
  lng:         number
  startDate?:  string
  endDate?:    string
  source:      'paris-opendata' | 'here' | 'dirif'
  sourceLabel: string
}

async function fetchParisEvents(_lat: number, _lng: number): Promise<IncidentPost[]> {
  try {
    const [eventsRes, closuresRes] = await Promise.all([
      fetch(
        `${PARIS_BASE}/evenements-perturbants-en-cours/records?limit=30&order_by=date_debut+DESC`,
        {
          signal: AbortSignal.timeout(8_000),
          headers: { Accept: 'application/json' },
        },
      ).catch(() => null),
      fetch(
        `${PARIS_BASE}/voie-fermetures-temporaires-actives-dans-paris/records?limit=30`,
        {
          signal: AbortSignal.timeout(8_000),
          headers: { Accept: 'application/json' },
        },
      ).catch(() => null),
    ])

    const posts: IncidentPost[] = []

    if (eventsRes?.ok) {
      const data = await eventsRes.json()
      for (const r of (data.results ?? [])) {
        const geo = r.geo_point_2d
        if (!geo?.lat || !geo?.lon) continue
        const objType = (r.objet_perturbation ?? r.objet ?? '').toLowerCase()
        posts.push({
          id:          `pe-${r.id_arrondissement ?? ''}-${r.denominationprincipale ?? ''}-${posts.length}`,
          title:       r.denominationprincipale ?? r.objet_perturbation ?? 'Événement perturbant',
          type:        objType.includes('travaux')
            ? 'travaux'
            : objType.includes('manif') || objType.includes('tourn')
            ? 'événement'
            : 'fermeture',
          severity:    'medium',
          address:     r.denominationprincipale ?? r.complementsur ?? `Paris ${r.id_arrondissement ?? ''}`.trim(),
          district:    r.id_arrondissement ? `Paris ${r.id_arrondissement}` : undefined,
          lat:         geo.lat,
          lng:         geo.lon,
          startDate:   r.date_debut,
          endDate:     r.date_fin,
          source:      'paris-opendata',
          sourceLabel: 'Paris OpenData',
        })
      }
    }

    if (closuresRes?.ok) {
      const data = await closuresRes.json()
      for (const r of (data.results ?? [])) {
        const geo = r.geo_point_2d
        if (!geo?.lat || !geo?.lon) continue
        const typeLabel = (r.type_de_chantier_ou_evenement ?? r.type_chantier ?? '').toLowerCase()
        posts.push({
          id:          `pc-${r.id ?? r.gid ?? posts.length}`,
          title:       r.denomination_espace_vert ?? r.denominationprincipale ?? 'Fermeture temporaire',
          type:        typeLabel.includes('travaux') || typeLabel.includes('chantier')
            ? 'travaux'
            : 'fermeture',
          severity:    'medium',
          address:     r.denomination_espace_vert ?? r.adresse ?? 'Paris',
          district:    r.arrondissement ? `${r.arrondissement}e arr.` : undefined,
          lat:         geo.lat,
          lng:         geo.lon,
          startDate:   r.datedebutprev ?? r.date_debut,
          endDate:     r.datefinprev ?? r.date_fin,
          source:      'paris-opendata',
          sourceLabel: 'Paris OpenData',
        })
      }
    }

    return posts
  } catch {
    return []
  }
}

async function fetchHereIncidents(bbox: string): Promise<IncidentPost[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/here/incidents?bbox=${bbox}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return []
    const items = await res.json()
    if (!Array.isArray(items)) return []

    return items
      .slice(0, 25)
      .map((item: Record<string, unknown>, i: number): IncidentPost => {
        const loc        = (item.LOCATION as Record<string, unknown>)?.GEO_NODE as Record<string, string> ?? {}
        const desc       = (item.TRAFFIC_ITEM_DESCRIPTION as Record<string, string>[])?.[0] ?? {}
        const criticality = parseInt(
          ((item.CRITICALITY as Record<string, string>)?.ID ?? '1'),
          10,
        )
        const typeDesc   = (item.TRAFFIC_ITEM_TYPE_DESC as string) ?? ''
        const locBound   = (item.LOCATION as Record<string, unknown>)?.POLITICAL_BOUNDARY as Record<string, string[]> | undefined

        return {
          id:          `here-${(item.TRAFFIC_ITEM_ID as string) ?? i}`,
          title:       typeDesc || 'Incident',
          type:        typeDesc.toLowerCase().includes('work') ? 'travaux' : 'incident',
          severity:    criticality >= 3 ? 'critical' : criticality >= 2 ? 'high' : 'medium',
          address:     locBound?.NAME?.[0] ?? (desc as Record<string, string>).value ?? 'Voie',
          lat:         parseFloat(loc.LAT ?? '0'),
          lng:         parseFloat(loc.LON ?? '0'),
          startDate:   item.START_TIME as string | undefined,
          endDate:     item.END_TIME as string | undefined,
          source:      'here',
          sourceLabel: 'HERE Traffic',
        }
      })
      .filter(p => p.lat !== 0 && p.lng !== 0)
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  const sp  = req.nextUrl.searchParams
  const lat = parseFloat(sp.get('lat') ?? '48.866')
  const lng = parseFloat(sp.get('lng') ?? '2.333')

  // Build bbox ~15 km around city center
  const d    = 0.14
  const bbox = `${lng - d},${lat - d},${lng + d},${lat + d}`

  // Paris IDF area detection
  const isParisArea = lat > 48.5 && lat < 49.1 && lng > 1.9 && lng < 2.8

  const [parisData, hereData] = await Promise.all([
    isParisArea ? fetchParisEvents(lat, lng) : Promise.resolve([]),
    fetchHereIncidents(bbox),
  ])

  // Paris OpenData first (more granular), then HERE for extra coverage
  const all = [...parisData, ...hereData]

  // Deduplicate by approximate location (~300 m grid cell)
  const seen   = new Set<string>()
  const deduped = all.filter(p => {
    const key = `${Math.round(p.lat * 300)},${Math.round(p.lng * 300)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json(deduped.slice(0, 30), {
    headers: { 'Cache-Control': 'public, max-age=120, s-maxage=120' },
  })
}
