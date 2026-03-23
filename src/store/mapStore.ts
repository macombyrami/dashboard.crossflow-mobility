import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import type { TrafficMode, MapLayerId, MapViewState, City } from '@/types'
import { CITIES, DEFAULT_CITY_ID } from '@/config/cities.config'
import { platformConfig } from '@/config/platform.config'
import type { GeocodingResult } from '@/lib/api/geocoding'

// Convert a geocoding result to a City object
export function geocodingToCity(r: GeocodingResult): City {
  const flagMap: Record<string, string> = {
    FR: '🇫🇷', GB: '🇬🇧', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹',
    US: '🇺🇸', JP: '🇯🇵', CN: '🇨🇳', BR: '🇧🇷', MA: '🇲🇦',
    NL: '🇳🇱', BE: '🇧🇪', CH: '🇨🇭', PT: '🇵🇹', PL: '🇵🇱',
    AE: '🇦🇪', SG: '🇸🇬', AU: '🇦🇺', CA: '🇨🇦', MX: '🇲🇽',
    DZ: '🇩🇿', TN: '🇹🇳', EG: '🇪🇬', NG: '🇳🇬', ZA: '🇿🇦',
    IN: '🇮🇳', KR: '🇰🇷', TR: '🇹🇷', RU: '🇷🇺', SE: '🇸🇪',
  }
  return {
    id:          `geo-${r.id}`,
    name:        r.name,
    country:     r.country,
    countryCode: r.countryCode,
    center:      { lat: r.lat, lng: r.lng },
    zoom:        r.zoom,
    timezone:    'UTC',
    bbox:        r.bbox,
    population:  0,
    flag:        flagMap[r.countryCode] ?? '🌍',
  }
}

interface MapStore {
  // City
  city:          City
  cityHistory:   City[]   // last searched cities
  setCity:       (city: City) => void
  addToHistory:  (city: City) => void

  // Mode
  mode:    TrafficMode
  setMode: (mode: TrafficMode) => void

  // Layers
  activeLayers: Set<MapLayerId>
  toggleLayer:  (layer: MapLayerId) => void
  setLayer:     (layer: MapLayerId, active: boolean) => void

  // Viewport
  viewState:    MapViewState
  setViewState: (vs: MapViewState) => void
  flyToCity:    (city: City) => void

  // Selection
  selectedSegmentId: string | null
  selectSegment:     (id: string | null) => void

  // Timeline
  timeOffsetMinutes: number
  setTimeOffset:     (min: number) => void

  // UI
  isPanelOpen:   boolean
  setPanelOpen:  (open: boolean) => void
  isAIPanelOpen: boolean
  setAIPanelOpen:(open: boolean) => void
  isMapReady:    boolean
  setMapReady:   (ready: boolean) => void
}

const defaultCity = CITIES.find(c => c.id === DEFAULT_CITY_ID)!

export const useMapStore = create<MapStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      city:        defaultCity,
      cityHistory: CITIES.slice(0, 5),
      setCity: (city) => {
        set({ city, selectedSegmentId: null })
        get().addToHistory(city)
        get().flyToCity(city)
      },
      addToHistory: (city) =>
        set(s => ({
          cityHistory: [city, ...s.cityHistory.filter(c => c.id !== city.id)].slice(0, 10),
        })),

      mode:    'live',
      setMode: (mode) => set({ mode, selectedSegmentId: null }),

      activeLayers: new Set<MapLayerId>(['traffic', 'incidents']),
      toggleLayer: (layer) =>
        set(s => {
          const next = new Set(s.activeLayers)
          next.has(layer) ? next.delete(layer) : next.add(layer)
          return { activeLayers: next }
        }),
      setLayer: (layer, active) =>
        set(s => {
          const next = new Set(s.activeLayers)
          active ? next.add(layer) : next.delete(layer)
          return { activeLayers: next }
        }),

      viewState: {
        longitude: defaultCity.center.lng,
        latitude:  defaultCity.center.lat,
        zoom:      defaultCity.zoom,
        pitch:     30,
        bearing:   0,
      },
      setViewState: (vs) => set({ viewState: vs }),
      flyToCity: (city) =>
        set({
          viewState: {
            longitude: city.center.lng,
            latitude:  city.center.lat,
            zoom:      city.zoom,
            pitch:     30,
            bearing:   0,
          },
        }),

      selectedSegmentId: null,
      selectSegment:     (id) => set({ selectedSegmentId: id, isPanelOpen: id !== null }),

      timeOffsetMinutes: 0,
      setTimeOffset:     (min) => set({ timeOffsetMinutes: min }),

      isPanelOpen:    false,
      setPanelOpen:   (open) => set({ isPanelOpen: open }),
      isAIPanelOpen:  false,
      setAIPanelOpen: (open) => set({ isAIPanelOpen: open }),
      isMapReady:     false,
      setMapReady:    (ready) => set({ isMapReady: ready }),
    })),
    {
      name: 'cf-map-storage',
      // Since activeLayers is a Set, we need to handle its serialization
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const data = JSON.parse(str)
          if (data.state && data.state.activeLayers) {
            data.state.activeLayers = new Set(data.state.activeLayers)
          }
          return data
        },
        setItem: (name, value) => {
          const data = { ...value }
          if (data.state && data.state.activeLayers instanceof Set) {
            // @ts-ignore
            data.state.activeLayers = Array.from(data.state.activeLayers)
          }
          localStorage.setItem(name, JSON.stringify(data))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      // We only want to persist some parts of the store
      partialize: (state) => ({
        city:         state.city,
        cityHistory:  state.cityHistory,
        activeLayers: state.activeLayers,
        mode:         state.mode,
      } as MapStore), // Cast to satisfy the expected type, though only data is returned
    }
  )
)
