import type { IncidentSeverity, IncidentType } from '@/types'

export type IncidentStatus = 'active' | 'finished'

export interface IncidentIntelligenceRecord {
  id: string
  road: string
  direction: string
  location: string
  type: IncidentType
  severity: IncidentSeverity
  timestamp: string
  source: string
  sourceLabel: string
  status: IncidentStatus
  description: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  lat: number
  lng: number
  aiInsight?: string
}

type SourceIncident = Omit<IncidentIntelligenceRecord, 'sources' | 'aiInsight'> & {
  sourceScore?: number
}

const ROAD_COORDS: Record<string, { lat: number; lng: number }> = {
  A1: { lat: 48.977, lng: 2.342 },
  A3: { lat: 48.862, lng: 2.445 },
  A4: { lat: 48.836, lng: 2.494 },
  A6: { lat: 48.746, lng: 2.348 },
  A10: { lat: 48.791, lng: 2.056 },
  A12: { lat: 48.805, lng: 2.047 },
  A13: { lat: 48.865, lng: 2.085 },
  A14: { lat: 48.899, lng: 2.175 },
  A15: { lat: 49.015, lng: 2.157 },
  A86: { lat: 48.875, lng: 2.258 },
  N104: { lat: 48.935, lng: 2.583 },
  BP: { lat: 48.864, lng: 2.336 },
  N7: { lat: 48.783, lng: 2.388 },
  N10: { lat: 48.71, lng: 2.153 },
  N118: { lat: 48.728, lng: 2.218 },
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

function parseDate(raw: string | undefined): string {
  if (!raw) return new Date().toISOString()
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

function toIncidentType(raw: string): IncidentType {
  const v = raw.toLowerCase()
  if (v.includes('accident')) return 'accident'
  if (v.includes('roadwork') || v.includes('travaux') || v.includes('closure') || v.includes('fermeture')) return 'roadwork'
  if (v.includes('congestion') || v.includes('circulation') || v.includes('bouchon')) return 'congestion'
  if (v.includes('event') || v.includes('manifestation')) return 'event'
  return 'anomaly'
}

function toSeverity(raw: string, fallback: IncidentSeverity = 'low'): IncidentSeverity {
  const v = raw.toLowerCase()
  if (v.includes('critical')) return 'critical'
  if (v.includes('high') || v.includes('major')) return 'high'
  if (v.includes('medium')) return 'medium'
  if (v.includes('low') || v.includes('minor')) return 'low'
  return fallback
}

function sourceRank(source: string): number {
  if (source === 'Sytadin') return 4
  if (source === 'TomTom') return 3
  if (source === 'HERE') return 2
  return 1
}

function confidenceRank(confidence: IncidentIntelligenceRecord['confidence']): number {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1
}

function severityRank(severity: IncidentSeverity): number {
  return severity === 'critical' ? 4 : severity === 'high' ? 3 : severity === 'medium' ? 2 : 1
}

function areCloseInTime(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 2 * 60 * 60 * 1000
}

function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earth = 6371e3
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return 2 * earth * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

function sameIncident(a: SourceIncident, b: SourceIncident): boolean {
  const sameRoad = normalizeToken(a.road) === normalizeToken(b.road)
  const sameType = a.type === b.type || a.type === 'anomaly' || b.type === 'anomaly'
  const sameTime = areCloseInTime(a.timestamp, b.timestamp)
  const closeCoords = haversineMeters(a.lat, a.lng, b.lat, b.lng) <= 2500
  const similarLocation =
    !a.location ||
    !b.location ||
    normalizeToken(a.location).includes(normalizeToken(b.location)) ||
    normalizeToken(b.location).includes(normalizeToken(a.location))

  return sameRoad && sameType && sameTime && (closeCoords || similarLocation)
}

function keepRelevant(record: SourceIncident): boolean {
  const ageHours = (Date.now() - new Date(record.timestamp).getTime()) / 3600000
  if (record.status === 'finished') return ageHours <= 3
  if (record.type === 'roadwork') return ageHours <= 48
  return ageHours <= 8
}

function extractRoad(raw: string): string {
  const match = raw.match(/\b(A\d{1,3}[A-Za-z]?|N\d{1,3}|D\d{1,3}|BP|Peripherique|Francilienne)\b/i)
  if (!match) return 'IDF'
  const road = match[1].toUpperCase()
  if (road === 'PERIPHERIQUE') return 'BP'
  if (road === 'FRANCILIENNE') return 'N104'
  return road
}

function fallbackCoords(road: string, lat?: number, lng?: number) {
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat: Number(lat), lng: Number(lng) }
  }
  return ROAD_COORDS[road] ?? { lat: 48.8566, lng: 2.3522 }
}

export function parseSytadinHtmlToIncidents(html: string): SourceIncident[] {
  const liRegex = /<li>\s*<a[^>]*>([^<]+)<\/a>\s*<\/li>/gi
  const incidents: SourceIncident[] = []
  let match: RegExpExecArray | null
  while ((match = liRegex.exec(html)) !== null) {
    const line = (match[1] ?? '').replace(/\s+/g, ' ').trim()
    if (!line) continue
    const road = extractRoad(line)
    const coords = fallbackCoords(road)
    const type = toIncidentType(line)
    incidents.push({
      id: `sytadin-html-${normalizeToken(line).slice(0, 16)}`,
      road,
      direction: /exterieur/i.test(line) ? 'exterieur' : /interieur/i.test(line) ? 'interieur' : '',
      location: line.match(/\(([^)]+)\)/)?.[1] ?? '',
      type,
      severity: toSeverity(line, type === 'accident' ? 'high' : type === 'congestion' ? 'medium' : 'low'),
      timestamp: new Date().toISOString(),
      source: 'Sytadin',
      sourceLabel: 'Sytadin',
      status: /\[termine\]/i.test(line) ? 'finished' : 'active',
      description: line.replace(/^!?FLASH[/: ]*/i, ''),
      confidence: 'medium',
      lat: coords.lat,
      lng: coords.lng,
    })
  }
  return incidents.filter(keepRelevant)
}

export function normalizeSytadinDbIncident(raw: any): SourceIncident | null {
  const geometry = raw?.geometry
  let lat: number | undefined
  let lng: number | undefined

  if (geometry?.type === 'Point' && Array.isArray(geometry.coordinates)) {
    lng = Number(geometry.coordinates[0])
    lat = Number(geometry.coordinates[1])
  } else if (geometry?.type === 'LineString' && Array.isArray(geometry.coordinates) && geometry.coordinates[0]) {
    const first = geometry.coordinates[0]
    lng = Number(first[0])
    lat = Number(first[1])
  }

  const road = raw?.road ?? extractRoad(`${raw?.event_description ?? ''}`)
  const coords = fallbackCoords(road, lat, lng)
  const type = toIncidentType(raw?.type ?? raw?.event_description ?? '')
  return {
    id: `sytadin-db-${raw?.tweet_id ?? raw?.id ?? normalizeToken(raw?.event_description ?? '')}`,
    road,
    direction: raw?.direction ?? '',
    location: raw?.from_city ?? raw?.to_city ?? '',
    type,
    severity: toSeverity(raw?.severity ?? '', type === 'accident' ? 'high' : type === 'congestion' ? 'medium' : 'low'),
    timestamp: parseDate(raw?.tweet_created_at ?? raw?.created_at),
    source: 'Sytadin',
    sourceLabel: 'Sytadin',
    status: raw?.status === 'resolved' ? 'finished' : 'active',
    description: raw?.event_description ?? 'Incident Sytadin',
    confidence: (raw?.confidence_parse ?? 'medium') as IncidentIntelligenceRecord['confidence'],
    lat: coords.lat,
    lng: coords.lng,
  }
}

export function normalizeTomTomIncident(raw: any): SourceIncident | null {
  const props = raw?.properties ?? raw
  const description = String(props?.events?.[0]?.description ?? props?.description ?? 'Incident TomTom')
  const road = props?.roadNumbers?.[0] ?? extractRoad(description)
  const first = raw?.geometry?.coordinates?.[0]
  const coords = fallbackCoords(road, first?.[1], first?.[0])
  const type = toIncidentType(description)

  return {
    id: `tomtom-${props?.id ?? normalizeToken(description).slice(0, 18)}`,
    road,
    direction: '',
    location: String(props?.from ?? props?.to ?? ''),
    type,
    severity: toSeverity(String(props?.severity ?? props?.magnitudeOfDelay ?? ''), type === 'accident' ? 'high' : 'medium'),
    timestamp: parseDate(props?.startTime ?? props?.fromTime),
    source: 'TomTom',
    sourceLabel: 'TomTom',
    status: props?.endTime && new Date(props.endTime).getTime() < Date.now() ? 'finished' : 'active',
    description,
    confidence: props?.roadNumbers?.length ? 'high' : 'medium',
    lat: coords.lat,
    lng: coords.lng,
  }
}

export function normalizeHereIncident(raw: any): SourceIncident | null {
  const description = String(
    raw?.TRAFFIC_ITEM_DESCRIPTION?.[0]?.value ??
    raw?.TRAFFIC_ITEM_TYPE_DESC ??
    raw?.description ??
    'Incident HERE'
  )
  const road = extractRoad(description)
  const lat = Number.parseFloat(String(raw?.LOCATION?.GEO_NODE?.LAT ?? raw?.location?.lat ?? '0'))
  const lng = Number.parseFloat(String(raw?.LOCATION?.GEO_NODE?.LON ?? raw?.location?.lng ?? '0'))
  const coords = fallbackCoords(road, Number.isFinite(lat) && lat !== 0 ? lat : undefined, Number.isFinite(lng) && lng !== 0 ? lng : undefined)
  const type = toIncidentType(description)
  const criticality = String(raw?.CRITICALITY?.DESCRIPTION ?? raw?.criticality ?? '')

  return {
    id: `here-${raw?.TRAFFIC_ITEM_ID ?? raw?.id ?? normalizeToken(description).slice(0, 18)}`,
    road,
    direction: '',
    location: String(raw?.LOCATION?.POLITICAL_BOUNDARY?.NAME?.[0] ?? raw?.location?.description ?? ''),
    type,
    severity: toSeverity(criticality, type === 'accident' ? 'high' : 'medium'),
    timestamp: parseDate(raw?.START_TIME ?? raw?.startTime),
    source: 'HERE',
    sourceLabel: 'HERE',
    status: raw?.END_TIME && new Date(raw.END_TIME).getTime() < Date.now() ? 'finished' : 'active',
    description,
    confidence: road !== 'IDF' ? 'medium' : 'low',
    lat: coords.lat,
    lng: coords.lng,
  }
}

export function mergeIncidents(incidents: SourceIncident[]): IncidentIntelligenceRecord[] {
  const merged: IncidentIntelligenceRecord[] = []
  incidents
    .filter(keepRelevant)
    .sort((a, b) => sourceRank(b.source) - sourceRank(a.source))
    .forEach((candidate) => {
      const existing = merged.find(item => sameIncident(item as SourceIncident, candidate))
      if (!existing) {
        merged.push({ ...candidate, sources: [candidate.sourceLabel] })
        return
      }

      const candidateScore =
        sourceRank(candidate.source) * 10 +
        confidenceRank(candidate.confidence) * 3 +
        severityRank(candidate.severity)
      const existingScore =
        sourceRank(existing.source) * 10 +
        confidenceRank(existing.confidence) * 3 +
        severityRank(existing.severity)

      if (candidateScore > existingScore) {
        existing.id = candidate.id
        existing.source = candidate.source
        existing.sourceLabel = candidate.sourceLabel
        existing.description = candidate.description
        existing.timestamp = candidate.timestamp
        existing.status = candidate.status
        existing.confidence = candidate.confidence
        existing.lat = candidate.lat
        existing.lng = candidate.lng
      }

      existing.road = existing.road || candidate.road
      existing.direction = existing.direction || candidate.direction
      existing.location = existing.location || candidate.location
      if (severityRank(candidate.severity) > severityRank(existing.severity)) {
        existing.type = candidate.type
        existing.severity = candidate.severity
      }
      existing.sources = Array.from(new Set([...existing.sources, candidate.sourceLabel]))
    })

  return merged.sort((a, b) => {
    const s = severityRank(b.severity) - severityRank(a.severity)
    if (s !== 0) return s
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

export async function enrichWithAiInsight(
  incidents: IncidentIntelligenceRecord[],
): Promise<IncidentIntelligenceRecord[]> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey || incidents.length === 0) {
    return incidents
  }

  const top = incidents
    .filter(i => i.status === 'active')
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, 3)

  if (top.length === 0) return incidents

  const prompt = `Generate one short traffic impact insight per incident in JSON array.
Use <= 20 words per insight.
Incidents: ${JSON.stringify(top.map(i => ({
    id: i.id,
    road: i.road,
    type: i.type,
    severity: i.severity,
    location: i.location,
    description: i.description
  })))
    }`

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          {
            role: 'system',
            content: 'You are a traffic operations copilot. Return valid compact JSON only.',
          },
          { role: 'user', content: prompt },
        ],
      }),
      signal: AbortSignal.timeout(9000),
    })

    if (!response.ok) return incidents
    const payload = await response.json()
    const text = String(payload?.choices?.[0]?.message?.content ?? '')
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return incidents
    const parsed = JSON.parse(jsonMatch[0]) as Array<{ id: string; insight: string }>

    const insightById = new Map(parsed.map(item => [item.id, item.insight]))
    return incidents.map(incident => ({
      ...incident,
      aiInsight: insightById.get(incident.id),
    }))
  } catch {
    return incidents
  }
}
