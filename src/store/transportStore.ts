import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export interface TransportLineDetail {
  id: string
  number: string
  name: string
  mode: 'metro' | 'rer' | 'tram' | 'bus'
  color: string
  coordinates: [number, number][] // [lng, lat][]
  stations: {
    id: string
    name: string
    coord: [number, number]
    passengers: number
    platforms: number
  }[]
  currentLoad: number
  nextTrainMinutes: number
  schedule: {
    departureTime: string
    destination: string
    delay: number
  }[]
  disruption: string | null
  status: 'normal' | 'delayed' | 'disrupted'
  estimatedPassengers: number
}

interface TransportStore {
  // Line data
  metroLines: TransportLineDetail[]
  rerLines: TransportLineDetail[]
  tramLines: TransportLineDetail[]
  busLines: TransportLineDetail[]

  // Filters
  minLoadPercent: number
  setMinLoadPercent: (percent: number) => void

  // Selection & hover
  selectedLineId: string | null
  setSelectedLine: (id: string | null) => void
  hoveredLineId: string | null
  setHoveredLine: (id: string | null) => void

  // Loading & errors
  isLoading: boolean
  setIsLoading: (loading: boolean) => void
  error: string | null
  setError: (error: string | null) => void

  // Data updates
  setMetroLines: (lines: TransportLineDetail[]) => void
  setRerLines: (lines: TransportLineDetail[]) => void
  setTramLines: (lines: TransportLineDetail[]) => void
  setBusLines: (lines: TransportLineDetail[]) => void

  // Get top lines for a mode
  getTopLines: (mode: 'metro' | 'rer' | 'tram' | 'bus', limit?: number) => TransportLineDetail[]

  // Reset
  resetAll: () => void
}

const initialState = {
  metroLines: [],
  rerLines: [],
  tramLines: [],
  busLines: [],
  minLoadPercent: 0,
  selectedLineId: null,
  hoveredLineId: null,
  isLoading: false,
  error: null,
}

export const useTransportStore = create<TransportStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    setMinLoadPercent: (percent) => set({ minLoadPercent: percent }),
    setSelectedLine: (id) => set({ selectedLineId: id }),
    setHoveredLine: (id) => set({ hoveredLineId: id }),
    setIsLoading: (loading) => set({ isLoading: loading }),
    setError: (error) => set({ error }),

    setMetroLines: (lines) => set({ metroLines: lines }),
    setRerLines: (lines) => set({ rerLines: lines }),
    setTramLines: (lines) => set({ tramLines: lines }),
    setBusLines: (lines) => set({ busLines: lines }),

    getTopLines: (mode, limit = 5) => {
      const state = get()
      let lines: TransportLineDetail[] = []

      switch (mode) {
        case 'metro':
          lines = state.metroLines
          break
        case 'rer':
          lines = state.rerLines
          break
        case 'tram':
          lines = state.tramLines
          break
        case 'bus':
          lines = state.busLines
          break
      }

      return (
        lines
          .filter((line) => line.currentLoad >= state.minLoadPercent)
          .sort((a, b) => b.currentLoad - a.currentLoad)
          .slice(0, limit)
      )
    },

    resetAll: () => set(initialState),
  }))
)
