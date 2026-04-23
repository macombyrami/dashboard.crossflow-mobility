/**
 * Incident Geocoder
 * Primary: Nominatim
 * Fallback: Stadia
 * Includes shared process cache.
 */

import NodeCache from 'node-cache'
import type { GeocodedIncident, ParsedIncident, Coordinates } from '@/types'

const cityCache = new NodeCache({ stdTTL: 2592000 }) // 30 days
const geocoderInstances = new Map<string, IncidentGeocoder>()

export class IncidentGeocoder {
  constructor(private stadiaApiKey: string | null = process.env.STADIA_GEOCODING_API_KEY || null) {}

  async geocode(incident: ParsedIncident): Promise<GeocodedIncident | null> {
    try {
      const fromCoords = incident.from_city ? await this.geocodeCity(incident.from_city) : null
      const toCoords = incident.to_city ? await this.geocodeCity(incident.to_city) : null

      if (!fromCoords && !toCoords) {
        return null
      }

      return {
        ...incident,
        from_coords: fromCoords,
        to_coords: toCoords,
        geometry_type: fromCoords && toCoords ? 'LineString' : 'Point',
      }
    } catch (error) {
      console.error('[Geocoder] Error geocoding incident:', error)
      return null
    }
  }

  private async geocodeCity(cityName: string): Promise<Coordinates | null> {
    const normalized = cityName.trim().toLowerCase()
    const key = `idf:${normalized}`

    const cached = cityCache.get<Coordinates>(key)
    if (cached) return cached

    const nominatimResult = await this.nominatim(cityName)
    if (nominatimResult) {
      cityCache.set(key, nominatimResult)
      return nominatimResult
    }

    if (!this.stadiaApiKey) return null

    const stadiaResult = await this.stadia(cityName)
    if (stadiaResult) {
      cityCache.set(key, stadiaResult)
    }
    return stadiaResult
  }

  private async nominatim(cityName: string): Promise<Coordinates | null> {
    try {
      const query = `${cityName}, Ile-de-France, France`
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrossFlowMobility/1.0 (Sytadin incident geocoder)',
        },
        signal: AbortSignal.timeout(6000),
      })
      if (!response.ok) return null

      const results = await response.json()
      if (!Array.isArray(results) || !results[0]) return null

      return {
        lat: Number.parseFloat(results[0].lat),
        lng: Number.parseFloat(results[0].lon),
      }
    } catch {
      return null
    }
  }

  private async stadia(cityName: string): Promise<Coordinates | null> {
    if (!this.stadiaApiKey) return null
    try {
      const query = `${cityName}, Ile-de-France, France`
      const url = `https://geocoding.stadiamaps.com/search?text=${encodeURIComponent(query)}&api_key=${this.stadiaApiKey}&limit=1`
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CrossFlowMobility/1.0 (Sytadin incident geocoder)',
        },
        signal: AbortSignal.timeout(6000),
      })
      if (!response.ok) return null

      const data = await response.json()
      const first = data?.features?.[0] ?? data?.results?.[0]
      if (!first) return null

      const coords = first?.geometry?.coordinates
      if (!Array.isArray(coords) || coords.length < 2) return null
      return { lat: Number(coords[1]), lng: Number(coords[0]) }
    } catch {
      return null
    }
  }
}

export async function geocodeIncident(incident: ParsedIncident, stadiaKey?: string): Promise<GeocodedIncident | null> {
  const key = stadiaKey ?? process.env.STADIA_GEOCODING_API_KEY ?? '__nominatim__'
  let geocoder = geocoderInstances.get(key)
  if (!geocoder) {
    geocoder = new IncidentGeocoder(stadiaKey ?? null)
    geocoderInstances.set(key, geocoder)
  }
  return geocoder.geocode(incident)
}
