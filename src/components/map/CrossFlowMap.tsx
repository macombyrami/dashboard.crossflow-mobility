'use client'
import { useEffect, useRef, useCallback, useState, useMemo } from 'react'

import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useSimulationStore } from '@/store/simulationStore'
import { platformConfig } from '@/config/platform.config'
import { congestionColor, scoreToCongestionLevel } from '@/lib/utils/congestion'
import { VehicleInfoCard } from '@/components/map/VehicleInfoCard'
import { VehicleFilterPanel } from '@/components/map/VehicleFilterPanel'

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
import { simulateTransitVehicles } from '@/lib/engine/transit.engine'
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
import type { Incident, HeatmapMode } from '@/types'

const TRAFFIC_SOURCE          = 'cf-traffic'
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


// Modern Vector Dark Style - High performance OSM vector tiles
const OSM_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
  sources: {
    'osm-vector': {
      type: 'vector',
      tiles: ['https://tiles.openfreemap.org/tiles/{z}/{x}/{y}.pbf'],
      maxzoom: 14,
      attribution: '© OpenStreetMap contributors © OpenFreeMap'
    }
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#08090B' }
    }
  ]
}

function computeRoadWidth(roadType: string | undefined, level: import('@/types').CongestionLevel, zoom: number): number {
  const base: Record<string, number> = {
    motorway: 4.5, motorway_link: 3.5, 
    trunk: 4, trunk_link: 3,
    primary: 3.5, primary_link: 2.8, 
    secondary: 2.8, secondary_link: 2.2,
    tertiary: 2.2, tertiary_link: 1.8,
    residential: 1.5, service: 1.2,
    unclassified: 1.2
  }
  const mult: Record<import('@/types').CongestionLevel, number> = {
    free: 1.0, slow: 1.15, congested: 1.3, critical: 1.5,
  }
  const baseWidth = base[roadType ?? ''] ?? 1.8
  const multiplier = mult[level] ?? 1.1
  
  // Exponential scaling with zoom
  const zoomFactor = Math.pow(1.5, Math.max(0, zoom - 11))
  return Math.round(baseWidth * multiplier * zoomFactor * 10) / 10
}

export function CrossFlowMap() {
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
  const liveVehiclesRef = useRef<import('@/lib/engine/transit.engine').TransitVehicle[]>([])
  const rafRef          = useRef<number | null>(null)
  const pulseRef        = useRef<number>(0)
  const lastVehicleUpdateRef = useRef<number>(0)

  const [mapLoaded, setMapLoaded] = useState(false)
  const [selectedVehicle, setSelectedVehicleState] = useState<import('@/lib/engine/transit.engine').TransitVehicle | null>(null)
  const [vehicleCount, setVehicleCount] = useState(0)


  const city            = useMapStore(s => s.city)
  const cityBoundary    = useMapStore(s => s.cityBoundary)
  const setCityBoundary = useMapStore(s => s.setCityBoundary)
  const activeLayers    = useMapStore(s => s.activeLayers)
  const setMapReady     = useMapStore(s => s.setMapReady)
  const selectSegment   = useMapStore(s => s.selectSegment)
  const heatmapMode     = useMapStore(s => s.heatmapMode)
  const zoneActive      = useMapStore(s => s.zoneActive)
  const zoneDraft       = useMapStore(s => s.zoneDraft)
  const zonePolygon     = useMapStore(s => s.zonePolygon)
  const addZonePoint    = useMapStore(s => s.addZonePoint)
  // Vehicle selection / tracking
  const selectedVehicleId  = useMapStore(s => s.selectedVehicleId)
  const setSelectedVehicle = useMapStore(s => s.setSelectedVehicle)
  const isTrackingVehicle  = useMapStore(s => s.isTrackingVehicle)
  const setTrackingVehicle = useMapStore(s => s.setTrackingVehicle)
  const vehicleTypeFilter  = useMapStore(s => s.vehicleTypeFilter)
  const vehicleSearchQuery = useMapStore(s => s.vehicleSearchQuery)


  const snapshot              = useTrafficStore(s => s.snapshot)
  const setSnapshot           = useTrafficStore(s => s.setSnapshot)
  const setIncidents          = useTrafficStore(s => s.setIncidents)
  const setWeather            = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather   = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality         = useTrafficStore(s => s.setAirQuality)
  const setDataSource         = useTrafficStore(s => s.setDataSource)
  const dataSource            = useTrafficStore(s => s.dataSource)

  const currentResult           = useSimulationStore(s => s.currentResult)
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
      initStaticSources(map)
      initBoundaryLayers(map)
      initDistrictsLayers(map)
      initHeatmapPassagesLayers(map)
      initZoneLayers(map)

      // Add TomTom tile layers if key available
      if (useLiveData) {
        addTomTomLayers(map)
      }

      setMapLoaded(true)
      setMapReady(true)
    })

    // Click on synthetic segments
    map.on('click', TRAFFIC_SOURCE + '-lines', async (e) => {
      // Don't handle segment click when zone tool is active
      if (zoneActiveRef.current) return
      const feat = e.features?.[0]
      if (!feat) return
      selectSegment(feat.properties?.id as string)

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
          hSrc.setData(feat)
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
            <p style="margin:0 0 2px 0;font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.1em;">Quartier Urbain</p>
            <h3 style="margin:0 0 14px 0;font-size:17px;font-weight:700;">${name}</h3>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
              <div style="flex:1;height:6px;border-radius:3px;background:linear-gradient(to right,#22C55E,#FFD600,#FF9F0A,#FF3B30);overflow:hidden;position:relative;">
                <div style="position:absolute;top:-3px;width:2px;height:12px;background:white;border-radius:1px;left:${pct}%;box-shadow:0 0 6px white;"></div>
              </div>
              <span style="font-size:13px;font-weight:700;color:${color};min-width:36px;">${pct}%</span>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:#86868B;text-transform:uppercase;">Densité estimée ⚠</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;color:${color};">${label}</p>
              </div>
              <div style="background:rgba(255,255,255,0.04);padding:8px;border-radius:10px;">
                <p style="margin:0;font-size:9px;color:#86868B;text-transform:uppercase;">Niveau admin</p>
                <p style="margin:3px 0 0 0;font-size:13px;font-weight:600;">Niv. ${feat.properties?.admin_level ?? 9}</p>
              </div>
            </div>
            <p style="margin:10px 0 0 0;font-size:9px;color:#424245;font-style:italic;">Densité calculée — données temps réel non disponibles</p>
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
    fetchCityBoundary(city.name, city.country).then(b => {
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
    const loadRoutes = async () => {
      const priority = await fetchRouteGeometries(city.bbox, ['subway', 'tram', 'train'], 80)
      const bus      = await fetchRouteGeometries(city.bbox, ['bus'], 120)
      const routes   = [...priority, ...bus]
      if (!routes.length) return
      osmRoutesRef.current.set(city.id, routes)
      updateVehicles(Date.now())
      updateTransitRoutesSource(ratpStatusRef.current)
    }
    loadRoutes()
  }, [city.id, mapLoaded]) // eslint-disable-line

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
    const src = map.getSource(VEHICLES_SOURCE) as maplibregl.GeoJSONSource | undefined
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
        const hSrc = map.getSource(VEHICLES_SOURCE + '-selected') as maplibregl.GeoJSONSource | undefined
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

    if (map.getLayer(METRO_STATIONS_SOURCE + '-alert')) {
      map.setPaintProperty(METRO_STATIONS_SOURCE + '-alert', 'circle-opacity', pulseOpacity)
    }
    if (map.getLayer(VEHICLES_SOURCE + '-selected-ring')) {
      map.setPaintProperty(VEHICLES_SOURCE + '-selected-ring', 'circle-opacity', pulseOpacity * 0.6)
      map.setPaintProperty(VEHICLES_SOURCE + '-selected-ring', 'circle-radius', [
        'interpolate', ['linear'], ['zoom'],
        10, 12 + (p * 8),
        15, 24 + (p * 12)
      ])
    }
  }, [city.id])

  useEffect(() => {
    if (!mapLoaded) return
    
    const animate = () => {
      updateVehicles(Date.now())
      rafRef.current = requestAnimationFrame(animate)
    }
    
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [mapLoaded, updateVehicles])

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

      if (!simulationResult || !simulationResult.predictive) {
        // Clear if no active simulation result
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

  }, [simulationResult, mapLoaded])


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
      // Clear boundary
      src.setData({ type: 'FeatureCollection', features: [] })
      return
    }

    src.setData({ type: 'FeatureCollection', features: [cityBoundary] })

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

    fetchCityDistricts(city.center.lat, city.center.lng).then(districts => {
      const s = map.getSource(DISTRICTS_SOURCE) as maplibregl.GeoJSONSource | undefined
      if (s) {
        const fc: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: districts.map(d => ({
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
              density: ((d.name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) * 2654435761) >>> 0) / 4294967296 * 0.8 + 0.1,
              admin_level: 9
            }
          }))
        }
        s.setData(fc)
      }
    })
  }, [city, mapLoaded]) // eslint-disable-line

  // ─── Data refresh ─────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

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
        const hereSegments: import('@/types').TrafficSegment[] = hereFlow
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
              level:            import_scoreToCongestionLevel(congestion),
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

    if (useTomTom) {
      // Fetch real TomTom incidents
      if (!useHere) setDataSource('live')
      const tomtomIncs = await fetchTomTomIncidents(city.bbox)
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
      // HERE incidents as fallback
      const hereIncs = await fetchHereIncidents(city.bbox)
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

    setIncidents(incidents)

    // Update synthetic traffic on map
    // Segments from HERE or OSM have real road geometry → realData:true → full opacity
    // Segments from synthetic generator → realData:false → barely visible (0.08)
    const trafficGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.segments.map(seg => ({
        type:       'Feature' as const,
        geometry:   { type: 'LineString' as const, coordinates: seg.coordinates },
        properties: {
          id:        seg.id,
          congestion: seg.congestionScore,
          speed:     seg.speedKmh,
          level:     seg.level,
          color:     congestionColor(seg.congestionScore),
          width:     computeRoadWidth(seg.roadType, seg.level, map.getZoom()),
          realData:  seg.id.startsWith('here-') || seg.id.includes('-osm-'),
        },
      })),
    }
    const tSrc = map.getSource(TRAFFIC_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (tSrc) tSrc.setData(trafficGeo)

    // Congestion heatmap
    const heatGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.heatmap.map(pt => ({
        type:       'Feature' as const,
        geometry:   { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
        properties: { intensity: pt.intensity },
      })),
    }
    const hSrc = map.getSource(HEATMAP_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (hSrc) hSrc.setData(heatGeo)

    // Passages heatmap
    const passGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.heatmapPassages.map(pt => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
        properties: { intensity: pt.intensity },
      })),
    }
    const pSrc = map.getSource(HEATMAP_PASSAGES_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (pSrc) pSrc.setData(passGeo)

    // CO2 heatmap
    const co2Geo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: snapshot.heatmapCo2.map(pt => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [pt.lng, pt.lat] },
        properties: { intensity: pt.intensity },
      })),
    }
    const cSrc = map.getSource(HEATMAP_CO2_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (cSrc) cSrc.setData(co2Geo)

    // Incidents
    const incGeo: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: incidents.map(inc => ({
        type:     'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [inc.location.lng, inc.location.lat] },
        properties: { id: inc.id, title: inc.title, severity: inc.severity, color: inc.iconColor },
      })),
    }
    const iSrc = map.getSource(INCIDENT_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (iSrc) iSrc.setData(incGeo)

    // Boundary layer update
    const bSrc = map.getSource(BOUNDARY_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (bSrc) {
      if (cityBoundary) {
        bSrc.setData(cityBoundary)
      } else {
        bSrc.setData({ type: 'FeatureCollection', features: [] })
      }
    }

    // NOTE: Météo gérée globalement par WeatherProvider (AppShell)
    // Plus besoin de l'appeler ici — évite les appels dupliqués à OpenMeteo
  }, [city, mapLoaded, useLiveData, setSnapshot, setIncidents, setDataSource, dataSource])

  // Keep refreshDataRef in sync so OSM loader can call it after roads are cached
  useEffect(() => { refreshDataRef.current = refreshData }, [refreshData])

  useEffect(() => {
    if (!mapLoaded) return
    refreshData()
    const interval = setInterval(refreshData, platformConfig.traffic.refreshIntervalMs)
    return () => clearInterval(interval)
  }, [mapLoaded, refreshData])

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
              width:      computeRoadWidth(seg.roadType, level, map.getZoom()),
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
              width:      computeRoadWidth(seg.roadType, seg.level, mapRef.current!.getZoom()),
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

    if (!map.getLayer(TRAFFIC_SOURCE + '-lines')) {
      map.addLayer({
        id:     TRAFFIC_SOURCE + '-lines',
        type:   'line',
        source: TRAFFIC_SOURCE,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint:  {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.6,
            14, 0.85,
            17, 1.0
          ],
          'line-blur': 0.8
        }
      })
    }
  }, [mapLoaded, mapRef])

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

  // ─── Layer visibility ─────────────────────────────────────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const trySet = (id: string, vis: 'visible' | 'none') => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }

    trySet(TRAFFIC_SOURCE  + '-lines',    activeLayers.has('traffic')   ? 'visible' : 'none')
    trySet(TRAFFIC_SOURCE  + '-glow',     activeLayers.has('traffic')   ? 'visible' : 'none')
    // Heatmap layers are managed by the heatmap mode effect below
    trySet(INCIDENT_SOURCE + '-circles',  activeLayers.has('incidents') ? 'visible' : 'none')
    trySet(INCIDENT_SOURCE + '-glow',     activeLayers.has('incidents') ? 'visible' : 'none')
    trySet(INCIDENT_SOURCE + '-labels',   activeLayers.has('incidents') ? 'visible' : 'none')

    // Boundary layers
    const boundaryVis = activeLayers.has('boundary') ? 'visible' : 'none'
    trySet(BOUNDARY_SOURCE + '-glow-outer', boundaryVis)
    trySet(BOUNDARY_SOURCE + '-glow',       boundaryVis)
    trySet(BOUNDARY_SOURCE + '-fill',       boundaryVis)
    trySet(BOUNDARY_SOURCE + '-line',       boundaryVis)
    trySet(BOUNDARY_SOURCE + '-label',      boundaryVis)

    // District choropleth
    trySet(DISTRICTS_SOURCE + '-fill',  boundaryVis)
    trySet(DISTRICTS_SOURCE + '-line',  boundaryVis)
    trySet(DISTRICTS_SOURCE + '-label', boundaryVis)

    // TomTom live tiles
    if (useLiveData) {
      trySet(TOMTOM_FLOW + '-layer', activeLayers.has('traffic') ? 'visible' : 'none')
      trySet(TOMTOM_INC  + '-layer', activeLayers.has('incidents') ? 'visible' : 'none')
    }

    const transportVis = activeLayers.has('transport') ? 'visible' : 'none'
    trySet(VEHICLES_SOURCE + '-glow',  transportVis)
    trySet(VEHICLES_SOURCE + '-layer', transportVis)
    trySet(VEHICLES_SOURCE + '-label', transportVis)
    
    // Vehicle selection highlight visibility
    const selectedVehVis = (transportVis === 'visible' && selectedVehicleId !== null) ? 'visible' : 'none'
    trySet(VEHICLES_SOURCE + '-selected-ring', selectedVehVis)
    trySet(VEHICLES_SOURCE + '-selected-dot',  selectedVehVis)
    
    // Transit route polylines

    trySet(TRANSIT_ROUTES_SOURCE + '-bus',    transportVis)
    trySet(TRANSIT_ROUTES_SOURCE + '-metro',  transportVis)
    // Metro station markers
    trySet(METRO_STATIONS_SOURCE + '-glow',   transportVis)
    trySet(METRO_STATIONS_SOURCE + '-ring',   transportVis)
    trySet(METRO_STATIONS_SOURCE + '-dot',    transportVis)
    trySet(METRO_STATIONS_SOURCE + '-lineref',transportVis)
    trySet(METRO_STATIONS_SOURCE + '-name',   transportVis)
    trySet(METRO_STATIONS_SOURCE + '-alert',  transportVis)
  }, [activeLayers, mapLoaded, useLiveData])

  // ─── Heatmap mode (shows/hides correct heatmap layer) ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const trySet = (id: string, vis: 'visible' | 'none') => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
    const isHeatmapActive = activeLayers.has('heatmap')
    trySet(HEATMAP_SOURCE          + '-layer',   isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none')
    trySet(HEATMAP_SOURCE          + '-circles', isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none')
    
    trySet(HEATMAP_PASSAGES_SOURCE + '-layer',   isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    trySet(HEATMAP_PASSAGES_SOURCE + '-circles', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    
    trySet(HEATMAP_CO2_SOURCE      + '-layer',   isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
    trySet(HEATMAP_CO2_SOURCE      + '-circles', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
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

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />
      
      {/* Interactive transit components */}
      <VehicleFilterPanel vehicleCount={vehicleCount} />
      <VehicleInfoCard 
        vehicle={selectedVehicle} 
        isDisrupted={selectedVehicle ? ratpDisruptedRef.current.has(selectedVehicle.routeRef.toUpperCase()) : false} 
      />

      {/* Loading overlay — fades out once map tiles are ready */}


      {!mapLoaded && (
        <div className="absolute inset-0 bg-bg-surface flex flex-col items-center justify-center gap-4 pointer-events-none z-10">
          <div className="w-10 h-10 border-[3px] border-brand-green border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Chargement de la carte…</p>
        </div>
      )}
    </div>
  )
}

// ─── Sources init ─────────────────────────────────────────────────────────────

function initStaticSources(map: maplibregl.Map) {
  // ─── Road Network Source (OSM Vector) ──────────────────────────────────
  // This provides the "skeleton" of the map
  if (!map.getSource('base-network')) {
    map.addSource('base-network', {
      type: 'vector',
      tiles: ['https://tiles.openfreemap.org/tiles/{z}/{x}/{y}.pbf'],
      maxzoom: 14
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

  // ─── Traffic Source ───────────────────────────────────────────────────
  if (!map.getSource(TRAFFIC_SOURCE)) {
    map.addSource(TRAFFIC_SOURCE, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      lineMetrics: true, // required for gradients/stretching
    })
  }
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Synthetic traffic lines
  map.addSource(PREDICTIVE_AFFECTED_SOURCE, { type: 'geojson', data: emptyFC })
  map.addSource(PREDICTIVE_EVENTS_SOURCE,   { type: 'geojson', data: emptyFC })


  // 1. Glow Layer (Outer) — only for real road data
  map.addLayer({
    id:     TRAFFIC_SOURCE + '-glow',
    type:   'line',
    source: TRAFFIC_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color':   ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['*', 0.5, ['get', 'width']], 13, ['*', 2, ['get', 'width']], 17, ['*', 3, ['get', 'width']]],
      // Ne rendre visible que les données RÉELLES (HERE/OSM) — masquer la grille synthétique
      'line-opacity': [
        'case',
        ['boolean', ['get', 'realData'], false],
        ['interpolate', ['linear'], ['zoom'], 10, 0.12, 14, 0.25],
        0  // segments synthétiques = invisible
      ],
      'line-blur':    10,
    },
  })

  // 2. Main Flow Line (Inner) — only for real road data
  map.addLayer({
    id:     TRAFFIC_SOURCE + '-lines',
    type:   'line',
    source: TRAFFIC_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color':   ['get', 'color'],
      'line-width': ['interpolate', ['linear'], ['zoom'], 8, ['*', 0.4, ['get', 'width']], 13, ['get', 'width'], 17, ['*', 1.4, ['get', 'width']]],
      // realData=false → grille synthétique → complètement masquée (ne pas afficher sur routes fantômes)
      'line-opacity': ['case', ['boolean', ['get', 'realData'], false], 0.88, 0],
    },
  })

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

  // Incidents (Luminous dots)
  map.addSource(INCIDENT_SOURCE, { type: 'geojson', data: emptyFC })

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
      'line-color':   '#22C55E',
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
      'line-color':   '#22C55E',
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

  // Helper : désactive un layer TomTom apr\u00e8s N erreurs consécutives (évite le spam 503)
  function watchTileErrors(sourceId: string, layerId: string, maxErrors = 3) {
    let errorCount = 0
    const onError = (e: any) => {
      // Seuls les erreurs de tiles 503/404 nous intéressent
      if (!e?.error?.status && !String(e?.error).includes('503') && !String(e?.error).includes('AJAXError')) return
      errorCount++
      if (errorCount >= maxErrors) {
        // Désactiver silencieusement le layer — stop la boucle de retry
        try {
          if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', 'none')
          console.warn(`[CrossFlow] TomTom layer "${layerId}" désactivé apr\u00e8s ${errorCount} erreurs 503 — cl\u00e9 API indisponible ou quota dépassé`)
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
function import_scoreToCongestionLevel(score: number): import('@/types').CongestionLevel {
  if (score < 0.25) return 'free'
  if (score < 0.55) return 'slow'
  if (score < 0.80) return 'congested'
  return 'critical'
}
