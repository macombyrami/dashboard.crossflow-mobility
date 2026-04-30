/**
 * /api/idf-stats
 * Pre-computed statistics about the IDF road network.
 * Uses the same module-level cache as /api/idf-roads.
 */

import { NextResponse } from 'next/server'
import * as fs from 'fs'
import * as path from 'path'

interface IdfSegment {
  frc: number
  roadName: string
  roadNumber: string
  county: string
  miles: number
  lanes: number
}

let _stats: IdfStats | null = null

interface IdfStats {
  totalSegments: number
  totalKm: number
  frcDistribution: Record<string, number>
  topCounties: Array<{ name: string; count: number }>
  majorHighways: string[]
  frcLabels: Record<string, string>
  loadedAt: string
}

const FRC_LABELS: Record<string, string> = {
  '1': 'Autoroutes / Voies rapides',
  '2': 'Nationales / Rocades',
  '3': 'Artères principales',
  '4': 'Collectrices',
  '5': 'Voies locales',
}

function buildStats(): IdfStats {
  if (_stats) return _stats

  const filePath = path.join(
    process.cwd(),
    'data/data_IledeFrance/maprelease-geojson/extracted/France_Ile_de_France.geojson',
  )

  const raw = fs.readFileSync(filePath, 'utf8')
  const geojson = JSON.parse(raw) as { features: { properties: Record<string, string> }[] }

  const segments: IdfSegment[] = geojson.features.map(f => ({
    frc:        parseInt(f.properties.FRC ?? '5', 10),
    roadName:   f.properties.RoadName ?? '',
    roadNumber: f.properties.RoadNumber ?? '',
    county:     f.properties.County ?? '',
    miles:      parseFloat(f.properties.Miles ?? '0'),
    lanes:      parseFloat(f.properties.Lanes ?? '1'),
  }))

  const totalKm = segments.reduce((s, seg) => s + seg.miles * 1.60934, 0)

  const frcDist: Record<string, number> = {}
  const countyCounts: Record<string, number> = {}
  const highwaySet = new Set<string>()

  for (const seg of segments) {
    const frc = String(seg.frc)
    frcDist[frc] = (frcDist[frc] ?? 0) + 1
    countyCounts[seg.county] = (countyCounts[seg.county] ?? 0) + 1
    if (seg.roadName && seg.frc <= 2 && seg.roadNumber) {
      highwaySet.add(seg.roadName)
    }
  }

  const topCounties = Object.entries(countyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }))

  const majorHighways = [...highwaySet]
    .filter(r => /^[AN]\d+/.test(r))
    .sort()
    .slice(0, 30)

  _stats = {
    totalSegments: segments.length,
    totalKm:       Math.round(totalKm),
    frcDistribution: frcDist,
    topCounties,
    majorHighways,
    frcLabels: FRC_LABELS,
    loadedAt: new Date().toISOString(),
  }

  return _stats
}

export async function GET() {
  const stats = buildStats()
  return NextResponse.json(stats, {
    headers: { 'Cache-Control': 'public, s-maxage=86400' },
  })
}
