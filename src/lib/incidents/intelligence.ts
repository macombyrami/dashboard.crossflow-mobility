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
}

type SourceIncident = {
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
  lat: number
  lng: number
}

const ROAD_COORDS: Record<string, { lat: number; lng: number }> = {
  A1: { lat: 48.977, lng: 2.342 },
  A3: { lat: 48.862, lng: 2.445 },
  A4: { lat: 48.836, lng: 2.494 },
  A6: { lat: 48.746, lng: 2.348 },
  A6B: { lat: 48.804, lng: 2.32 },
  A10: { lat: 48.791, lng: 2.056 },
  A12: { lat: 48.805, lng: 2.047 },
  A13: { lat: 48.865, lng: 2.085 },
  A14: { lat: 48.899, lng: 2.175 },
  A15: { lat: 49.015, lng: 2.157 },
  A86: { lat: 48.875, lng: 2.258 },
  A104: { lat: 48.935, lng: 2.583 },
  BP: { lat: 48.864, lng: 2.336 },
  N7: { lat: 48.783, lng: 2.388 },
  N10: { lat: 48.71, lng: 2.153 },
  N12: { lat: 48.82, lng: 1.989 },
  N13: { lat: 48.942, lng: 2.054 },
  N118: { lat: 48.728, lng: 2.218 },
  N184: { lat: 49.048, lng: 2.072 },
}

function parseFrenchTimestamp(raw: string | undefined): string {
  if (!raw) return new Date().toISOString()
  const match = raw.match(/(\d{2})\/(\d{2})\/(\d{2})\s+à\s+(\d{2}):(\d{2})/i)
  if (!match) return new Date().toISOString()
  const [, day, month, year, hour, minute] = match
  return new Date(Date.UTC(2000 + Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute))).toISOString()
}

function cleanText(value: string): string {
  return value
    .replace(/&agrave;/g, 'à')
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&ecirc;/g, 'ê')
    .replace(/&ocirc;/g, 'ô')
    .replace(/&ucirc;/g, 'û')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeDirection(text: string): string {
  if (/vers Paris/i.test(text)) return 'vers Paris'
  if (/vers la province/i.test(text)) return 'vers la province'
  if (/intérieur/i.test(text) || /interieur/i.test(text)) return 'intérieur'
  if (/extérieur/i.test(text) || /exterieur/i.test(text)) return 'extérieur'
  return ''
}

function extractRoad(text: string): string {
  const match = text.match(/\b(A\d{1,3}[A-Z]?|N\d{1,3}|BP|Périphérique|Peripherique)\b/i)
  if (!match) return 'IDF'
  const road = match[1].toUpperCase()
  return road === 'PÉRIPHÉRIQUE' || road === 'PERIPHERIQUE' ? 'BP' : road
}

function inferType(text: string): IncidentType {
  const upper = text.toUpperCase()
  if (upper.includes('ACCIDENT') || upper.includes('INCENDIE') || upper.includes('PANNE')) return 'accident'
  if (upper.includes('TRAVAUX') || upper.includes('CHANTIER') || upper.includes('FERME') || upper.includes('FERMETURE') || upper.includes('COUPURE')) return 'roadwork'
  if (upper.includes('BOUCHON') || upper.includes('RALENTISSEMENT') || upper.includes('CIRCULATION ALTERNEE') || upper.includes('CONGESTION')) return 'congestion'
  if (upper.includes('MANIFESTATION') || upper.includes('BISON FUTE') || upper.includes('EVENEMENT') || upper.includes('ÉVÉNEMENT')) return 'event'
  return 'anomaly'
}

function inferSeverity(text: string, type: IncidentType, sourceSeverity?: number): IncidentSeverity {
  const upper = text.toUpperCase()
  if ((type === 'accident' && /BLOQU|FERM|COUPUR|INCENDIE|TUNNEL/i.test(upper)) || /!FLASH/i.test(upper)) return 'critical'
  if (type === 'accident') return 'high'
  if (type === 'roadwork') return /FLASH/i.test(upper) ? 'high' : 'medium'
  if (type === 'congestion') return /SATUR/i.test(upper) ? 'medium' : 'low'

  if (typeof sourceSeverity === 'number') {
    if (sourceSeverity >= 4) return 'critical'
    if (sourceSeverity >= 3) return 'high'
    if (sourceSeverity >= 2) return 'medium'
  }

  return 'low'
}

function extractLocation(text: string): string {
  const locationMatch =
    text.match(/\(([^)]+)\)/)?.[1] ||
    text.match(/(?:niveau de|à hauteur de|au niveau de|porte de|vers|sur)\s+([^,:]+)/i)?.[1] ||
    ''

  return cleanText(locationMatch).replace(/^de\s+/i, '')
}

function buildCoords(road: string, lat?: number, lng?: number) {
  if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)) {
    return { lat, lng }
  }
  return ROAD_COORDS[road] ?? { lat: 48.8566, lng: 2.3522 }
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

function normalizeToken(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '')
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
  const sameRoad = a.road === b.road
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

export function parseSytadinHtmlToIncidents(html: string): SourceIncident[] {
  const liRegex = /<li>\s*<a[^>]*>([^<]+)<\/a>\s*<\/li>/gi
  const incidents: SourceIncident[] = []
  let match: RegExpExecArray | null

  while ((match = liRegex.exec(html)) !== null) {
    const rawLine = cleanText(match[1] ?? '')
    if (!rawLine) continue

    const [dateChunk, rawMessage] = rawLine.split(/\s:\s(.+)/).filter(Boolean)
    const message = rawMessage ? rawMessage : rawLine
    const road = extractRoad(message)
    const type = inferType(message)
    const direction = normalizeDirection(message)
    const location = extractLocation(message)
    const status: IncidentStatus = /\bTERMINE\b|\bTERMINEE\b|\[Terminé\]/i.test(message) ? 'finished' : 'active'
    const coords = buildCoords(road)

    incidents.push({
      id: `sytadin-${incidents.length}-${normalizeToken(message).slice(0, 12)}`,
      road,
      direction,
      location,
      type,
      severity: inferSeverity(message, type),
      timestamp: parseFrenchTimestamp(dateChunk),
      source: 'Sytadin',
      sourceLabel: 'Sytadin',
      status,
      description: message.replace(/^(?:!FLASH|FLASH|INFO)\//i, ''),
      confidence: 'high',
      lat: coords.lat,
      lng: coords.lng,
    })
  }

  return incidents.filter(keepRelevant)
}

export function normalizeTomTomIncident(raw: any): SourceIncident | null {
  const props = raw?.properties ?? raw
  const description = cleanText(props.events?.[0]?.description ?? props.description ?? 'Incident routier')
  const road = props.roadNumbers?.[0] ?? extractRoad(`${props.from ?? ''} ${props.to ?? ''} ${description}`)
  const type = inferType(description)
  const coords = raw?.geometry?.coordinates?.[0]
  const point = buildCoords(road, coords?.[1], coords?.[0])
  const location = extractLocation(`${props.from ?? ''} ${props.to ?? ''} ${description}`) || cleanText(props.from ?? props.to ?? '')

  if (!road) return null

  return {
    id: `tomtom-${props.id ?? normalizeToken(description).slice(0, 16)}`,
    road,
    direction: normalizeDirection(`${props.from ?? ''} ${props.to ?? ''} ${description}`),
    location,
    type,
    severity: inferSeverity(description, type, Number(props.magnitudeOfDelay ?? props.severity ?? 0)),
    timestamp: props.startTime ?? new Date().toISOString(),
    source: 'TomTom',
    sourceLabel: 'TomTom',
    status: props.endTime && new Date(props.endTime).getTime() < Date.now() ? 'finished' : 'active',
    description,
    confidence: props.roadNumbers?.length ? 'high' : 'medium',
    lat: point.lat,
    lng: point.lng,
  }
}

export function mergeIncidents(incidents: SourceIncident[]): IncidentIntelligenceRecord[] {
  const merged: IncidentIntelligenceRecord[] = []

  incidents
    .filter(keepRelevant)
    .sort((a, b) => sourceRank(b.source) - sourceRank(a.source))
    .forEach((candidate) => {
      const existing = merged.find(item => sameIncident(item, candidate))
      if (!existing) {
        merged.push({
          ...candidate,
          sources: [candidate.sourceLabel],
        })
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
      existing.type = severityRank(candidate.severity) > severityRank(existing.severity) ? candidate.type : existing.type
      existing.severity = severityRank(candidate.severity) > severityRank(existing.severity) ? candidate.severity : existing.severity
      existing.sources = Array.from(new Set([...existing.sources, candidate.sourceLabel]))
    })

  return merged.sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity)
    if (severityDelta !== 0) return severityDelta
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}
