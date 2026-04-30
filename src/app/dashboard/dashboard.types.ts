export type OperatorMode = 'dashboard' | 'control'
export type TransitTab = 'metros' | 'rers' | 'tramways'
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
export type IncidentKind = 'accident' | 'roadwork' | 'congestion' | 'anomaly' | 'event'

export type DashboardCity = {
  id: string
  name: string
  bbox: [number, number, number, number]
}

export type AggregatedCityPayload = {
  city_id?: string
  timestamp?: string
  traffic?: {
    average_speed?: number
    congestion_level?: 'free' | 'slow' | 'congested' | 'critical'
    incident_count?: number
    segments?: Array<{
      id?: string
      axisName?: string
      streetName?: string
      roadType?: string
      congestionScore?: number
      flowVehiclesPerHour?: number
      speedKmh?: number
      freeFlowSpeedKmh?: number
    }>
  }
}

export type IntelligenceIncident = {
  id: string
  road: string
  direction: string
  location: string
  type: IncidentKind
  severity: IncidentSeverity
  timestamp: string
  source: string
  sourceLabel: string
  status: 'active' | 'finished'
  description: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  lat: number
  lng: number
}

export type IncidentSelection = {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  type: string
  source: string
  address: string
  startedAt: string
  lng: number
  lat: number
}

export type TransitLine = {
  slug: string
  type: TransitTab
  title: string
  message: string
  source?: string
}

export type PriorityItem =
  | {
      id: string
      kind: 'incident'
      severity: IncidentSeverity
      title: string
      subtitle: string
      impact: string
      lat: number
      lng: number
      timestamp: string
    }
  | {
      id: string
      kind: 'line'
      severity: IncidentSeverity
      title: string
      subtitle: string
      impact: string
      lineType: TransitTab
    }

export type TrendState = {
  label: string
  tone: string
}

export type IncidentFeedItem = {
  id: string
  road: string
  direction: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  timestamp: string
  location: string
}
