/**
 * TomTom Traffic API
 * Real-time traffic data
 * Free: 2 500 req/day on developer plan
 * Sign up at developer.tomtom.com
 */

const BASE = 'https://api.tomtom.com'

function getKey(): string {
  return process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? ''
}

export function hasKey(): boolean {
  return Boolean(getKey())
}

// ─── Traffic Tile URLs (raster overlay on map) ──────────────────────────────
// These are map tile URLs — displayed as map layers, not counted as API calls in the same way

export function getTrafficFlowTileUrl(): string {
  const key = getKey()
  if (!key) return ''
  // relative0-dark: dark-themed relative speed tiles (perfect for dark map)
  return `${BASE}/traffic/map/4/tile/flow/relative0-dark/{z}/{x}/{y}.png?key=${key}&tileSize=256`
}

export function getTrafficIncidentTileUrl(): string {
  const key = getKey()
  if (!key) return ''
  return `${BASE}/traffic/map/4/tile/incidents/night/{z}/{x}/{y}.png?key=${key}&tileSize=256`
}

// ─── Flow Segment Data (JSON — real speed for a point on the road) ─────────

export interface FlowSegmentData {
  currentSpeed:         number    // km/h
  freeFlowSpeed:        number    // km/h
  currentTravelTime:    number    // seconds
  freeFlowTravelTime:   number    // seconds
  confidence:           number    // 0.0 - 1.0
  roadClosure:          boolean
  coordinates: {
    coordinate: { latitude: number; longitude: number }[]
  }
}

export async function fetchFlowSegment(lat: number, lng: number, zoom = 10): Promise<FlowSegmentData | null> {
  const key = getKey()
  if (!key) return null

  try {
    const url = `${BASE}/traffic/services/4/flowSegmentData/relative0/${zoom}/json?point=${lat},${lng}&unit=kmph&key=${key}`
    const res = await fetch(url, { next: { revalidate: 30 } })
    if (!res.ok) return null
    const data = await res.json()
    return data.flowSegmentData ?? null
  } catch {
    return null
  }
}

// ─── Incidents ────────────────────────────────────────────────────────────

export interface TomTomIncident {
  id:          string
  type:        string
  severity:    number  // 0-4
  iconCategory:number
  magnitudeOfDelay: number  // 0=unknown, 1=minor, 2=moderate, 3=major, 4=undefined
  startTime:   string
  endTime?:    string
  from:        string
  to:          string
  length:      number // meters
  delay:       number // seconds
  roadNumbers: string[]
  description: string
  point:       { latitude: number; longitude: number }
}

const SEVERITY_MAP: Record<number, 'low' | 'medium' | 'high' | 'critical'> = {
  0: 'low',
  1: 'low',
  2: 'medium',
  3: 'high',
  4: 'critical',
}

export async function fetchIncidents(
  bbox: [number, number, number, number],
): Promise<TomTomIncident[]> {
  const key = getKey()
  if (!key) return []

  try {
    const [west, south, east, north] = bbox
    const bboxStr = `${west},${south},${east},${north}`
    const fields  = '{incidents{type,geometry,properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}'
    const url     = `${BASE}/traffic/services/5/incidentDetails.json?bbox=${bboxStr}&fields=${encodeURIComponent(fields)}&language=fr-FR&key=${key}`
    const res     = await fetch(url, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const data = await res.json()

    return (data.incidents ?? []).map((inc: any) => {
      const props = inc.properties ?? {}
      const geo   = inc.geometry?.coordinates ?? []
      const point = geo[0] ? { latitude: geo[0][1], longitude: geo[0][0] } : { latitude: 0, longitude: 0 }

      return {
        id:               props.id ?? Math.random().toString(36).slice(2),
        type:             inc.type ?? 'unknown',
        severity:         props.magnitudeOfDelay ?? 0,
        iconCategory:     props.iconCategory ?? 0,
        magnitudeOfDelay: props.magnitudeOfDelay ?? 0,
        startTime:        props.startTime ?? new Date().toISOString(),
        endTime:          props.endTime,
        from:             props.from ?? '',
        to:               props.to ?? '',
        length:           props.length ?? 0,
        delay:            props.delay ?? 0,
        roadNumbers:      props.roadNumbers ?? [],
        description:      props.events?.[0]?.description ?? 'Incident signalé',
        point,
      }
    })
  } catch {
    return []
  }
}

export function tomtomSeverityToLocal(severity: number): 'low' | 'medium' | 'high' | 'critical' {
  return SEVERITY_MAP[severity] ?? 'medium'
}

// ─── Weather (OpenWeatherMap) ─────────────────────────────────────────────

export interface WeatherData {
  temp:        number
  description: string
  icon:        string
  wind:        number
  rain:        boolean
  snow:        boolean
  visibility:  number // meters
  trafficImpact: 'none' | 'minor' | 'moderate' | 'severe'
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const key = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY
  if (!key) return null

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${key}&units=metric&lang=fr`
    const res = await fetch(url, { next: { revalidate: 600 } })
    if (!res.ok) return null
    const d = await res.json()

    const rain = d.rain?.['1h'] > 0 || d.weather?.[0]?.main === 'Rain'
    const snow = d.snow?.['1h'] > 0 || d.weather?.[0]?.main === 'Snow'
    const vis  = d.visibility ?? 10000

    const trafficImpact =
      snow || vis < 500        ? 'severe'   :
      rain || vis < 2000       ? 'moderate' :
      d.wind?.speed > 15       ? 'minor'    : 'none'

    return {
      temp:        Math.round(d.main?.temp ?? 0),
      description: d.weather?.[0]?.description ?? '',
      icon:        d.weather?.[0]?.icon ?? '',
      wind:        Math.round(d.wind?.speed ?? 0),
      rain,
      snow,
      visibility:  vis,
      trafficImpact,
    }
  } catch {
    return null
  }
}
