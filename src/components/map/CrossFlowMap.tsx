'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { platformConfig } from '@/config/platform.config'
import { congestionColor } from '@/lib/utils/congestion'
import { generateTrafficSnapshot, generateIncidents, generateTrafficFromOSMRoads } from '@/lib/engine/traffic.engine'
import { fetchRoads } from '@/lib/api/overpass'
import type { OSMRoad } from '@/lib/api/overpass'
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
import { fetchCityBoundary } from '@/lib/api/geocoding'
import type { Incident, HeatmapMode } from '@/types'

const TRAFFIC_SOURCE          = 'cf-traffic'
const HEATMAP_SOURCE          = 'cf-heatmap'
const HEATMAP_PASSAGES_SOURCE = 'cf-heatmap-passages'
const HEATMAP_CO2_SOURCE      = 'cf-heatmap-co2'
const INCIDENT_SOURCE         = 'cf-incidents'
const TOMTOM_FLOW             = 'tomtom-flow'
const TOMTOM_INC              = 'tomtom-incidents'
const BOUNDARY_SOURCE         = 'city-boundary'
const ZONE_SOURCE             = 'cf-zone'
const ZONE_DRAFT_SOURCE       = 'cf-zone-draft'

// CartoDB Voyager Dark — completely free, no key, beautiful dark style
const CARTO_DARK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs:  'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    'carto-dark': {
      type:        'raster',
      tiles:       ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'],
      tileSize:    256,
      attribution: '© OpenStreetMap contributors © CARTO',
      maxzoom:     19,
    },
  },
  layers: [
    {
      id:     'carto-base',
      type:   'raster',
      source: 'carto-dark',
      paint:  { 'raster-opacity': 0.95 },
    },
  ],
}

export function CrossFlowMap() {
  const mapRef       = useRef<maplibregl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const popupRef     = useRef<maplibregl.Popup | null>(null)
  const osmRoadsRef  = useRef<Map<string, OSMRoad[]>>(new Map())
  const [mapLoaded, setMapLoaded] = useState(false)

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

  const setSnapshot           = useTrafficStore(s => s.setSnapshot)
  const setIncidents          = useTrafficStore(s => s.setIncidents)
  const setWeather            = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather   = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality         = useTrafficStore(s => s.setAirQuality)
  const setDataSource         = useTrafficStore(s => s.setDataSource)

  const useLiveData = hasKey()

  // Refs to avoid stale closures in map click handler
  const zoneActiveRef    = useRef(zoneActive)
  const addZonePointRef  = useRef(addZonePoint)
  useEffect(() => { zoneActiveRef.current = zoneActive }, [zoneActive])
  useEffect(() => { addZonePointRef.current = addZonePoint }, [addZonePoint])

  // ─── Cursor change when zone tool is active ──────────────────────────

  useEffect(() => {
    if (!mapRef.current) return
    mapRef.current.getCanvas().style.cursor = zoneActive ? 'crosshair' : ''
  }, [zoneActive])

  // ─── Init map ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:     CARTO_DARK_STYLE,
      center:    [city.center.lng, city.center.lat],
      zoom:      city.zoom,
      pitch:     30,
      bearing:   0,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      initStaticSources(map)
      initBoundaryLayers(map)
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

    // General map click — zone drawing + TomTom point query
    map.on('click', async (e) => {
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
      if (b) setCityBoundary(b)
    })
  }, [mapLoaded]) // eslint-disable-line

  // ─── Fetch OSM roads for current city ────────────────────────────────

  useEffect(() => {
    if (!mapLoaded) return
    if (osmRoadsRef.current.has(city.id)) return
    fetchRoads(city.bbox, ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'])
      .then(roads => {
        if (roads.length > 0) osmRoadsRef.current.set(city.id, roads.slice(0, 600))
      })
  }, [city.id, mapLoaded]) // eslint-disable-line

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

  // ─── Data refresh ─────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    const useHere    = hereHasKey()
    const useTomTom  = useLiveData

    // ── 1. Fetch HERE real traffic flow (real geometry + real speed) ──────
    let snapshot = (() => {
      const osmRoads = osmRoadsRef.current.get(city.id)
      return osmRoads && osmRoads.length > 0
        ? generateTrafficFromOSMRoads(city, osmRoads)
        : generateTrafficSnapshot(city)
    })()

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
            const length     = estimateSegmentLength(s.coords)
            return {
              id:               `here-${city.id}-${i}`,
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
          width:     platformConfig.traffic.lineWidths[seg.level],
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

    // Real weather + air quality (OpenMeteo, 100% free, no key)
    const [omWeather, aq] = await Promise.all([
      fetchOpenMeteoWeather(city.center.lat, city.center.lng),
      fetchAirQuality(city.center.lat, city.center.lng),
    ])
    setOpenMeteoWeather(omWeather)
    setAirQuality(aq)
    // Populate legacy WeatherData shape from OpenMeteo data
    setWeather(omWeather ? {
      description:   omWeather.weatherLabel,
      temp:          omWeather.temp,
      icon:          omWeather.weatherEmoji,
      wind:          omWeather.windSpeedKmh,
      rain:          omWeather.precipitationMm > 0,
      snow:          omWeather.snowDepthCm > 0,
      visibility:    omWeather.visibilityM,
      trafficImpact: omWeather.trafficImpact,
    } : null)
  }, [city, mapLoaded, useLiveData, setSnapshot, setIncidents, setWeather, setOpenMeteoWeather, setAirQuality, setDataSource])

  useEffect(() => {
    if (!mapLoaded) return
    refreshData()
    const interval = setInterval(refreshData, platformConfig.traffic.refreshIntervalMs)
    return () => clearInterval(interval)
  }, [mapLoaded, refreshData])

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

    // TomTom live tiles
    if (useLiveData) {
      trySet(TOMTOM_FLOW + '-layer', activeLayers.has('traffic') ? 'visible' : 'none')
      trySet(TOMTOM_INC  + '-layer', activeLayers.has('incidents') ? 'visible' : 'none')
    }
  }, [activeLayers, mapLoaded, useLiveData])

  // ─── Heatmap mode (shows/hides correct heatmap layer) ────────────────

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current
    const trySet = (id: string, vis: 'visible' | 'none') => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', vis)
    }
    const isHeatmapActive = activeLayers.has('heatmap')
    trySet(HEATMAP_SOURCE          + '-layer', isHeatmapActive && heatmapMode === 'congestion' ? 'visible' : 'none')
    trySet(HEATMAP_PASSAGES_SOURCE + '-layer', isHeatmapActive && heatmapMode === 'passages'   ? 'visible' : 'none')
    trySet(HEATMAP_CO2_SOURCE      + '-layer', isHeatmapActive && heatmapMode === 'co2'        ? 'visible' : 'none')
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
    <div ref={containerRef} className="w-full h-full" />
  )
}

// ─── Sources init ─────────────────────────────────────────────────────────────

function initStaticSources(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Synthetic traffic lines
  map.addSource(TRAFFIC_SOURCE, { type: 'geojson', data: emptyFC })

  // 1. Glow Layer (Outer)
  map.addLayer({
    id:     TRAFFIC_SOURCE + '-glow',
    type:   'line',
    source: TRAFFIC_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color':   ['get', 'color'],
      'line-width':   ['*', ['get', 'width'], 3], // Glow is wider
      'line-opacity': [
        'interpolate', ['linear'], ['zoom'],
        10, 0.05,
        14, 0.15
      ],
      'line-blur':    10,
    },
  })

  // 2. Main Flow Line (Inner)
  map.addLayer({
    id:     TRAFFIC_SOURCE + '-lines',
    type:   'line',
    source: TRAFFIC_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color':   ['get', 'color'],
      'line-width':   ['get', 'width'],
      'line-opacity': ['case', ['boolean', hasKey(), false], 0.2, 0.9],
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
        1,    'rgba(255, 59, 48, 0.9)',
      ],
    },
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
}

function initBoundaryLayers(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  map.addSource(BOUNDARY_SOURCE, { type: 'geojson', data: emptyFC })

  // 1. Outer glow — very wide blurred line
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow-outer',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#22C55E',
      'line-width':   28,
      'line-opacity': 0.07,
      'line-blur':    20,
    },
  })

  // 2. Mid glow
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-glow',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':   '#22C55E',
      'line-width':   10,
      'line-opacity': 0.18,
      'line-blur':    6,
    },
  })

  // 3. Fill — very subtle city tint
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-fill',
    type:   'fill',
    source: BOUNDARY_SOURCE,
    paint:  {
      'fill-color':   '#22C55E',
      'fill-opacity': 0.04,
    },
  })

  // 4. Crisp border line
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-line',
    type:   'line',
    source: BOUNDARY_SOURCE,
    paint:  {
      'line-color':        '#22C55E',
      'line-width':        2,
      'line-opacity':      0.85,
      'line-dasharray':    [3, 2],
    },
  })

  // 5. City name label at centroid (symbol layer)
  map.addLayer({
    id:     BOUNDARY_SOURCE + '-label',
    type:   'symbol',
    source: BOUNDARY_SOURCE,
    layout: {
      'text-field':    ['coalesce', ['get', 'name'], ''],
      'text-font':     ['Open Sans Bold', 'Arial Unicode MS Bold'],
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
        1,    'rgba(255, 255, 0, 1)',
      ],
    },
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
        1,    'rgba(255, 30, 30, 1)',
      ],
    },
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

  if (flowUrl) {
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
  }

  if (incUrl) {
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
