/**
 * Nominatim (OpenStreetMap) geocoding
 * Completely free — no API key required
 * Find any city, district, street in the world
 */
import { USER_AGENT } from '@/lib/app-config'

export interface GeocodingResult {
  id:          string
  displayName: string
  name:        string
  country:     string
  countryCode: string
  lat:         number
  lng:         number
  zoom:        number
  bbox:        [number, number, number, number] // [west, south, east, north]
  type:        string // city, town, village, suburb...
  importance:  number
}

export async function searchPlace(query: string): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q:              query,
    format:         'json',
    limit:          '8',
    addressdetails: '1',
    extratags:      '1',
    featuretype:    'city,town,village,suburb,quarter,neighbourhood,municipality',
  })

  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'Accept-Language': 'fr,en',
        'User-Agent':      USER_AGENT,
      },
    },
  )

  if (!res.ok) return []

  const data = await res.json()
  return (data as any[]).map((item: any) => ({
    id:          item.place_id?.toString() ?? item.osm_id?.toString() ?? '',
    displayName: item.display_name ?? '',
    name:        item.name ?? item.address?.city ?? item.address?.town ?? '',
    country:     item.address?.country ?? '',
    countryCode: (item.address?.country_code ?? '').toUpperCase(),
    lat:         parseFloat(item.lat),
    lng:         parseFloat(item.lon),
    zoom:        zoomFromType(item.type, item.class),
    bbox:        item.boundingbox
      ? [
          parseFloat(item.boundingbox[2]), // west
          parseFloat(item.boundingbox[0]), // south
          parseFloat(item.boundingbox[3]), // east
          parseFloat(item.boundingbox[1]), // north
        ] as [number, number, number, number]
      : [parseFloat(item.lon) - 0.1, parseFloat(item.lat) - 0.1, parseFloat(item.lon) + 0.1, parseFloat(item.lat) + 0.1],
    type:        item.type ?? item.class ?? 'place',
    importance:  item.importance ?? 0,
  }))
}

function zoomFromType(type: string, cls: string): number {
  if (type === 'city' || type === 'metropolis')      return 12
  if (type === 'town')                                return 13
  if (type === 'suburb' || type === 'quarter')        return 14
  if (type === 'neighbourhood' || type === 'village') return 15
  if (cls === 'boundary' || cls === 'place')          return 12
  return 13
}

// ─── City boundary (polygon) ──────────────────────────────────────────────────

export interface CityBoundary {
  type:        'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

export async function fetchCityBoundary(
  cityName: string,
  countryCode: string,
): Promise<CityBoundary | null> {
  const params = new URLSearchParams({
    q:              `${cityName}, ${countryCode}`,
    format:         'geojson',
    limit:          '1',
    polygon_geojson: '1',
    featuretype:    'city,town,municipality',
  })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: {
          'Accept-Language': 'fr,en',
          'User-Agent':      USER_AGENT,
        },
      },
    )
    if (!res.ok) return null

    const data = await res.json()
    const feature = data?.features?.[0]
    if (!feature?.geometry) return null

    return feature.geometry as CityBoundary
  } catch {
    return null
  }
}

// ─── City districts (arrondissements, quarters) ───────────────────────────────

export interface District {
  id:     string
  name:   string
  lat:    number
  lng:    number
  bbox:   [number, number, number, number]
  type:   string
}

export async function fetchCityDistricts(
  lat: number,
  lng: number,
  radiusKm = 20,
): Promise<District[]> {
  // Use Overpass-style reverse lookup via Nominatim for districts
  const params = new URLSearchParams({
    lat:             lat.toString(),
    lon:             lng.toString(),
    format:          'json',
    zoom:            '12',
    addressdetails:  '1',
  })

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params}`,
      {
        headers: {
          'Accept-Language': 'fr,en',
          'User-Agent':      USER_AGENT,
        },
      },
    )
    if (!res.ok) return []

    const data = await res.json()

    // Build a list of districts from the address hierarchy
    const address = data?.address ?? {}
    const districts: District[] = []
    const districtTypes = ['suburb', 'quarter', 'neighbourhood', 'city_district', 'district']

    for (const type of districtTypes) {
      if (address[type]) {
        districts.push({
          id:   `${type}-${address[type]}`,
          name: address[type],
          lat,
          lng,
          bbox: [lng - 0.02, lat - 0.02, lng + 0.02, lat + 0.02],
          type,
        })
      }
    }

    return districts
  } catch {
    return []
  }
}
