import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { Incident } from '@/types'

export interface CriticalEvent {
  id: string
  type: 'incident' | 'congestion' | 'transport_overload'
  severity: 'critical' | 'high'
  location: string
  label: string
  impact: 'high' | 'medium'
  timestamp: string
}

export interface TransportLineSummary {
  id: string
  number: string
  name: string
  mode: 'metro' | 'rer' | 'tram' | 'bus'
  loadPercent: number
  passengers: number
  nextVehicleMinutes: number
  status: 'normal' | 'delayed' | 'disrupted'
  color: string
}

interface ControlRoomStore {
  // Global network status
  networkStatus: 'NORMAL' | 'TENSION' | 'CRITICAL'
  avgCongestion: number // 0-100
  activeIncidentCount: number
  transportLoadAverage: number // 0-100
  setNetworkStatus: (status: 'NORMAL' | 'TENSION' | 'CRITICAL') => void
  setAvgCongestion: (value: number) => void
  setActiveIncidentCount: (count: number) => void
  setTransportLoadAverage: (value: number) => void

  // Critical events (top 5 high-impact items)
  criticalEvents: CriticalEvent[]
  setCriticalEvents: (events: CriticalEvent[]) => void
  dismissEvent: (id: string) => void

  // Prediction timeline
  selectedTimeOffset: number // minutes (0, 15, 30, 60)
  setTimeOffset: (minutes: number) => void
  predictionSummary: string
  setPredictionSummary: (text: string) => void

  // Transport overview
  transportTab: 'metro' | 'rer' | 'tram' | 'bus'
  setTransportTab: (tab: 'metro' | 'rer' | 'tram' | 'bus') => void
  busiestLines: TransportLineSummary[]
  setBusiestLines: (lines: TransportLineSummary[]) => void
  hoveredLineId: string | null
  setHoveredLineId: (id: string | null) => void

  // Incident feed
  dismissedIncidentIds: Set<string>
  dismissIncident: (id: string) => void
  undismissIncident: (id: string) => void

  // Simulation
  simulationScenario: string | null
  setSimulationScenario: (scenario: string | null) => void
  isSimulating: boolean
  setIsSimulating: (running: boolean) => void
  simulationResults: { affectedZones: string[]; estimatedDelay: number } | null
  setSimulationResults: (results: { affectedZones: string[]; estimatedDelay: number } | null) => void

  // UI state
  selectedPanelItemId: string | null
  setSelectedPanelItemId: (id: string | null) => void
  panelScrollPosition: number
  setPanelScrollPosition: (position: number) => void
  isLeftPanelExpanded: boolean
  setLeftPanelExpanded: (expanded: boolean) => void

  // Reset all state
  resetAll: () => void
}

const initialState = {
  networkStatus: 'NORMAL' as const,
  avgCongestion: 0,
  activeIncidentCount: 0,
  transportLoadAverage: 0,
  criticalEvents: [],
  selectedTimeOffset: 0,
  predictionSummary: 'Stable sur 45 min',
  transportTab: 'metro' as const,
  busiestLines: [],
  hoveredLineId: null,
  dismissedIncidentIds: new Set<string>(),
  simulationScenario: null,
  isSimulating: false,
  simulationResults: null,
  selectedPanelItemId: null,
  panelScrollPosition: 0,
  isLeftPanelExpanded: true,
}

export const useControlRoomStore = create<ControlRoomStore>()(
  subscribeWithSelector((set) => ({
    ...initialState,

    setNetworkStatus: (status) => set({ networkStatus: status }),
    setAvgCongestion: (value) => set({ avgCongestion: value }),
    setActiveIncidentCount: (count) => set({ activeIncidentCount: count }),
    setTransportLoadAverage: (value) => set({ transportLoadAverage: value }),

    setCriticalEvents: (events) => set({ criticalEvents: events }),
    dismissEvent: (id) =>
      set((state) => ({
        criticalEvents: state.criticalEvents.filter((e) => e.id !== id),
      })),

    setTimeOffset: (minutes) => set({ selectedTimeOffset: minutes }),
    setPredictionSummary: (text) => set({ predictionSummary: text }),

    setTransportTab: (tab) => set({ transportTab: tab }),
    setBusiestLines: (lines) => set({ busiestLines: lines }),
    setHoveredLineId: (id) => set({ hoveredLineId: id }),

    dismissIncident: (id) =>
      set((state) => ({
        dismissedIncidentIds: new Set([...state.dismissedIncidentIds, id]),
      })),
    undismissIncident: (id) =>
      set((state) => {
        const newSet = new Set(state.dismissedIncidentIds)
        newSet.delete(id)
        return { dismissedIncidentIds: newSet }
      }),

    setSimulationScenario: (scenario) => set({ simulationScenario: scenario }),
    setIsSimulating: (running) => set({ isSimulating: running }),
    setSimulationResults: (results) => set({ simulationResults: results }),

    setSelectedPanelItemId: (id) => set({ selectedPanelItemId: id }),
    setPanelScrollPosition: (position) => set({ panelScrollPosition: position }),
    setLeftPanelExpanded: (expanded) => set({ isLeftPanelExpanded: expanded }),

    resetAll: () => set(initialState),
  }))
)
