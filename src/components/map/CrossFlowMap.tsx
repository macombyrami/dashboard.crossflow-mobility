'use client'
import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useSimulationStore } from '@/store/simulationStore'
import { SIMULATION_INTERACTION_MODE } from '@/store/simulationStore'
import { simulationService } from '@/lib/services/SimulationService'
import { predictiveApi } from '@/lib/api/predictive'
import { platformConfig } from '@/config/platform.config'
import { congestionColor, scoreToCongestionLevel } from '@/lib/utils/congestion'
import { cn } from '@/lib/utils/cn'
import { AlertTriangle } from 'lucide-react'
import { VehicleInfoCard } from '@/components/map/VehicleInfoCard'
import { VehicleFilterPanel } from '@/components/map/VehicleFilterPanel'
import { MapSplitSlider } from '@/components/map/MapSplitSlider'
import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import LayerControls from '@/components/map/controls/LayerControls'
import MapLegend from '@/components/map/MapLegend'
import { saveSnapshot } from '@/lib/api/snapshots'
import { toast } from 'sonner'
import { GeolocationControl } from '@/components/map/controls/GeolocationControl'
import type { UserPosition } from '@/hooks/useGeolocation'

import {
  generateTrafficSnapshot,
  generateIncidents,
  generateTrafficFromOSMRoads,
  generateCityKPIs,
  generateTrafficFromIdfGeoJSON,
} from '@/lib/engine/traffic.engine'
import {
  fetchRoads,
  fetchTrafficPOIs,
  fetchRouteGeometries,
  fetchMetroStations,
} from '@/lib/api/overpass'
import {
  fetchSytadinKPIs,
  generateSytadinKPIs,
  generateSytadinTravelTimes,
  fetchAndInjectSytadinIncidents,
  isIdfCity,
} from '@/lib/engine/sytadin.engine'
import type { OSMRoad, OSMPOIPoint, OSMRouteGeometry, MetroStation } from '@/lib/api/overpass'
import { fetchAllTrafficStatus, LINE_COLORS } from '@/lib/api/ratp'
import { simulateTransitVehicles, type TransitVehicle } from '@/lib/engine/transit.engine'
import {
  hasKey,
  getTrafficFlowTileUrl,
  getTrafficIncidentTileUrl,
  fetchFlowSegment,
  fetchIncidents as fetchTomTomIncidents,
  tomtomSeverityToLocal,
} from '@/lib/api/tomtom'
import {
  fetchHereFlow,
  fetchHereIncidents,
  hasKey as hereHasKey,
  jamFactorToCongestion,
} from '@/lib/api/here'
import { fetchWeather as fetchOpenMeteoWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { fetchCityBoundary, fetchCityDistricts } from '@/lib/api/geocoding'
import { useSocialStore } from '@/store/socialStore'
import type { Incident, HeatmapMode, CongestionLevel, TrafficSnapshot, TrafficSegment, MapLayerId } from '@/types'

const TRAFFIC_SOURCE          = 'cf-traffic'
const TRAFFIC_PREDICTION_SOURCE = 'cf-traffic-prediction'
const HEATMAP_SOURCE          = 'cf-heatmap'
const HEATMAP_PASSAGES_SOURCE = 'cf-heatmap-passages'
const HEATMAP_CO2_SOURCE      = 'cf-heatmap-co2'
const INCIDENT_SOURCE         = 'cf-incidents'
const TOMTOM_FLOW             = 'tomtom-flow'
const TOMTOM_INC              = 'tomtom-incidents'
const BOUNDARY_SOURCE         = 'city-boundary'
const DISTRICTS_SOURCE        = 'city-districts'
const ZONE_SOURCE             = 'cf-zone'
const ZONE_DRAFT_SOURCE       = 'cf-zone-draft'
const POI_SOURCE              = 'cf-pois'
const VEHICLES_SOURCE         = 'cf-vehicles'
const METRO_STATIONS_SOURCE   = 'cf-metro-stations'
const TRANSIT_ROUTES_SOURCE   = 'cf-transit-routes'
const PREDICTIVE_AFFECTED_SOURCE = 'cf-pred-affected'
const PREDICTIVE_EVENTS_SOURCE   = 'cf-pred-events'
const SIM_LOCATION_SOURCE        = 'cf-sim-location'
const SOCIAL_SOURCE              = 'cf-social'
const WORLD_MASK_SOURCE           = 'cf-world-mask'


// ─── Popup helpers ────────────────────────────────────────────────────────

/** Return black or white text depending on background luminance */
function textOnBg(hex: string): string {
  const h = hex.replace('#', '')
  if (h.length < 6) return '#000'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55 ? '#000' : '#fff'
}

/** Cardinal direction label from bearing in degrees */
function bearingLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO']
  return dirs[Math.round(deg / 45) % 8]
}

const TYPE_LABEL: Record<string, string> = {
  subway:   'Métro',
  tram:     'Tramway',
  bus:      'Bus',
  train:    'RER / Train',
  ferry:    'Ferry',
  monorail: 'Monorail',
}

const METRO_HUBS = [
  'Châtelet', 'Gare du Nord', 'Gare de Lyon', 'Montparnasse', 'Saint-Lazare',
  'La Défense', 'Auber', 'Les Halles', 'Charles de Gaulle', 'Nation', 'République',
]


// Reliable Raster Dark Style (CartoDB Dark Matter)
const OSM_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO'
    }
  },
  layers: [
    {
      id:     'background-pure',
      type:   'background',
      paint:  { 'background-color': '#08090B' }
    },
    {
      id:     'osm-raster-layer',
      type:   'raster',
      source: 'osm-raster',
      paint:  { 
        'raster-opacity': 0.85,
        'raster-brightness-max': 0.45,
        'raster-saturation': -0.45
      }
    }
  ],
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
}

// ─── Map Helpers (Race Condition Protection) ───────────────────────

/** Wrap map properties to avoid 'undefined' crashes if layer/source not ready */
const safeSetPaintProperty = (map: maplibregl.Map | null, id: string, prop: string, val: any) => {
  if (map && map.getLayer(id)) map.setPaintProperty(id, prop, val)
}
const safeSetLayoutProperty = (map: maplibregl.Map | null, id: string, prop: string, val: any) => {
  if (map && map.getLayer(id)) map.setLayoutProperty(id, prop, val)
}
const safeGetSource = (map: maplibregl.Map | null, id: string) => {
  return (map && map.getSource(id)) ? map.getSource(id) : null
}
const safeSetFilter = (map: maplibregl.Map | null, id: string, filter: any) => {
  if (map && map.getLayer(id)) map.setFilter(id, filter)
}
const safeSetFeatureState = (map: maplibregl.Map | null, feat: { source: string, id: string | number }, state: any) => {
  if (map && map.getSource(feat.source)) map.setFeatureState(feat, state)
}

function computeRoadWidth(roadType: string | undefined, level: CongestionLevel, zoom: number, isMobile: boolean = false): number {
  const base: Record<string, number> = {
    motorway: 3.5, motorway_link: 2.8, 
    trunk: 3.2, trunk_link: 2.4,
    primary: 2.8, primary_link: 2.0, 
    secondary: 2.2, secondary_link: 1.8,
    tertiary: 1.8, tertiary_link: 1.4,
    residential: 1.2, service: 1.0,
    unclassified: 1.0
  }
  const mult: Record<CongestionLevel, number> = {
    free: 1.0, slow: 1.15, congested: 1.3, critical: 1.5,
  }
  let baseWidth = base[roadType ?? ''] ?? 1.8
  
  // Mobile Optimization: Force thinner lines for spatial density
  if (isMobile) {
    baseWidth *= 0.7 
  }

  const multiplier = mult[level] ?? 1.1
  
  // Exponential scaling with zoom
  const zoomFactor = Math.pow(1.5, Math.max(0, zoom - 11))
  return Math.round(baseWidth * multiplier * zoomFactor * 10) / 10
}

export const CrossFlowMap = memo(function CrossFlowMap() {
  const mapRef          = useRef<maplibregl.Map | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)
  const popupRef        = useRef<maplibregl.Popup | null>(null)
  const osmRoadsRef     = useRef<Map<string, OSMRoad[]>>(new Map())
  const osmPoisRef      = useRef<Map<string, OSMPOIPoint[]>>(new Map())
  const osmRoutesRef    = useRef<Map<string, OSMRouteGeometry[]>>(new Map())
  const osmMetroRef       = useRef<Map<string, MetroStation[]>>(new Map())
  const ratpStatusRef     = useRef<Map<string, string>>(new Map())
  const ratpDisruptedRef  = useRef<Set<string>>(new Set())
  const refreshDataRef  = useRef<() => void>(() => {})
  const lastVehicleUpdateRef = useRef<number>(0)
  const previousSnapshotRef  = useRef<TrafficSnapshot | null>(null)
  const lastRefreshRef       = useRef<number>(0)
  const cityNetworkRef       = useRef<string | null>(null) // Track which city's network is loaded
  const liveVehiclesRef      = useRef<TransitVehicle[]>([])
  const pulseRef             = useRef<number>(0)
  const scanRef              = useRef<number>(0) // Phase 5: Radial Scan
  const rafRef               = useRef<number>(0)
const socialIntervalRef    = useRef<NodeJS.Timeout | null>(null)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [mapError, setMapError]   = useState<string | null>(null)
  const [selectedVehicle, setSelectedVehicleState] = useState<TransitVehicle | null>(null)
  const [vehicleCount, setVehicleCount] = useState(0)
  const [countdown, setCountdown] = useState(600) // 10 minutes in seconds
  const [provider, setProvider] = useState<'tomtom' | 'here' | 'synthetic'>('tomtom')
  const [lastSnapshot, setLastSnapshot] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(false)

  // ─── Geolocation State ────────────────────────────────────────────────
  const [userPosition, setUserPosition] = useState<UserPosition | null>(null)
  const userMarkerRef  = useRef<maplibregl.Marker | null>(null)
  const userSourceReady = useRef(false)
  const USER_LOCATION_SOURCE = 'cf-user-location'


  const city            = useMapStore(s => s.city)
  const cityBoundary    = useMapStore(s => s.cityBoundary)
  const setCityBoundary = useMapStore(s => s.setCityBoundary)
  const activeLayers    = useMapStore(s => s.activeLayers)
  const setMapReady     = useMapStore(s => s.setMapReady)
  const mode            = useMapStore(s => s.mode)
  const selectSegment   = useMapStore(s => s.selectSegment)
  const heatmapMode     = useMapStore(s => s.heatmapMode)
  const zoneActive      = useMapStore(s => s.zoneActive)
  const zoneDraft       = useMapStore(s => s.zoneDraft)
  const zonePolygon     = useMapStore(s => s.zonePolygon)
  const addZonePoint    = useMapStore(s => s.addZonePoint)
  // Vehicle selection / tracking
  const selectedVehicleId  = useMapStore(s => s.selectedVehicleId)
  const isMobile = useMediaQuery('(max-width: 768px)')
  const setSelectedVehicle = useMapStore(s => s.setSelectedVehicle)
  const isTrackingVehicle  = useMapStore(s => s.isTrackingVehicle)
  const setTrackingVehicle = useMapStore(s => s.setTrackingVehicle)
  const vehicleTypeFilter  = useMapStore(s => s.vehicleTypeFilter)
  const vehicleSearchQuery = useMapStore(s => s.vehicleSearchQuery)
  const splitRatio         = useMapStore(s => s.splitRatio)
  const [splitLng, setSplitLng] = useState<number>(0)


  const snapshot              = useTrafficStore(s => s.snapshot)
  const setSnapshot           = useTrafficStore(s => s.setSnapshot)
  const timeOffsetMinutes     = useMapStore(s => s.timeOffsetMinutes)
  const incidents             = useTrafficStore(s => s.incidents)
  const setIncidents          = useTrafficStore(s => s.setIncidents)
  const setIsSyncing          = useTrafficStore(s => s.setIsSyncing)
  const setLastSync           = useTrafficStore(s => s.setLastSync)
  const setWeather            = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather   = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality         = useTrafficStore(s => s.setAirQuality)
  const setDataSource         = useTrafficStore(s => s.setDataSource)
  const dataSource            = useTrafficStore(s => s.dataSource)

  const currentResult           = useSimulationStore(s => s.currentResult)
  const simulationRevision      = useSimulationStore(s => s.revision)
  const simulationInteractionMode = useSimulationStore(s => s.interactionMode)
  const setInteractionMode      = useSimulationStore(s => s.setInteractionMode)
  const locationPickerActive    = useSimulationStore(s => s.locationPickerActive)
  const eventLocation           = useSimulationStore(s => s.eventLocation)
  const setEventLocation        = useSimulationStore(s => s.setEventLocation)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)

  const useLiveData = hasKey()

  // Refs to avoid stale closures in map click handler
  const zoneActiveRef              = useRef(zoneActive)
  const addZonePointRef            = useRef(addZonePoint)
  const setSelectedVehicleRef      = useRef(setSelectedVehicle)
  const locationPickerRef          = useRef(locationPickerActive)
  const setEventLocationRef        = useRef(setEventLocation)
  const setLocationPickerActiveRef = useRef(setLocationPickerActive)
  const vehicleTypeFilterRef  = useRef(vehicleTypeFilter)
  const vehicleSearchRef      = useRef(vehicleSearchQuery)
  const isTrackingRef         = useRef(isTrackingVehicle)
  useEffect(() => { zoneActiveRef.current = zoneActive }, [zoneActive])
  useEffect(() => { addZonePointRef.current = addZonePoint }, [addZonePoint])
  useEffect(() => { setSelectedVehicleRef.current = setSelectedVehicle }, [setSelectedVehicle])
  useEffect(() => { locationPickerRef.current = locationPickerActive }, [locationPickerActive])
  useEffect(() => { setEventLocationRef.current = setEventLocation }, [setEventLocation])
  useEffect(() => { setLocationPickerActiveRef.current = setLocationPickerActive }, [setLocationPickerActive])
  useEffect(() => { vehicleTypeFilterRef.current = vehicleTypeFilter }, [vehicleTypeFilter])
  useEffect(() => { vehicleSearchRef.current = vehicleSearchQuery }, [vehicleSearchQuery])
  useEffect(() => { isTrackingRef.current = isTrackingVehicle }, [isTrackingVehicle])



  // ─── Vehicle position update & smooth animation (RAF loop) ───────────

  const updateVehicles = useCallback((nowMs: number) => {
    const map    = mapRef.current
    const routes = osmRoutesRef.current.get(city.id)
    if (!map || !routes?.length) return

    // 1. Simulate all vehicles at current time
    const allVehicles = simulateTransitVehicles(routes, nowMs)
    liveVehiclesRef.current = allVehicles

    // 2. Apply Filters (Type + Search)
    const filtered = allVehicles.filter(v => {
      // Type filter
      if (vehicleTypeFilterRef.current.size > 0 && !vehicleTypeFilterRef.current.has(v.routeType)) {
        return false
      }
      // Search filter
      if (vehicleSearchRef.current) {
        const q = vehicleSearchRef.current.toLowerCase()
          .replace(/ligne\s+/g, '')
          .replace(/bus\s+/g, '')
          .replace(/metro\s+/g, '')
          .replace(/m\d/g, m => m.slice(1)) // "M14" -> "14"
          .trim()
        const match = v.routeRef.toLowerCase().includes(q) || v.routeName.toLowerCase().includes(q)
        if (!match) return false
      }
      return true
    })

    // 3. Update Map Source
    const src = safeGetSource(map, VEHICLES_SOURCE) as maplibregl.GeoJSONSource | null
    if (src) {
      src.setData({
        type: 'FeatureCollection',
        features: filtered.map(v => ({
          type:       'Feature' as const,
          geometry:   { type: 'Point' as const, coordinates: [v.lng, v.lat] },
          properties: {
            id:        v.id,
            routeType: v.routeType,
            routeRef:  v.routeRef,
            routeName: v.routeName,
            color:     v.color,
            bearing:   v.bearing,
            speedKmh:  v.speedKmh,
          },
        })),
      })
    }

    // 4. Handle Selected Vehicle & Tracking
    const selId = useMapStore.getState().selectedVehicleId
    if (selId) {
      const active = allVehicles.find(v => v.id === selId)
      if (active) {
        // Update selection highlight source
        const hSrc = safeGetSource(map, VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | null
        if (hSrc) {
          hSrc.setData({
            type: 'Feature' as const,
            geometry: { type: 'Point' as const, coordinates: [active.lng, active.lat] },
            properties: active,
          })
        }
        // Sync React state for InfoCard (throttled)
        if (nowMs - lastVehicleUpdateRef.current > 100) {
          setSelectedVehicleState(active)
          lastVehicleUpdateRef.current = nowMs
        }
        // Camera follow
        if (isTrackingRef.current) {
          map.easeTo({ center: [active.lng, active.lat], duration: 100, easing: (t) => t })
        }
      } else {
        // Vehicle likely disappeared (off routes)
        setSelectedVehicleState(null)
      }
    } else {
      // Clear highlight if nothing selected
      const hSrc = map.getSource(VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | undefined
      if (hSrc) hSrc.setData({ type: 'FeatureCollection', features: [] })
      setSelectedVehicleState(null)
    }

    setVehicleCount(allVehicles.length)

    // 5. Global Animations (Pulse for disrupted stations + selected vehicles)
    pulseRef.current = (nowMs % 1500) / 1500 // 1.5s cycle
    const p = pulseRef.current
    const pulseOpacity = 0.7 * (1 - p)

    safeSetPaintProperty(map, METRO_STATIONS_SOURCE + '-alert', 'circle-opacity', pulseOpacity)
    
    if (map && map.getLayer(VEHICLES_SOURCE + '-selected-ring')) {
      safeSetPaintProperty(map, VEHICLES_SOURCE + '-selected-ring', 'circle-opacity', pulseOpacity * 0.6)
      safeSetPaintProperty(map, VEHICLES_SOURCE + '-selected-ring', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        10, 12 + (p * 8),
        15, 24 + (p * 12)
      ])
    }
  }, [city.id])

  // ─── Unified Animation Loop (Flow + Pulse) ──────────────────────────────────

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    let offset = 0

    const animate = () => {
      if (document.hidden) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }

      const now = Date.now()
      
      // 1. Traffic Dash Animation
      offset = (offset + 0.15) % 100
      safeSetPaintProperty(map, TRAFFIC_SOURCE + '-lines', 'line-dash-offset', offset)

      // 1b. Phase 5: Radial Scan & Critical Pulse
      // Scan starts at 0 and grows to 1 then stays there
      if (scanRef.current < 1) {
        scanRef.current += 0.005
        safeSetPaintProperty(map, 'cf-traffic-glow', 'line-opacity', [
          'interpolate', ['linear'], ['line-progress'],
          scanRef.current - 0.15, 0,
          scanRef.current, 0.4,
          scanRef.current + 0.15, 0
        ])
      }

      // 2. Pulse Animation (Vehicles + Station Alerts)
      updateVehicles(now)

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [mapLoaded, updateVehicles])

  // ─── Split View Lng Calculation ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || mode !== 'predict') return
    const map = mapRef.current

    const updateSplitLine = () => {
      const container = map.getContainer()
      const width = container.clientWidth
      const splitX = (splitRatio / 100) * width
      const lngLat = map.unproject([splitX, container.clientHeight / 2])
      setSplitLng(lngLat.lng)
    }

    updateSplitLine()
    map.on('move', updateSplitLine)
    return () => { map.off('move', updateSplitLine) }
  }, [mapLoaded, splitRatio, mode])

  // ─── Cursor change when zone tool is active ──────────────────────────
  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getCanvas().style.cursor = (zoneActive || locationPickerActive) ? 'crosshair' : ''
  }, [zoneActive, locationPickerActive])

  // ─── Init map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     OSM_DARK_STYLE,
      center:    [city.center.lng, city.center.lat],
      zoom:      city.zoom,
      pitch:     20,
      bearing:   0,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      console.log('[CrossFlow] Map loaded successfully')
      initStaticSources(map)
      initBoundaryLayers(map)
      initDistrictsLayers(map)
      initHeatmapPassagesLayers(map)
      initZoneLayers(map)
      initSocialLayers(map)

      // Add TomTom tile layers if key available
      if (useLiveData) {
        addTomTomLayers(map)
      }

      setMapLoaded(true)
      setMapReady(true)
    })

    map.on('error', (e) => {
      const status = (e as any)?.error?.status
      if (status === 503 || status === 429) {
        console.warn('[CrossFlow] TomTom/Upstream transient error → dashboard enters resilience mode')
        return // handled by source-specific watchers
      }

      console.error('[CrossFlow] MapLibre error:', e.error?.message || e)
      // Check if it's a critical style or tile loading error
      const msg = e.error?.message || ''
      if (msg.includes('Failed to fetch') || msg.includes('Style is not done loading')) {
        setMapError('Impossible de charger les données cartographiques. Vérifiez votre connexion.')
      }
    })

    // Click on synthetic segments
    map.on('click', TRAFFIC_SOURCE + '-lines', async (e) => {
      // Don't handle segment click when zone tool is active
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const segmentId = feat.properties?.id as string
      selectSegment(segmentId)

      if (simulationInteractionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD) {
        try {
          await predictiveApi.blockRoad(segmentId)
          simulationService.getAffectedEdges().then(geojson => {
            const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
            if (src && geojson) src.setData(geojson)
          })
          useSimulationStore.getState().bumpRevision()
          setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
        } catch (err) {
          console.error('[CrossFlow] blockRoad failed:', err)
        }
        return
      }

      if (simulationInteractionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC) {
        try {
          await predictiveApi.addTraffic(segmentId, 'medium')
          simulationService.getAffectedEdges().then(geojson => {
            const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
            if (src && geojson) src.setData(geojson)
          })
          useSimulationStore.getState().bumpRevision()
          setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
        } catch (err) {
          console.error('[CrossFlow] addTraffic failed:', err)
        }
        return
      }

      // Fetch real TomTom data for this point if key available
      if (useLiveData) {
        const coords = e.lngLat
        const flow   = await fetchFlowSegment(coords.lat, coords.lng, Math.round(map.getZoom()))
        if (flow) {
          showFlowPopup(map, coords, flow)
        }
      }
    })

    // General map click — sim location picker + zone drawing + TomTom point query
    map.on('click', async (e) => {
      // Simulation location picker — place event marker on click
      if (locationPickerRef.current) {
        setEventLocationRef.current({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        setLocationPickerActiveRef.current(false)
        return
      }

      // Zone drawing mode
      if (zoneActiveRef.current) {
        addZonePointRef.current([e.lngLat.lng, e.lngLat.lat])
        return
      }

      if (!useLiveData) return
      // Only if not clicking a feature
      const features = map.queryRenderedFeatures(e.point)
      if (features.some(f => f.source === TRAFFIC_SOURCE)) return

      const flow = await fetchFlowSegment(e.lngLat.lat, e.lngLat.lng, Math.round(map.getZoom()))
      if (flow && !flow.roadClosure) {
        showFlowPopup(map, e.lngLat, flow)
      }
    })

    map.on('mouseenter', TRAFFIC_SOURCE + '-lines', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', TRAFFIC_SOURCE + '-lines', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on traffic segments → Urban Insight Popup
    map.on('click', TRAFFIC_SOURCE + '-lines', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      
      const p = feat.properties as any
      const color = p.color || '#FACC15'
      const score = Math.round(p.congestion * 100)
      
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '300px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:20px; color:white; border:1px solid ${color}40; font-family:Inter,sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:12px;">
              <div>
                <p style="margin:0; font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; letter-spacing:0.08em;">${p.axisName || 'Axe Urbain'}</p>
                <h3 style="margin:4px 0 0 0; font-size:18px; font-weight:700;">${p.streetName || 'Rue de Paris'}</h3>
              </div>
              <div style="background:${color}20; padding:6px 10px; border-radius:10px; border:1px solid ${color}40;">
                <span style="font-size:14px; font-weight:800; color:${color};">${score}%</span>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px;">
              <div style="background:rgba(255,255,255,0.04); padding:10px; border-radius:14px;">
                <p style="margin:0; font-size:9px; color:#86868B; text-transform:uppercase;">Vitesse</p>
                <p style="margin:2px 0 0 0; font-size:15px; font-weight:700;">${Math.round(p.speed)} <span style="font-size:10px; font-weight:400; color:#424245;">km/h</span></p>
              </div>
              <div style="background:rgba(255,255,255,0.04); padding:10px; border-radius:14px;">
                <p style="margin:0; font-size:9px; color:#86868B; text-transform:uppercase;">Tendance</p>
                <p style="margin:2px 0 0 0; font-size:15px; font-weight:700; color:#22C55E;">Stable</p>
              </div>
            </div>

            <div style="padding-top:12px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:8px;">
              <div style="width:6px; height:6px; border-radius:50%; background:#22C55E; box-shadow:0 0 8px #22C55E;"></div>
              <p style="margin:0; font-size:10px; color:#86868B;">Source: TomTom Live + Correlation Engine</p>
            </div>
          </div>
        `)
        .addTo(map)
    })

    // Click on transit vehicles → update store selection (drives VehicleInfoCard)
    map.on('click', VEHICLES_SOURCE + '-layer', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const vehicleId = String(feat.properties?.id ?? '')
      setSelectedVehicleRef.current(vehicleId)
      // Update the highlight source immediately
      const selSrc = map.getSource(VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | undefined
      if (selSrc) {
        selSrc.setData({
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            geometry: { type: 'Point', coordinates: (feat.geometry as GeoJSON.Point).coordinates },
            properties: feat.properties,
          }],
        })
      }
    })

    map.on('mouseenter', VEHICLES_SOURCE + '-layer', (e) => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
      const feat = e.features?.[0]
      if (feat) {
        const hSrc = map.getSource(VEHICLES_SOURCE + '-hover') as maplibregl.GeoJSONSource | undefined
        if (hSrc) {
          // Explicitly construct a plain object to avoid serialization errors with internal MapLibre classes (hL)
          hSrc.setData({
            type: 'Feature',
            geometry: {
              type: (feat.geometry as any).type,
              coordinates: (feat.geometry as any).coordinates
            } as any,
            properties: { ...feat.properties }
          })
          map.setLayoutProperty(VEHICLES_SOURCE + '-hover-ring', 'visibility', 'visible')
        }
      }
    })
    map.on('mouseleave', VEHICLES_SOURCE + '-layer', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
      const m = mapRef.current
      if (m && m.getLayer(VEHICLES_SOURCE + '-hover-ring')) {
        m.setLayoutProperty(VEHICLES_SOURCE + '-hover-ring', 'visibility', 'none')
      }
    })

    // Click on metro stations
    map.on('click', METRO_STATIONS_SOURCE + '-dot', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p       = feat.properties as Record<string, unknown>
      const name    = String(p.name ?? 'Station')
      const lines   = String(p.lines ?? '').split('·').filter(Boolean)
      const disrupted  = ratpDisruptedRef.current
      const ratpStatus = ratpStatusRef.current

      const linesBadges = lines.map(line => {
        const color       = String(ratpStatus.get(line) ?? LINE_COLORS[line] ?? '#8B5CF6')
        const isDisrupted = disrupted.has(line.toUpperCase())
        const tc          = textOnBg(color)
        return `
          <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;border-radius:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.07)">
            <div style="width:20px;height:20px;border-radius:5px;background:${color};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:${tc};flex-shrink:0">${line}</div>
            <span style="font-size:10px;color:${isDisrupted ? '#EF4444' : '#22C55E'};font-weight:600">${isDisrupted ? '⚠ Perturbé' : '● Normal'}</span>
          </div>`
      }).join('')

      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '260px', className: 'cf-station-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div style="font-family:Inter,sans-serif;padding:14px;min-width:180px">
            <p style="margin:0 0 3px 0;font-size:9px;font-weight:700;color:#86868B;text-transform:uppercase;letter-spacing:0.12em">Station</p>
            <h3 style="margin:0 0 10px 0;font-size:15px;font-weight:700;color:#F5F5F7">${name}</h3>
            ${lines.length ? `<div style="display:flex;flex-direction:column;gap:4px">${linesBadges}</div>` : `<p style="margin:0;font-size:11px;color:#86868B">Aucune ligne associée</p>`}
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseenter', METRO_STATIONS_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', METRO_STATIONS_SOURCE + '-dot', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on City Boundary
    map.on('click', BOUNDARY_SOURCE + '-fill', (e) => {
      if (zoneActiveRef.current) return
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding: 16px; border-radius: 20px; color: white; border: 1px solid rgba(34,197,94,0.2);">
            <p style="margin:0 0 4px 0; font-size:10px; font-weight:700; color:#22C55E; text-transform:uppercase; tracking:0.1em;">Périmètre Urbain</p>
            <h3 style="margin:0 0 12px 0; font-size:18px;">${city.name}</h3>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
              <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:12px;">
                <p style="margin:0; font-size:9px; color:#86868B;">POPULATION</p>
                <p style="margin:0; font-size:13px; font-weight:600;">${city.population.toLocaleString()}</p>
              </div>
              <div style="background:rgba(255,255,255,0.03); padding:8px; border-radius:12px;">
                <p style="margin:0; font-size:9px; color:#86868B;">PAYS</p>
                <p style="margin:0; font-size:13px; font-weight:600;">${city.country} ${city.flag}</p>
              </div>
            </div>
            <p style="margin:12px 0 0 0; font-size:10px; color:#86868B; line-height:1.4;">
              Analyse en temps réel du flux de mobilité sur l'ensemble de la zone métropolitaine.
            </p>
          </div>
        `)
        .addTo(map)
    })

    // Click on District choropleth
    map.on('click', DISTRICTS_SOURCE + '-fill', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const name    = feat.properties?.name ?? 'Zone'
      const density = feat.properties?.density ?? 0.5
      const pct     = Math.round(density * 100)
      const color   = density < 0.25 ? '#22C55E' : density < 0.5 ? '#FFD600' : density < 0.75 ? '#FF9F0A' : '#FF3B30'
      const label   = density < 0.25 ? 'Fluide' : density < 0.5 ? 'Modéré' : density < 0.75 ? 'Dense' : 'Saturé'
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '260px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px;border-radius:20px;color:white;border:1px solid ${color}30;font-family:Inter,-apple-system,sans-serif;">
            <p style="margin:0 0 2px 0;font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">Secteur Opérationnel</p>
            <h3 style="margin:0 0 14px 0;font-size:17px;font-weight:700;">${name}</h3>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
              <div style="flex:1;height:6px;border-radius:3px;background:linear-gradient(to right,#22C55E,#FFD600,#FF9F0A,#FF3B30);overflow:hidden;position:relative;">
                <div style="position:absolute;top:-3px;width:2px;height:12px;background:white;border-radius:1px;left:${pct}%;box-shadow:0 0 6px white;"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${color};min-width:36px;">${pct}%</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:#86868B;text-transform:uppercase;">Score Predictif</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;color:${color};">${label}</p>
              </div>
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:#86868B;text-transform:uppercase;">Multiplier</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;">×1.24</p>
              </div>
            </div>
            <div style="padding-top:10px; border-top:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; gap:6px;">
              <div style="width:6px; height:6px; border-radius:50%; background:#22C55E; box-shadow:0 0 6px #22C55E;"></div>
              <p style="margin:0;font-size:9px;color:#86868B;font-weight:500;">Intelligence Engine: Validated Scoring</p>
            </div>
          </div>
        `)
        .addTo(map)
    })
    map.on('mouseenter', DISTRICTS_SOURCE + '-fill', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', DISTRICTS_SOURCE + '-fill', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on Incidents
    map.on('click', INCIDENT_SOURCE + '-circles', (e) => {
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      const p = feat.properties as any
      const color = p.color || '#FFD600'
      const severity = (p.severity || 'medium').toUpperCase()
      
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '240px', className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:16px; border-radius:18px; color:white; border:1px solid ${color}40;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${color}; box-shadow:0 0 8px ${color};"></div>
              <span style="font-size:10px; font-weight:700; color:${color}; text-transform:uppercase; tracking:0.1em;">${severity}</span>
            </div>
            <h3 style="margin:0 0 6px 0; font-size:15px; font-weight:700;">${p.title}</h3>
            <p style="margin:0; font-size:11px; color:#86868B; line-height:1.4;">Signalé à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
            <div style="margin-top:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between;">
               <span style="font-size:9px; color:#424245;">ID: ${p.id.slice(0,8)}</span>
               <span style="font-size:10px; font-weight:600; color:#22C55E;">Détails &rarr;</span>
            </div>
          </div>
        `)
        .addTo(map)
    })

    map.on('mouseenter', INCIDENT_SOURCE + '-circles', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', INCIDENT_SOURCE + '-circles', () => {
      if (!zoneActiveRef.current) map.getCanvas().style.cursor = ''
    })

    // Click on Heatmap Points (using the points rendered as transparent circles for interaction)
    const handleHeatmapClick = (mode: HeatmapMode, color: string, unit: string) => (e: any) => {
      const feat = e.features?.[0]
      if (!feat) return
      const intensity = feat.properties?.intensity
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, className: 'apple-popup' })
        .setLngLat(e.lngLat)
        .setHTML(`
          <div class="glass" style="padding:12px; border-radius:16px; min-width:140px; border:1px solid ${color}40;">
            <p style="margin:0; font-size:9px; font-weight:700; color:${color}; text-transform:uppercase;">Intensité ${mode}</p>
            <p style="margin:4px 0 0 0; font-size:22px; font-weight:700; color:white;">
              ${Math.round(intensity * 100)}<span style="font-size:12px; font-weight:500; color:#86868B; margin-left:4px;">${unit}</span>
            </p>
          </div>
        `)
        .addTo(map)
    }

    map.on('click', HEATMAP_SOURCE + '-circles', handleHeatmapClick('congestion', '#FF3B30', '%'))
    map.on('click', HEATMAP_PASSAGES_SOURCE + '-circles', handleHeatmapClick('passages', '#FFD600', 'pts'))
    map.on('click', HEATMAP_CO2_SOURCE + '-circles', handleHeatmapClick('co2', '#A855F7', 'g'))

    mapRef.current = map
    return () => {
      popupRef.current?.remove()
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, []) // eslint-disable-line

  // Helper: show real TomTom flow popup
  function showFlowPopup(map: maplibregl.Map, lngLat: maplibregl.LngLat, flow: Awaited<ReturnType<typeof fetchFlowSegment>>) {
    if (!flow) return
    popupRef.current?.remove()
    const ratio   = flow.currentSpeed / flow.freeFlowSpeed
    const color   = ratio > 0.75 ? '#22C55E' : ratio > 0.5 ? '#FFD600' : ratio > 0.25 ? '#FF9F0A' : '#FF3B30'
    const delay   = Math.max(0, flow.currentTravelTime - flow.freeFlowTravelTime)

    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, maxWidth: '280px', className: 'apple-popup' })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="glass" style="padding: 16px; border-radius: 20px; font-family: Inter, -apple-system, sans-serif; color: #F5F5F7; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 8px 32px rgba(0,0,0,0.4);">
          <div style="display: flex; align-items: center; justify-between; margin-bottom: 12px; gap: 12px;">
             <div style="flex: 1;">
                <p style="font-size: 10px; font-weight: 700; color: #86868B; text-transform: uppercase; tracking: 0.1em; margin: 0 0 4px 0;">Vitesse Actuelle</p>
                <p style="font-size: 24px; font-weight: 700; color: white; margin: 0;">${flow.currentSpeed} <span style="font-size: 14px; font-weight: 500; color: #86868B;">km/h</span></p>
             </div>
             <div style="width: 44px; h-44px; border-radius: 12px; background: ${color}15; border: 1px solid ${color}30; display: flex; items-center; justify-center; height: 44px;">
                <div style="width: 10px; height: 10px; border-radius: 50%; background: ${color}; box-shadow: 0 0 12px ${color};"></div>
             </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div style="background: rgba(255,255,255,0.03); border-radius: 14px; padding: 10px; border: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #86868B; font-size: 9px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0;">Trajet</p>
              <p style="font-size: 15px; font-weight: 700; color: white; margin: 0;">${Math.round(flow.currentTravelTime / 60)} <span style="font-size: 11px; font-color: #86868B;">min</span></p>
            </div>
            <div style="background: rgba(255,255,255,0.03); border-radius: 14px; padding: 10px; border: 1px solid rgba(255,255,255,0.05);">
              <p style="color: #86868B; font-size: 9px; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0;">Retard</p>
              <p style="font-size: 15px; font-weight: 700; color: ${delay > 0 ? '#FF9F0A' : '#22C55E'}; margin: 0;">
                ${delay > 0 ? '+' : ''}${Math.round(delay / 60)} <span style="font-size: 11px;">min</span>
              </p>
            </div>
          </div>

          <div style="display: flex; justify-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.05); pt-12px; padding-top: 10px;">
            <span style="font-size: 10px; font-weight: 500; color: #424245;">Fiabilité: ${Math.round(flow.confidence * 100)}%</span>
            <span style="font-size: 10px; font-weight: 600; color: #22C55E; margin-left: auto;">TomTom Live</span>
          </div>
        </div>
      `)
      .addTo(map)
  }

  // ─── Load boundary for initial city ──────────────────────────────────

  useEffect(() => {
    if (!mapLoaded || cityBoundary) return
    fetchCityBoundary(city.name, city.country).then((b: any) => {
      if (b) {
        setCityBoundary({
          type: 'Feature',
          geometry: b,
          properties: {}
        } as GeoJSON.Feature)
      }
    })
  }, [mapLoaded]) // eslint-disable-line

  // ─── Fetch OSM roads for current city ────────────────────────────────

  useEffect(() => {
    if (!mapLoaded) return

    // Load OSM roads for real geometry
    if (!osmRoadsRef.current.has(city.id)) {
      fetchRoads(city.bbox, ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])
        .then(roads => {
          if (roads.length > 0) {
            osmRoadsRef.current.set(city.id, roads.slice(0, 600))
            refreshDataRef.current()
          }
        })
    }

    // Load POIs (traffic signals, bus stops, subway entrances) independently
    if (!osmPoisRef.current.has(city.id)) {
      fetchTrafficPOIs(city.bbox).then(pois => {
        if (!pois.length) return
        osmPoisRef.current.set(city.id, pois)
        const map = mapRef.current
        if (!map) return
        const src = map.getSource(POI_SOURCE) as maplibregl.GeoJSONSource | undefined
        if (!src) return
        src.setData({
          type: 'FeatureCollection',
          features: pois.map(poi => ({
            type:       'Feature' as const,
            geometry:   { type: 'Point' as const, coordinates: [poi.lng, poi.lat] },
            properties: { id: poi.id, type: poi.type, name: poi.name },
          })),
        })
      })
    }
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── Detect Paris (enables RATP real-time status) ────────────────────

  const isParis = city.countryCode === 'FR' &&
    Math.abs(city.center.lat - 48.8566) < 0.6 &&
    Math.abs(city.center.lng - 2.3522) < 0.8

  // ─── Load transit route geometries + render as polylines ─────────────

  useEffect(() => {
    if (!mapLoaded) return
    if (osmRoutesRef.current.has(city.id)) return

    // Fetch metro/tram first (always), then supplement with bus routes.
    // Two separate calls ensures metro lines are never cut off by bus-route count.
    // loadRoutes() // Removed as it was orphansed after the snapshot engine refactor
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── 10-Minute Snapshot Engine (Staff Engineer) ─────────────────────

  const performSnapshot = useCallback(async (isInitial = false) => {
    if (dataSource !== 'live' || !mapRef.current) return
    setIsFetching(true)
    
    try {
      console.log('🔄 [Snapshot Engine] Fetching urban state for', city.name)
      const snapshot = await generateTrafficSnapshot(city)
      const map = mapRef.current

      // Update Feature State (High Performance) - V4 Extended Metadata
      snapshot.segments.forEach(seg => {
        map.setFeatureState(
          { source: TRAFFIC_SOURCE, id: seg.id },
          { 
            hasData: true, 
            levelCode: seg.level === 'free' ? 0 : seg.level === 'slow' ? 1 : seg.level === 'congested' ? 2 : 3,
            congestion: seg.congestionScore,
            speed: seg.speedKmh,
            anomaly: seg.anomalyScore || 0,
            arrondissement: seg.arrondissement || ''
          }
        )
      })

      // Sync KPIs to store
      const kpis = generateCityKPIs(city)
      useTrafficStore.getState().setKPIs(kpis)
      
      // Persist to Supabase
      if (!isInitial) {
        await useTrafficStore.getState().persistSnapshot({
          city_id: city.id,
          provider: provider,
          fetched_at: new Date().toISOString(),
          stats: {
            avg_congestion: kpis.congestionRate,
            incident_count: kpis.activeIncidents,
            active_segments: snapshot.segments.length
          },
          bbox: city.bbox
        })
        toast.success(`Snapshot ${city.name} synchronisé avec succès.`)
      }

      setLastSnapshot(new Date().toLocaleTimeString())
      setCountdown(600)
    } catch (err) {
      console.error('[Snapshot Engine] Error:', err)
      toast.error('Erreur lors de la synchronisation du snapshot.')
    } finally {
      setIsFetching(false)
    }
  }, [city.id, city.name, dataSource, provider])

  // Scheduler with Visibility Guard
  useEffect(() => {
    if (!mapLoaded) return

    // Initial sync
    performSnapshot(true)

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (document.visibilityState === 'visible') {
            performSnapshot()
            return 600
          }
          return 1 // Stay at 1 if hidden until visible
        }
        return prev - 1
      })
    }, 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // If we were hidden and missed a sync, sync now
        if (countdown <= 1) performSnapshot()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [mapLoaded, performSnapshot])

  // ─── Social Scheduler ──────────────────────────────────────────────
  
  const performSocialCollection = useCallback(async () => {
    if (dataSource !== 'live' || document.visibilityState !== 'visible') return
    console.log('📡 [Social Engine] Triggering 10min collection for', city.name)
    try {
      const { collectSocialSignals } = await import('@/lib/api/social')
      await collectSocialSignals(city.id)
      // Optional: force refresh timeline state if needed
    } catch (err) {
      console.warn('[Social Engine] Collection failed:', err)
    }
  }, [city.id, city.name, dataSource])

  useEffect(() => {
    if (!mapLoaded) return

    // Initial collect
    performSocialCollection()

    // 10 minute interval
    socialIntervalRef.current = setInterval(performSocialCollection, 600000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performSocialCollection()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      if (socialIntervalRef.current) clearInterval(socialIntervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [mapLoaded, performSocialCollection])

  // ─── Social Pins Sync ──────────────────────────────────────────────
  const socialEvents = useSocialStore((s: any) => s.events)
  const socialRange  = useSocialStore((s: any) => s.timeRange)
  
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    const src = map.getSource(SOCIAL_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    const now = Date.now()
    const filtered = socialEvents.filter((e: any) => {
      const diffMin = (now - new Date(e.captured_at).getTime()) / 60000
      return diffMin <= socialRange
    })

    src.setData({
      type: 'FeatureCollection',
      features: filtered.map((e: any) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: e.geo ? [extractCoordsFromPoint(e.geo).lng, extractCoordsFromPoint(e.geo).lat] : [city.center.lng + (Math.random()-0.5)*0.01, city.center.lat + (Math.random()-0.5)*0.01]
        },
        properties: {
          id: e.id,
          severity: e.severity,
          text: e.text,
          captured_at: e.captured_at,
          color: e.severity === 'critical' ? '#FF1744' : e.severity === 'high' ? '#FFD600' : '#22C55E'
        }
      }))
    })
  }, [mapLoaded, socialEvents, socialRange, city.center.lng, city.center.lat])

  // ─── Metro stations with line labels ─────────────────────────────────

  useEffect(() => {
    if (!mapLoaded) return
    if (osmMetroRef.current.has(city.id)) return

    fetchMetroStations(city.bbox).then(stations => {
      if (!stations.length) return
      osmMetroRef.current.set(city.id, stations)
      updateMetroStationsSource()
    })
  }, [city.id, mapLoaded]) // eslint-disable-line

  // ─── RATP real-time status → bus + metro route colors (Paris only) ───

  useEffect(() => {
    if (!mapLoaded || !isParis) return

    const applyRatp = async () => {
      const { lines } = await fetchAllTrafficStatus()
      const statusColors  = new Map<string, string>()
      const disrupted     = new Set<string>()

      for (const line of lines) {
        let color: string
        switch (line.status) {
          case 'interrompu': color = '#EF4444'; disrupted.add(line.slug); break
          case 'perturbé':   color = '#F59E0B'; disrupted.add(line.slug); break
          case 'travaux':    color = '#F97316'; disrupted.add(line.slug); break
          default:           color = line.color ?? LINE_COLORS[line.slug] ?? '#3B82F6'
        }
        statusColors.set(line.slug, color)
      }
      ratpStatusRef.current    = statusColors
      ratpDisruptedRef.current = disrupted
      updateTransitRoutesSource(statusColors)
      updateMetroStationsSource()   // re-render station markers with disruption flags
    }

    applyRatp()
    const iv = setInterval(applyRatp, 60_000)
    return () => clearInterval(iv)
  }, [mapLoaded, isParis, city.id]) // eslint-disable-line

  // ─── Vehicle position update (every 10 seconds) ───────────────────────





  // ─── Transit route polylines (bus + metro as colored lines) ──────────

  function updateTransitRoutesSource(ratpStatus: Map<string, string>) {
    const map    = mapRef.current
    const routes = osmRoutesRef.current.get(city.id)
    if (!map || !routes?.length) return
    const src = map.getSource(TRANSIT_ROUTES_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    src.setData({
      type: 'FeatureCollection',
      features: routes.map(r => {
        // For Paris: override color from RATP status if available
        let color = r.colour
        const slug = r.ref.toUpperCase()
        const statusColor = ratpStatus.get(slug)
        if (statusColor) color = statusColor
        return {
          type:       'Feature' as const,
          geometry:   { type: 'LineString' as const, coordinates: r.coords },
          properties: { id: r.id, routeType: r.route, ref: r.ref, color, name: r.name },
        }
      }),
    })
  }

  // ─── Metro station markers with line numbers ──────────────────────────

  function updateMetroStationsSource() {
    const map      = mapRef.current
    const stations = osmMetroRef.current.get(city.id)
    if (!map || !stations?.length) return
    const src = map.getSource(METRO_STATIONS_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    const disrupted   = ratpDisruptedRef.current
    const ratpStatus  = ratpStatusRef.current

    src.setData({
      type: 'FeatureCollection',
      features: stations.map(s => {
        const firstLine  = s.lines[0] ?? ''
        // RER lines are uppercase letters A-E; metro lines are numbers
        const isRer      = /^[A-E]$/.test(firstLine)
        // Use exact RATP status color (red=interrompu, amber=perturbé) or official line color
        const statusColor = ratpStatus.get(firstLine) ?? null
        const lineColor  = LINE_COLORS[firstLine] ?? (isRer ? '#E2231A' : '#8B5CF6')
        const color      = statusColor ?? lineColor

        // Disruption: any of the station's lines is disrupted
        const isDisrupted = s.lines.some(l => disrupted.has(l.toUpperCase()))

        // Importance: based on line count + major hubs
        let importance = 1.0 + (s.lines.length * 0.35)
        const isHub = METRO_HUBS.some((hub: string) => s.name.includes(hub))
        if (isHub) importance += 1.8
        if (s.lines.length >= 3) importance += 0.5


        // Label: show all lines separated by · (e.g. "1·4·7·14")

        const label = firstLine
          ? s.lines.length > 1
            ? s.lines.join('·')
            : firstLine
          : isRer ? 'RER' : 'M'

        return {
          type:       'Feature' as const,
          geometry:   { type: 'Point' as const, coordinates: [s.lng, s.lat] },
          properties: {
            id:         s.id,
            name:       s.name,
            lines:      s.lines.join('·'),
            lineCount:  s.lines.length,
            color,
            label,
            disrupted:  isDisrupted ? 1 : 0,
            importance,
            isRer:      isRer ? 1 : 0,
          },
        }
      }),
    })
  }


  // ─── Fly to city ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    popupRef.current?.remove()
    mapRef.current.flyTo({
      center:    [city.center.lng, city.center.lat],
      zoom:      city.zoom,
      duration:  1400,
      essential: true,
    })
  }, [city.id, mapLoaded]) // eslint-disable-line
 
  // ─── Predictive Simulation Results — Visual Sync ─────────────────────
  const simulationResult = useSimulationStore(s => s.currentResult)

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return

    const updatePredictiveLayers = async () => {
      const map = mapRef.current!
      const affectedSrc = map.getSource(PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | undefined
      const eventsSrc   = map.getSource(PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | undefined

      if (!simulationResult && simulationRevision === 0) {
        // Clear when no simulation workflow is active yet
        affectedSrc?.setData({ type: 'FeatureCollection', features: [] })
        eventsSrc?.setData({ type: 'FeatureCollection', features: [] })
        return
      }

      try {
        const { predictiveApi } = await import('@/lib/api/predictive')

        // 1. Fetch geojson for all affected edges (slow OR blocked)
        const affectedGeoJSON = await predictiveApi.getAffectedEdges()
        if (affectedSrc) affectedSrc.setData(affectedGeoJSON)


        // 2. Clear events if not specifically handled
        eventsSrc?.setData({ type: 'FeatureCollection', features: [] })

      } catch (err) {
        console.error('Failed to refresh predictive layers:', err)
      }
    }

    updatePredictiveLayers()

  }, [simulationResult, simulationRevision, mapLoaded, simulationInteractionMode])


  // ─── Sim Event Location Marker ───────────────────────────────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const src = mapRef.current.getSource(SIM_LOCATION_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return
    if (!eventLocation) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    src.setData({
      type: 'FeatureCollection',
      features: [{
        type:       'Feature',
        geometry:   { type: 'Point', coordinates: [eventLocation.lng, eventLocation.lat] },
        properties: {},
      }],
    })
  }, [eventLocation, mapLoaded])

  // ─── City boundary ────────────────────────────────────────────────────



  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const src = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    if (!cityBoundary) {
      // Clear boundary and mask
      src.setData({ type: 'FeatureCollection', features: [] })
      const maskSrc = map.getSource(WORLD_MASK_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (maskSrc) maskSrc.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    src.setData({ type: 'FeatureCollection', features: [cityBoundary] })

    // ─── World Mask Update ───────────────────
    const maskSrc = map.getSource(WORLD_MASK_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (maskSrc) {
      const world = [[-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]]
      let coordinates: number[][][] = [world]

      if (cityBoundary.geometry.type === 'Polygon') {
        // Add current polygon as hole
        coordinates.push(...(cityBoundary.geometry.coordinates as number[][][]))
      } else if (cityBoundary.geometry.type === 'MultiPolygon') {
        // Add all polygons of MultiPolygon as holes
        (cityBoundary.geometry.coordinates as number[][][][]).forEach(poly => {
          coordinates.push(...poly)
        })
      }

      maskSrc.setData({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates },
        properties: {}
      })
    }

    // Compute bounds from polygon and fitBounds
    const coords = extractCoords(cityBoundary.geometry as any)
    if (coords.length === 0) return
    const lngs = coords.map(c => c[0])
    const lats = coords.map(c => c[1])
    const bounds = new maplibregl.LngLatBounds(
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    )
    map.fitBounds(bounds, { padding: 48, duration: 1600, essential: true })
  }, [cityBoundary, mapLoaded])

  // ─── City districts choropleth ────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const src = map.getSource(DISTRICTS_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!src) return

    src.setData({ type: 'FeatureCollection', features: [] }) // clear while loading
    if (!city.bbox) return

    fetchCityDistricts(city.center.lat, city.center.lng).then((districts: any[]) => {
      const s = map.getSource(DISTRICTS_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (s) {
        const fc: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: districts.map((d: any) => ({
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [d.bbox[0], d.bbox[1]],
                [d.bbox[2], d.bbox[1]],
                [d.bbox[2], d.bbox[3]],
                [d.bbox[0], d.bbox[3]],
                [d.bbox[0], d.bbox[1]]
              ]]
            },
            properties: {
              name: d.name,
              // Deterministic density from district name hash (avoids flickering)
              density: ((d.name.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0) * 2654435761) >>> 0) / 4294967296 * 0.8 + 0.1,
              admin_level: 9
            }
          }))
        }
        s.setData(fc)
      }
    })
  }, [city, mapLoaded]) // eslint-disable-line
 
  // ─── UCTN Initialization (Unified City Traffic Network) ──────────────
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current

    const initNetwork = async () => {
      if (cityNetworkRef.current === city.id) return
      
      const { NetworkAggregator } = await import('@/lib/engine/NetworkAggregator')
      const fc = await NetworkAggregator.getCityNetwork(city)
      
      const tSrc = safeGetSource(map, TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | null
      if (tSrc) {
        tSrc.setData(fc)
        cityNetworkRef.current = city.id
        console.log(`[CrossFlow] UCTN Loaded for ${city.name}: ${fc.features.length} segments.`)
      }
    }

    initNetwork()
  }, [city, mapLoaded])

  // ─── Data refresh ─────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (!mapRef.current || !mapLoaded) return

    // CRITICAL: Stop background work if tab is inactive
    if (document.visibilityState === 'hidden') return

    // Throttle: prevent multiple rapid refreshes (min 5s interval)
    const nowTs = Date.now()
    if (nowTs - lastRefreshRef.current < 5000) return
    lastRefreshRef.current = nowTs

    const map = mapRef.current
    const bounds = map.getBounds()
    const viewportBbox: [number, number, number, number] = [
      bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()
    ]

    const useHere    = hereHasKey()
    const useTomTom  = useLiveData

    // ── 1. Determine base snapshot (Synthetic or Multi-source) ────────────
    let snapshot = (() => {
      const osmRoads = osmRoadsRef.current.get(city.id)
      return osmRoads && osmRoads.length > 0
        ? generateTrafficFromOSMRoads(city, osmRoads)
        : generateTrafficSnapshot(city)
    })()

    // ── 2. Regional Scaling — Load real IDF network if applicable ────────
    if (isIdfCity(city) && dataSource === 'synthetic') {
      try {
        const bounds = map.getBounds()
        const bboxStr = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
          .map(v => Math.round(v * 1000) / 1000).join(',')
        
        const res = await fetch(`/api/idf-roads?bbox=${bboxStr}&limit=1200&frc=1,2,3,4`)
        if (res.ok) {
          const idfGeojson = await res.json()
          if (idfGeojson.features?.length > 0) {
            snapshot = generateTrafficFromIdfGeoJSON(city, idfGeojson)
          }
        }
      } catch (err) {
        console.warn('[CrossFlowMap] Failed to scale IDF network, using fallback grid.', err)
      }
    }

    // ── 3. Overlay real-time HERE traffic if available ────────────────────
    if (useHere) {
      const hereFlow = await fetchHereFlow(city.bbox)
      if (hereFlow.length > 0) {
        const now = new Date().toISOString()
        const hereSegments: TrafficSegment[] = hereFlow
          .filter(s => s.coords.length >= 2)
          .map((s, i) => {
            const congestion = jamFactorToCongestion(s.jamFactor)
            const freeFlow   = s.freeFlow   > 0 ? s.freeFlow   : 50
            const speed      = s.speed      > 0 ? s.speed      : freeFlow * (1 - congestion * 0.85)
            const roadType   = freeFlow > 100 ? 'motorway' : freeFlow > 80 ? 'trunk' : freeFlow > 55 ? 'primary' : freeFlow > 35 ? 'secondary' : 'tertiary'
            const length     = estimateSegmentLength(s.coords)
            return {
              id:               `here-${city.id}-${i}`,
              roadType,
              coordinates:      s.coords,
              speedKmh:         Math.round(speed),
              freeFlowSpeedKmh: Math.round(freeFlow),
              congestionScore:  Math.round(congestion * 100) / 100,
              level:            scoreToCongestionLevel(congestion),
              flowVehiclesPerHour: Math.round((1 - congestion) * 1800 + 200),
              travelTimeSeconds:   length > 0 ? Math.round((length / 1000) / speed * 3600) : 60,
              length,
              mode:             'car' as const,
              lastUpdated:      now,
            }
          })

        const heatmap         = hereSegments.map(s => ({ lng: s.coordinates[0][0], lat: s.coordinates[0][1], intensity: s.congestionScore }))
        const heatmapPassages = hereSegments.map(s => ({ lng: s.coordinates[0][0], lat: s.coordinates[0][1], intensity: Math.min(1, s.flowVehiclesPerHour / 2000) }))
        const heatmapCo2      = hereSegments.map(s => ({ lng: s.coordinates[0][0], lat: s.coordinates[0][1], intensity: (120 + s.congestionScore * 180) / 300 }))

        snapshot = { cityId: city.id, segments: hereSegments, heatmap, heatmapPassages, heatmapCo2, fetchedAt: now }
        setDataSource('live')
      }
    }

    const synthetic = generateIncidents(city)
    setSnapshot(snapshot)

    let incidents: Incident[] = synthetic

    // ── 4. Fetch TomTom incidents ONLY if not in resilience/synthetic mode ──
    if (useTomTom && dataSource === 'live') {
      // Fetch real TomTom incidents for current viewport
      const tomtomIncs = await fetchTomTomIncidents(viewportBbox)
      if (tomtomIncs.length > 0) {
        incidents = tomtomIncs.map(inc => ({
          id:          inc.id,
          type:        mapIncidentType(inc.iconCategory),
          severity:    tomtomSeverityToLocal(inc.magnitudeOfDelay),
          title:       inc.description || `Incident sur ${inc.from || 'route'}`,
          description: `${inc.from ? 'De ' + inc.from : ''}${inc.to ? ' vers ' + inc.to : ''}. Délai: ${Math.round(inc.delay / 60)} min.`,
          location:    { lat: inc.point.latitude, lng: inc.point.longitude },
          address:     inc.roadNumbers.join(', ') || `${city.name}`,
          startedAt:   inc.startTime,
          resolvedAt:  inc.endTime,
          source:      'TomTom',
          iconColor:   getSeverityColor(tomtomSeverityToLocal(inc.magnitudeOfDelay)),
        }))
      }
    } else if (useHere) {
      // HERE incidents as fallback for current viewport
      const hereIncs = await fetchHereIncidents(viewportBbox)
      if (hereIncs.length > 0) {
        incidents = hereIncs.map(inc => ({
          id:          inc.incidentId,
          type:        (inc.type.toLowerCase().includes('accident') ? 'accident' :
                        inc.type.toLowerCase().includes('work')     ? 'roadwork' : 'congestion') as Incident['type'],
          severity:    (inc.criticality === 'critical' ? 'critical' : inc.criticality === 'major' ? 'high' : 'medium') as Incident['severity'],
          title:       inc.description,
          description: `${inc.location.description} — ${inc.type}`,
          location:    { lat: inc.location.lat, lng: inc.location.lng },
          address:     inc.location.description || city.name,
          startedAt:   inc.startTime,
          resolvedAt:  inc.endTime,
          source:      'HERE',
          iconColor:   getSeverityColor(inc.criticality === 'critical' ? 'critical' : inc.criticality === 'major' ? 'high' : 'medium'),
        }))
      }
    } else {
      setDataSource('synthetic')
    }

    if (!snapshot) return

    const { NetworkAggregator } = await import('@/lib/engine/NetworkAggregator')
    const snappedSnapshot = NetworkAggregator.snapToNetwork(city, snapshot)
    
    setSnapshot(snappedSnapshot)
    setIncidents(incidents)

    // --- High Performance: UCTN Property Updates ---
    if (safeGetSource(map, TRAFFIC_SOURCE)) {
      const activeIds = new Set(snappedSnapshot.segments.map(s => s.id))
      
      // Update state for current live data
      snappedSnapshot.segments.forEach(seg => {
        safeSetFeatureState(map,
          { source: TRAFFIC_SOURCE, id: seg.id },
          { 
            hasData: true, 
            levelCode: scoreToCongestionLevel(seg.congestionScore) === 'free' ? 0 : 
                      scoreToCongestionLevel(seg.congestionScore) === 'slow' ? 1 :
                      scoreToCongestionLevel(seg.congestionScore) === 'congested' ? 2 : 3,
            anomaly: seg.anomalyScore || 0,
            arrondissement: seg.arrondissement || ''
          }
        )
      })

      // Update state for prediction
      snappedSnapshot.segments.forEach(seg => {
        // Simulated +30m delta
        const currentScore = seg.congestionScore
        const predictedScore = Math.min(1, currentScore + 0.15)
        safeSetFeatureState(map,
          { source: TRAFFIC_PREDICTION_SOURCE, id: seg.id },
          { levelCode: scoreToCongestionLevel(predictedScore) === 'free' ? 0 : 
                       scoreToCongestionLevel(predictedScore) === 'slow' ? 1 :
                       scoreToCongestionLevel(predictedScore) === 'congested' ? 2 : 3 }
        )
      })

      // Sync geometries if city changed
      if (cityNetworkRef.current !== city.id) {
        const geo: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: snappedSnapshot.segments.map(s => ({
            type: 'Feature',
            id: s.id,
            geometry: { type: 'LineString', coordinates: s.coordinates },
            properties: { 
              highway: s.roadType,
              midpoint_lng: s.coordinates[Math.floor(s.coordinates.length / 2)][0]
            }
          }))
        }
        const s1 = safeGetSource(map, TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | null
        const s2 = safeGetSource(map, TRAFFIC_PREDICTION_SOURCE) as maplibregl.GeoJSONSource | null
        if (s1) s1.setData(geo)
        if (s2) s2.setData(geo)
        cityNetworkRef.current = city.id
      }

      // ─── A/B Split View Filtering ───
      if (mode === 'predict') {
        const filters: any = ['<', ['get', 'midpoint_lng'], splitLng]
        safeSetFilter(map, TRAFFIC_SOURCE + '-lines', filters)
        safeSetFilter(map, TRAFFIC_SOURCE + '-glow',  filters)
        safeSetFilter(map, TRAFFIC_SOURCE + '-halo',  filters)
        safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', ['>', ['get', 'midpoint_lng'], splitLng] as any)
      } else {
        // Reset filters in other modes
        safeSetFilter(map, TRAFFIC_SOURCE + '-lines', null)
        safeSetFilter(map, TRAFFIC_SOURCE + '-glow',  null)
        safeSetFilter(map, TRAFFIC_SOURCE + '-halo',  null)
        safeSetFilter(map, TRAFFIC_PREDICTION_SOURCE + '-lines', null)
      }
    }

    // --- Heatmaps & Incidents ---
    if (activeLayers.has('heatmap')) {
      const heatGeo: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: snapshot.heatmap.map(pt => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
          properties: { intensity: pt.intensity },
        })),
      }
      const hSrc = safeGetSource(map, HEATMAP_SOURCE) as maplibregl.GeoJSONSource | null
      if (hSrc) hSrc.setData(heatGeo)
    }

    const incGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: incidents.map(inc => ({
        type:     'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [inc.location.lng, inc.location.lat] },
        properties: { id: inc.id, title: inc.title, severity: inc.severity, color: inc.iconColor },
      })),
    }
    const iSrc = safeGetSource(map, INCIDENT_SOURCE) as maplibregl.GeoJSONSource | null
    if (iSrc) iSrc.setData(incGeo)

    // Boundary
    const bSrc = safeGetSource(map, BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | null
    if (bSrc && cityBoundary) bSrc.setData(cityBoundary)

    previousSnapshotRef.current = snapshot
  }, [city, mapLoaded, activeLayers, useLiveData, setSnapshot, setIncidents, setDataSource])

  useEffect(() => { refreshDataRef.current = refreshData }, [refreshData])

  useEffect(() => {
    if (!mapLoaded) return
    refreshData()
    // Viewport-aware refresh: update when user stops moving/zooming
    const onMoveEnd = () => refreshData()
    mapRef.current?.on('moveend', onMoveEnd)

    return () => {
      mapRef.current?.off('moveend', onMoveEnd)
    }
  }, [mapLoaded, refreshData])

  // ─── 10-Minute Persistence Sampler (Staff Engineer Architecture) ───────
  useEffect(() => {
    if (!mapLoaded || !snapshot || mode !== 'live') return

    let lastSnapshotTime = 0
    let interval: NodeJS.Timeout | null = null

    const capture = async () => {
      if (document.hidden || !snapshot) return
      
      const now = Date.now()
      if (now - lastSnapshotTime < 550000) return // Throttle to ~10 min

      console.log('[Snapshot Sampler] Capturing state for city:', city.id)
      setIsSyncing(true)
      
      try {
        const { saveSnapshot } = await import('@/lib/api/snapshots')
        await saveSnapshot({
          city_id:  city.id,
          provider: dataSource,
          fetched_at: new Date().toISOString(),
          stats:    { 
            avg_congestion: snapshot.segments.reduce((a, b) => a + b.congestionScore, 0) / snapshot.segments.length,
            incident_count: incidents.length,
            active_segments: snapshot.segments.length 
          },
          bbox: city.bbox
        })
        setLastSync(new Date())
      } catch (err) {
        console.warn('[Snapshot Sampler] Persistence failed:', err)
      } finally {
        setIsSyncing(false)
        lastSnapshotTime = Date.now()
      }
    }

    // Capture immediately, then every 10 min
    capture()
    interval = setInterval(capture, 600000)

    // Visibility Guard: don't capture if tab is hidden
    const onVisibilityChange = () => {
      if (!document.hidden) capture()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [mapLoaded, city.id, mode, dataSource, snapshot, setIsSyncing, setLastSync])

  // ─── Simulation overlay — tint segment colors by delta ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const tSrc = map.getSource(TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!tSrc) return

    if (!currentResult || !snapshot) return

    // Apply congestion delta proportionally to each segment
    const { congestionPct } = currentResult.delta
    const simFeatures: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.segments.map(seg => {
        const simCongestion = Math.max(0, Math.min(1, seg.congestionScore + congestionPct))
        const level = scoreToCongestionLevel(simCongestion)
        return {
          type:       'Feature' as const,
          geometry:   { type: 'LineString' as const, coordinates: seg.coordinates },
            properties: {
              id:         seg.id,
              congestion: simCongestion,
              speed:      seg.speedKmh,
              level,
              color:      congestionColor(simCongestion),
              width:      computeRoadWidth(seg.roadType, level, map.getZoom(), isMobile),
              roadType:   seg.roadType,
              streetName: seg.streetName,
              axisName:   seg.axisName,
              dist:       seg.arrondissement,
              realData:   seg.id.startsWith('here-') || seg.id.includes('-osm-') || seg.id.includes('-seg-'),
            },
          }
      }),
    }
    tSrc.setData(simFeatures)

    // Restore normal data when result is cleared
    return () => {
      if (!mapRef.current) return
      const src = mapRef.current.getSource(TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (src && snapshot) {
        const geo: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: snapshot.segments.map(seg => ({
            type:       'Feature' as const,
            geometry:   { type: 'LineString' as const, coordinates: seg.coordinates },
            properties: {
              id:         seg.id,
              congestion: seg.congestionScore,
              speed:      seg.speedKmh,
              level:      seg.level,
              color:      congestionColor(seg.congestionScore),
              width:      computeRoadWidth(seg.roadType, seg.level, mapRef.current!.getZoom(), isMobile),
              roadType:   seg.roadType,
              streetName: seg.streetName,
              axisName:   seg.axisName,
              dist:       seg.arrondissement,
              realData:   seg.id.startsWith('here-') || seg.id.includes('-osm-') || seg.id.includes('-seg-'),
            },
          })),
        }
        src.setData(geo)
      }
    }
  }, [currentResult, snapshot, mapLoaded]) // eslint-disable-line



  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const IDF_SOURCE = 'cf-idf-roads'

    const removeIdfLayer = () => {
      if (map.getLayer(IDF_SOURCE + '-lines')) map.removeLayer(IDF_SOURCE + '-lines')
      if (map.getLayer(IDF_SOURCE + '-labels')) map.removeLayer(IDF_SOURCE + '-labels')
      if (map.getSource(IDF_SOURCE)) map.removeSource(IDF_SOURCE)
    }

    if (!currentResult) {
      removeIdfLayer()
      return
    }

    // Compute bbox from current map bounds (or city center fallback)
    const bounds = map.getBounds()
    const bbox = [
      bounds.getWest(), bounds.getSouth(),
      bounds.getEast(), bounds.getNorth(),
    ].map(v => Math.round(v * 1000) / 1000).join(',')

    const url = `/api/idf-roads?frc=1,2,3&bbox=${bbox}&limit=800`

    fetch(url, { cache: 'force-cache' })
      .then(r => r.ok ? r.json() : null)
      .then((geojson: GeoJSON.FeatureCollection | null) => {
        if (!geojson || !map.isStyleLoaded()) return

        // Add or update source
        const existingSrc = map.getSource(IDF_SOURCE) as maplibregl.GeoJSONSource | undefined
        if (existingSrc) {
          existingSrc.setData(geojson)
        } else {
          map.addSource(IDF_SOURCE, { type: 'geojson', data: geojson })

          // Color by FRC
          map.addLayer({
            id:     IDF_SOURCE + '-lines',
            type:   'line',
            source: IDF_SOURCE,
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint:  {
              'line-color': [
                'match', ['get', 'frc'],
                1, '#FF1744',   // autoroutes
                2, '#FF6D00',   // nationales
                3, '#FFB300',   // artères
                '#4CAF50',      // default
              ],
              'line-width': [
                'interpolate', ['linear'], ['zoom'],
                8,  ['match', ['get', 'frc'], 1, 2, 2, 1.5, 1],
                13, ['match', ['get', 'frc'], 1, 4, 2, 3, 2],
                17, ['match', ['get', 'frc'], 1, 6, 2, 5, 3],
              ],
              'line-opacity': 0.55,
            },
          }, TRAFFIC_SOURCE + '-lines') // insert below traffic layer

          map.addLayer({
            id:        IDF_SOURCE + '-labels',
            type:      'symbol',
            source:    IDF_SOURCE,
            minzoom:   13,
            layout:    {
              'symbol-placement': 'line',
              'text-field':       ['get', 'roadName'],
              'text-size':        10,
              'text-max-angle':   30,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#000000',
              'text-halo-width': 1,
              'text-opacity': 0.7,
            },
          })
        }
      })
      .catch(() => {})

    return removeIdfLayer
  }, [currentResult, mapLoaded]) // eslint-disable-line

  // ─── Predictive Backend Sync (Affected roads + Events) ──────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    if (!currentResult || !currentResult.predictive) {
      const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
      const affSrc = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
      const evtSrc = safeGetSource(map, PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | null
      if (affSrc) affSrc.setData(empty)
      if (evtSrc) evtSrc.setData(empty)
      return
    }

    // Fetch and sync affected edges (real OSM segments from backend)
    simulationService.getAffectedEdges().then(geojson => {
      const src = safeGetSource(map, PREDICTIVE_AFFECTED_SOURCE) as maplibregl.GeoJSONSource | null
      if (src && geojson) src.setData(geojson)
    })

    // Fetch and sync active events (labels + icons)
    simulationService.getEvents().then(geojson => {
      const src = safeGetSource(map, PREDICTIVE_EVENTS_SOURCE) as maplibregl.GeoJSONSource | null
      if (src && geojson) src.setData(geojson)
    })
  }, [currentResult, mapLoaded])

  // ─── Simulation Click Location ──────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const loc = useSimulationStore.getState().eventLocation

    const src = safeGetSource(map, SIM_LOCATION_SOURCE) as maplibregl.GeoJSONSource | null
    if (!src) return

    if (!loc) {
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    src.setData({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [loc.lng, loc.lat] },
      properties: {}
    })
  }, [useSimulationStore.getState().eventLocation, mapLoaded])

  // ─── Layer visibility ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    safeSetLayoutProperty(map, TRAFFIC_SOURCE  + '-lines',    'visibility', activeLayers.has('traffic')   ? 'visible' : 'none')
    safeSetLayoutProperty(map, TRAFFIC_SOURCE  + '-glow',     'visibility', activeLayers.has('traffic')   ? 'visible' : 'none')
    // Heatmap layers are managed by the heatmap mode effect below
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-circles',  'visibility', activeLayers.has('incidents') ? 'visible' : 'none')
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-glow',     'visibility', activeLayers.has('incidents') ? 'visible' : 'none')
    safeSetLayoutProperty(map, INCIDENT_SOURCE + '-labels',   'visibility', activeLayers.has('incidents') ? 'visible' : 'none')

    // Boundary layers
    const boundaryVis = activeLayers.has('boundary') ? 'visible' : 'none'
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow-outer', 'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-glow',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-fill',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-line',       'visibility', boundaryVis)
    safeSetLayoutProperty(map, BOUNDARY_SOURCE + '-label',      'visibility', boundaryVis)

    // District choropleth
    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-fill',  'visibility', boundaryVis)
    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-line',  'visibility', boundaryVis)
    safeSetLayoutProperty(map, DISTRICTS_SOURCE + '-label', 'visibility', boundaryVis)

    // TomTom live tiles
    if (useLiveData) {
      safeSetLayoutProperty(map, TOMTOM_FLOW + '-layer', 'visibility', activeLayers.has('traffic') ? 'visible' : 'none')
      safeSetLayoutProperty(map, TOMTOM_INC  + '-layer', 'visibility', activeLayers.has('incidents') ? 'visible' : 'none')
    }

    const transportVis = activeLayers.has('transport') ? 'visible' : 'none'
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-glow',  'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-layer', 'visibility', transportVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-label', 'visibility', transportVis)
    
    // Vehicle selection highlight visibility
    const selectedVehVis = (transportVis === 'visible' && selectedVehicleId !== null) ? 'visible' : 'none'
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-selected-ring', 'visibility', selectedVehVis)
    safeSetLayoutProperty(map, VEHICLES_SOURCE + '-selected-dot',  'visibility', selectedVehVis)
    
    // Transit route polylines

    safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-bus',    'visibility', transportVis)
    safeSetLayoutProperty(map, TRANSIT_ROUTES_SOURCE + '-metro',  'visibility', transportVis)
    // Metro station markers
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-glow',   'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-ring',   'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-dot',    'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-lineref','visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-name',   'visibility', transportVis)
    safeSetLayoutProperty(map, METRO_STATIONS_SOURCE + '-alert',  'visibility', transportVis)
  }, [activeLayers, mapLoaded, useLiveData])

  // ─── Heatmap mode (shows/hides correct heatmap layer) ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const isHeatmapActive = activeLayers.has('heatmap')
    safeSetLayoutProperty(map, HEATMAP_SOURCE          + '-layer',   'visibility', isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none')
    safeSetLayoutProperty(map, HEATMAP_SOURCE          + '-circles', 'visibility', isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none')
    
    safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-layer',   'visibility', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    safeSetLayoutProperty(map, HEATMAP_PASSAGES_SOURCE + '-circles', 'visibility', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    
    safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE      + '-layer',   'visibility', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
    safeSetLayoutProperty(map, HEATMAP_CO2_SOURCE      + '-circles', 'visibility', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
  }, [heatmapMode, activeLayers, mapLoaded])

  // ─── Zone drawing (draft line + finalized polygon) ─────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    // Draft polygon (in progress)
    const draftSrc = map.getSource(ZONE_DRAFT_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (draftSrc) {
      if (zoneDraft.length >= 2) {
        draftSrc.setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: zoneDraft },
          properties: {},
        })
      } else {
        draftSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }

    // Finalized polygon
    const zoneSrc = map.getSource(ZONE_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (zoneSrc) {
      if (zonePolygon && zonePolygon.length >= 3) {
        const closed = [...zonePolygon, zonePolygon[0]]
        zoneSrc.setData({
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [closed] },
          properties: {},
        })
      } else {
        zoneSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }
  }, [zoneDraft, zonePolygon, mapLoaded])

  // ─── User Location Marker (MapLibre custom animated element) ─────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    if (!userPosition) {
      // Remove marker if position cleared
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
      return
    }

    const { lat, lng, accuracy, heading } = userPosition

    if (userMarkerRef.current) {
      // Update existing marker position
      userMarkerRef.current.setLngLat([lng, lat])
      return
    }

    // Build custom DOM element
    const el = document.createElement('div')
    el.className = 'user-location-marker'
    el.style.cssText = `
      position: relative;
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    `

    // Accuracy ring (translucent)
    const ring = document.createElement('div')
    ring.style.cssText = `
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(0, 255, 157, 0.12);
      border: 1.5px solid rgba(0, 255, 157, 0.4);
      animation: user-location-pulse 2.5s ease-out infinite;
    `

    // Blue dot (main indicator) — matching Google Maps style
    const dot = document.createElement('div')
    dot.style.cssText = `
      position: absolute;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #00FF9D;
      border: 3px solid #ffffff;
      box-shadow: 0 0 0 2px rgba(0,255,157,0.3), 0 2px 8px rgba(0,0,0,0.5);
      z-index: 2;
    `

    // Heading arrow (only when heading is available)
    if (heading !== null && heading !== undefined) {
      const arrow = document.createElement('div')
      arrow.style.cssText = `
        position: absolute;
        width: 0;
        height: 0;
        border-left: 4px solid transparent;
        border-right: 4px solid transparent;
        border-bottom: 10px solid rgba(0,255,157,0.8);
        transform: rotate(${heading}deg) translateY(-14px);
        z-index: 1;
        transform-origin: center bottom;
      `
      el.appendChild(arrow)
    }

    el.appendChild(ring)
    el.appendChild(dot)

    // Add CSS animation if not already injected
    if (!document.getElementById('user-location-style')) {
      const style = document.createElement('style')
      style.id = 'user-location-style'
      style.textContent = `
        @keyframes user-location-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          70%  { transform: scale(2.4); opacity: 0; }
          100% { transform: scale(1);   opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    userMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([lng, lat])
      .addTo(map)

    return () => {
      userMarkerRef.current?.remove()
      userMarkerRef.current = null
    }
  }, [mapLoaded, userPosition])

  // Track if first-fix toast was already shown
  const geoToastShownRef = useRef(false)

  // ─── Geolocation callbacks ───────────────────────────────────────────
  const handleUserPosition = useCallback((pos: UserPosition | null) => {
    setUserPosition(pos)
    // Only toast once on first fix (not on every continuous GPS update)
    if (pos && !geoToastShownRef.current) {
      geoToastShownRef.current = true
      toast.success(`📍 Position détectée`, {
        description: `Précision GPS : ±${Math.round(pos.accuracy)}m • Données locales actives`,
        duration: 4000,
      })
    }
    // Reset flag when position is cleared
    if (!pos) geoToastShownRef.current = false
  }, [])


  const handleGeoFlyTo = useCallback((lat: number, lng: number) => {
    mapRef.current?.flyTo({
      center:    [lng, lat],
      zoom:      15,
      duration:  1200,
      essential: true,
    })
  }, [])


  return (
    <div className="w-full h-full relative">
      {mapError && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md p-6 text-center">
          <div className="max-w-sm p-6 rounded-2xl bg-bg-elevated border border-traffic-critical/30 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-12 h-12 rounded-full bg-traffic-critical/10 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-traffic-critical" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Erreur de chargement</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              {mapError}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-2.5 rounded-xl bg-brand text-black font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Réessayer
            </button>
          </div>
        </div>
      )}

      <div 
        ref={containerRef} 
        className={cn(
          "w-full h-full bg-[#08090B] transition-opacity duration-700",
          mapLoaded ? "opacity-100" : "opacity-0"
        )} 
      />
      
      {/* HUD elements are now managed by MapPage for better orchestration with AIPanel */}

      {/* ─── Geolocation Control ───────────────────────────────────── */}
      {mapLoaded && (
        <div className="absolute bottom-24 right-3 z-[400]">
          <GeolocationControl
            onPositionChange={handleUserPosition}
            onFlyTo={handleGeoFlyTo}
          />
        </div>
      )}

      {/* Loading overlay — fades out once map tiles are ready */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4 pointer-events-none z-10 transition-opacity duration-500">
          <div className="w-10 h-10 border-[3px] border-brand-green border-t-transparent rounded-full animate-spin shadow-glow-sm" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest animate-pulse">Chargement de la carte…</p>
        </div>
      )}
    </div>
  )
})

// ─── Sources init ─────────────────────────────────────────────────────────────

function initStaticSources(map: maplibregl.Map) {
  // ─── Road Network Source (OSM Vector) ──────────────────────────────────
  // This provides the "skeleton" of the map
  if (!map.getSource('base-network')) {
    map.addSource('base-network', {
      type: 'vector',
      tiles: [
        // Using provided Stadia Maps API Key for authorized access
        `https://tiles.stadiamaps.com/data/openmaptiles/{z}/{x}/{y}.pbf?api_key=${process.env.NEXT_PUBLIC_STADIA_API_KEY}`
      ],
      maxzoom: 14,
      promoteId: 'id'
    })
  }

  // ─── Base Roads Layer (The complete road network) ──────────────────────
  if (!map.getLayer('base-roads')) {
    map.addLayer({
      id: 'base-roads',
      type: 'line',
      source: 'base-network',
      'source-layer': 'road',
      paint: {
        'line-color': '#1A1C22',
        'line-width': [
          'interpolate', ['linear'], ['zoom'],
          10, 0.5,
          13, 1.2,
          16, 2.5
        ],
        'line-opacity': 0.8
      },
      layout: { 'line-cap': 'round', 'line-join': 'round' }
    })
  }

  // ─── Labels ───────────────────────────────────────────────────────────
  if (!map.getLayer('road-labels')) {
    map.addLayer({
      id: 'road-labels',
      type: 'symbol',
      source: 'base-network',
      'source-layer': 'road',
      minzoom: 14,
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
        'symbol-placement': 'line',
        'text-rotation-alignment': 'map'
      },
      paint: {
        'text-color': '#424245',
        'text-halo-color': '#08090B',
        'text-halo-width': 1
      }
    })
  }

  // ─── Traffic Sources & Fundamental Layers ─────────────────────────────
  
  if (!map.getSource(TRAFFIC_SOURCE)) {
    map.addSource(TRAFFIC_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true,
      promoteId: 'id',
    })
  }

  if (!map.getSource(TRAFFIC_PREDICTION_SOURCE)) {
    map.addSource(TRAFFIC_PREDICTION_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      promoteId: 'id',
    })
  }

  // 0. Traffic Halo (Maximum Contrast)
  if (!map.getLayer(TRAFFIC_SOURCE + '-halo')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-halo',
      type:   'line',
      source: TRAFFIC_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': '#000000',
        'line-width': ['interpolate', ['linear'], ['zoom'], 
          8, ['*', 1.2, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.5]],
          13, ['*', 1.3, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.5]],
          17, ['*', 1.6, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.5]]
        ],
        'line-opacity': 0.6,
      }
    })
  }

  // 1. Primary Traffic Lines
  if (!map.getLayer(TRAFFIC_SOURCE + '-lines')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-lines',
      type:   'line',
      source: TRAFFIC_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hasData'], false],
          ['match', ['feature-state', 'levelCode'],
            0, '#00FF9D', 1, '#FACD15', 2, '#FF9F0A', 3, '#EF4444',
            '#00FF9D'
          ],
          '#2A2D35' 
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 
          8, ['*', 0.6, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.4]],
          13, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.4],
          17, ['*', 1.4, ['match', ['get', 'highway'], 'motorway', 4, 'trunk', 3, 'primary', 2.5, 1.4]]
        ],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          10, ['case', ['boolean', ['feature-state', 'hasData'], false], 0.95, 0.4],
          14, ['case', ['boolean', ['feature-state', 'hasData'], false], 1.0, 0.6]
        ],
        'line-dasharray': [4, 0.1]
      },
    })
  }

  // 2. Prediction Overlays (Dashed)
  if (!map.getLayer(TRAFFIC_PREDICTION_SOURCE + '-lines')) {
    map.addLayer({
      id:     TRAFFIC_PREDICTION_SOURCE + '-lines',
      type:   'line',
      source: TRAFFIC_PREDICTION_SOURCE,
      minzoom: 12,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': [
          'match', ['feature-state', 'levelCode'],
          0, '#00FF9D', 1, '#FACD15', 2, '#FF9F0A', 3, '#EF4444',
          '#666666'
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 1, 16, 3],
        'line-dasharray': [1, 2],
        'line-opacity': 0.4,
        'line-offset': 4 
      }
    }, TRAFFIC_SOURCE + '-lines')
  }

  // 3. Traffic Glow (Underlay)
  if (!map.getLayer(TRAFFIC_SOURCE + '-glow')) {
    map.addLayer({
      id:     TRAFFIC_SOURCE + '-glow',
      type:   'line',
      source: TRAFFIC_SOURCE,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint:  {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hasData'], false],
          ['match', ['feature-state', 'levelCode'],
            0, '#00FF9D', 1, '#FACD15', 2, '#FF9F0A', 3, '#EF4444',
            '#00FF9D'
          ],
          'transparent' 
        ],
        'line-width': ['interpolate', ['linear'], ['zoom'], 11, 4, 16, 12],
        'line-opacity': [
          'interpolate', ['linear'], ['zoom'],
          11, 0,
          12, ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 0.65, 0.25],
          17, ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 0.65, 0.4]
        ],
        'line-blur': ['case', ['>=', ['feature-state', 'anomaly'], 0.6], 6, 3],
      },
    }, TRAFFIC_SOURCE + '-lines')
  }

  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(PREDICTIVE_AFFECTED_SOURCE, { type: 'geojson', data: emptyFC })
  map.addSource(PREDICTIVE_EVENTS_SOURCE,   { type: 'geojson', data: emptyFC })

  // ── PREDICTIVE AFFECTED ROADS ──────────────────
  map.addLayer({
    id:     PREDICTIVE_AFFECTED_SOURCE + '-glow',
    type:   'line',
    source: PREDICTIVE_AFFECTED_SOURCE,
    paint: {
      'line-color':   '#FF3B30',
      'line-width':   12,
      'line-opacity': 0.15,
      'line-blur':    8,
    }
  })
  map.addLayer({
    id:     PREDICTIVE_AFFECTED_SOURCE + '-lines',
    type:   'line',
    source: PREDICTIVE_AFFECTED_SOURCE,
    paint: {
      'line-color':   '#FF3B30',
      'line-width':   3.5,
      'line-opacity': 0.85,
    }
  })

  // ── PREDICTIVE EVENTS ─────────────────────────
  map.addLayer({
    id:     PREDICTIVE_EVENTS_SOURCE + '-circles',
    type:   'circle',
    source: PREDICTIVE_EVENTS_SOURCE,
    paint: {
      'circle-radius':       8,
      'circle-color':        '#FF3B30',
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity':      0.9,
    }
  })
  map.addLayer({
    id:     PREDICTIVE_EVENTS_SOURCE + '-labels',
    type:   'symbol',
    source: PREDICTIVE_EVENTS_SOURCE,
    layout: {
      'text-field':    ['get', 'label'],
      'text-font':     ['Open Sans Bold'],
      'text-size':     11,
      'text-anchor':   'top',
      'text-offset':   [0, 1.2],
    },
    paint: {
      'text-color':      '#FFFFFF',
      'text-halo-color': 'rgba(0,0,0,0.8)',
      'text-halo-width': 2,
    }
  })


  // ── SIM LOCATION MARKER ────────────────────────
  map.addSource(SIM_LOCATION_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     SIM_LOCATION_SOURCE + '-ring',
    type:   'circle',
    source: SIM_LOCATION_SOURCE,
    paint: {
      'circle-radius':       20,
      'circle-color':        'rgba(255,71,87,0.12)',
      'circle-stroke-color': '#FF4757',
      'circle-stroke-width': 2.5,
    },
  })
  map.addLayer({
    id:     SIM_LOCATION_SOURCE + '-dot',
    type:   'circle',
    source: SIM_LOCATION_SOURCE,
    paint: {
      'circle-radius':       5,
      'circle-color':        '#FF4757',
      'circle-stroke-color': '#FFFFFF',
      'circle-stroke-width': 1.5,
    },
  })

  // Heatmap
  map.addSource(HEATMAP_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     HEATMAP_SOURCE + '-layer',
    type:   'heatmap',
    source: HEATMAP_SOURCE,
    maxzoom: 16,
    layout: { visibility: 'none' },
    paint:  {
      'heatmap-weight':   ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity':['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-radius':   ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 22],
      'heatmap-opacity':  0.60,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(34, 197, 94, 0)',
        0.25, 'rgba(34, 197, 94, 0.3)',
        0.5,  'rgba(255, 214, 0, 0.5)',
        0.75, 'rgba(255, 159, 10, 0.7)',
      ],
    },
  })

  // Transparent click targets for heatmap
  map.addLayer({
    id:     HEATMAP_SOURCE + '-circles',
    type:   'circle',
    source: HEATMAP_SOURCE,
    paint:  {
      'circle-radius': 18,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0
    }
  })

  // Incidents (Luminous dots) - STAFF: CLUSTERING ENABLED
  map.addSource(INCIDENT_SOURCE, { 
    type: 'geojson', 
    data: emptyFC,
    cluster: true,
    clusterMaxZoom: 14, 
    clusterRadius: 50 
  })

  // Outer glow for incidents
  map.addLayer({
    id:     INCIDENT_SOURCE + '-glow',
    type:   'circle',
    source: INCIDENT_SOURCE,
    paint:  {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 8, 8, 14, 16],
      'circle-color':        ['get', 'color'],
      'circle-opacity':      0.2,
      'circle-blur':         1,
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-circles',
    type:   'circle',
    source: INCIDENT_SOURCE,
    paint:  {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 8, 4, 14, 7],
      'circle-color':        ['get', 'color'],
      'circle-opacity':      1,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#08090B',
    },
  })

  map.addLayer({
    id:     INCIDENT_SOURCE + '-labels',
    type:   'symbol',
    source: INCIDENT_SOURCE,
    minzoom: 13,
    layout: {
      'text-field':  ['get', 'title'],
      'text-font':   ['Open Sans Regular'],
      'text-size':   11,
      'text-offset': [0, 2],
      'text-anchor': 'top',
      'text-letter-spacing': 0.02,
    },
    paint: {
      'text-color':      '#F5F5F7',
      'text-halo-color': 'rgba(8, 9, 11, 0.8)',
      'text-halo-width': 2,
    },
  })

  // ── POI Overlay (traffic signals, bus stops, subway) ──────────────────
  map.addSource(POI_SOURCE, { type: 'geojson', data: emptyFC })

  // Traffic signals — yellow dots
  map.addLayer({
    id:      POI_SOURCE + '-signals',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 13,
    filter:  ['==', ['get', 'type'], 'traffic_signals'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 13, 3, 16, 6, 18, 9],
      'circle-color':         '#FFD600',
      'circle-opacity':       0.95,
      'circle-stroke-width':  1.5,
      'circle-stroke-color':  '#08090B',
    },
  })

  // Bus stops — blue dots
  map.addLayer({
    id:      POI_SOURCE + '-bus-stops',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 14,
    filter:  ['==', ['get', 'type'], 'bus_stop'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 14, 3, 17, 6],
      'circle-color':         '#3B82F6',
      'circle-opacity':       0.85,
      'circle-stroke-width':  1,
      'circle-stroke-color':  '#08090B',
    },
  })

  // Subway entrances — purple rings
  map.addLayer({
    id:      POI_SOURCE + '-subway',
    type:    'circle',
    source:  POI_SOURCE,
    minzoom: 13,
    filter:  ['==', ['get', 'type'], 'subway_entrance'],
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 13, 4, 17, 9],
      'circle-color':         '#A855F7',
      'circle-opacity':       1,
      'circle-stroke-width':  2,
      'circle-stroke-color':  '#08090B',
    },
  })

  // ── Transit Route Polylines (bus + metro lines on the map) ───────────
  map.addSource(TRANSIT_ROUTES_SOURCE, { type: 'geojson', data: emptyFC })

  // Metro / tram / train — thick colored lines
  map.addLayer({
    id:      TRANSIT_ROUTES_SOURCE + '-metro',
    type:    'line',
    source:  TRANSIT_ROUTES_SOURCE,
    minzoom: 10,
    filter:  ['in', ['get', 'routeType'], ['literal', ['subway', 'tram', 'train']]],
    layout:  { 'line-join': 'round', 'line-cap': 'round' },
    paint:   {
      'line-color':   ['get', 'color'],
      'line-width':   ['interpolate', ['linear'], ['zoom'], 10, 2.5, 13, 4, 15, 5.5, 17, 7],
      'line-opacity': 0.85,
    },
  })

  // Bus routes — thinner lines, visible from zoom 12
  map.addLayer({
    id:      TRANSIT_ROUTES_SOURCE + '-bus',
    type:    'line',
    source:  TRANSIT_ROUTES_SOURCE,
    minzoom: 12,
    filter:  ['==', ['get', 'routeType'], 'bus'],
    layout:  { 'line-join': 'round', 'line-cap': 'round' },
    paint:   {
      'line-color':   ['get', 'color'],
      'line-width':   ['interpolate', ['linear'], ['zoom'], 12, 1.5, 14, 2.5, 16, 3.5],
      'line-opacity': 0.7,
    },
  })

  // ── Metro Stations (proper markers with line numbers) ─────────────────
  map.addSource(METRO_STATIONS_SOURCE, { type: 'geojson', data: emptyFC })

  // Outer glow (atmospheric)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-glow',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':   ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 8, ['get', 'importance']], 
        14, ['*', 16, ['get', 'importance']], 
        16, ['*', 22, ['get', 'importance']]
      ],
      'circle-color':    ['get', 'color'],
      'circle-opacity':  ['interpolate', ['linear'], ['zoom'], 11, 0.08, 14, 0.15],
      'circle-blur':     0.8,
    },

  })

  // White backing ring
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-ring',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 5, ['get', 'importance']], 
        14, ['*', 9, ['get', 'importance']], 
        16, ['*', 12, ['get', 'importance']]
      ],
      'circle-color':        '#FFFFFF',
      'circle-opacity':      1,
      'circle-stroke-width': 0,
    },

  })

  // Colored fill (line color)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-dot',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    paint:   {
      'circle-radius':        ['interpolate', ['linear'], ['zoom'], 
        11, ['*', 3.5, ['get', 'importance']], 
        14, ['*', 7.5, ['get', 'importance']], 
        16, ['*', 10.5, ['get', 'importance']]
      ],
      'circle-color':         ['get', 'color'],
      'circle-opacity':       1,
      'circle-stroke-width':  1.5,
      'circle-stroke-color':  '#1A1A2E',
    },

  })

  // Line ref label (e.g. "1", "4·9·14") — centered on the dot
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-lineref',
    type:    'symbol',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 13,
    layout:  {
      'text-field':            ['get', 'label'],
      'text-font':             ['Open Sans Bold'],
      'text-size':             ['interpolate', ['linear'], ['zoom'], 13, 7, 15, 10, 17, 12],
      'text-anchor':           'center',
      'text-allow-overlap':    true,
      'text-ignore-placement': true,
    },
    paint:   {
      'text-color':      '#FFFFFF',
      'text-halo-color': 'rgba(0,0,0,0)',
      'text-halo-width': 0,
    },
  })

  // Station name label below the dot (visible from zoom 14)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-name',
    type:    'symbol',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 14,
    layout:  {
      'text-field':        ['get', 'name'],
      'text-font':         ['Open Sans Bold'],
      'text-size':         ['interpolate', ['linear'], ['zoom'], 14, 10, 16, 13],
      'text-anchor':       'top',
      'text-offset':       [0, 1.0],
      'text-max-width':    8,
      'text-allow-overlap': false,
    },
    paint:   {
      'text-color':      '#F5F5F7',
      'text-halo-color': 'rgba(8,9,11,0.95)',
      'text-halo-width': 2.5,
    },
  })

  // Disruption alert ring (red/orange halo around disrupted station dots)
  map.addLayer({
    id:      METRO_STATIONS_SOURCE + '-alert',
    type:    'circle',
    source:  METRO_STATIONS_SOURCE,
    minzoom: 11,
    filter:  ['==', ['get', 'disrupted'], 1],
    paint:   {
      'circle-radius':         ['interpolate', ['linear'], ['zoom'], 11, 10, 14, 18, 16, 24],
      'circle-color':          '#EF4444',
      'circle-opacity':        0, // Driven by animation
      'circle-stroke-width':   1.5,
      'circle-stroke-color':   '#EF4444',
      'circle-stroke-opacity': 0.8,
    },

  })

  // ── Transit Vehicles ──────────────────────────────────────────────────
  map.addSource(VEHICLES_SOURCE, { type: 'geojson', data: emptyFC })

  // Outer glow ring (type-colored)
  map.addLayer({
    id:     VEHICLES_SOURCE + '-glow',
    type:   'circle',
    source: VEHICLES_SOURCE,
    layout: { visibility: 'visible' },
    paint:  {
      'circle-radius':    ['interpolate', ['linear'], ['zoom'], 10, 8, 15, 16],
      'circle-color':     ['get', 'color'],
      'circle-opacity':   0.18,
      'circle-blur':      0.6,
    },
  })

  // Main vehicle dot
  map.addLayer({
    id:     VEHICLES_SOURCE + '-layer',
    type:   'circle',
    source: VEHICLES_SOURCE,
    layout: { visibility: 'visible' },
    paint:  {
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        9,  ['match', ['get', 'routeType'], 'subway', 4, 'train', 4, 'tram', 3.5, 3],
        14, ['match', ['get', 'routeType'], 'subway', 8, 'train', 8, 'tram', 7,   6],
        17, ['match', ['get', 'routeType'], 'subway', 11,'train', 11,'tram', 9,   8],
      ],
      'circle-color':        ['get', 'color'],
      'circle-opacity':      0.95,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1, 14, 2],
      'circle-stroke-color': '#08090B',
    },
  })

  // Line ref label (show line number on the vehicle dot)
  map.addLayer({
    id:      VEHICLES_SOURCE + '-label',
    type:    'symbol',
    source:  VEHICLES_SOURCE,
    minzoom: 13,
    layout: {
      'text-field':   ['slice', ['get', 'routeRef'], 0, 3],
      'text-font':    ['Open Sans Regular'],
      'text-size':    ['interpolate', ['linear'], ['zoom'], 13, 8, 16, 11],
      'text-anchor':  'center',
      'text-allow-overlap': true,
    },
    paint: {
      'text-color':      '#000000',
      'text-halo-color': 'rgba(0,0,0,0)',
      'text-halo-width': 0,
    },
  })

  // ── Vehicle selection highlight ───────────────────────────────────
  map.addSource(VEHICLES_SOURCE + '-selected', { type: 'geojson', data: emptyFC })
  
  // Large pulsing selection ring
  map.addLayer({
    id:     VEHICLES_SOURCE + '-selected-ring',
    type:   'circle',
    source: VEHICLES_SOURCE + '-selected',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 12, 15, 24],
      'circle-color':  ['get', 'color'],
      'circle-opacity': 0.15,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  // Selected dot (on top)
  map.addLayer({
    id:     VEHICLES_SOURCE + '-selected-dot',
    type:   'circle',
    source: VEHICLES_SOURCE + '-selected',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 6, 15, 12],
      'circle-color':  ['get', 'color'],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFFFFF',
    },
  })

  // Hover layer (simple ring, visible on mouseenter)
  map.addSource(VEHICLES_SOURCE + '-hover', { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     VEHICLES_SOURCE + '-hover-ring',
    type:   'circle',
    source: VEHICLES_SOURCE + '-hover',
    paint:  {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 9, 15, 18],
      'circle-color':  '#FFFFFF',
      'circle-opacity': 0.25,
      'circle-stroke-width': 1,
      'circle-stroke-color': '#FFFFFF',
    },
    layout: { visibility: 'none' }
  })
}

function initDistrictsLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(DISTRICTS_SOURCE, { type: 'geojson', data: emptyFC })

  // Choropleth fill — color driven by `density` property (0-1)
  map.addLayer({
    id:     DISTRICTS_SOURCE + '-fill',
    type:   'fill',
    source: DISTRICTS_SOURCE,
    paint:  {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'density'],
        0,    'rgba(34, 197, 94, 0.30)',
        0.33, 'rgba(255, 214, 0, 0.35)',
        0.66, 'rgba(255, 159, 10, 0.40)',
        1,    'rgba(255, 59, 48, 0.45)',
      ],
      'fill-opacity': 1,
      'fill-outline-color': 'rgba(0,0,0,0)',
    },
  })

  // District borders
  map.addLayer({
    id:     DISTRICTS_SOURCE + '-line',
    type:   'line',
    source: DISTRICTS_SOURCE,
    paint:  {
      'line-color':   'rgba(255,255,255,0.12)',
      'line-width':   0.8,
    },
  })

  // District name labels (visible from zoom 12)
  map.addLayer({
    id:     DISTRICTS_SOURCE + '-label',
    type:   'symbol',
    source: DISTRICTS_SOURCE,
    minzoom: 12,
    layout: {
      'text-field':    ['get', 'name'],
      'text-font':     ['Open Sans Bold'],
      'text-size':     11,
      'text-anchor':   'center',
      'symbol-placement': 'point',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color':      'rgba(255,255,255,0.85)',
      'text-halo-color': 'rgba(0,0,0,0.7)',
      'text-halo-width': 2,
    },
  })
}

function initBoundaryLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  map.addSource(BOUNDARY_SOURCE, { type: 'geojson', data: emptyFC })

  // 1. Very wide outer glow (Neon effect)
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow-outer',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#00FF9D',
      'line-width':   40,
      'line-opacity': 0.05,
      'line-blur':    25,
    },
  })

  // 2. Focused mid glow
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#00FF9D',
      'line-width':   12,
      'line-opacity': 0.2,
      'line-blur':    8,
    },
  })

  // 3. Fill — Elegant glassmorphism area
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-fill',
    type:   'fill',
    source: BOUNDARY_SOURCE,
    paint:  {
      'fill-color':   '#22C55E',
      'fill-opacity': 0.03,
    },
  })

  // 4. Crisp high-tech border line
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-line',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':        '#22C55E',
      'line-width':        1.5,
      'line-opacity':      0.9,
      'line-dasharray':    [4, 4],
    },
  })

  // 5. City name label at centroid (symbol layer)
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-label',
    type:   'symbol',
    source: BOUNDARY_SOURCE,
    layout: {
      'text-field':    ['coalesce', ['get', 'name'], ''],
      'text-font':     ['Open Sans Bold'],
      'text-size':     13,
      'text-offset':   [0, 0],
      'text-anchor':   'center',
      'symbol-placement': 'point',
    },
    paint: {
      'text-color':      'rgba(34,197,94,0.9)',
      'text-halo-color': 'rgba(8,9,11,0.8)',
      'text-halo-width': 3,
    },
    minzoom: 8,
    maxzoom: 13,
  })

  // 6. WORLD MASK — Masks out other cities
  map.addSource(WORLD_MASK_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     WORLD_MASK_SOURCE + '-fill',
    type:   'fill',
    source: WORLD_MASK_SOURCE,
    paint:  {
      'fill-color':   '#08090B',
      'fill-opacity': 0.95,
    },
  }, BOUNDARY_SOURCE + '-glow-outer') // Insert below boundary glows but above background
}

function initHeatmapPassagesLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Passages heatmap
  map.addSource(HEATMAP_PASSAGES_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     HEATMAP_PASSAGES_SOURCE + '-layer',
    type:   'heatmap',
    source: HEATMAP_PASSAGES_SOURCE,
    maxzoom: 16,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight':    ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 22],
      'heatmap-opacity':   0.70,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(0, 100, 255, 0)',
        0.25, 'rgba(0, 150, 255, 0.4)',
        0.5,  'rgba(0, 200, 200, 0.6)',
        0.75, 'rgba(0, 255, 150, 0.8)',
      ],
    },
  })

  map.addLayer({
    id:     HEATMAP_PASSAGES_SOURCE + '-circles',
    type:   'circle',
    source: HEATMAP_PASSAGES_SOURCE,
    paint:  {
      'circle-radius': 18,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0
    }
  })

  // CO2 heatmap
  map.addSource(HEATMAP_CO2_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     HEATMAP_CO2_SOURCE + '-layer',
    type:   'heatmap',
    source: HEATMAP_CO2_SOURCE,
    maxzoom: 16,
    layout: { visibility: 'none' },
    paint: {
      'heatmap-weight':    ['interpolate', ['linear'], ['get', 'intensity'], 0, 0, 1, 1],
      'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1, 9, 3],
      'heatmap-radius':    ['interpolate', ['linear'], ['zoom'], 0, 2, 9, 22],
      'heatmap-opacity':   0.70,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(100, 0, 200, 0)',
        0.2,  'rgba(100, 0, 200, 0.3)',
        0.5,  'rgba(200, 50, 50, 0.6)',
        0.75, 'rgba(255, 100, 0, 0.8)',
      ],
    },
  })

  map.addLayer({
    id:     HEATMAP_CO2_SOURCE + '-circles',
    type:   'circle',
    source: HEATMAP_CO2_SOURCE,
    paint:  {
      'circle-radius': 18,
      'circle-color': 'rgba(0,0,0,0)',
      'circle-opacity': 0
    }
  })
}

function initZoneLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Draft polyline source
  map.addSource(ZONE_DRAFT_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id: ZONE_DRAFT_SOURCE + '-line',
    type: 'line',
    source: ZONE_DRAFT_SOURCE,
    paint: {
      'line-color':    '#FACC15',
      'line-width':    2,
      'line-opacity':  0.8,
      'line-dasharray': [4, 3],
    },
  })

  // Finalized zone source
  map.addSource(ZONE_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id: ZONE_SOURCE + '-fill',
    type: 'fill',
    source: ZONE_SOURCE,
    paint: {
      'fill-color':   '#FACC15',
      'fill-opacity': 0.12,
    },
  })
  map.addLayer({
    id: ZONE_SOURCE + '-outline',
    type: 'line',
    source: ZONE_SOURCE,
    paint: {
      'line-color':   '#FACC15',
      'line-width':   2.5,
      'line-opacity': 0.9,
    },
  })
}

function initSocialLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }
  map.addSource(SOCIAL_SOURCE, { 
    type: 'geojson', 
    data: emptyFC,
    cluster: true,
    clusterMaxZoom: 14,
    clusterRadius: 40
  })

  map.addLayer({
    id: SOCIAL_SOURCE + '-glow',
    type: 'circle',
    source: SOCIAL_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 10, 14, 20],
      'circle-color': ['get', 'color'],
      'circle-opacity': 0.15,
      'circle-blur': 1,
    }
  })

  map.addLayer({
    id: SOCIAL_SOURCE + '-circles',
    type: 'circle',
    source: SOCIAL_SOURCE,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 5, 14, 9],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.9
    }
  })
}

function extractCoordsFromPoint(wellKnownText: any): { lat: number, lng: number } {
  if (!wellKnownText) return { lat: 0, lng: 0 }
  if (typeof wellKnownText === 'object') return wellKnownText
  const match = String(wellKnownText).match(/POINT\(([^ ]+) ([^ ]+)\)/)
  if (match) return { lng: parseFloat(match[1]), lat: parseFloat(match[2]) }
  return { lat: 0, lng: 0 }
}

// Flatten all coordinates from a GeoJSON geometry
function extractCoords(geom: GeoJSON.Geometry): number[][] {
  if (!geom) return []
  if (geom.type === 'Point') return [geom.coordinates as number[]]
  if (geom.type === 'LineString') return geom.coordinates as number[][]
  if (geom.type === 'Polygon') return (geom.coordinates as number[][][]).flat()
  if (geom.type === 'MultiPolygon') return (geom.coordinates as number[][][][]).flat(2)
  return []
}

function addTomTomLayers(map: maplibregl.Map) {
  const flowUrl = getTrafficFlowTileUrl()
  const incUrl  = getTrafficIncidentTileUrl()

  // Helper : désactive un layer TomTom après N erreurs consécutives (évite le spam 503)
  function watchTileErrors(sourceId: string, layerId: string, maxErrors = 3) {
    let errorCount = 0
    const onError = (e: any) => {
      const status = e?.error?.status
      const isTransient = status === 503 || status === 429 || String(e?.error).includes('AJAXError')

      if (!isTransient) return
      
      errorCount++
      if (errorCount >= maxErrors) {
        // Désactiver silencieusement le layer — stop la boucle de retry
        try {
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
          console.warn(`[CrossFlow] TomTom layer "${layerId}" désactivé après ${errorCount} erreurs — switch automatique en mode synthétique`)
          
          // Force fallback to synthetic if TomTom fails
          const store = useTrafficStore.getState()
          if (store.dataSource === 'live') {
            store.setDataSource('synthetic')
          }
        } catch { /* carte déjà détruite */ }
        map.off('error', onError)
      }
    }
    map.on('error', onError)
  }

  if (flowUrl) {
    try {
      map.addSource(TOMTOM_FLOW, {
        type:    'raster',
        tiles:   [flowUrl],
        tileSize: 256,
        maxzoom: 14, // Prevent API bombing at high zoom levels
      })
      map.addLayer({
        id:     TOMTOM_FLOW + '-layer',
        type:   'raster',
        source: TOMTOM_FLOW,
        paint:  { 'raster-opacity': 0.85 },
      })
      watchTileErrors(TOMTOM_FLOW, TOMTOM_FLOW + '-layer')
    } catch (err) {
      console.warn('[CrossFlow] TomTom flow layer init failed:', err)
    }
  }

  if (incUrl) {
    try {
      map.addSource(TOMTOM_INC, {
        type:    'raster',
        tiles:   [incUrl],
        tileSize: 256,
        maxzoom: 14, // Limit traffic incident requests
      })
      map.addLayer({
        id:     TOMTOM_INC + '-layer',
        type:   'raster',
        source: TOMTOM_INC,
        paint:  { 'raster-opacity': 0.90 },
      })
      watchTileErrors(TOMTOM_INC, TOMTOM_INC + '-layer')
    } catch (err) {
      console.warn('[CrossFlow] TomTom incidents layer init failed:', err)
    }
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapIncidentType(iconCategory: number): Incident['type'] {
  const map: Record<number, Incident['type']> = {
    0: 'congestion', 1: 'accident',   2: 'roadwork',
    3: 'roadwork',   4: 'congestion', 5: 'roadwork',
    6: 'event',      7: 'anomaly',    8: 'roadwork',
    9: 'congestion', 10: 'accident',  11: 'event',
  }
  return map[iconCategory] ?? 'anomaly'
}

function getSeverityColor(sev: Incident['severity']): string {
  const colors = { low: '#00E676', medium: '#FFD600', high: '#FF6D00', critical: '#FF1744' }
  return colors[sev]
}

// Estimate road segment length in meters from coordinate array
function estimateSegmentLength(coords: [number, number][]): number {
  let len = 0
  for (let i = 1; i < coords.length; i++) {
    const dx = (coords[i][0] - coords[i-1][0]) * 111320 * Math.cos(coords[i][1] * Math.PI / 180)
    const dy = (coords[i][1] - coords[i-1][1]) * 110540
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return Math.round(len)
}

// Wrapper to allow inline call with dynamic import-style syntax
function import_scoreToCongestionLevel(score: number): CongestionLevel {
  if (score < 0.25) return 'free'
  if (score < 0.55) return 'slow'
  if (score < 0.80) return 'congested'
  return 'critical'
}
