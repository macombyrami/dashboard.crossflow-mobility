import { TrafficLine } from '@/lib/api/ratp'

export interface TransitMetrics {
  freqMin: number
  capacityPph: number
  loadPct: number
  nextMin: number
  paxPerHour: number
}

export interface NetworkInsight {
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
  action?: string
}

export interface TransportIntelligenceSnapshot {
  globalScore: number
  trend: 'stable' | 'improving' | 'degrading'
  insights: NetworkInsight[]
  prediction30m: {
    loadPct: number
    label: string
    trend: 'up' | 'down' | 'stable'
  }
  topLines: { id: string; name: string; loadPct: number; slug: string; color: string }[]
  flopLines: { id: string; name: string; loadPct: number; slug: string; color: string }[]
  recommendations: string[]
}

/**
 * TransportIntelligence Engine
 * Transforms descriptive traffic data into operational urban insights.
 */
export class TransportIntelligence {
  
  static calculateSnapshot(
    lines: TrafficLine[],
    metrics: Map<string, TransitMetrics>,
    now: Date
  ): TransportIntelligenceSnapshot {
    
    const allMetrics = Array.from(metrics.values())
    const avgLoad = allMetrics.length 
      ? allMetrics.reduce((a, b) => a + b.loadPct, 0) / allMetrics.length 
      : 0
    
    const disruptedCount = lines.filter(l => l.status !== 'normal').length
    const criticalLines = lines.filter(l => (metrics.get(l.id)?.loadPct ?? 0) > 80)
    
    // 1. Global Score (0-100)
    // Formula: 100 - (avgLoad * 0.6 + (disruptedCount / lines.length * 100) * 0.4)
    const penaltyDisruption = lines.length ? (disruptedCount / lines.length) * 50 : 0
    const globalScore = Math.max(0, Math.min(100, Math.round(100 - (avgLoad * 0.5 + penaltyDisruption))))
    
    // 2. Trend (Simulated based on rush hours)
    const h = now.getHours()
    const isEnteringRush = (h >= 7 && h < 8) || (h >= 16 && h < 17)
    const isLeavingRush = (h >=9 && h < 10) || (h >= 19 && h < 20)
    const trend = isEnteringRush ? 'degrading' : isLeavingRush ? 'improving' : 'stable'
    
    // 3. Top / Flop Lines
    const sortedLines = [...lines]
      .filter(l => metrics.has(l.id))
      .sort((a, b) => (metrics.get(b.id)?.loadPct ?? 0) - (metrics.get(a.id)?.loadPct ?? 0))
    
    const flopLines = sortedLines.slice(0, 3).map(l => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      color: l.color,
      loadPct: metrics.get(l.id)!.loadPct
    }))
    
    const topLines = sortedLines.slice(-3).reverse().map(l => ({
      id: l.id,
      name: l.name,
      slug: l.slug,
      color: l.color,
      loadPct: metrics.get(l.id)!.loadPct
    }))

    // 4. Insights & Predictions
    const insights: NetworkInsight[] = []
    if (disruptedCount > 0) {
      insights.push({
        type: 'error',
        message: `${disruptedCount} incidents majeurs impactent la fluidité inter-quartiers.`,
        action: 'Prioriser le report modal'
      })
    }
    
    if (criticalLines.length > 0) {
      insights.push({
        type: 'warning',
        message: `${criticalLines.length} lignes en zone critique (>80%). Risque de saturation locale.`,
        action: 'Surveillance accrue'
      })
    } else if (avgLoad < 40) {
      insights.push({
        type: 'success',
        message: 'Réseau fluide. Capacité résiduelle optimale sur l\'ensemble des axes.',
        action: 'Opérations normales'
      })
    }

    const predictionLoad = isEnteringRush ? avgLoad + 12 : isLeavingRush ? avgLoad - 8 : avgLoad + (Math.random() * 4 - 2)
    const prediction30m = {
      loadPct: Math.round(Math.min(99, Math.max(5, predictionLoad))),
      label: isEnteringRush ? 'Convergence vers pic' : isLeavingRush ? 'Décroissance' : 'Stabilité prévue',
      trend: isEnteringRush ? 'up' : isLeavingRush ? 'down' : 'stable' as any
    }

    // 5. Actionable Recommendations
    const recommendations: string[] = []
    if (criticalLines.some(l => l.type === 'rers')) {
      recommendations.push('Redistribuer les flux RER vers les lignes de métro parallèles.')
    }
    if (avgLoad > 70) {
      recommendations.push('Activer le plan de régulation zone dense (Niveau 2).')
    }
    if (disruptedCount > 3) {
      recommendations.push('Informer les usagers des itinéraires bis via Social NLP.')
    }
    if (recommendations.length === 0) {
      recommendations.push('Maintenir la fréquence actuelle. Aucune intervention requise.')
    }

    return {
      globalScore,
      trend,
      insights,
      prediction30m,
      topLines,
      flopLines,
      recommendations: recommendations.slice(0, 3)
    }
  }
}
