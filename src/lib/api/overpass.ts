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

import { overpassLimiter } from '@/lib/utils/rateLimiter'

// Route through our server proxy (caches 1h, avoids browser rate-limits + CORS)
const OVERPASS_BASE = typeof window !== 'undefined'
  ? '/api/overpass'
  : 'https://overpass-api.de/api/interpreter'

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
    out tags qt;
    >;
    out skel qt;
  `

  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(15000),
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
    out tags center qt 500;
  `

  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(12000),
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
    out tags qt;
    >;
    out skel qt;
  `

  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(12000),
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

// ─── Metro stations with line associations ────────────────────────────────

export interface MetroStation {
  id:    number
  name:  string
  lat:   number
  lng:   number
  lines: string[]   // sorted line refs e.g. ["1", "4", "7"]
}

/**
 * Fetch subway stations (railway=station + stop_position) AND subway route
 * relations in one Overpass call. Associates each station with its metro line
 * numbers by cross-referencing route-relation member node IDs.
 */
export async function fetchMetroStations(
  bbox: [number, number, number, number],
): Promise<MetroStation[]> {
  const [west, south, east, north] = bbox
  // Fetch stations + route relations (for line→station mapping)
  // Also include RER (route=train, network~RATP) and tram stops
  const query = `
    [out:json][timeout:40];
    (
      node["railway"="station"]["station"="subway"](${south},${west},${north},${east});
      node["railway"="station"]["station"="light_rail"](${south},${west},${north},${east});
      node["public_transport"="stop_position"]["subway"="yes"](${south},${west},${north},${east});
      node["public_transport"="stop_position"]["tram"="yes"](${south},${west},${north},${east});
      relation["type"="route"]["route"="subway"](${south},${west},${north},${east});
      relation["type"="route"]["route"="tram"](${south},${west},${north},${east});
      relation["type"="route"]["route"="train"]["network"~"RATP|SNCF|Transilien|RER",i](${south},${west},${north},${east});
    );
    out tags center qt 2000;
  `
  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(40000),
    })
    if (!res.ok) return []
    const data = await res.json()

    // 1. Build nodeId → Set<lineRef> from route relations
    const nodeLines = new Map<number, Set<string>>()
    for (const el of data.elements ?? []) {
      if (el.type !== 'relation') continue
      const ref = (el.tags?.ref ?? '').trim()
      if (!ref) continue
      for (const member of el.members ?? []) {
        if (member.type === 'node') {
          if (!nodeLines.has(member.ref)) nodeLines.set(member.ref, new Set())
          nodeLines.get(member.ref)!.add(ref)
        }
      }
    }

    // 2. Collect station nodes, merge by name to deduplicate multi-stop stations
    const byName = new Map<string, MetroStation>()
    for (const el of data.elements ?? []) {
      if (el.type !== 'node' || el.lat === undefined) continue
      const tags = el.tags ?? {}
      const isStation =
        (tags.railway === 'station' && (tags.station === 'subway' || tags.subway === 'yes')) ||
        (tags.public_transport === 'stop_position' && tags.subway === 'yes' && tags.name)
      if (!isStation) continue
      const name = (tags.name ?? tags['name:fr'] ?? '').trim()
      if (!name) continue
      const lines = [...(nodeLines.get(el.id) ?? new Set())].sort()
      const key   = name.toLowerCase()
      const exist = byName.get(key)
      if (!exist) {
        byName.set(key, { id: el.id, name, lat: el.lat, lng: el.lon, lines })
      } else {
        // Merge lines from multiple stop_position nodes for same station
        const merged = [...new Set([...exist.lines, ...lines])].sort()
        byName.set(key, { ...exist, lines: merged })
      }
    }

    return [...byName.values()].slice(0, 400)
  } catch {
    return []
  }
}

// ─── Transit route relations ──────────────────────────────────────────────

export interface OSMTransitLine {
  id:       number
  route:    string   // bus | tram | subway | train | monorail | ferry
  name:     string
  ref:      string   // line number / letter
  colour:   string   // hex color
  operator: string
  network:  string
}

export async function fetchTransitRoutes(
  bbox: [number, number, number, number],
  maxLines = 150,
): Promise<OSMTransitLine[]> {
  const [west, south, east, north] = bbox
  const query = `
    [out:json][timeout:25];
    (
      relation["type"="route"]["route"~"^(bus|tram|subway|train|monorail|ferry)$"](${south},${west},${north},${east});
    );
    out tags center ${maxLines};
  `

  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(15000),
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.elements ?? [])
      .filter((el: any) => el.type === 'relation')
      .map((el: any): OSMTransitLine => {
        const tags = el.tags ?? {}
        return {
          id:       el.id,
          route:    tags.route ?? 'bus',
          name:     tags.name ?? tags.ref ?? '',
          ref:      tags.ref ?? '',
          colour:   (tags.colour ?? tags.color ?? transitDefaultColor(tags.route)).replace(/^(?!#)/, '#'),
          operator: tags.operator ?? tags.network ?? '',
          network:  tags.network ?? tags.operator ?? '',
        }
      })
      .slice(0, maxLines)
  } catch {
    return []
  }
}

// ─── Transit route geometries (with way geometry for vehicle simulation) ────

export interface OSMRouteGeometry {
  id:       number
  route:    string          // subway | tram | bus | train | ferry
  name:     string
  ref:      string          // line number / letter
  colour:   string          // hex color
  coords:   [number, number][] // [lng, lat][] — stitched route path
}

export async function fetchRouteGeometries(
  bbox: [number, number, number, number],
  routeTypes: string[] = ['subway', 'tram', 'bus'],
  maxRoutes = 30,
): Promise<OSMRouteGeometry[]> {
  const [west, south, east, north] = bbox
  const types = routeTypes.join('|')
  // Sort by route type priority: subway/tram first, then others
  const query = `
    [out:json][timeout:40];
    (
      relation["type"="route"]["route"~"^(${types})$"](${south},${west},${north},${east});
    );
    out geom ${maxRoutes};
  `

  try {
    await overpassLimiter.acquire()
    const res = await fetch(OVERPASS_BASE, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(query)}`,
      signal:  AbortSignal.timeout(40000),
    })
    if (!res.ok) return []
    const data = await res.json()

    return (data.elements ?? [])
      .filter((el: any) => el.type === 'relation')
      .map((el: any): OSMRouteGeometry | null => {
        const tags   = el.tags ?? {}
        const route  = tags.route ?? 'bus'
        const colour = (tags.colour ?? tags.color ?? transitDefaultColor(route)).replace(/^(?!#)/, '#')

        // Collect all way-member geometries in order
        const wayGeoms: Array<[number, number][]> = (el.members ?? [])
          .filter((m: any) => m.type === 'way' && Array.isArray(m.geometry) && m.geometry.length >= 2)
          .map((m: any) => m.geometry.map((pt: any) => [pt.lon, pt.lat] as [number, number]))

        if (wayGeoms.length === 0) return null

        // Stitch ways into a continuous path (greedy nearest-endpoint matching)
        const coords = stitchWays(wayGeoms)
        if (coords.length < 4) return null

        return {
          id:     el.id,
          route,
          name:   tags.name ?? tags.ref ?? '',
          ref:    tags.ref  ?? '',
          colour,
          coords,
        }
      })
      .filter(Boolean) as OSMRouteGeometry[]
  } catch {
    return []
  }
}

// Greedy way-stitching: tries to form a continuous path from unordered way segments
function stitchWays(ways: Array<[number, number][]>): [number, number][] {
  if (ways.length === 0) return []
  const result: [number, number][] = [...ways[0]]
  const remaining = ways.slice(1)

  while (remaining.length > 0) {
    const last  = result[result.length - 1]
    let bestIdx = 0
    let bestDist = Infinity
    let reversed = false

    for (let i = 0; i < remaining.length; i++) {
      const way   = remaining[i]
      const dHead = dist2(last, way[0])
      const dTail = dist2(last, way[way.length - 1])
      if (dHead < bestDist) { bestDist = dHead; bestIdx = i; reversed = false }
      if (dTail < bestDist) { bestDist = dTail; bestIdx = i; reversed = true  }
    }

    const chosen = remaining.splice(bestIdx, 1)[0]
    const segment = reversed ? [...chosen].reverse() : chosen
    // Skip duplicate first coord if it matches last
    const start = dist2(last, segment[0]) < 1e-10 ? 1 : 0
    result.push(...segment.slice(start))
  }

  return result
}

function dist2(a: [number, number], b: [number, number]): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2
}

function transitDefaultColor(route?: string): string {
  const map: Record<string, string> = {
    bus:      '#3B82F6',
    tram:     '#10B981',
    subway:   '#8B5CF6',
    train:    '#F59E0B',
    monorail: '#EC4899',
    ferry:    '#06B6D4',
  }
  return map[route ?? ''] ?? '#6B7280'
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
