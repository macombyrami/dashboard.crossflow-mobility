import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface CongestionZone {
  id: string
  coordinates: [number, number][] // polygon
  severity: 'low' | 'medium' | 'high' | 'critical'
  confidence: number // 0-1
  affectedRoads: string[]
  estimatedDelay: number // minutes
}

export interface PredictionSegment {
  segmentId: string
  congestionScore: number // 0-1
  confidence: number // 0-1
  trend: 'improving' | 'stable' | 'worsening'
  estimatedDelay: number // minutes
}

export interface PredictionData {
  timeOffsetMinutes: number
  congestionZones: CongestionZone[]
  affectedSegments: PredictionSegment[]
  affectedIncidents: string[] // incident IDs
  affectedLines: string[] // transport line IDs
  confidence: number
  summary: string
  recommendation: string
}

interface PredictionStore {
  // Predictions map: offset minutes -> prediction data
  predictions: Map<number, PredictionData>

  // Current prediction (based on selected time offset)
  currentPrediction: PredictionData | null
  setCurrentPrediction: (prediction: PredictionData | null) => void

  // Loading & errors
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void

  // Last fetch timestamp
  lastFetchedAt: Date | null
  setLastFetchedAt: (date: Date | null) => void

  // Data management
  setPrediction: (timeOffset: number, prediction: PredictionData) => void
  getPrediction: (timeOffset: number) => PredictionData | null
  setPredictions: (predictions: Map<number, PredictionData>) => void

  // Cache control
  isCacheValid: (maxAgeMinutes?: number) => boolean
  clearCache: () => void

  // Reset
  resetAll: () => void
}

const CACHE_VALIDITY_MINUTES = 5

const initialState = {
  predictions: new Map<number, PredictionData>(),
  currentPrediction: null,
  isLoading: false,
  error: null,
  lastFetchedAt: null,
}

export const usePredictionStore = create<PredictionStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setCurrentPrediction: (prediction) => set({ currentPrediction: prediction }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),
    setLastFetchedAt: (date) => set({ lastFetchedAt: date }),

    setPrediction: (timeOffset, prediction) =>
      set((state) => ({
        predictions: new Map(state.predictions).set(timeOffset, prediction),
      })),

    getPrediction: (timeOffset) => {
      return get().predictions.get(timeOffset) || null
    },

    setPredictions: (predictions) => set({ predictions }),

    isCacheValid: (maxAgeMinutes = CACHE_VALIDITY_MINUTES) => {
      const state = get()
      if (!state.lastFetchedAt) return false
      const ageMinutes = (Date.now() - state.lastFetchedAt.getTime()) / 60000
      return ageMinutes < maxAgeMinutes
    },

    clearCache: () =>
      set({
        predictions: new Map(),
        currentPrediction: null,
        lastFetchedAt: null,
      }),

    resetAll: () => set(initialState),
  }))
)
