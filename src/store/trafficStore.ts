import { create } from 'zustand'
import type { TrafficSnapshot, Incident, CityKPIs } from '@/types'
import type { WeatherData } from '@/lib/api/tomtom'
import type { OpenMeteoWeather, AirQuality } from '@/lib/api/openmeteo'
import { mobilityCore } from '@/lib/engine/MobilityCore'

interface TrafficStore {
  snapshot:             TrafficSnapshot | null
  incidents:            Incident[]
  socialIncidents:      Incident[]
  dismissedIncidentIds: Set<string>
  kpis:                 CityKPIs | null
  weather:              WeatherData | null
  openMeteoWeather:     OpenMeteoWeather | null
  airQuality:           AirQuality | null
  lastUpdate:           Date | null
  
  // LIVE Sync metadata (Staff Engineer Feature)
  lastSync:             Date | null
  isSyncing:            boolean
  
  dataSource:           'live' | 'synthetic'

  setSnapshot:          (s: TrafficSnapshot) => void
  setIncidents:         (i: Incident[]) => void
  setSocialIncidents:   (i: Incident[]) => void
  setKPIs:              (k: CityKPIs) => void
  setWeather:           (w: WeatherData | null) => void
  setOpenMeteoWeather:  (w: OpenMeteoWeather | null) => void
  setAirQuality:        (a: AirQuality | null) => void
  setDataSource:        (src: 'live' | 'synthetic') => void
  
  setLastSync:          (d: Date | null) => void
  setIsSyncing:         (b: boolean) => void
  persistSnapshot:      (data: any) => Promise<void>

  clearIncidents:       () => void
  clearAll:             () => void
}

export const useTrafficStore = create<TrafficStore>()((set) => ({
  snapshot:             null,
  incidents:            [],
  socialIncidents:      [],
  dismissedIncidentIds: new Set(),
  kpis:                 null,
  weather:              null,
  openMeteoWeather:     null,
  airQuality:           null,
  lastUpdate:           null,
  lastSync:             null,
  isSyncing:            false,
  dataSource:           'synthetic',

  setSnapshot: (s) => {
    // 🧠 V4 Core Normalization
    const typical = null // In a real system, this would be fetched from history
    const normalized = mobilityCore.normalizeTraffic(s, typical)
    set({ snapshot: normalized, lastUpdate: new Date() })
  },

  setIncidents: (i) => {
    mobilityCore.setIncidents(i)
    set((state) => ({ 
      incidents: i.filter(inc => !state.dismissedIncidentIds.has(inc.id)) 
    }))
  },

  setSocialIncidents: (i) => {
    // Calculate social pulse intensity for the core
    const intensity = Math.min(1, i.length / 10) 
    mobilityCore.updateSocialPulse(intensity)
    
    set((state) => ({ 
      socialIncidents: i.filter(inc => !state.dismissedIncidentIds.has(inc.id)) 
    }))
  },

  setKPIs:             (k)   => set({ kpis: k }),
  setWeather:          (w)   => {
    if (w) {
      mobilityCore.updateWeather(w.trafficImpact)
    }
    set({ weather: w })
  },
  setOpenMeteoWeather: (w)   => set({ openMeteoWeather: w }),
  setAirQuality:       (a)   => set({ airQuality: a }),
  setDataSource:       (src) => set({ dataSource: src }),
  
  setLastSync:         (d)   => set({ lastSync: d }),
  setIsSyncing:        (b)   => set({ isSyncing: b }),

  persistSnapshot: async (data: any) => {
    try {
      const { saveSnapshot } = await import('@/lib/api/snapshots')
      const success = await saveSnapshot(data)
      if (success) {
        set({ lastSync: new Date() })
      }
    } catch (err: any) {
      if (err.message?.includes('Connection closed')) {
        console.warn('[TrafficStore] Persistence connection closed by server (likely DB reset/migration).')
      } else {
        console.error('[TrafficStore] Critical persistence error:', err)
      }
    }
  },

  clearIncidents:      ()    => set((state) => ({ 
    dismissedIncidentIds: new Set([
      ...state.dismissedIncidentIds, 
      ...state.incidents.map(inc => inc.id),
      ...state.socialIncidents.map(inc => inc.id)
    ]),
    incidents: [],
    socialIncidents: []
  })),
  clearAll:            ()    => set({
    snapshot: null, incidents: [], socialIncidents: [], kpis: null,
    weather: null, openMeteoWeather: null, airQuality: null,
    lastUpdate: null, lastSync: null, isSyncing: false, 
    dismissedIncidentIds: new Set(), dataSource: 'synthetic'
  }),
}))
