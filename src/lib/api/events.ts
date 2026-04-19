/**
 * Événements urbains — impact trafic
 * Sources:
 *   - Que faire à Paris (opendata.paris.fr) — GRATUIT · Aucune clé
 *   - OpenAgenda IDF (openagenda.com/api)   — GRATUIT · Aucune clé
 *   - PredictHQ (predicthq.com)             — GRATUIT 100 req/jour avec clé
 *   - Ticketmaster Discovery API            — GRATUIT avec clé (TICKETMASTER_API_KEY server-side)
 *
 * Impact: concerts, matchs, manifs, congrès → pics de trafic localisés
 */

const PARIS_EVENTS_BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records'
const OPENAGENDA_BASE   = 'https://api.openagenda.com/v2/events'

export function hasPredictHQKey(): boolean {
  return process.env.NEXT_PUBLIC_PREDICTHQ_ENABLED === 'true'
}

function hasTicketmasterKey(): boolean {
  return process.env.NEXT_PUBLIC_TICKETMASTER_ENABLED === 'true'
}

export interface UrbanEvent {
  id:              string
  title:           string
  category:        'concert' | 'sport' | 'manifestation' | 'exposition' | 'marché' | 'congrès' | 'festival' | 'autre'
  startDate:       string
  endDate:         string
  location:        { lat: number; lng: number; address: string; district?: string }
  attendance:      number
  radius:          number
  trafficScore:    number
  impactLabel?:    string
  trafficIncrease?: number
  venue?:          string
  ticketUrl?:      string
  distanceKm?:     number
  proximityScore?: number
  source:          'paris-opendata' | 'predicthq' | 'crossflow-engine' | 'openagenda' | 'ticketmaster'
}

// ─── Paris Open Data ──────────────────────────────────────────────────────

export async function fetchParisEvents(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<UrbanEvent[]> {
  try {
    const today   = new Date().toISOString().slice(0, 10)
    const in3days = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)

    const params = new URLSearchParams({
      where:    `date_start >= "${today}" AND date_start <= "${in3days}T23:59:59"`,
      limit:    '40',
      order_by: 'date_start',
    })

    const res = await fetch(`${PARIS_EVENTS_BASE}?${params}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? [])
      .filter((e: any) => e.lat_lon_latlon)
      .map((e: any): UrbanEvent => {
        const [elat, elng] = (e.lat_lon_latlon ?? '0,0').split(',').map(Number)
        const cat  = mapParisCategory(e.category ?? '', e.title ?? '')
        const dist = haversine(lat, lng, elat, elng) / 1000
        return {
          id:          e.id?.toString() ?? Math.random().toString(36).slice(2),
          title:       e.title ?? 'Événement',
          category:    cat,
          startDate:   e.date_start ?? today,
          endDate:     e.date_end   ?? today,
          location: {
            lat:      elat,
            lng:      elng,
            address:  e.address_name ?? e.address_zipcode ?? 'Paris',
            district: e.address_zipcode,
          },
          venue:        e.address_name,
          attendance:   estimateAttendance(cat, e.price_type),
          radius:       categoryRadius(cat),
          trafficScore: categoryTrafficScore(cat),
          distanceKm:   Math.round(dist * 10) / 10,
          source:       'paris-opendata',
        }
      })
      .filter((e: UrbanEvent) => {
        const dist = haversine(lat, lng, e.location.lat, e.location.lng)
        return dist <= radiusKm * 1000
      })
  } catch {
    return []
  }
}

// ─── OpenAgenda IDF (free, no key) ────────────────────────────────────────

export async function fetchOpenAgendaIDF(
  lat: number,
  lng: number,
  radiusKm = 15,
): Promise<UrbanEvent[]> {
  try {
    const today   = new Date().toISOString().slice(0, 10)
    const in7days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    const params = new URLSearchParams({
      size:                   '30',
      'timings[gte]':         `${today}T00:00:00`,
      'timings[lte]':         `${in7days}T23:59:59`,
      'location[radius]':     `${radiusKm}km`,
      'location[latitude]':   lat.toString(),
      'location[longitude]':  lng.toString(),
      sort:                   'timings.asc',
      detailed:               '1',
    })

    const res = await fetch(`${OPENAGENDA_BASE}?${params}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    const data = await res.json()

    return ((data.events ?? []) as any[])
      .map((e: any): UrbanEvent | null => {
        const elat = e.location?.latitude
        const elng = e.location?.longitude
        if (!elat || !elng) return null
        const title = e.title?.fr ?? e.title?.en ?? 'Événement'
        const cat   = mapOpenAgendaCategory(e.keywords ?? [], title)
        const dist  = haversine(lat, lng, elat, elng) / 1000
        const timing = e.timings?.[0]
        return {
          id:           `oa-${e.uid}`,
          title,
          category:     cat,
          startDate:    timing?.begin ?? `${today}T00:00:00`,
          endDate:      timing?.end   ?? `${today}T23:59:59`,
          location: {
            lat:      elat,
            lng:      elng,
            address:  e.location?.address ?? e.location?.city ?? 'Île-de-France',
            district: e.location?.postalCode,
          },
          venue:        e.location?.name,
          attendance:   estimateAttendance(cat, null),
          radius:       categoryRadius(cat),
          trafficScore: categoryTrafficScore(cat),
          distanceKm:   Math.round(dist * 10) / 10,
          source:       'openagenda',
        }
      })
      .filter(Boolean) as UrbanEvent[]
  } catch {
    return []
  }
}

// ─── Ticketmaster Discovery (optional free key) ───────────────────────────

export async function fetchTicketmasterEvents(
  lat: number,
  lng: number,
  radiusKm = 15,
): Promise<UrbanEvent[]> {
  if (!hasTicketmasterKey()) return []

  try {
    const res = await fetch(`/api/events/ticketmaster?lat=${lat}&lng=${lng}&radius=${radiusKm}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const raw = await res.json()

    return (raw ?? []).map((e: any): UrbanEvent => {
      const venue = e._embedded?.venues?.[0]
      const elat  = parseFloat(venue?.location?.latitude  ?? lat)
      const elng  = parseFloat(venue?.location?.longitude ?? lng)
      const cat   = mapTicketmasterCategory(e.classifications?.[0]?.segment?.name ?? '')
      const dist  = haversine(lat, lng, elat, elng) / 1000
      return {
        id:        `tm-${e.id}`,
        title:     e.name,
        category:  cat,
        startDate: e.dates?.start?.dateTime ?? e.dates?.start?.localDate ?? new Date().toISOString(),
        endDate:   e.dates?.end?.dateTime   ?? e.dates?.start?.dateTime  ?? new Date().toISOString(),
        location: {
          lat: elat, lng: elng,
          address:  venue ? `${venue.name}, ${venue.city?.name}` : 'France',
          district: venue?.postalCode,
        },
        venue:        venue?.name,
        ticketUrl:    e.url,
        attendance:   estimateAttendance(cat, null),
        radius:       categoryRadius(cat),
        trafficScore: categoryTrafficScore(cat),
        distanceKm:   Math.round(dist * 10) / 10,
        source:       'ticketmaster',
      }
    })
  } catch {
    return []
  }
}

// ─── PredictHQ (worldwide, free key) ─────────────────────────────────────

export async function fetchPredictHQEvents(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<UrbanEvent[]> {
  if (!hasPredictHQKey()) return []

  try {
    const res = await fetch(`/api/events/predicthq?lat=${lat}&lng=${lng}&radius=${radiusKm}`, {
      signal: AbortSignal.timeout(8_000),
    })
    if (!res.ok) return []
    const results = await res.json()

    return (results ?? []).map((e: any): UrbanEvent => {
      const [elng, elat] = e.location ?? [lng, lat]
      const cat  = mapPHQCategory(e.category)
      const dist = haversine(lat, lng, elat, elng) / 1000
      return {
        id:           e.id,
        title:        e.title,
        category:     cat,
        startDate:    e.start,
        endDate:      e.end ?? e.start,
        location: {
          lat:     elat,
          lng:     elng,
          address: e.entities?.[0]?.formatted_address ?? '',
        },
        attendance:   e.phq_attendance ?? estimateAttendance(cat, null),
        radius:       Math.max(categoryRadius(cat), (e.phq_attendance ?? 0) > 10000 ? 1500 : 800),
        trafficScore: Math.min(1, (e.rank ?? 50) / 100),
        distanceKm:   Math.round(dist * 10) / 10,
        source:       'predicthq',
      }
    })
  } catch {
    return []
  }
}

// ─── Aggregated fetch ─────────────────────────────────────────────────────

export async function fetchNearbyEvents(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<UrbanEvent[]> {
  const isParisArea = lat > 48.5 && lat < 49.1 && lng > 2.0 && lng < 2.7

  const [parisEvents, openAgendaEvents, phqEvents, tmEvents] = await Promise.all([
    isParisArea ? fetchParisEvents(lat, lng, radiusKm) : Promise.resolve([]),
    fetchOpenAgendaIDF(lat, lng, radiusKm),
    fetchPredictHQEvents(lat, lng, radiusKm),
    fetchTicketmasterEvents(lat, lng, radiusKm),
  ])

  // Merge all sources, highest-quality first
  const all = [...phqEvents, ...tmEvents, ...parisEvents, ...openAgendaEvents]

  // Deduplicate by proximity grid cell (300m) + same day
  const seen = new Set<string>()
  const deduped = all.filter(e => {
    const key = `${Math.round(e.location.lat * 1000)},${Math.round(e.location.lng * 1000)},${e.startDate.slice(0, 10)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  // Enrich with proximity score + labels
  return deduped.map(e => ({
    ...e,
    proximityScore:  computeProximityScore(e, lat, lng),
    impactLabel:     e.trafficScore > 0.6 ? 'Impact fort' :
                     e.trafficScore > 0.3 ? 'Impact modéré' : 'Impact léger',
    trafficIncrease: e.trafficIncrease ?? Math.round(e.trafficScore * 100),
  }))
}

/**
 * Compute aggregate traffic impact factor from events
 */
export function eventsToTrafficFactor(
  events: UrbanEvent[],
  lat: number,
  lng: number,
): { factor: number; topEvents: string[] } {
  let factor = 1.0
  const topEvents: string[] = []
  const now = new Date()

  for (const e of events) {
    const start = new Date(e.startDate)
    const end   = new Date(e.endDate)
    if (now < start || now > end) continue

    const dist          = haversine(lat, lng, e.location.lat, e.location.lng)
    const proximity     = Math.max(0, 1 - dist / (e.radius * 3))
    const attendBoost   = Math.max(1, 1 + (e.attendance / 50000))
    const impact        = e.trafficScore * proximity * attendBoost

    if (impact > 0.05) {
      factor += impact * 0.6
      topEvents.push(`${e.title} (${e.category}, ~${e.attendance.toLocaleString()} pers.)`)
    }
  }

  return {
    factor:    Math.min(2.2, Math.round(factor * 100) / 100),
    topEvents: topEvents.slice(0, 3),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R  = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a  = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function computeProximityScore(e: UrbanEvent, userLat: number, userLng: number): number {
  const distM      = haversine(userLat, userLng, e.location.lat, e.location.lng)
  const proximity  = Math.max(0, 1 - distM / (e.radius * 4))
  const attendNorm = Math.min(1, e.attendance / 20000)
  return Math.round(Math.min(1, e.trafficScore * 0.4 + proximity * 0.4 + attendNorm * 0.2) * 100) / 100
}

function mapParisCategory(cat: string, title = ''): UrbanEvent['category'] {
  const c = (cat + ' ' + title).toLowerCase()
  if (c.includes('festival'))                                                                        return 'festival'
  if (c.includes('concert') || c.includes('music') || c.includes('jazz') || c.includes('rap') || c.includes('rock') || c.includes('électro')) return 'concert'
  if (c.includes('sport') || c.includes('match') || c.includes('marathon') || c.includes('foot') || c.includes('tennis') || c.includes('rugby')) return 'sport'
  if (c.includes('manif') || c.includes('march') || c.includes('défilé'))                          return 'manifestation'
  if (c.includes('expo') || c.includes('musée') || c.includes('galerie'))                          return 'exposition'
  if (c.includes('brocant') || c.includes('vide-gre') || c.includes('marché'))                     return 'marché'
  if (c.includes('conf') || c.includes('salon') || c.includes('sommet') || c.includes('forum'))    return 'congrès'
  return 'autre'
}

function mapOpenAgendaCategory(keywords: string[], title: string): UrbanEvent['category'] {
  const kw = (keywords.join(' ') + ' ' + title).toLowerCase()
  if (kw.includes('festival'))                                                                       return 'festival'
  if (kw.includes('concert') || kw.includes('musique') || kw.includes('jazz') || kw.includes('rock') || kw.includes('rap') || kw.includes('electro')) return 'concert'
  if (kw.includes('sport') || kw.includes('match') || kw.includes('marathon') || kw.includes('foot') || kw.includes('tennis')) return 'sport'
  if (kw.includes('manif') || kw.includes('défilé'))                                               return 'manifestation'
  if (kw.includes('expo') || kw.includes('musée') || kw.includes('galerie'))                       return 'exposition'
  if (kw.includes('marche') || kw.includes('brocante'))                                             return 'marché'
  if (kw.includes('conf') || kw.includes('salon') || kw.includes('forum'))                         return 'congrès'
  return 'autre'
}

function mapPHQCategory(cat: string): UrbanEvent['category'] {
  if (cat === 'concerts')    return 'concert'
  if (cat === 'sports')      return 'sport'
  if (cat === 'expos')       return 'exposition'
  if (cat === 'conferences') return 'congrès'
  return 'autre'
}

function mapTicketmasterCategory(segment: string): UrbanEvent['category'] {
  const s = segment.toLowerCase()
  if (s.includes('music'))  return 'concert'
  if (s.includes('sport'))  return 'sport'
  if (s.includes('art'))    return 'exposition'
  return 'autre'
}

function estimateAttendance(cat: UrbanEvent['category'], _priceType: string | null): number {
  const base: Record<UrbanEvent['category'], number> = {
    concert:       5000,
    festival:      15000,
    sport:         8000,
    manifestation: 15000,
    exposition:    500,
    marché:        2000,
    congrès:       1000,
    autre:         300,
  }
  return base[cat] ?? 500
}

function categoryRadius(cat: UrbanEvent['category']): number {
  const r: Record<UrbanEvent['category'], number> = {
    concert:       800,
    festival:      2000,
    sport:         1200,
    manifestation: 2000,
    exposition:    300,
    marché:        400,
    congrès:       600,
    autre:         300,
  }
  return r[cat] ?? 500
}

function categoryTrafficScore(cat: UrbanEvent['category']): number {
  const s: Record<UrbanEvent['category'], number> = {
    concert:       0.65,
    festival:      0.80,
    sport:         0.70,
    manifestation: 0.80,
    exposition:    0.20,
    marché:        0.30,
    congrès:       0.40,
    autre:         0.15,
  }
  return s[cat] ?? 0.2
}
