import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationScenario, SimulationResult, ScenarioType } from '@/types'
import { platformConfig } from '@/config/platform.config'

interface SimulationStore {
  // Current scenario builder
  scenarioType:    ScenarioType
  scenarioName:    string
  durationHours:   number
  magnitude:       number // 0.3–2.0, user-defined intensity
  timeWindowStart: number
  timeWindowEnd:   number
  
  // Engine lifecycle status
  status: 'idle' | 'initializing' | 'ready' | 'error'
  lastError: string | null

  setScenarioType:    (t: ScenarioType) => void
  setScenarioName:    (n: string) => void
  setDurationHours:   (h: number) => void
  setMagnitude:       (m: number) => void
  setTimeWindow:      (start: number, end: number) => void

  // Build scenario object
  buildScenario:    () => SimulationScenario

  // Run state
  isRunning:  boolean
  progress:   number
  setRunning: (r: boolean) => void
  setProgress:(p: number) => void

  // Results history
  results:     SimulationResult[]
  currentResult: SimulationResult | null
  addResult:   (r: SimulationResult) => void
  setCurrentResult: (r: SimulationResult | null) => void
  clearResults:() => void

  // Backend state
  graphLoaded:   boolean
  backendOnline: boolean
  setGraphLoaded: (l: boolean) => void
  setBackendOnline:(o: boolean) => void
  setEngineStatus: (s: 'idle' | 'initializing' | 'ready' | 'error') => void
  setLastError: (err: string | null) => void

  // Event location picker (map click to place simulation zone)
  eventLocation:         { lat: number; lng: number } | null
  locationPickerActive:  boolean
  setEventLocation:      (loc: { lat: number; lng: number } | null) => void
  setLocationPickerActive: (active: boolean) => void
}


export const useSimulationStore = create<SimulationStore>()(
  persist(
    (set, get) => ({
      scenarioType:    'road_closure',
      scenarioName:    'Ma simulation',
      durationHours:   2,
      magnitude:       1.0,
      timeWindowStart: 8,
      timeWindowEnd:   10,
      status:          'idle',
      lastError:       null,

      setScenarioType:  (t: ScenarioType) => {
        const cfg = platformConfig.simulation.scenarioConfig[t]
        set({ scenarioType: t, scenarioName: cfg?.label ?? t })
      },
      setScenarioName:    (n: string) => set({ scenarioName: n }),
      setDurationHours:   (h: number) => set({ durationHours: h }),
      setMagnitude:       (m: number) => set({ magnitude: m }),
      setTimeWindow:      (start: number, end: number) => set({ timeWindowStart: start, timeWindowEnd: end }),

      buildScenario: (): SimulationScenario => {
        const s = get() as SimulationStore
        return {
          type:               s.scenarioType,
          name:               s.scenarioName,
          description:        platformConfig.simulation.scenarioConfig[s.scenarioType]?.description ?? '',
          params:             { magnitude: s.magnitude },
          affectedSegmentIds: [],
          timeWindowStart:    s.timeWindowStart,
          timeWindowEnd:      s.timeWindowEnd,
          durationHours:      s.durationHours,
        }
      },

      isRunning:  false,
      progress:   0,
      setRunning: (r: boolean) => set({ isRunning: r }),
      setProgress:(p: number) => set({ progress: p }),

      results:       [],
      currentResult: null,
      addResult:     (r: SimulationResult) => set(s => ({ results: [r, ...(s as SimulationStore).results].slice(0, 20) })),
      setCurrentResult: (r: SimulationResult | null) => set({ currentResult: r }),
      clearResults:  () => set({ results: [], currentResult: null }),

      graphLoaded:   false,
      backendOnline: false,
      setGraphLoaded: (l: boolean) => set({ graphLoaded: l }),
      setBackendOnline:(o: boolean) => set({ backendOnline: o }),
      setEngineStatus: (s) => set({ status: s }),
      setLastError: (err) => set({ lastError: err }),

      eventLocation:        null,
      locationPickerActive: false,
      setEventLocation:     (loc) => set({ eventLocation: loc, locationPickerActive: false }),
      setLocationPickerActive: (active) => set({ locationPickerActive: active }),
    }),

    {
      name: 'cf-simulation-storage',
      partialize: (state) => ({
        results:       state.results,
        scenarioType:  state.scenarioType,
        scenarioName:  state.scenarioName,
        magnitude:     state.magnitude,
        durationHours: state.durationHours,
      } as SimulationStore),
    }
  )
)
