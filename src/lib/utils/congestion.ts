import { platformConfig } from '@/config/platform.config'
import type { CongestionLevel } from '@/types'

const { congestionThresholds, colors } = platformConfig.traffic

export function scoreToCongestionLevel(score: number): CongestionLevel {
  for (const [level, range] of Object.entries(congestionThresholds)) {
    if (score >= range.min && score < range.max) {
      return level as CongestionLevel
    }
  }
  return 'critical'
}

export function congestionColor(score: number): string {
  const level = scoreToCongestionLevel(score)
  return colors[level]
}

export function congestionLabel(score: number): string {
  const labels: Record<CongestionLevel, string> = {
    free:      'Fluide',
    slow:      'Ralenti',
    congested: 'Congestionné',
    critical:  'Critique',
  }
  return labels[scoreToCongestionLevel(score)]
}

export function formatCongestionPct(score: number): string {
  return `${Math.round(score * 100)}%`
}

export function deltaColor(delta: number): string {
  if (delta < -0.05) return '#00E676'  // improving
  if (delta > 0.05)  return '#FF1744'  // worsening
  return '#8080A0'                      // stable
}

export function formatDelta(delta: number, unit = '%'): string {
  const pct = Math.round(delta * 100)
  return `${pct > 0 ? '+' : ''}${pct}${unit}`
}

export function pollutionLabel(index: number): { label: string; color: string } {
  if (index < 3)  return { label: 'Bon',        color: '#00E676' }
  if (index < 5)  return { label: 'Modéré',     color: '#FFD600' }
  if (index < 7)  return { label: 'Mauvais',    color: '#FF6D00' }
  return               { label: 'Très mauvais', color: '#FF1744' }
}

export function trendIcon(trend: 'improving' | 'stable' | 'worsening'): string {
  return { improving: '↘', stable: '→', worsening: '↗' }[trend]
}
