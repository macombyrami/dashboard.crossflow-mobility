import { create } from 'zustand'
import type { TrafficSnapshot, Incident, CityKPIs } from '@/types'
import type { WeatherData } from '@/lib/api/tomtom'
import type { OpenMeteoWeather, AirQuality } from '@/lib/api/openmeteo'

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
  dataSource:           'live' | 'synthetic'

  setSnapshot:          (s: TrafficSnapshot) => void
  setIncidents:         (i: Incident[]) => void
  setSocialIncidents:   (i: Incident[]) => void
  setKPIs:              (k: CityKPIs) => void
  setWeather:           (w: WeatherData | null) => void
  setOpenMeteoWeather:  (w: OpenMeteoWeather | null) => void
  setAirQuality:        (a: AirQuality | null) => void
  setDataSource:        (src: 'live' | 'synthetic') => void
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
  dataSource:           'synthetic',

  setSnapshot:         (s)   => set({ snapshot: s, lastUpdate: new Date() }),
  setIncidents:        (i)   => set((state) => ({ 
    incidents: i.filter(inc => !state.dismissedIncidentIds.has(inc.id)) 
  })),
  setSocialIncidents:  (i)   => set((state) => ({ 
    socialIncidents: i.filter(inc => !state.dismissedIncidentIds.has(inc.id)) 
  })),
  setKPIs:             (k)   => set({ kpis: k }),
  setWeather:          (w)   => set({ weather: w }),
  setOpenMeteoWeather: (w)   => set({ openMeteoWeather: w }),
  setAirQuality:       (a)   => set({ airQuality: a }),
  setDataSource:       (src) => set({ dataSource: src }),
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
    lastUpdate: null, dismissedIncidentIds: new Set(),
  }),
}))
