import { create } from 'zustand'
import type { TrafficSnapshot, TrafficSummary, Incident, CityKPIs } from '@/types'
import type { WeatherData } from '@/lib/api/tomtom'
import type { OpenMeteoWeather, AirQuality } from '@/lib/api/openmeteo'
import { mobilityCore } from '@/lib/engine/MobilityCore'

interface TrafficStore {
  snapshot:             TrafficSnapshot | null
  trafficSummary:       TrafficSummary | null
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

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function buildTrafficSummary(snapshot: TrafficSnapshot | null, incidents: Incident[], dataSource: 'live' | 'synthetic'): TrafficSummary | null {
  if (!snapshot) return null

  const segmentCount = snapshot.segments.length > 0
    ? snapshot.segments.length
    : snapshot.heatmap.length > 0
      ? Math.max(1, Math.round(snapshot.heatmap.length / 3))
      : 0

  const segmentCongestion = snapshot.segments.length > 0
    ? average(snapshot.segments.map(seg => seg.congestionScore))
    : snapshot.heatmap.length > 0
      ? average(snapshot.heatmap.map(pt => pt.intensity))
      : 0

  const alertCount = incidents.length
  const congestionRate = Math.max(0, Math.min(1, segmentCongestion))
  const hasStructuredData = segmentCount > 0 || alertCount > 0

  if (!hasStructuredData) {
    return {
      segmentCount: 0,
      avgCongestion: 0,
      alertCount: 0,
      trafficStatus: 'fluid',
      trafficLabel: 'No data available',
      predictionLabel: 'No data available',
      predictionDeltaPct: 0,
      updatedAt: snapshot.fetchedAt,
      hasData: false,
    }
  }

  const trafficStatus: TrafficSummary['trafficStatus'] =
    congestionRate >= 0.75 || alertCount >= 4
      ? 'critical'
      : congestionRate >= 0.38 || alertCount >= 2
        ? 'moderate'
        : 'fluid'

  const trafficLabel =
    trafficStatus === 'critical' ? 'Trafic critique' :
    trafficStatus === 'moderate' ? 'Trafic modéré' :
    'Trafic fluide'

  const predicted = Math.max(0, Math.min(1, congestionRate + 0.18 + Math.min(0.12, alertCount * 0.02)))
  const predictionDeltaPct = Math.max(0, Math.round((predicted - congestionRate) * 100))
  const predictionLabel = predictionDeltaPct === 0
    ? 'Stable sur 45 min'
    : `+${predictionDeltaPct}% dans 45 min`

  return {
    segmentCount,
    avgCongestion: Math.round(congestionRate * 100) / 100,
    alertCount,
    trafficStatus,
    trafficLabel,
    predictionLabel,
    predictionDeltaPct,
    updatedAt: snapshot.fetchedAt,
    hasData: true,
  }
}

export const useTrafficStore = create<TrafficStore>()((set, get) => ({
  snapshot:             null,
  trafficSummary:       null,
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
    const currentIncidents = [...get().incidents, ...get().socialIncidents]
    const dataSource = get().dataSource
    set({
      snapshot: normalized,
      trafficSummary: buildTrafficSummary(normalized, currentIncidents, dataSource),
      lastUpdate: new Date(),
    })
  },

  setIncidents: (i) => {
    mobilityCore.setIncidents(i)
    set((state) => {
      const incidents = i.filter(inc => !state.dismissedIncidentIds.has(inc.id))
      const allIncidents = [...incidents, ...state.socialIncidents]
      return {
        incidents,
        trafficSummary: buildTrafficSummary(state.snapshot, allIncidents, state.dataSource),
      }
    })
  },

  setSocialIncidents: (i) => {
    // Calculate social pulse intensity for the core
    const intensity = Math.min(1, i.length / 10) 
    mobilityCore.updateSocialPulse(intensity)
    
    set((state) => {
      const socialIncidents = i.filter(inc => !state.dismissedIncidentIds.has(inc.id))
      const allIncidents = [...state.incidents, ...socialIncidents]
      return {
        socialIncidents,
        trafficSummary: buildTrafficSummary(state.snapshot, allIncidents, state.dataSource),
      }
    })
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
  setDataSource:       (src) => set((state) => ({
    dataSource: src,
    trafficSummary: buildTrafficSummary(state.snapshot, [...state.incidents, ...state.socialIncidents], src),
  })),
  
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
    socialIncidents: [],
    trafficSummary: buildTrafficSummary(state.snapshot, [], state.dataSource),
  })),
  clearAll:            ()    => set({
    snapshot: null, incidents: [], socialIncidents: [], kpis: null,
    weather: null, openMeteoWeather: null, airQuality: null,
    lastUpdate: null, lastSync: null, isSyncing: false, 
    dismissedIncidentIds: new Set(), dataSource: 'synthetic',
    trafficSummary: null,
  }),
}))
