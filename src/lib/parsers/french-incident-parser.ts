/**
 * French Incident Parser
 * Extracts structured data from French traffic incident tweets
 */

import type { ParsedIncident } from '@/types'

interface ParsingConfig {
  cities: string[]
  roads: string[]
}

export class FrenchIncidentParser {
  private roadPattern: RegExp
  private directionPattern: RegExp
  private typePatterns: Record<string, RegExp>
  private severityPatterns: Record<string, RegExp>
  private cityList: Set<string>
  private config: ParsingConfig

  constructor(config: ParsingConfig) {
    this.config = config
    this.cityList = new Set(config.cities.map(c => c.toLowerCase()))

    // Road patterns: A86, N104, Périphérique, RER, etc.
    this.roadPattern = /(?:l[''']?)?(?:autoroute\s)?(?:de\s)?([A-Z]\d{1,3}|Périphérique|RER\s[A-Z]|Métro\s\d{1,2}|Boulevard|Rue|Avenue|Chaussée)\b/gi

    // Direction patterns
    this.directionPattern = /(?:sens|direction|vers|en)\s+(intérieur|extérieur|Paris|province|Provins|Orly|nord|sud|est|ouest)/gi

    // Type inference patterns
    this.typePatterns = {
      accident: /accident|collision|heurt|carambolage|choc|impact/i,
      closure: /fermeture|fermé|interdiction|interdit|coupure|bloqué|fermée|clos/i,
      roadwork: /travaux|chantier|maintenance|entretien|réparation|enrobé|réfection|travail/i,
      congestion: /circulation\sdifficicle|bouchon|embouteillage|saturation|saturé|ralentissement|dense|chargé|trafic|charge|engorgement/i,
      blockage: /manifestation|blocage|grève|protestation|piquets|barrage|occupation/i,
      weather: /pluie|neige|verglas|brouillard|tempête|vent|inondation|orage|glace/i
    }

    // Severity patterns
    this.severityPatterns = {
      critical: /complet|interdit|blocage|interrompu|incendie|fermé|totalement|aucun\spassage|coupée|complètement fermé/i,
      high: /accident|grave|dommages|incendie|heurt|blocage total|très chargé|fermé/i,
      medium: /saturation|complètement\ssaturé|très\schargé|trafic\sdense|très\sdifficicle|embouteillage/i,
      low: /ralentissement|charge|difficile|trafic|débit\sréduit|lent|faible/i
    }
  }

  parse(rawTweet: string): ParsedIncident | null {
    const text = rawTweet.trim()
    if (!text || text.length < 10) return null

    try {
      const type = this.extractType(text)
      const severity = this.extractSeverity(text, type)
      const road = this.extractRoad(text)
      const direction = this.extractDirection(text)
      const [fromCity, toCity] = this.extractCities(text)
      const event = this.extractEvent(text, type)

      // Validate: need at least road or cities
      if (!road && !fromCity && !toCity) {
        return null
      }

      return {
        type: type || 'other',
        severity: severity || 'low',
        road: road || null,
        direction: direction || null,
        from_city: fromCity || null,
        to_city: toCity || null,
        event: event || text.substring(0, 150),
        confidence_parse: this.calculateConfidence(road, fromCity, toCity)
      }
    } catch (error) {
      console.debug(`[Parser] Error parsing tweet`, error)
      return null
    }
  }

  private extractType(text: string): 'accident' | 'closure' | 'roadwork' | 'congestion' | 'blockage' | 'weather' | 'other' {
    for (const [type, pattern] of Object.entries(this.typePatterns)) {
      if (pattern.test(text)) return type as any
    }
    return 'other'
  }

  private extractSeverity(text: string, type: string): 'critical' | 'high' | 'medium' | 'low' {
    // Check explicit severity patterns first
    for (const [severity, pattern] of Object.entries(this.severityPatterns)) {
      if (pattern.test(text)) return severity as any
    }

    // Fall back to type-based severity
    switch (type) {
      case 'closure':
        return 'critical'
      case 'accident':
        return 'high'
      case 'roadwork':
        return 'low'
      case 'congestion':
        return 'medium'
      case 'blockage':
        return 'high'
      case 'weather':
        return 'medium'
      default:
        return 'low'
    }
  }

  private extractRoad(text: string): string | null {
    // Try primary patterns
    const match = this.roadPattern.exec(text)
    if (match) {
      let road = match[1].toUpperCase().trim()
      // Normalize: remove articles
      road = road.replace(/^L[''']/, '').replace(/^LA\s/, '').replace(/^LE\s/, '')
      return road
    }

    // Try hardcoded road list as fallback
    for (const road of this.config.roads) {
      if (text.toUpperCase().includes(road.toUpperCase())) {
        return road
      }
    }

    return null
  }

  private extractDirection(text: string): string | null {
    // Look for direction keywords
    const directions = ['intérieur', 'extérieur', 'vers paris', 'vers la province', 'nord', 'sud', 'est', 'ouest']

    for (const dir of directions) {
      if (text.toLowerCase().includes(dir)) {
        return dir
      }
    }

    return null
  }

  private extractCities(text: string): [string | null, string | null] {
    // Look for "entre X et Y"
    const betweenMatch = text.match(/entre\s+([^,]+)\s+et\s+([^,.!?]+)/i)
    if (betweenMatch) {
      const from = this.normalizeCityName(betweenMatch[1])
      const to = this.normalizeCityName(betweenMatch[2])
      if (this.isCityKnown(from) || this.isCityKnown(to)) {
        return [from, to]
      }
    }

    // Look for "vers X"
    const versMatch = text.match(/vers\s+([^,.\s!?]+)/i)
    if (versMatch) {
      const city = this.normalizeCityName(versMatch[1])
      if (this.isCityKnown(city)) {
        return [null, city]
      }
    }

    // Look for "à X", "près de X", "au niveau de X"
    const nearMatch = text.match(/(?:à|près\sde|au\sniveau\sde)\s+([^,.\s!?]+)/i)
    if (nearMatch) {
      const city = this.normalizeCityName(nearMatch[1])
      if (this.isCityKnown(city)) {
        return [city, null]
      }
    }

    // Fallback: search all known cities
    for (const city of this.cityList) {
      if (text.toLowerCase().includes(city)) {
        return [city, null]
      }
    }

    return [null, null]
  }

  private extractEvent(text: string, type: string): string {
    // Get first line or first 150 chars
    const lines = text.split('\n')
    let event = lines[0]

    // Remove FLASH prefix if present
    event = event.replace(/^FLASH[/:\s]*/, '').trim()

    return event.substring(0, 150)
  }

  private normalizeCityName(city: string): string {
    return city
      .trim()
      .replace(/[,.\s!?]+$/g, '') // Remove trailing punctuation
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
      .toLowerCase()
  }

  private isCityKnown(city: string): boolean {
    const normalized = city.toLowerCase().trim()
    return this.cityList.has(normalized) || this.cityList.has(normalized.replace(/-/g, ' '))
  }

  private calculateConfidence(road: string | null, from: string | null, to: string | null): 'high' | 'medium' | 'low' {
    let score = 0
    if (road) score += 40
    if (from) score += 30
    if (to) score += 30

    return score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  }
}

export function parseIncident(text: string, cities: string[], roads: string[]): ParsedIncident | null {
  const parser = new FrenchIncidentParser({ cities, roads })
  return parser.parse(text)
}
