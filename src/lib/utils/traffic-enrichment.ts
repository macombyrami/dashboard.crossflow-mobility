import { TrafficSegment } from '@/types'
import { findArrondissement } from '@/lib/data/paris_districts'

/**
 * Maps a bearing in degrees (0-360) to a French cardinal direction
 */
export function getHeadingLabel(deg: number | string | undefined): string {
  if (deg === undefined || deg === '') return 'N/a'
  const d = typeof deg === 'string' ? parseFloat(deg) : deg
  if (isNaN(d)) return 'N/a'

  // Standard 8 directions
  const dirs = [
    'Nord', 'Nord-Est', 'Est', 'Sud-Est', 
    'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'
  ]
  const index = Math.round(d / 45) % 8
  return dirs[index]
}

/**
 * Provides a short code for directions (N, NE, E...)
 */
export function getHeadingCode(deg: number | string | undefined): string {
  const labels: Record<string, string> = {
    'Nord': 'N', 'Nord-Est': 'NE', 'Est': 'E', 'Sud-Est': 'SE',
    'Sud': 'S', 'Sud-Ouest': 'SO', 'Ouest': 'O', 'Nord-Ouest': 'NO'
  }
  const full = getHeadingLabel(deg)
  return labels[full] ?? '?'
}

/**
 * Enriches a raw segment with structured naming and location data
 */
export function enrichTrafficSegment(segment: TrafficSegment): TrafficSegment {
  // 1. Determine local context (Paris Arrondissement)
  const [lng, lat] = segment.coordinates[0] || [0, 0]
  const dist = findArrondissement(lng, lat)
  
  // 2. Normalize Street Name
  const rawName = segment.name || segment.streetName || 'Voie anonyme'
  const cleanName = rawName
    .replace(/^FR:/, '')
    .replace(' (Ramp)', '')
    .trim()

  // 3. Direction
  // Estimate bearing if missing using start/end coords
  let bearing: number | undefined = undefined
  if (segment.coordinates.length >= 2) {
    const start = segment.coordinates[0]
    const end = segment.coordinates[segment.coordinates.length - 1]
    bearing = (Math.atan2(end[0] - start[0], end[1] - start[1]) * 180 / Math.PI + 360) % 360
  }
  const dir = getHeadingLabel(bearing)

  // 4. Construct Human-Readable Axe Name
  // Format: "Boulevard Périphérique — Sud-Est — 16e arr."
  const contextLabel = dist ? ` — ${dist.id}${dist.id === 1 ? 'er' : 'e'} arr.` : ''
  const fullAxisName = `${cleanName} — ${dir}${contextLabel}`

  // 5. Detect Priority Axis Score (Heuristic)
  const typeWeights: Record<string, number> = {
    motorway: 1.0, 
    trunk: 0.9, 
    primary: 0.8, 
    secondary: 0.6, 
    tertiary: 0.4
  }
  const priority = typeWeights[segment.roadType ?? 'tertiary'] ?? 0.2

  return {
    ...segment,
    streetName:     cleanName,
    arrondissement: dist ? dist.name : undefined,
    direction:      getHeadingCode(bearing),
    axisName:       fullAxisName,
    priorityAxis:   priority,
    // Detect intersection presence (shared coordinates logic would be here)
    isIntersection: (segment.id.includes('int') || segment.name?.includes('Carrefour')),
    flowTrend:      segment.congestionScore > 0.6 ? 'worsening' : segment.congestionScore < 0.2 ? 'improving' : 'stable',
  }
}

/**
 * Mass enrichment function for snapshots
 */
export function enrichSnapshot(segments: TrafficSegment[]): TrafficSegment[] {
  return segments.map(enrichTrafficSegment)
}
