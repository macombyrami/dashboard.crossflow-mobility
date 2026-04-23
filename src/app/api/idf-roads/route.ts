/**
 * /api/idf-roads
 * Serves filtered IDF road segments from the local GeoJSON dataset.
 *
 * Query params:
 *   frc      - comma-separated FRC classes (1=highway, 2=major, 3=arterial, 4=collector, 5=local)
 *   county   - filter by county name (partial, case-insensitive)
 *   bbox     - lng1,lat1,lng2,lat2 (WGS84)
 *   limit    - max features returned (default 500)
 *   minMiles - minimum segment length in miles (default 0)
 *
 * The 143 MB file is parsed once and cached in module scope.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

// ── Lean internal type (drops unused fields) ────────────────────────────────

interface IdfSegment {
  id: string          // XDSegID
  frc: number
  roadName: string
  roadNumber: string
  roadList: string
  county: string
  postalCode: string
  miles: number
  lanes: number
  bearing: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  coordinates: [number, number][]  // [lng, lat][]
}

// ── Spatial Grid Index (Spatial Hash) ───────────────────────────────────────

const GRID_SIZE = 0.05 // degrees (~5.5km)
const MAX_FEATURES = 600
const MAX_COORDS_PER_FEATURE = 32
let _segments: IdfSegment[] | null = null
const _grid: Map<string, IdfSegment[]> = new Map()

function getGridKeys(bbox: [number, number, number, number]): string[] {
  const keys: string[] = []
  const x1 = Math.floor(bbox[0] / GRID_SIZE)
  const y1 = Math.floor(bbox[1] / GRID_SIZE)
  const x2 = Math.floor(bbox[2] / GRID_SIZE)
  const y2 = Math.floor(bbox[3] / GRID_SIZE)

  for (let x = x1; x <= x2; x++) {
    for (let y = y1; y <= y2; y++) {
      keys.push(`${x},${y}`)
    }
  }
  return keys
}

function loadSegments(): IdfSegment[] {
  if (_segments) return _segments

  const filePath = path.join(
    process.cwd(),
    'data/data_IledeFrance/maprelease-geojson/extracted/France_Ile_de_France.geojson',
  )

  if (!fs.existsSync(filePath)) {
    console.error(`[idf-roads] Dataset not found at ${filePath}`)
    return []
  }

  console.log('[idf-roads] Parsing 143MB GeoJSON…')
  const raw = fs.readFileSync(filePath, 'utf8')
  const geojson = JSON.parse(raw) as { features: any[] }

  _segments = geojson.features.map(f => {
    const p = f.properties
    const seg: IdfSegment = {
      id:         String(p.XDSegID ?? p.OID ?? Math.random()),
      frc:        parseInt(p.FRC ?? '5', 10),
      roadName:   p.RoadName ?? p.FullRoadName ?? 'Voie sans nom',
      roadNumber: p.RoadNumber ?? '',
      roadList:   p.RoadList ?? '',
      county:     p.County ?? '',
      postalCode: p.PostalCode ?? '',
      miles:      parseFloat(p.Miles ?? '0'),
      lanes:      parseFloat(p.Lanes ?? '1'),
      bearing:    p.Bearing ?? '',
      startLat:   parseFloat(p.StartLat ?? '0'),
      startLng:   parseFloat(p.StartLong ?? '0'),
      endLat:     parseFloat(p.EndLat ?? '0'),
      endLng:     parseFloat(p.EndLong ?? '0'),
      coordinates: f.geometry?.coordinates ?? [],
    }

    // Index by starting point
    const gx = Math.floor(seg.startLng / GRID_SIZE)
    const gy = Math.floor(seg.startLat / GRID_SIZE)
    const key = `${gx},${gy}`
    if (!_grid.has(key)) _grid.set(key, [])
    _grid.get(key)!.push(seg)

    return seg
  })

  console.log(`[idf-roads] Indexed ${_segments.length} segments in ${_grid.size} spatial cells.`)
  return _segments
}

function simplifyCoordinates(coords: [number, number][]): [number, number][] {
  if (coords.length <= MAX_COORDS_PER_FEATURE) return coords
  const step = Math.ceil(coords.length / MAX_COORDS_PER_FEATURE)
  const simplified = coords.filter((_, idx) => idx % step === 0)
  const last = coords[coords.length - 1]
  if (simplified[simplified.length - 1] !== last) simplified.push(last)
  return simplified
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  const frcFilter  = sp.get('frc')
    ? new Set(sp.get('frc')!.split(',').map(Number))
    : null

  const countyFilter = sp.get('county')?.toLowerCase() ?? null
  const limit        = Math.min(parseInt(sp.get('limit') ?? '400', 10), MAX_FEATURES)
  const minMiles     = parseFloat(sp.get('minMiles') ?? '0')

  let bbox: [number, number, number, number] | null = null
  if (sp.get('bbox')) {
    const parts = sp.get('bbox')!.split(',').map(Number)
    if (parts.length === 4) bbox = parts as [number, number, number, number]
  }

  const allSegments = loadSegments()
  let pool: IdfSegment[] = allSegments

  // Optimized spatial lookup if bbox is provided
  if (bbox) {
    pool = []
    const keys = getGridKeys(bbox)
    const seen = new Set<string>()
    for (const key of keys) {
      const cell = _grid.get(key)
      if (cell) {
        for (const s of cell) {
          if (!seen.has(s.id)) {
            pool.push(s)
            seen.add(s.id)
          }
        }
      }
    }
  }

  const results: IdfSegment[] = []
  for (const seg of pool) {
    if (results.length >= limit) break
    
    // Quick FRC check first
    if (frcFilter && !frcFilter.has(seg.frc)) continue
    
    // BBox check second
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox
      if (
        seg.startLng < minLng || seg.startLng > maxLng ||
        seg.startLat < minLat || seg.startLat > maxLat
      ) continue
    }

    if (countyFilter && !seg.county.toLowerCase().includes(countyFilter)) continue
    if (seg.miles < minMiles) continue
    
    results.push(seg)
  }

  return NextResponse.json({
    type: 'FeatureCollection',
    metadata: {
      totalFound:  results.length,
      searchedIn:  pool.length,
      gridCells:   bbox ? getGridKeys(bbox).length : 0
    },
    features: results.map(seg => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: simplifyCoordinates(seg.coordinates),
      },
      properties: {
        id:         seg.id,
        frc:        seg.frc,
        roadName:   seg.roadName,
        roadNumber: seg.roadNumber,
        county:     seg.county,
        miles:      seg.miles,
        lanes:      seg.lanes,
      },
    })),
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
