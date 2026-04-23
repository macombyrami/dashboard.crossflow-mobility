import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SimulationScenario, SimulationResult, ScenarioType } from '@/types'
import { platformConfig } from '@/config/platform.config'

export const SIMULATION_INTERACTION_MODE = {
  NONE: 'none',
  BLOCK_ROAD: 'block_road',
  ADD_TRAFFIC: 'add_traffic',
  ADD_EVENT: 'add_event',
} as const

export type SimulationInteractionMode = typeof SIMULATION_INTERACTION_MODE[keyof typeof SIMULATION_INTERACTION_MODE]

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
  revision:           number
  bumpRevision:       () => void
  interactionMode:    SimulationInteractionMode
  setInteractionMode:  (mode: SimulationInteractionMode) => void
  trafficLevel:       'light' | 'medium' | 'heavy'
  setTrafficLevel:    (level: 'light' | 'medium' | 'heavy') => void

  // Local simulation state used by /simulation without remote backend
  roadNetwork: GeoJSON.FeatureCollection | null
  setRoadNetwork: (network: GeoJSON.FeatureCollection | null) => void
  blockedEdgeIds: string[]
  trafficEdges: Record<string, 'light' | 'medium' | 'heavy'>
  localEvents: LocalSimulationEvent[]
  blockRoad: (edgeId: string) => void
  unblockRoad: (edgeId: string) => void
  setTrafficEdge: (edgeId: string, level: 'light' | 'medium' | 'heavy') => void
  clearTrafficEdge: (edgeId: string) => void
  addLocalEvent: (event: Omit<LocalSimulationEvent, 'id' | 'createdAt'>) => void
  removeLocalEvent: (eventId: string) => void
  clearLocalEvents: () => void
  resetLocalSimulation: () => void

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
      revision:        0,
      interactionMode: SIMULATION_INTERACTION_MODE.NONE,
      trafficLevel:    'medium',
      status:          'idle',
      lastError:       null,
      roadNetwork:     null,
      blockedEdgeIds:  [],
      trafficEdges:    {},
      localEvents:     [],

      setScenarioType:  (t: ScenarioType) => {
        const cfg = platformConfig.simulation.scenarioConfig[t]
        set({ scenarioType: t, scenarioName: cfg?.label ?? t })
      },
      setScenarioName:    (n: string) => set({ scenarioName: n }),
      setDurationHours:   (h: number) => set({ durationHours: h }),
      setMagnitude:       (m: number) => set({ magnitude: m }),
      setTimeWindow:      (start: number, end: number) => set({ timeWindowStart: start, timeWindowEnd: end }),
      bumpRevision:       () => set(s => ({ revision: s.revision + 1 })),
      setInteractionMode: (mode) => set({ interactionMode: mode }),
      setTrafficLevel:    (level) => set({ trafficLevel: level }),
      setRoadNetwork:     (network) => set({ roadNetwork: network }),
      blockRoad:          (edgeId) => set(state => ({
        blockedEdgeIds: state.blockedEdgeIds.includes(edgeId)
          ? state.blockedEdgeIds
          : [...state.blockedEdgeIds, edgeId],
        trafficEdges: {
          ...state.trafficEdges,
          [edgeId]: state.trafficEdges[edgeId] ?? 'heavy',
        },
      })),
      unblockRoad:        (edgeId) => set(state => {
        const { [edgeId]: _removed, ...rest } = state.trafficEdges
        return {
          blockedEdgeIds: state.blockedEdgeIds.filter(id => id !== edgeId),
          trafficEdges: rest,
        }
      }),
      setTrafficEdge:     (edgeId, level) => set(state => ({
        trafficEdges: {
          ...state.trafficEdges,
          [edgeId]: level,
        },
      })),
      clearTrafficEdge:   (edgeId) => set(state => {
        const { [edgeId]: _removed, ...rest } = state.trafficEdges
        return { trafficEdges: rest }
      }),
      addLocalEvent:      (event) => set(state => ({
        localEvents: [
          {
            id: `evt_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
            createdAt: Date.now(),
            ...event,
          },
          ...state.localEvents,
        ].slice(0, 20),
      })),
      removeLocalEvent:   (eventId) => set(state => ({
        localEvents: state.localEvents.filter(evt => evt.id !== eventId),
      })),
      clearLocalEvents:   () => set({ localEvents: [] }),
      resetLocalSimulation: () => set({
        blockedEdgeIds: [],
        trafficEdges: {},
        localEvents: [],
        roadNetwork: null,
        eventLocation: null,
        locationPickerActive: false,
        interactionMode: SIMULATION_INTERACTION_MODE.NONE,
        lastError: null,
        status: 'ready',
        backendOnline: true,
        graphLoaded: true,
      }),

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

interface LocalSimulationEvent {
  id: string
  createdAt: number
  type: string
  label: string
  lat: number
  lng: number
  radius: number
  affectedEdges: string[]
}
