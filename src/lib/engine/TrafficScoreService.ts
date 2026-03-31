/**
 * TrafficScoreService
 * 🧠 Core Intelligence Engine for Correlation & Weighting
 */
import type { TrafficSegment, CongestionLevel } from '@/types'
import { scoreToCongestionLevel } from '@/lib/utils/congestion'

export interface ContextFactors {
  weatherImpact:  'none' | 'minor' | 'moderate' | 'severe'
  eventIntensity: number // 0 (none) to 1 (major concert/match)
  hourOfDay:      number
  isWeekend:      boolean
  publicTransportLoad: number // 0-1 (e.g. RATP incidents or peak hours)
}

/**
 * Calculates a consolidated "Traffic Score" incorporating multi-source factors.
 * Formula: Score = Base * (1 + WeatherFactor + EventFactor + PTFactor)
 */
export function calculateEnrichedTrafficScore(
  baseCongestion: number,
  context: ContextFactors
): { score: number; level: CongestionLevel; multipliers: Record<string, number> } {
  
  // 1. Weather multiplier (Rain/Snow increases density)
  const weatherMult = 
    context.weatherImpact === 'severe'   ? 0.45 :
    context.weatherImpact === 'moderate' ? 0.25 :
    context.weatherImpact === 'minor'    ? 0.10 : 0
  
  // 2. Local Event multiplier (e.g. Football match at Stade de France)
  const eventMult = context.eventIntensity * 0.50
  
  // 3. Public Transport multiplier (Strike or Breakdown = More cars)
  const ptMult = context.publicTransportLoad * 0.35
  
  // 4. Temporal multiplier (Rush hours amplify all impacts)
  const isRushHour = 
    (!context.isWeekend && ((context.hourOfDay >= 8 && context.hourOfDay <= 10) || (context.hourOfDay >= 17 && context.hourOfDay <= 19)))
  
  const rushHourAmplifier = isRushHour ? 1.4 : 1.0

  // Combine
  const rawScore = baseCongestion * (1 + weatherMult + eventMult + ptMult) * rushHourAmplifier
  const finalScore = Math.min(1, Math.max(0, rawScore))
  
  return {
    score:  Math.round(finalScore * 100) / 100,
    level:  scoreToCongestionLevel(finalScore),
    multipliers: {
      weather: weatherMult,
      event:   eventMult,
      pt:      ptMult,
      rush:    rushHourAmplifier
    }
  }
}

/**
 * Provides qualitative insight based on the score delta
 */
export function getTrafficInsight(current: number, historical: number): string {
  const delta = current - historical
  if (delta > 0.3) return "Congestion majeure inhabituelle"
  if (delta > 0.15) return "Circulation plus dense que la normale"
  if (delta < -0.2) return "Conditions de circulation fluides"
  return "Trafic conforme aux prévisions"
}
