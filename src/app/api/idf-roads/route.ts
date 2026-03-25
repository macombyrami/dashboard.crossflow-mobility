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

// ── Module-level cache ───────────────────────────────────────────────────────

let _segments: IdfSegment[] | null = null

function loadSegments(): IdfSegment[] {
  if (_segments) return _segments

  const filePath = path.join(
    process.cwd(),
    'data/data_IledeFrance/maprelease-geojson/extracted/France_Ile_de_France.geojson',
  )

  console.log('[idf-roads] Parsing GeoJSON… (one-time, ~2-5s)')
  const raw = fs.readFileSync(filePath, 'utf8')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geojson = JSON.parse(raw) as { features: any[] }

  _segments = geojson.features.map(f => {
    const p = f.properties
    return {
      id:         String(p.XDSegID ?? p.OID ?? ''),
      frc:        parseInt(p.FRC ?? '5', 10),
      roadName:   p.RoadName ?? '',
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
    } as IdfSegment
  })

  console.log(`[idf-roads] Loaded ${_segments.length} segments.`)
  return _segments
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams

  const frcFilter  = sp.get('frc')
    ? new Set(sp.get('frc')!.split(',').map(Number))
    : null

  const countyFilter = sp.get('county')?.toLowerCase() ?? null
  const limit        = Math.min(parseInt(sp.get('limit') ?? '500', 10), 2000)
  const minMiles     = parseFloat(sp.get('minMiles') ?? '0')

  let bbox: [number, number, number, number] | null = null
  if (sp.get('bbox')) {
    const parts = sp.get('bbox')!.split(',').map(Number)
    if (parts.length === 4) bbox = parts as [number, number, number, number]
  }

  const segments = loadSegments()
  const results: IdfSegment[] = []

  for (const seg of segments) {
    if (results.length >= limit) break
    if (frcFilter && !frcFilter.has(seg.frc)) continue
    if (countyFilter && !seg.county.toLowerCase().includes(countyFilter)) continue
    if (seg.miles < minMiles) continue
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox
      if (
        seg.startLng < minLng || seg.startLng > maxLng ||
        seg.startLat < minLat || seg.startLat > maxLat
      ) continue
    }
    results.push(seg)
  }

  // Convert to GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: results.map(seg => ({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: seg.coordinates,
      },
      properties: {
        id:         seg.id,
        frc:        seg.frc,
        roadName:   seg.roadName,
        roadNumber: seg.roadNumber,
        county:     seg.county,
        miles:      seg.miles,
        lanes:      seg.lanes,
        bearing:    seg.bearing,
      },
    })),
  }

  return NextResponse.json(geojson, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  })
}
