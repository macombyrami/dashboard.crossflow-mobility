/**
 * MobilityCore (V4)
 * 🌍 Central Orchestrator for Multi-Source Intelligence & Normalization
 * Strictly follows the CTO master mandate for an event-driven Source of Truth.
 */
import type { City, TrafficSnapshot, Incident, ContextFactors, IntelligenceResult } from '@/types'
import { calculateV4TrafficScore, calculateSeverity, getMobilityInsight } from './TrafficScoreService'

export interface MobilityState {
  currentSnapshot: TrafficSnapshot | null
  typicalSnapshot: TrafficSnapshot | null // Historical baseline
  incidents:       Incident[]
  socialPulse:     number // 0-1
  weatherImpact:   'none' | 'minor' | 'moderate' | 'severe'
  lastUpdated:     string
}

export class MobilityCore {
  private static instance: MobilityCore
  private state: MobilityState = {
    currentSnapshot: null,
    typicalSnapshot: null,
    incidents:       [],
    socialPulse:     0,
    weatherImpact:   'none',
    lastUpdated:     new Date().toISOString()
  }

  private constructor() {}

  public static getInstance(): MobilityCore {
    if (!MobilityCore.instance) {
      MobilityCore.instance = new MobilityCore()
    }
    return MobilityCore.instance
  }

  /**
   * Normalizes incoming raw traffic data using the Intelligence Engine.
   * Cross-references with Weather and Social signals.
   */
  public normalizeTraffic(raw: TrafficSnapshot, typical: TrafficSnapshot | null): TrafficSnapshot {
    const typicalIndex = new Map<string, number>()
    if (typical?.segments?.length) {
      for (const seg of typical.segments) {
        typicalIndex.set(seg.id, seg.congestionScore)
      }
    }

    const context: ContextFactors = {
      weatherImpact: this.state.weatherImpact,
      eventIntensity: this.state.incidents.some(i => i.severity === 'critical') ? 0.8 : 0,
      hourOfDay:      new Date(raw.fetchedAt).getHours(),
      isWeekend:      [0, 6].includes(new Date(raw.fetchedAt).getDay()),
      publicTransportLoad: 0.1, // Placeholder for RATP integration
      socialPulse:    this.state.socialPulse
    }

    const normalizedSegments = raw.segments.map(s => {
      const typicalScore = typicalIndex.get(s.id) ?? 0.3
      const intel = calculateV4TrafficScore(s.congestionScore, typicalScore, context)
      
      return {
        ...s,
        congestionScore: intel.score,
        level:           intel.level,
        // GIS Metadata (V4 Requirement)
        arrondissement: s.arrondissement || 'Non_disponible',
        status:          getMobilityInsight(intel)
      }
    })

    return {
      ...raw,
      segments: normalizedSegments,
      fetchedAt: new Date().toISOString()
    }
  }

  /**
   * Updates the core social signal from NLP analysis
   */
  public updateSocialPulse(intensity: number) {
    this.state.socialPulse = Math.max(0, Math.min(1, intensity))
    this.state.lastUpdated = new Date().toISOString()
  }

  /**
   * Updates the core weather signal
   */
  public updateWeather(impact: 'none' | 'minor' | 'moderate' | 'severe') {
    this.state.weatherImpact = impact
    this.state.lastUpdated = new Date().toISOString()
  }

  /**
   * Adds critical incidents to the intelligence pool
   */
  public setIncidents(incidents: Incident[]) {
    this.state.incidents = incidents
    this.state.lastUpdated = new Date().toISOString()
  }

  public getState(): MobilityState {
    return { ...this.state }
  }
}

export const mobilityCore = MobilityCore.getInstance()
