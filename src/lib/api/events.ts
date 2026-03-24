/**
 * Événements urbains — impact trafic
 * Sources:
 *   - Que faire à Paris (opendata.paris.fr) — GRATUIT · Aucune clé
 *   - PredictHQ (predicthq.com)             — GRATUIT 100 req/jour avec clé
 *
 * Impact: concerts, matchs, manifs, congrès → pics de trafic localisés
 */

const PARIS_EVENTS_BASE = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records'

function getPredictHQKey(): string {
  return process.env.NEXT_PUBLIC_PREDICTHQ_API_KEY ?? ''
}

export function hasPredictHQKey(): boolean {
  return Boolean(getPredictHQKey())
}

export interface UrbanEvent {
  id:          string
  title:       string
  category:    'concert' | 'sport' | 'manifestation' | 'exposition' | 'marché' | 'congrès' | 'autre'
  startDate:   string
  endDate:     string
  location:    { lat: number; lng: number; address: string; district?: string }
  attendance:  number     // estimated attendance
  radius:      number     // impact radius in meters
  trafficScore: number    // 0-1 local traffic impact
  impactLabel?: string    // "Léger", "Moyen", "Fort"
  trafficIncrease?: number // +28% etc.
  source:      'paris-opendata' | 'predicthq' | 'crossflow-engine'
}

// ─── Paris Open Data events ───────────────────────────────────────────────

export async function fetchParisEvents(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<UrbanEvent[]> {
  try {
    const today = new Date().toISOString().slice(0, 10)
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

    const params = new URLSearchParams({
      where:    `date_start >= "${today}" AND date_start <= "${tomorrow}T23:59:59"`,
      limit:    '30',
      order_by: 'date_start',
    })

    const res = await fetch(`${PARIS_EVENTS_BASE}?${params}`, {
      next: { revalidate: 1800 }, // 30 min cache
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? [])
      .filter((e: any) => e.lat_lon_latlon)
      .map((e: any): UrbanEvent => {
        const [elat, elng] = (e.lat_lon_latlon ?? '0,0').split(',').map(Number)
        const cat = mapParisCategory(e.category ?? '')
        return {
          id:          e.id?.toString() ?? Math.random().toString(36).slice(2),
          title:       e.title ?? 'Événement',
          category:    cat,
          startDate:   e.date_start ?? today,
          endDate:     e.date_end   ?? today,
          location: {
            lat:     elat,
            lng:     elng,
            address: e.address_name ?? e.address_zipcode ?? 'Paris',
          },
          attendance:  estimateAttendance(cat, e.price_type),
          radius:      categoryRadius(cat),
          trafficScore: categoryTrafficScore(cat),
          source:      'paris-opendata',
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

// ─── PredictHQ (worldwide, with free key) ────────────────────────────────

export async function fetchPredictHQEvents(
  lat: number,
  lng: number,
  radiusKm = 10,
): Promise<UrbanEvent[]> {
  const key = getPredictHQKey()
  if (!key) return []

  try {
    const today    = new Date().toISOString().slice(0, 10)
    const in7days  = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

    const params = new URLSearchParams({
      'within':            `${radiusKm}km@${lat},${lng}`,
      'start.gte':         today,
      'start.lte':         in7days,
      'sort':              '-rank',
      'limit':             '20',
      'category':          'concerts,sports,expos,community,conferences,disasters,public-holidays',
    })

    const res = await fetch(
      `https://api.predicthq.com/v1/events/?${params}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        signal:  AbortSignal.timeout(6000),
        next:    { revalidate: 3600 },
      },
    )
    if (!res.ok) return []
    const data = await res.json()

    return (data.results ?? []).map((e: any): UrbanEvent => {
      const [elng, elat] = e.location ?? [lng, lat]
      const cat = mapPHQCategory(e.category)
      return {
        id:          e.id,
        title:       e.title,
        category:    cat,
        startDate:   e.start,
        endDate:     e.end ?? e.start,
        location: {
          lat:     elat,
          lng:     elng,
          address: e.entities?.[0]?.formatted_address ?? '',
        },
        attendance:  e.phq_attendance ?? estimateAttendance(cat, null),
        radius:      Math.max(categoryRadius(cat), (e.phq_attendance ?? 0) > 10000 ? 1500 : 800),
        trafficScore: Math.min(1, (e.rank ?? 50) / 100),
        source:      'predicthq',
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

  const [parisEvents, phqEvents] = await Promise.all([
    isParisArea ? fetchParisEvents(lat, lng, radiusKm) : Promise.resolve([]),
    fetchPredictHQEvents(lat, lng, radiusKm),
  ])

  // Merge, deduplicate by proximity (within 200m + same day)
  const all = [...phqEvents, ...parisEvents]
  const seen = new Set<string>()
  return all.filter(e => {
    const key = `${Math.round(e.location.lat * 1000)},${Math.round(e.location.lng * 1000)},${e.startDate.slice(0, 10)}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Compute aggregate traffic impact factor from events
 * Returns multiplier (1.0 = no effect, 1.5 = +50% local congestion)
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

    const dist     = haversine(lat, lng, e.location.lat, e.location.lng)
    const proximity = Math.max(0, 1 - dist / (e.radius * 3))
    
    // Attendance multiplier: +10% impact every 10k people
    const attendanceBoost = Math.max(1, 1 + (e.attendance / 50000))
    const impact    = e.trafficScore * proximity * attendanceBoost

    if (impact > 0.05) {
      factor += impact * 0.6 // Increased base sensitivity
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

function mapParisCategory(cat: string): UrbanEvent['category'] {
  const c = cat.toLowerCase()
  if (c.includes('concert') || c.includes('music') || c.includes('festival')) return 'concert'
  if (c.includes('sport') || c.includes('match'))  return 'sport'
  if (c.includes('march') || c.includes('manif'))  return 'manifestation'
  if (c.includes('expo') || c.includes('musée'))   return 'exposition'
  if (c.includes('march') || c.includes('brocant')) return 'marché'
  if (c.includes('conf') || c.includes('salon'))   return 'congrès'
  return 'autre'
}

function mapPHQCategory(cat: string): UrbanEvent['category'] {
  if (cat === 'concerts')    return 'concert'
  if (cat === 'sports')      return 'sport'
  if (cat === 'expos')       return 'exposition'
  if (cat === 'conferences') return 'congrès'
  return 'autre'
}

function estimateAttendance(cat: UrbanEvent['category'], priceType: string | null): number {
  const base: Record<UrbanEvent['category'], number> = {
    concert:        5000,
    sport:          8000,
    manifestation:  15000,
    exposition:     500,
    marché:         2000,
    congrès:        1000,
    autre:          300,
  }
  return base[cat] ?? 500
}

function categoryRadius(cat: UrbanEvent['category']): number {
  const r: Record<UrbanEvent['category'], number> = {
    concert:        800,
    sport:          1200,
    manifestation:  2000,
    exposition:     300,
    marché:         400,
    congrès:        600,
    autre:          300,
  }
  return r[cat] ?? 500
}

function categoryTrafficScore(cat: UrbanEvent['category']): number {
  const s: Record<UrbanEvent['category'], number> = {
    concert:        0.65,
    sport:          0.70,
    manifestation:  0.80,
    exposition:     0.20,
    marché:         0.30,
    congrès:        0.40,
    autre:          0.15,
  }
  return s[cat] ?? 0.2
}
