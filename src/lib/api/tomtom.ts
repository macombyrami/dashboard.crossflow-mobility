/**
 * TomTom Traffic API — client-side wrapper
 * All external calls are proxied via /api/tomtom/* (keys stay server-side)
 */

export function hasKey(): boolean {
  return process.env.NEXT_PUBLIC_TOMTOM_ENABLED === 'true' ||
    (!!process.env.NEXT_PUBLIC_TOMTOM_API_KEY && process.env.NEXT_PUBLIC_TOMTOM_API_KEY.length > 10)
}

export function getTrafficFlowTileUrl(): string {
  if (!hasKey()) return ''
  return `/api/tomtom/tile/flow/relative0-dark/{z}/{x}/{y}`
}

export function getTrafficIncidentTileUrl(): string {
  if (!hasKey()) return ''
  return `/api/tomtom/tile/incidents/night/{z}/{x}/{y}`
}

export interface FlowSegmentData {
  currentSpeed:         number
  freeFlowSpeed:        number
  currentTravelTime:    number
  freeFlowTravelTime:   number
  confidence:           number
  roadClosure:          boolean
  coordinates: {
    coordinate: { latitude: number; longitude: number }[]
  }
}

export async function fetchFlowSegment(lat: number, lng: number, zoom = 10): Promise<FlowSegmentData | null> {
  if (!hasKey()) return null
  try {
    const res = await fetch(`/api/tomtom/flow?lat=${lat}&lng=${lng}&zoom=${zoom}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export interface TomTomIncident {
  id:          string
  type:        string
  severity:    number
  iconCategory:number
  magnitudeOfDelay: number
  startTime:   string
  endTime?:    string
  from:        string
  to:          string
  length:      number
  delay:       number
  roadNumbers: string[]
  description: string
  point:       { latitude: number; longitude: number }
}

export async function fetchIncidents(
  bbox: [number, number, number, number],
): Promise<TomTomIncident[]> {
  if (!hasKey()) return []
  try {
    const [west, south, east, north] = bbox
    const res = await fetch(`/api/tomtom/incidents?bbox=${west},${south},${east},${north}`)
    if (!res.ok) return []
    const incidents = await res.json()
    return (incidents ?? []).map((inc: any) => {
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
  if (severity >= 4) return 'critical'
  if (severity >= 3) return 'high'
  if (severity >= 2) return 'medium'
  return 'low'
}

export interface WeatherData {
  temp:        number
  description: string
  icon:        string
  wind:        number
  rain:        boolean
  snow:        boolean
  visibility:  number
  trafficImpact: 'none' | 'minor' | 'moderate' | 'severe'
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
  if (process.env.NEXT_PUBLIC_OPENWEATHER_ENABLED !== 'true') return null
  try {
    const res = await fetch(`/api/weather/openweather?lat=${lat}&lng=${lng}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
