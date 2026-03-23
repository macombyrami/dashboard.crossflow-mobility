/**
 * OpenStreetMap Overpass API
 * 100% GRATUIT · Aucune clé · Données mondiales
 * https://overpass-api.de
 *
 * Utilisé pour:
 * - Réseau routier réel (axes principaux, rues)
 * - Points d'intérêt trafic (parkings, stations, feux)
 * - Infrastructure cyclable
 * - Zones piétonnes
 */

const OVERPASS_BASE = 'https://overpass-api.de/api/interpreter'

export interface OSMRoad {
  id:       number
  name:     string
  highway:  string   // motorway, trunk, primary, secondary, tertiary, residential...
  maxspeed: number   // km/h
  oneway:   boolean
  lanes:    number
  coords:   [number, number][] // [lng, lat][]
  length:   number  // estimated meters
}

export interface OSMPOIPoint {
  id:       number
  type:     'parking' | 'fuel' | 'traffic_signals' | 'bus_stop' | 'subway_entrance' | 'charging_station' | 'bicycle_rental'
  name:     string
  lat:      number
  lng:      number
  capacity?: number
  operator?: string
}

export interface OSMCycleRoute {
  id:       number
  name:     string
  type:     'cycleway' | 'bike_lane' | 'shared_path'
  coords:   [number, number][]
  oneway:   boolean
}

// ─── Fetch major roads in bbox ─────────────────────────────────────────────

export async function fetchRoads(
  bbox: [number, number, number, number],
  highwayTypes: string[] = ['motorway', 'trunk', 'primary', 'secondary'],
): Promise<OSMRoad[]> {
  const [west, south, east, north] = bbox
  const highwayFilter = highwayTypes.map(t => `["highway"="${t}"]`).join('')

  const query = `
    [out:json][timeout:25];
    (
      way["highway"~"^(${highwayTypes.join('|')})$"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `

  try {
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(15000),
      next:    { revalidate: 3600 }, // roads don't change often
    })
    if (!res.ok) return []
    const data = await res.json()

    return parseWays(data)
  } catch {
    return []
  }
}

// ─── Fetch POIs (parking, fuel, signals, transit) ─────────────────────────

export async function fetchTrafficPOIs(
  bbox: [number, number, number, number],
): Promise<OSMPOIPoint[]> {
  const [west, south, east, north] = bbox
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"^(parking|fuel|bicycle_rental)$"](${south},${west},${north},${east});
      node["highway"="traffic_signals"](${south},${west},${north},${east});
      node["highway"="bus_stop"](${south},${west},${north},${east});
      node["railway"="subway_entrance"](${south},${west},${north},${east});
      node["amenity"="charging_station"](${south},${west},${north},${east});
    );
    out body qt 500;
  `

  try {
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(12000),
      next:    { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.elements ?? [])
      .filter((el: any) => el.type === 'node')
      .map((el: any): OSMPOIPoint => {
        const tags = el.tags ?? {}
        const type = mapAmenityType(tags)
        return {
          id:       el.id,
          type,
          name:     tags.name ?? tags.ref ?? typeLabel(type),
          lat:      el.lat,
          lng:      el.lon,
          capacity: tags.capacity ? parseInt(tags.capacity) : undefined,
          operator: tags.operator,
        }
      })
      .slice(0, 300) // cap to avoid perf issues
  } catch {
    return []
  }
}

// ─── Fetch cycling infrastructure ─────────────────────────────────────────

export async function fetchCycleNetwork(
  bbox: [number, number, number, number],
): Promise<OSMCycleRoute[]> {
  const [west, south, east, north] = bbox
  const query = `
    [out:json][timeout:20];
    (
      way["highway"="cycleway"](${south},${west},${north},${east});
      way["cycleway"~"^(lane|track|shared_lane)$"](${south},${west},${north},${east});
    );
    out body;
    >;
    out skel qt;
  `

  try {
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(12000),
      next:    { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()

    return parseWays(data).map(w => ({
      id:     w.id,
      name:   w.name,
      type:   'cycleway' as const,
      coords: w.coords,
      oneway: w.oneway,
    })).slice(0, 500)
  } catch {
    return []
  }
}

// ─── City stats from Wikidata/Nominatim ───────────────────────────────────

export interface CityStats {
  population?:    number
  area?:          number   // km²
  density?:       number   // pop/km²
  elevation?:     number   // meters
  wikiLabel?:     string
  wikidataId?:    string
  country?:       string
  adminLevel?:    string
}

export async function fetchCityStats(cityName: string, countryCode: string): Promise<CityStats> {
  try {
    // Use Wikidata SPARQL for city statistics
    const sparql = `
      SELECT ?item ?pop ?area ?elev WHERE {
        ?item wikibase:label { bd:serviceParam wikibase:language "${countryCode === 'FR' ? 'fr' : 'en'},en". }
        ?item rdfs:label "${cityName}"@${countryCode === 'FR' ? 'fr' : 'en'}.
        OPTIONAL { ?item wdt:P1082 ?pop. }
        OPTIONAL { ?item wdt:P2046 ?area. }
        OPTIONAL { ?item wdt:P2044 ?elev. }
      }
      LIMIT 1
    `
    const res = await fetch(
      `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparql)}&format=json`,
      {
        headers: { 'Accept': 'application/sparql-results+json' },
        signal:  AbortSignal.timeout(4000),
        next:    { revalidate: 86400 }, // 24h cache
      },
    )
    if (!res.ok) return {}
    const data     = await res.json()
    const binding  = data.results?.bindings?.[0]
    if (!binding) return {}

    const pop  = binding.pop?.value  ? parseInt(binding.pop.value)   : undefined
    const area = binding.area?.value ? parseFloat(binding.area.value): undefined

    return {
      population: pop,
      area:       area ? Math.round(area) : undefined,
      density:    pop && area ? Math.round(pop / area) : undefined,
      elevation:  binding.elev?.value ? Math.round(parseFloat(binding.elev.value)) : undefined,
      wikidataId: binding.item?.value?.split('/').pop(),
    }
  } catch {
    return {}
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface OverpassElement {
  type:    'way' | 'node'
  id:      number
  nodes?:  number[]
  lat?:    number
  lon?:    number
  tags?:   Record<string, string>
}

function parseWays(data: { elements: OverpassElement[] }): OSMRoad[] {
  const nodeMap = new Map<number, [number, number]>()
  const roads:   OSMRoad[] = []

  for (const el of data.elements ?? []) {
    if (el.type === 'node' && el.lat && el.lon) {
      nodeMap.set(el.id, [el.lon, el.lat])
    }
  }

  for (const el of data.elements ?? []) {
    if (el.type !== 'way' || !el.nodes) continue
    const coords = el.nodes.map(n => nodeMap.get(n)).filter(Boolean) as [number, number][]
    if (coords.length < 2) continue

    const tags     = el.tags ?? {}
    const maxspeed = parseMaxspeed(tags.maxspeed)
    const lanes    = tags.lanes ? parseInt(tags.lanes) : 1
    const length   = estimateLength(coords)

    roads.push({
      id:       el.id,
      name:     tags.name ?? tags.ref ?? '',
      highway:  tags.highway ?? '',
      maxspeed,
      oneway:   tags.oneway === 'yes',
      lanes,
      coords,
      length,
    })
  }

  return roads
}

function parseMaxspeed(val?: string): number {
  if (!val) return 50
  if (val === 'FR:urban')   return 50
  if (val === 'FR:rural')   return 80
  if (val === 'FR:motorway')return 130
  const n = parseInt(val)
  return isNaN(n) ? 50 : n
}

function estimateLength(coords: [number, number][]): number {
  let len = 0
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i-1][0]) * 111320 * Math.cos(coords[i][1] * Math.PI / 180)
    const dy = (coords[i][1] - coords[i-1][1]) * 110540
    len += Math.sqrt(dx*dx + dy*dy)
  }
  return Math.round(len)
}

function mapAmenityType(tags: Record<string, string>): OSMPOIPoint['type'] {
  if (tags.amenity === 'parking')           return 'parking'
  if (tags.amenity === 'fuel')              return 'fuel'
  if (tags.highway === 'traffic_signals')   return 'traffic_signals'
  if (tags.highway === 'bus_stop')          return 'bus_stop'
  if (tags.railway === 'subway_entrance')   return 'subway_entrance'
  if (tags.amenity === 'charging_station')  return 'charging_station'
  if (tags.amenity === 'bicycle_rental')    return 'bicycle_rental'
  return 'parking'
}

function typeLabel(type: OSMPOIPoint['type']): string {
  const labels: Record<OSMPOIPoint['type'], string> = {
    parking:           'Parking',
    fuel:              'Station essence',
    traffic_signals:   'Feux tricolores',
    bus_stop:          'Arrêt de bus',
    subway_entrance:   'Entrée métro',
    charging_station:  'Borne EV',
    bicycle_rental:    'Vélos en libre-service',
  }
  return labels[type]
}
