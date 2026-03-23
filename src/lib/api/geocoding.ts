/**
 * Nominatim (OpenStreetMap) geocoding
 * Completely free — no API key required
 * Find any city, district, street in the world
 */

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
        'User-Agent':      'CrossFlow-Mobility/1.0',
      },
    },
  )

  if (!res.ok) throw new Error(`Nominatim error: ${res.status}`)
  const data = await res.json()

  return (data as NominatimResult[])
    .filter(r => parseFloat(r.importance.toString()) > 0.1)
    .map(r => {
      const bbox = r.boundingbox
        ? [
            parseFloat(r.boundingbox[2]), // west (min_lon)
            parseFloat(r.boundingbox[0]), // south (min_lat)
            parseFloat(r.boundingbox[3]), // east (max_lon)
            parseFloat(r.boundingbox[1]), // north (max_lat)
          ] as [number, number, number, number]
        : [
            parseFloat(r.lon) - 0.1,
            parseFloat(r.lat) - 0.1,
            parseFloat(r.lon) + 0.1,
            parseFloat(r.lat) + 0.1,
          ] as [number, number, number, number]

      // Compute zoom from bbox size
      const bboxSpan = Math.max(bbox[2] - bbox[0], bbox[3] - bbox[1])
      const zoom =
        bboxSpan > 1.5  ? 10 :
        bboxSpan > 0.5  ? 11 :
        bboxSpan > 0.15 ? 12 :
        bboxSpan > 0.05 ? 13 :
        bboxSpan > 0.02 ? 14 : 15

      const address = r.address ?? {}
      const name    = address.city ?? address.town ?? address.village ??
                      address.suburb ?? address.quarter ?? address.neighbourhood ??
                      r.display_name.split(',')[0]

      return {
        id:          r.place_id.toString(),
        displayName: r.display_name,
        name,
        country:     address.country ?? '',
        countryCode: (address.country_code ?? '').toUpperCase(),
        lat:         parseFloat(r.lat),
        lng:         parseFloat(r.lon),
        zoom,
        bbox,
        type:        r.type,
        importance:  parseFloat(r.importance.toString()),
      }
    })
    .sort((a, b) => b.importance - a.importance)
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'User-Agent': 'CrossFlow-Mobility/1.0' } },
  )
  if (!res.ok) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  const data = await res.json()
  const a = data.address ?? {}
  return a.road ?? a.suburb ?? a.city ?? data.display_name?.split(',')[0] ?? ''
}

export async function fetchCityBoundary(name: string, country?: string): Promise<GeoJSON.Feature | null> {
  try {
    const query = country ? `${name}, ${country}` : name

    // Try with featuretype=city first (admin boundaries), then fallback without
    for (const featuretype of ['city,municipality,town', undefined]) {
      const params = new URLSearchParams({
        q:               query,
        format:          'json',
        polygon_geojson: '1',
        limit:           '3',
        'accept-language': 'fr,en',
      })
      if (featuretype) params.set('featuretype', featuretype)

      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { 'User-Agent': 'CrossFlow-Mobility/1.0' } },
      )
      if (!res.ok) continue
      const data = await res.json()
      if (!data || data.length === 0) continue

      // Prefer results with polygon geometry (not just points)
      const withPolygon = data.find((r: any) =>
        r.geojson && (r.geojson.type === 'Polygon' || r.geojson.type === 'MultiPolygon')
      )
      const r = withPolygon ?? data[0]
      if (!r.geojson) continue

      return {
        type:       'Feature',
        geometry:   r.geojson,
        properties: {
          name: r.display_name.split(',')[0],
          id:   r.place_id,
        },
      }
    }
    return null
  } catch (err) {
    console.error('Error fetching city boundary:', err)
    return null
  }
}

interface NominatimResult {
  place_id:    number
  display_name:string
  lat:         string
  lon:         string
  type:        string
  importance:  string | number
  boundingbox?: string[]
  address?: {
    city?:         string
    town?:         string
    village?:      string
    suburb?:       string
    quarter?:      string
    neighbourhood?: string
    country?:      string
    country_code?: string
    road?:         string
  }
}
