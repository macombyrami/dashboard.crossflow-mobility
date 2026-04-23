/**
 * French Incident Parser
 * Extracts structured data from Sytadin tweets.
 */

import type { ParsedIncident } from '@/types'

interface ParsingConfig {
  cities: string[]
  roads: string[]
}

const TYPE_PATTERNS: Record<ParsedIncident['type'], RegExp> = {
  accident: /\b(accident|collision|carambolage|heurt|choc|panne)\b/i,
  closure: /\b(fermeture|ferme|fermee|interdit|coupure|bloque|barre)\b/i,
  roadwork: /\b(travaux|chantier|maintenance|entretien|reparation)\b/i,
  congestion: /\b(circulation difficile|bouchon|embouteillage|ralentissement|saturation|trafic dense)\b/i,
  blockage: /\b(manifestation|blocage|barrage|greve)\b/i,
  weather: /\b(pluie|neige|verglas|brouillard|orage|inondation)\b/i,
  other: /^$/i,
}

export class FrenchIncidentParser {
  private cityLookup: Map<string, string>
  private roadPattern: RegExp

  constructor(private config: ParsingConfig) {
    this.cityLookup = new Map()
    for (const city of config.cities) {
      this.cityLookup.set(this.normalizeToken(city), city)
    }
    this.roadPattern = /\b(A\d{1,3}[A-Za-z]?|N\d{1,3}|D\d{1,3}|Francilienne|Peripherique|Boulevard\s+Peripherique)\b/i
  }

  parse(rawTweet: string): ParsedIncident | null {
    const text = rawTweet.replace(/\s+/g, ' ').trim()
    if (!text || text.length < 8) return null

    const road = this.extractRoad(text)
    const [fromCity, toCity] = this.extractCities(text)
    const direction = this.extractDirection(text)
    const type = this.extractType(text)
    const severity = this.extractSeverity(type, text)
    const event = this.extractEvent(text, type)

    if (!road && !fromCity && !toCity) return null

    return {
      type,
      severity,
      road,
      direction,
      from_city: fromCity,
      to_city: toCity,
      event,
      confidence_parse: this.calculateConfidence({ road, fromCity, toCity, direction }),
    }
  }

  private extractType(text: string): ParsedIncident['type'] {
    if (TYPE_PATTERNS.accident.test(text)) return 'accident'
    if (TYPE_PATTERNS.closure.test(text)) return 'closure'
    if (TYPE_PATTERNS.roadwork.test(text)) return 'roadwork'
    if (TYPE_PATTERNS.congestion.test(text)) return 'congestion'
    if (TYPE_PATTERNS.blockage.test(text)) return 'blockage'
    if (TYPE_PATTERNS.weather.test(text)) return 'weather'
    return 'other'
  }

  private extractSeverity(type: ParsedIncident['type'], text: string): ParsedIncident['severity'] {
    if (/\bflash\b/i.test(text) && type === 'closure') return 'critical'
    if (type === 'closure') return 'critical'
    if (type === 'accident') return 'high'
    if (type === 'congestion') return 'medium'
    if (type === 'roadwork') return /\bflash\b/i.test(text) ? 'medium' : 'low'
    if (type === 'blockage') return 'high'
    if (type === 'weather') return 'medium'
    return 'low'
  }

  private extractRoad(text: string): string | null {
    const direct = text.match(this.roadPattern)?.[1]
    if (direct) {
      return this.normalizeRoad(direct)
    }
    for (const road of this.config.roads) {
      const normalizedRoad = road.toLowerCase()
      if (text.toLowerCase().includes(normalizedRoad)) {
        return this.normalizeRoad(road)
      }
    }
    return null
  }

  private extractDirection(text: string): string | null {
    const lower = text.toLowerCase()
    if (lower.includes('sens interieur') || lower.includes('sens intérieur')) return 'interieur'
    if (lower.includes('sens exterieur') || lower.includes('sens extérieur')) return 'exterieur'
    if (lower.includes('vers paris')) return 'vers paris'
    if (lower.includes('vers la province')) return 'vers la province'
    if (lower.includes('nord')) return 'nord'
    if (lower.includes('sud')) return 'sud'
    if (lower.includes('est')) return 'est'
    if (lower.includes('ouest')) return 'ouest'
    return null
  }

  private extractCities(text: string): [string | null, string | null] {
    const between = text.match(/\bentre\s+([^\-,()]+?)\s+et\s+([^\-,()]+)\b/i)
    if (between) {
      const from = this.resolveCity(between[1])
      const to = this.resolveCity(between[2])
      if (from || to) return [from, to]
    }

    const parentheses = text.match(/\(([^)]+)\)/)
    if (parentheses) {
      const one = this.resolveCity(parentheses[1])
      if (one) return [one, null]
    }

    const vers = text.match(/\bvers\s+([^\-,()]+)/i)
    if (vers) {
      const to = this.resolveCity(vers[1])
      if (to) return [null, to]
    }

    for (const city of this.config.cities) {
      const token = this.normalizeToken(city)
      if (this.normalizeToken(text).includes(token)) {
        return [city, null]
      }
    }
    return [null, null]
  }

  private extractEvent(text: string, type: ParsedIncident['type']): string {
    const clean = text.replace(/^!?FLASH[/: ]*/i, '').trim()
    if (TYPE_PATTERNS.congestion.test(clean)) return 'Circulation difficile'
    if (type === 'accident') return 'Accident'
    if (type === 'closure') return 'Fermeture'
    if (type === 'roadwork') return 'Travaux'
    return clean.slice(0, 180)
  }

  private resolveCity(raw: string): string | null {
    const token = this.normalizeToken(raw)
    if (!token) return null

    if (this.cityLookup.has(token)) return this.cityLookup.get(token) ?? null

    // loose matching for multi-word names.
    for (const [knownToken, knownCity] of this.cityLookup.entries()) {
      if (token.includes(knownToken) || knownToken.includes(token)) {
        return knownCity
      }
    }
    return null
  }

  private normalizeRoad(rawRoad: string): string {
    const raw = rawRoad.trim()
    if (/^francilienne$/i.test(raw)) return 'N104'
    if (/peripherique/i.test(raw)) return 'BP'
    return raw.toUpperCase()
  }

  private normalizeToken(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  }

  private calculateConfidence(parts: {
    road: string | null
    fromCity: string | null
    toCity: string | null
    direction: string | null
  }): ParsedIncident['confidence_parse'] {
    let score = 0
    if (parts.road) score += 40
    if (parts.fromCity) score += 25
    if (parts.toCity) score += 25
    if (parts.direction) score += 10
    if (score >= 70) return 'high'
    if (score >= 40) return 'medium'
    return 'low'
  }
}

export function parseIncident(text: string, cities: string[], roads: string[]): ParsedIncident | null {
  const parser = new FrenchIncidentParser({ cities, roads })
  return parser.parse(text)
}
