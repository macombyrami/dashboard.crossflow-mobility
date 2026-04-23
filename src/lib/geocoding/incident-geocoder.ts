/**
 * Incident Geocoder
 * Converts city names to coordinates using Nominatim (OpenStreetMap)
 * Includes caching for performance
 */

import NodeCache from 'node-cache'
import type { GeocodedIncident, ParsedIncident, Coordinates } from '@/types'

interface GeocodingResult {
  coordinates: Coordinates | null
  accuracy: 'high' | 'medium' | 'low'
  source: 'nominatim' | 'stadia'
  cached: boolean
}

export class IncidentGeocoder {
  private cache: NodeCache
  private stadiaApiKey: string | null

  constructor(stadiaApiKey?: string) {
    // TTL: 30 days for city coordinates (they don't change)
    this.cache = new NodeCache({ stdTTL: 2592000 })
    this.stadiaApiKey = stadiaApiKey || process.env.STADIA_GEOCODING_API_KEY || null
  }

  async geocode(incident: ParsedIncident): Promise<GeocodedIncident | null> {
    try {
      let fromCoords: Coordinates | null = null
      let toCoords: Coordinates | null = null

      // Geocode from_city
      if (incident.from_city) {
        fromCoords = await this.geocodeCity(incident.from_city)
      }

      // Geocode to_city
      if (incident.to_city) {
        toCoords = await this.geocodeCity(incident.to_city)
      }

      // Must have at least one coordinate
      if (!fromCoords && !toCoords) {
        console.debug(`[Geocoder] Could not geocode: ${incident.from_city} / ${incident.to_city}`)
        return null
      }

      return {
        ...incident,
        from_coords: fromCoords,
        to_coords: toCoords,
        geometry_type: fromCoords && toCoords ? 'LineString' : 'Point'
      }
    } catch (error) {
      console.error(`[Geocoder] Error geocoding incident:`, error)
      return null
    }
  }

  private async geocodeCity(cityName: string): Promise<Coordinates | null> {
    const cacheKey = `city:${cityName.toLowerCase().trim()}`

    // Check cache first
    const cached = this.cache.get<Coordinates>(cacheKey)
    if (cached) {
      return cached
    }

    // Try Nominatim first (free, no key needed)
    let result = await this.nominatim(cityName)

    // Fallback to Stadia if configured
    if (!result && this.stadiaApiKey) {
      result = await this.stadia(cityName)
    }

    if (result) {
      this.cache.set(cacheKey, result)
      return result
    }

    return null
  }

  private async nominatim(cityName: string): Promise<Coordinates | null> {
    try {
      // Add "France" to query for Paris area disambiguation
      const query = `${cityName}, Île-de-France, France`
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrossFlowMobility/1.0'
        },
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const results = await response.json()
      if (!results || results.length === 0) {
        return null
      }

      const [result] = results
      return {
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon)
      }
    } catch (error) {
      console.debug(`[Nominatim] Error geocoding "${cityName}":`, error)
      return null
    }
  }

  private async stadia(cityName: string): Promise<Coordinates | null> {
    if (!this.stadiaApiKey) return null

    try {
      const url = `https://geocoding.stadiamaps.com/search?text=${encodeURIComponent(cityName)}&api_key=${this.stadiaApiKey}&limit=1`

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrossFlowMobility/1.0'
        },
        signal: AbortSignal.timeout(5000)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!data.results || data.results.length === 0) {
        return null
      }

      const [result] = data.results
      return {
        lat: result.geometry.coordinates[1],
        lng: result.geometry.coordinates[0]
      }
    } catch (error) {
      console.debug(`[Stadia] Error geocoding "${cityName}":`, error)
      return null
    }
  }
}

export async function geocodeIncident(incident: ParsedIncident, stadiaKey?: string): Promise<GeocodedIncident | null> {
  const geocoder = new IncidentGeocoder(stadiaKey)
  return geocoder.geocode(incident)
}
