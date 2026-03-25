/**
 * CrossFlow Predictive Context
 * Agrège tous les signaux contextuels pour enrichir le moteur prévisionnel.
 *
 * Facteurs intégrés:
 *   1. Heure + jour de la semaine  (moteur existant)
 *   2. Calendrier scolaire / jours fériés  ← NOUVEAU
 *   3. Météo + qualité air  ← OpenMeteo (existant)
 *   4. Événements urbains  ← NOUVEAU
 *   5. Saison / mois  ← NOUVEAU
 *   6. Lever/coucher soleil  ← NOUVEAU
 */

import { buildCalendarContext }       from '@/lib/api/calendar'
import { fetchNearbyEvents, eventsToTrafficFactor } from '@/lib/api/events'
import { fetchDisruptions, NavitiaDisruption }    from '@/lib/api/navitia'
import type { OpenMeteoWeather, AirQuality } from '@/lib/api/openmeteo'
import type { City } from '@/types'

export interface PredictiveContext {
  // Raw signals
  calendarFactor:   number
  eventFactor:      number
  weatherFactor:    number
  aqFactor:         number
  transportFactor:  number
  seasonFactor:     number

  // Scientific Scoring
  pressureScore:    number    // 0–1
  pressureLevel:    'LOW' | 'MEDIUM' | 'HIGH'

  // Combined multiplier
  totalFactor:      number

  // Human-readable context for AI
  signals:          PredictiveSignal[]

  // Confidence
  confidence:       number

  // Cache key
  computedAt:       string
}

export interface PredictiveSignal {
  name:      string
  value:     string
  impact:    'positive' | 'negative' | 'neutral'
  factor:    number
  source:    string
}

// ─── Main builder ─────────────────────────────────────────────────────────

export async function buildPredictiveContext(
  city: City,
  weather?: OpenMeteoWeather | null,
  airQuality?: AirQuality | null,
  currentCongestion = 0.3, // default if not provided
): Promise<PredictiveContext> {

  // Parallel fetch of all signals
  const [calCtx, events, disruptions] = await Promise.all([
    buildCalendarContext(city.center.lat, city.center.lng, 'C'),
    fetchNearbyEvents(city.center.lat, city.center.lng, 15),
    fetchDisruptions(city.center.lat, city.center.lng, 8000),
  ])

  const signals: PredictiveSignal[] = []

  // 1. Calendar factor
  const calendarFactor = calCtx.trafficFactor
  for (const r of calCtx.reasons) {
    signals.push({
      name:   'Calendrier',
      value:  r,
      impact: calendarFactor < 1 ? 'positive' : 'negative',
      factor: calendarFactor,
      source: 'data.gouv.fr + education.gouv.fr',
    })
  }
  if (calCtx.sun?.isGoldenHour) {
    signals.push({
      name:   'Soleil',
      value:  `Lever/coucher: risque d'éblouissement`,
      impact: 'negative',
      factor: 1.08,
      source: 'sunrise-sunset.org',
    })
  }

  // 2. Event factor
  const { factor: eventFactor, topEvents } = eventsToTrafficFactor(
    events, city.center.lat, city.center.lng,
  )
  if (topEvents.length > 0) {
    for (const ev of topEvents) {
      signals.push({
        name:   'Événement',
        value:  ev,
        impact: 'negative',
        factor: eventFactor,
        source: 'Paris Open Data / PredictHQ',
      })
    }
  }

  // 3. Transport factor (Navitia)
  const transportFactor = computeTransportFactor(disruptions)
  if (transportFactor > 1.0) {
    const activeLines = disruptions.flatMap(d => d.lines.map(l => l.code)).slice(0, 3)
    signals.push({
      name:   'Transports',
      value:  `Perturbations TC (Lignes: ${activeLines.join(', ')})`,
      impact: 'negative',
      factor: transportFactor,
      source: 'PRIM IDFM',
    })
  }

  // 4. Weather factor
  let weatherFactor = 1.0
  let rainValue = 0
  if (weather) {
    const wf: Record<string, number> = { none: 1.0, minor: 1.08, moderate: 1.20, severe: 1.45 }
    weatherFactor = wf[weather.trafficImpact] ?? 1.0
    rainValue = Math.min(1, (weather.precipitationMm ?? 0) / 10) // normalized 0-1 (10mm = max impact)
    
    if (weatherFactor !== 1.0) {
      signals.push({
        name:   'Météo',
        value:  `${weather.weatherEmoji} ${weather.weatherLabel} — impact ${weather.trafficImpact}`,
        impact: 'negative',
        factor: weatherFactor,
        source: 'Open-Meteo',
      })
    }
  }

  // 5. Air quality factor
  let aqFactor = 1.0
  if (airQuality) {
    aqFactor = 1 + airQuality.trafficImpact
    if (airQuality.trafficImpact > 0) {
      signals.push({
        name:   'Qualité air',
        value:  `IQA EU ${airQuality.aqiEuropean} — ${airQuality.level}`,
        impact: 'negative',
        factor: aqFactor,
        source: 'Open-Meteo Air Quality',
      })
    }
  }

  // 6. Seasonal factor
  const month = new Date().getMonth()
  const isParisArea = city.center.lat > 48 && city.center.lat < 49.5
    && city.center.lng > 1.5 && city.center.lng < 3.5
  const seasonFactor = computeSeasonFactor(month, isParisArea)
  if (Math.abs(seasonFactor - 1.0) > 0.05) {
    const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
    signals.push({
      name:   'Saisonnalité',
      value:  `${monthNames[month]}: facteur ${seasonFactor}`,
      impact: seasonFactor < 1 ? 'positive' : 'negative',
      factor: seasonFactor,
      source: 'Modèle statistique historique',
    })
  }

  // ─── TrafficPressureScore Calculation ─────────────────────────────────────
  // Formula: congestion * 0.4 + rain * 0.2 + disruption * 0.3 + impact * 0.1
  const disruptionValue = (transportFactor - 1.0) / 0.4 // normalized 0-1
  const impactValue     = (eventFactor - 1.0) / 1.2    // normalized (PredictHQ max is around 2.2)
  
  const pressureScore = (currentCongestion * 0.4) + (rainValue * 0.2) + (disruptionValue * 0.3) + (impactValue * 0.1)
  const pressureLevel = pressureScore > 0.7 ? 'HIGH' : pressureScore > 0.4 ? 'MEDIUM' : 'LOW'

  // Combined factor
  const rawFactor = calendarFactor * weatherFactor * aqFactor * seasonFactor * eventFactor * transportFactor
  const totalFactor = Math.max(0.15, Math.min(2.5, Math.round(rawFactor * 100) / 100))

  // Confidence
  let confidence = 0.5
  if (weather)      confidence += 0.15
  if (airQuality)   confidence += 0.05
  if (events.length > 0) confidence += 0.15
  if (disruptions.length > 0) confidence += 0.15
  confidence = Math.min(1, confidence)

  return {
    calendarFactor,
    eventFactor,
    weatherFactor,
    aqFactor,
    transportFactor,
    seasonFactor,
    pressureScore: Math.round(pressureScore * 100) / 100,
    pressureLevel,
    totalFactor,
    signals,
    confidence,
    computedAt: new Date().toISOString(),
  }
}

function computeTransportFactor(disruptions: NavitiaDisruption[]): number {
  if (disruptions.length === 0) return 1.0
  // Peak impact: +25% if major lines are down
  const weight = disruptions.reduce((acc, d) => {
    const priority = d.severity?.priority ?? 5
    if (priority <= 2) return acc + 0.10 // Major
    if (priority <= 4) return acc + 0.05 // Moderate
    return acc + 0.02
  }, 0)
  return Math.min(1.4, 1.0 + weight)
}

// ─── Seasonal factors (based on French traffic statistics) ────────────────

function computeSeasonFactor(month: number, isParisArea: boolean): number {
  // Source: Bison Futé historical averages
  if (isParisArea) {
    const PARIS_SEASONAL = [
      0.88, // Jan  — peu de trafic
      0.90, // Feb
      0.98, // Mar
      1.00, // Apr  — référence
      1.02, // May
      0.98, // Jun
      0.70, // Jul  — Paris se vide
      0.60, // Aug  — creux absolu
      1.10, // Sep  — rentrée choc
      1.05, // Oct
      1.00, // Nov
      0.85, // Dec  — fêtes réduisent déplacements travail
    ]
    return PARIS_SEASONAL[month] ?? 1.0
  }
  // Generic French city (less vacation effect)
  const GENERIC = [0.92, 0.94, 0.98, 1.00, 1.02, 1.00, 0.85, 0.78, 1.08, 1.03, 1.00, 0.90]
  return GENERIC[month] ?? 1.0
}

// ─── Prediction horizon adjustment ───────────────────────────────────────

/**
 * Given a current context, project the factor N minutes into the future.
 * Accounts for events starting/ending and weather changes.
 */
export function projectContextToHorizon(
  ctx: PredictiveContext,
  horizonMin: number,
): number {
  // Simple linear decay toward 1.0 over 2h
  const decayRate = 0.003 * horizonMin  // max 30% decay over 100min
  const projected = 1 + (ctx.totalFactor - 1) * (1 - decayRate)
  return Math.max(0.15, Math.min(2.5, Math.round(projected * 100) / 100))
}

// ─── Summary string for AI prompt ────────────────────────────────────────

export function contextToAISummary(ctx: PredictiveContext): string {
  const lines = [
    `Facteur prévisionnel global: **${ctx.totalFactor}** (confiance ${Math.round(ctx.confidence * 100)}%)`,
    '',
    '**Signaux actifs:**',
    ...ctx.signals.map(s =>
      `- ${s.name}: ${s.value} (×${s.factor}, source: ${s.source})`
    ),
  ]
  return lines.join('\n')
}

/**
 * Standard format for ML models & external exports (as suggested by the user)
 */
export function toStandardFormat(
  ctx: PredictiveContext,
  city: City,
  weather?: OpenMeteoWeather | null,
) {
  return {
    timestamp: ctx.computedAt,
    location: {
      lat: city.center.lat,
      lng: city.center.lng,
    },
    traffic: {
      congestion_level: ctx.totalFactor,
    },
    weather: {
      rain:       weather?.precipitationMm ?? 0,
      visibility: weather?.visibilityM     ?? 10000,
    },
    transport: {
      status: ctx.transportFactor > 1.1 ? 'disrupted' : 'nominal',
      factor: ctx.transportFactor,
    },
    event: {
      impact_score: ctx.eventFactor - 1.0,
    },
    metadata: {
      calendar_factor: ctx.calendarFactor,
      confidence:      ctx.confidence,
      pressure_score:  ctx.pressureScore,
      pressure_level:  ctx.pressureLevel,
    }
  }
}
