import type {
  IncidentFeedItem,
  IncidentSelection,
  IncidentSeverity,
  IntelligenceIncident,
  PriorityItem,
  TransitLine,
  TransitTab,
  TrendState,
} from './dashboard.types'

export const TAB_LABEL: Record<TransitTab, string> = {
  metros: 'Metro',
  rers: 'RER',
  tramways: 'Tram',
}

export const SEVERITY_STYLE: Record<IncidentSeverity, { dot: string; badge: string; text: string }> = {
  critical: { dot: 'bg-red-600', badge: 'bg-red-100 text-red-700', text: 'Critical' },
  high: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', text: 'High' },
  medium: { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', text: 'Medium' },
  low: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', text: 'Low' },
}

export function severityRank(value: IncidentSeverity) {
  return value === 'critical' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1
}

export function asSeverityFromTransitTitle(title: string, message: string): IncidentSeverity {
  const text = `${title} ${message}`.toLowerCase()
  if (text.includes('interrompu') || text.includes('suspendu')) return 'critical'
  if (text.includes('perturb')) return 'high'
  if (text.includes('ralenti') || text.includes('incident')) return 'medium'
  return 'low'
}

export function lineLoadIndex(line: TransitLine): number {
  const base = asSeverityFromTransitTitle(line.title, line.message)
  if (base === 'critical') return 95
  if (base === 'high') return 82
  if (base === 'medium') return 68
  return 38
}

export function congestionPercent(level?: 'free' | 'slow' | 'congested' | 'critical') {
  if (level === 'critical') return 86
  if (level === 'congested') return 68
  if (level === 'slow') return 46
  return 24
}

export function networkStatusFromMetrics(avgLoadPct: number, criticalCount: number) {
  if (criticalCount >= 3 || avgLoadPct >= 78) return 'CRITICAL'
  if (criticalCount >= 1 || avgLoadPct >= 55) return 'TENSE'
  return 'NORMAL'
}

export function trendLabel(current: number, previous: number | null): TrendState {
  if (previous == null) return { label: 'stable', tone: 'text-stone-500' }
  const delta = current - previous
  if (delta > 4) return { label: 'rising', tone: 'text-red-600' }
  if (delta < -4) return { label: 'falling', tone: 'text-emerald-600' }
  return { label: 'stable', tone: 'text-stone-500' }
}

export function formatAge(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now'
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return `${h} h ago`
}

export function buildPriorityItems(incidents: IntelligenceIncident[], lines: TransitLine[]): PriorityItem[] {
  const incidentItems: PriorityItem[] = incidents
    .filter(item => item.status === 'active')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 5)
    .map(item => ({
      id: item.id,
      kind: 'incident',
      severity: item.severity,
      title: `${item.road} ${item.direction ? `- ${item.direction}` : ''}`.trim(),
      subtitle: item.description,
      impact: `${item.confidence} confidence`,
      lat: item.lat,
      lng: item.lng,
      timestamp: item.timestamp,
    }))

  const lineItems: PriorityItem[] = lines
    .filter(item => asSeverityFromTransitTitle(item.title, item.message) !== 'low')
    .slice(0, 4)
    .map(item => ({
      id: `line-${item.slug}`,
      kind: 'line',
      severity: asSeverityFromTransitTitle(item.title, item.message),
      title: `${TAB_LABEL[item.type]} ${item.slug}`,
      subtitle: item.message || item.title,
      impact: item.title,
      lineType: item.type,
    }))

  return [...incidentItems, ...lineItems]
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 5)
}

export function buildInsight(incidents: IntelligenceIncident[], networkStatus: 'NORMAL' | 'TENSE' | 'CRITICAL', avgLoadPct: number) {
  const topIncident = incidents
    .filter(item => item.status === 'active')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]

  if (topIncident) {
    return `${topIncident.road} under ${SEVERITY_STYLE[topIncident.severity].text.toLowerCase()} pressure. Recommended: activate rerouting on ${topIncident.location || 'adjacent corridors'} within 15 minutes.`
  }

  if (networkStatus === 'TENSE' || networkStatus === 'CRITICAL') {
    return `Network load is ${avgLoadPct}%. Activate preventive flow regulation on top 3 constrained lines before the next peak.`
  }

  return 'Network remains stable. Keep control mode on standby and monitor incident confidence updates.'
}

export function toIncidentSelection(incident: IntelligenceIncident): IncidentSelection {
  return {
    id: incident.id,
    title: incident.road,
    description: incident.description,
    severity: incident.severity,
    type: incident.type,
    source: incident.sourceLabel,
    address: incident.location || incident.direction || '',
    startedAt: incident.timestamp,
    lng: incident.lng,
    lat: incident.lat,
  }
}

export function toIncidentFeedItems(incidents: IntelligenceIncident[]): IncidentFeedItem[] {
  return incidents.map(incident => ({
    id: incident.id,
    road: incident.road,
    direction: incident.direction,
    type: incident.type,
    severity: incident.severity,
    description: incident.description,
    timestamp: incident.timestamp,
    location: incident.location,
  }))
}
