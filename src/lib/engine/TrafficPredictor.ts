/**
 * TrafficPredictor Engine (Heuristic v1)
 * Estimates city-wide traffic levels without active API calls
 * Based on historical patterns and current context.
 */

export interface TrafficPrediction {
  congestionLevel: number // 0-100
  label: 'low' | 'moderate' | 'heavy' | 'critical'
  confidence: number // 0-1
}

export class TrafficPredictor {
  /**
   * Predict global city traffic level
   * @param cityId City identifier
   * @param now Current date/time
   * @param weather (Optional) Current weather status
   */
  static predict(cityId: string, now: Date, weather?: string): TrafficPrediction {
    const hour = now.getHours()
    const day = now.getDay() // 0=Sunday, 1=Monday, ...
    const isWeekend = day === 0 || day === 6
    
    let baseScore = 20 // Default night/quiet score
    
    // 1. Morning Rush (7:30 - 9:30)
    if (hour >= 7 && hour <= 9) {
      baseScore = isWeekend ? 35 : 75
      if (hour === 8) baseScore += 10 // Peak of peak
    } 
    // 2. Evening Rush (16:30 - 19:30)
    else if (hour >= 16 && hour <= 19) {
      baseScore = isWeekend ? 45 : 82
      if (hour === 17 || hour === 18) baseScore += 8 // Peak of peak
    }
    // 3. Daytime (9:30 - 16:30)
    else if (hour > 9 && hour < 16) {
      baseScore = isWeekend ? 55 : 45
    }
    // 4. Night (22:00 - 06:00)
    else if (hour >= 22 || hour < 6) {
      baseScore = 12
    }
    
    // 5. Weather Multipliers
    if (weather) {
      const w = weather.toLowerCase()
      if (w.includes('rain') || w.includes('pluie')) baseScore *= 1.15
      if (w.includes('snow') || w.includes('neige')) baseScore *= 1.35
      if (w.includes('storm') || w.includes('orage')) baseScore *= 1.25
    }

    // 6. City specific variance (Mock)
    if (cityId === 'paris') baseScore *= 1.1
    if (cityId === 'lyon' || cityId === 'marseille') baseScore *= 1.05

    const finalScore = Math.min(100, Math.round(baseScore))
    
    return {
      congestionLevel: finalScore,
      label: this.getLabel(finalScore),
      confidence: 0.85 // Heuristic confidence is high for general patterns
    }
  }

  private static getLabel(score: number): TrafficPrediction['label'] {
    if (score < 30) return 'low'
    if (score < 60) return 'moderate'
    if (score < 85) return 'heavy'
    return 'critical'
  }
}
