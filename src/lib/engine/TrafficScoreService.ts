/**
 * TrafficScoreService (V4)
 * 🧠 Core Intelligence Engine for Correlation, Weighting & Anomaly Detection
 */
import type { TrafficSegment, CongestionLevel, IncidentSeverity } from '@/types'
import { scoreToCongestionLevel } from '@/lib/utils/congestion'

export interface ContextFactors {
  weatherImpact:  'none' | 'minor' | 'moderate' | 'severe'
  eventIntensity: number // 0 to 1
  hourOfDay:      number
  isWeekend:      boolean
  publicTransportLoad: number // 0-1
  socialPulse:    number // 0-1 (derived from NLP anomalies/complaints)
}

export interface IntelligenceResult {
  score:       number
  level:       CongestionLevel
  anomalyScore:number // 0-1 (Current vs Typical)
  multipliers: Record<string, number>
}

/**
 * Calculates a consolidated "Intelligence Score" using a multi-factor weighting engine.
 * V4 adds Social NLP signals and Anomaly Detection metrics.
 */
export function calculateV4TrafficScore(
  baseCongestion: number,
  typicalCongestion: number,
  context: ContextFactors
): IntelligenceResult {
  
  // 🌦️ 1. Weather multiplier (Dynamic based on intensity)
  const weatherMult = 
    context.weatherImpact === 'severe'   ? 0.50 :
    context.weatherImpact === 'moderate' ? 0.30 :
    context.weatherImpact === 'minor'    ? 0.15 : 0
  
  // 🏟️ 2. Local Event multiplier (e.g. Olympics, Matches)
  const eventMult = context.eventIntensity * 0.60
  
  // 🚆 3. Public Transport multiplier (Strike/Breakdown = Modal Shift)
  const ptMult = context.publicTransportLoad * 0.40
  
  // 📱 4. Social Pulse multiplier (Digital signal of physical congestion)
  const socialMult = context.socialPulse * 0.25

  // ⏰ 5. Temporal multiplier (Rush hours amplify all impacts)
  const isMorningRush = !context.isWeekend && context.hourOfDay >= 8 && context.hourOfDay <= 10
  const isEveningRush = !context.isWeekend && context.hourOfDay >= 17 && context.hourOfDay <= 19
  const rushHourAmplifier = (isMorningRush || isEveningRush) ? 1.5 : 1.0

  // 🧠 6. Combine Core Score
  const rawScore = baseCongestion * (1 + weatherMult + eventMult + ptMult + socialMult) * rushHourAmplifier
  const finalScore = Math.min(1, Math.max(0, rawScore))
  
  // 🚨 7. Anomaly Score (Current vs Typical delta)
  // An anomaly is a significant deviation from what's "typical" for this segment
  const anomalyScore = Math.max(0, Math.min(1, (finalScore - typicalCongestion) / (typicalCongestion || 0.1)))

  return {
    score:  Math.round(finalScore * 100) / 100,
    level:  scoreToCongestionLevel(finalScore),
    anomalyScore: Math.round(anomalyScore * 100) / 100,
    multipliers: {
      weather: weatherMult,
      event:   eventMult,
      pt:      ptMult,
      social:  socialMult,
      rush:    rushHourAmplifier,
      base:    baseCongestion
    }
  }
}

/**
 * Determines severity for an incident or anomaly
 */
export function calculateSeverity(anomalyScore: number): IncidentSeverity {
  if (anomalyScore > 0.8) return 'critical'
  if (anomalyScore > 0.5) return 'high'
  if (anomalyScore > 0.2) return 'medium'
  return 'low'
}

/**
 * Staff-Engineer Insight Utility
 */
export function getMobilityInsight(res: IntelligenceResult): string {
  const { anomalyScore, multipliers } = res
  
  if (anomalyScore > 0.4) {
    let reason = "Anomalie détectée."
    if (multipliers.weather > 0.2) reason = "Conditions météo sévères impactant l'axe."
    if (multipliers.event > 0.3)   reason = "Événement local saturant le réseau."
    if (multipliers.social > 0.1)  reason = "Signalements sociaux confirmant l'incident."
    return `🚨 ${reason} (${Math.round(anomalyScore * 100)}% de déviation)`
  }
  
  if (anomalyScore < -0.15) return "✅ Trafic plus fluide que la normale."
  return "🟢 Conditions normales conformes aux prévisions."
}
