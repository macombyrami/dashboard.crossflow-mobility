import type { HeatmapPoint } from '@/types'

export interface AggregatedHeatCellProperties {
  intensity: number
  rawIntensity: number
  count: number
  peak: number
  contextLabel: string
  predictedSpike: number
}

export type AggregatedHeatFeatureCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  AggregatedHeatCellProperties
>

type GridCell = {
  id: string
  lng: number
  lat: number
  sum: number
  max: number
  count: number
}

function getCellSizeForZoom(zoomBucket: number): number {
  if (zoomBucket <= 6) return 0.03
  if (zoomBucket <= 8) return 0.016
  if (zoomBucket <= 10) return 0.008
  if (zoomBucket <= 12) return 0.004
  if (zoomBucket <= 14) return 0.002
  return 0.0012
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
  return sorted[index]
}

function normalizeRedCappedIntensity(intensity: number, redGate: number): number {
  if (intensity <= 0) return 0
  if (intensity < redGate) {
    return Math.min(0.78, intensity * 0.92)
  }
  const local = (intensity - redGate) / Math.max(1 - redGate, 0.0001)
  return Math.min(1, 0.82 + local * 0.18)
}

export function aggregateHeatmapToFeatureCollection(
  points: HeatmapPoint[],
  zoomBucket: number,
): AggregatedHeatFeatureCollection {
  const sampled =
    points.length > 2400
      ? points.filter((_, index) => index % Math.ceil(points.length / 2400) === 0)
      : points

  const cellSize = getCellSizeForZoom(zoomBucket)
  const grid = new Map<string, GridCell>()

  for (const point of sampled) {
    if (point.intensity < 0.12) continue

    const gx = Math.floor(point.lng / cellSize)
    const gy = Math.floor(point.lat / cellSize)
    const key = `${gx}:${gy}`
    const weightedIntensity = Math.pow(point.intensity, 1.15)
    const lng = (gx + 0.5) * cellSize
    const lat = (gy + 0.5) * cellSize

    const existing = grid.get(key)
    if (existing) {
      existing.sum += weightedIntensity
      existing.max = Math.max(existing.max, point.intensity)
      existing.count += 1
      continue
    }

    grid.set(key, {
      id: key,
      lng,
      lat,
      sum: weightedIntensity,
      max: point.intensity,
      count: 1,
    })
  }

  const cells = [...grid.values()]
  if (!cells.length) {
    return { type: 'FeatureCollection', features: [] }
  }

  const rawValues = cells.map((cell) => {
    const densityBoost = Math.min(1.35, 0.88 + Math.log2(cell.count + 1) * 0.16)
    return Math.max(cell.max, (cell.sum / cell.count) * densityBoost)
  })

  const p90 = Math.max(0.18, percentile(rawValues, 0.9))
  const normalized = rawValues.map((value) => Math.min(1, value / p90))
  const peakCutoff = Math.max(0.82, percentile(normalized, 0.95))

  const features = cells.flatMap((cell, index) => {
    const rawIntensity = normalized[index]
    if (rawIntensity < 0.18 && cell.count < 2) return []

    const intensity = normalizeRedCappedIntensity(rawIntensity, peakCutoff)
    const peak = intensity >= 0.82 ? 1 : 0
    const predictedSpike = intensity >= 0.9 || (intensity >= 0.74 && cell.count >= 4) ? 1 : 0

    return [{
      type: 'Feature' as const,
      id: cell.id,
      geometry: {
        type: 'Point' as const,
        coordinates: [cell.lng, cell.lat],
      },
      properties: {
        intensity,
        rawIntensity,
        count: cell.count,
        peak,
        contextLabel: predictedSpike ? 'Predicted spike in 30min' : 'High congestion area',
        predictedSpike,
      },
    }]
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}
