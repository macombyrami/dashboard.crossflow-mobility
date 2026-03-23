'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { platformConfig } from '@/config/platform.config'
import { congestionColor } from '@/lib/utils/congestion'
import { generateTrafficSnapshot, generateIncidents } from '@/lib/engine/traffic.engine'
import {
  hasKey,
  getTrafficFlowTileUrl,
  getTrafficIncidentTileUrl,
  fetchFlowSegment,
  fetchIncidents as fetchTomTomIncidents,
  tomtomSeverityToLocal,
} from '@/lib/api/tomtom'
import { fetchWeather as fetchOpenMeteoWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import type { Incident } from '@/types'

const TRAFFIC_SOURCE  = 'cf-traffic'
const HEATMAP_SOURCE  = 'cf-heatmap'
const INCIDENT_SOURCE = 'cf-incidents'
const TOMTOM_FLOW     = 'tomtom-flow'
const TOMTOM_INC      = 'tomtom-incidents'

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
  const [mapLoaded, setMapLoaded] = useState(false)

  const city          = useMapStore(s => s.city)
  const activeLayers  = useMapStore(s => s.activeLayers)
  const setMapReady   = useMapStore(s => s.setMapReady)
  const selectSegment = useMapStore(s => s.selectSegment)

  const setSnapshot           = useTrafficStore(s => s.setSnapshot)
  const setIncidents          = useTrafficStore(s => s.setIncidents)
  const setWeather            = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather   = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality         = useTrafficStore(s => s.setAirQuality)
  const setDataSource         = useTrafficStore(s => s.setDataSource)

  const useLiveData = hasKey()

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

      // Add TomTom tile layers if key available
      if (useLiveData) {
        addTomTomLayers(map)
      }

      setMapLoaded(true)
      setMapReady(true)
    })

    // Click on synthetic segments
    map.on('click', TRAFFIC_SOURCE + '-lines', async (e) => {
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

    // Click on map → fetch real TomTom data at that point
    map.on('click', async (e) => {
      if (!useLiveData) return
      // Only if not clicking a feature
      const features = map.queryRenderedFeatures(e.point)
      if (features.some(f => f.source === TRAFFIC_SOURCE)) return

      const flow = await fetchFlowSegment(e.lngLat.lat, e.lngLat.lng, Math.round(map.getZoom()))
      if (flow && !flow.roadClosure) {
        showFlowPopup(map, e.lngLat, flow)
      }
    })

    map.on('mouseenter', TRAFFIC_SOURCE + '-lines', () => { map.getCanvas().style.cursor = 'pointer' })
    map.on('mouseleave', TRAFFIC_SOURCE + '-lines', () => { map.getCanvas().style.cursor = '' })

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
    const color   = ratio > 0.75 ? '#00E676' : ratio > 0.5 ? '#FFD600' : ratio > 0.25 ? '#FF6D00' : '#FF1744'
    const delay   = Math.max(0, flow.currentTravelTime - flow.freeFlowTravelTime)

    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: false, maxWidth: '240px' })
      .setLngLat(lngLat)
      .setHTML(`
        <div style="font-family:Inter,sans-serif;font-size:12px;color:#F0F0FF;background:#0F0F1A;padding:12px;border-radius:12px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <span style="font-weight:600;font-size:11px;color:${color}">
              ${flow.currentSpeed} km/h
            </span>
            <span style="color:#454560;font-size:10px;">/ ${flow.freeFlowSpeed} km/h</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            <div style="background:#161625;border-radius:8px;padding:8px;">
              <p style="color:#454560;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;">Trajet</p>
              <p style="font-weight:700;margin-top:2px;">${Math.round(flow.currentTravelTime / 60)} min</p>
            </div>
            <div style="background:#161625;border-radius:8px;padding:8px;">
              <p style="color:#454560;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;">Retard</p>
              <p style="font-weight:700;margin-top:2px;color:${delay > 0 ? '#FF6D00' : '#00E676'}">
                ${delay > 0 ? '+' : ''}${Math.round(delay / 60)} min
              </p>
            </div>
          </div>
          <div style="margin-top:8px;color:#454560;font-size:9px;">
            Confiance: ${Math.round(flow.confidence * 100)}% · Source: TomTom Live
          </div>
        </div>
      `)
      .addTo(map)
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

  // ─── Data refresh ─────────────────────────────────────────────────────

  const refreshData = useCallback(async () => {
    if (!mapRef.current || !mapLoaded) return
    const map = mapRef.current

    // Always generate synthetic overlay
    const snapshot  = generateTrafficSnapshot(city)
    const synthetic = generateIncidents(city)
    setSnapshot(snapshot)

    let incidents: Incident[] = synthetic

    if (useLiveData) {
      // Fetch real TomTom incidents
      setDataSource('live')
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

    // Heatmap
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
    trySet(HEATMAP_SOURCE  + '-layer',    activeLayers.has('heatmap')   ? 'visible' : 'none')
    trySet(INCIDENT_SOURCE + '-circles',  activeLayers.has('incidents') ? 'visible' : 'none')
    trySet(INCIDENT_SOURCE + '-labels',   activeLayers.has('incidents') ? 'visible' : 'none')

    // TomTom live tiles
    if (useLiveData) {
      trySet(TOMTOM_FLOW + '-layer', activeLayers.has('traffic') ? 'visible' : 'none')
      trySet(TOMTOM_INC  + '-layer', activeLayers.has('incidents') ? 'visible' : 'none')
    }
  }, [activeLayers, mapLoaded, useLiveData])

  return (
    <div ref={containerRef} className="w-full h-full" />
  )
}

// ─── Sources init ─────────────────────────────────────────────────────────────

function initStaticSources(map: maplibregl.Map) {
  const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

  // Synthetic traffic lines
  map.addSource(TRAFFIC_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     TRAFFIC_SOURCE + '-lines',
    type:   'line',
    source: TRAFFIC_SOURCE,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  {
      'line-color':   ['get', 'color'],
      'line-width':   ['get', 'width'],
      'line-opacity': ['case', ['boolean', hasKey(), false], 0.3, 0.9], // dimmed if live data active
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
      'heatmap-opacity':  0.80,
      'heatmap-color': [
        'interpolate', ['linear'], ['heatmap-density'],
        0,    'rgba(0,230,118,0)',
        0.25, 'rgba(0,230,118,0.55)',
        0.5,  'rgba(255,214,0,0.75)',
        0.75, 'rgba(255,109,0,0.90)',
        1,    'rgba(255,23,68,1)',
      ],
    },
  })

  // Incidents
  map.addSource(INCIDENT_SOURCE, { type: 'geojson', data: emptyFC })
  map.addLayer({
    id:     INCIDENT_SOURCE + '-circles',
    type:   'circle',
    source: INCIDENT_SOURCE,
    paint:  {
      'circle-radius':       ['interpolate', ['linear'], ['zoom'], 8, 5, 14, 10],
      'circle-color':        ['get', 'color'],
      'circle-opacity':      0.92,
      'circle-stroke-width': 2,
      'circle-stroke-color': '#07070D',
    },
  })
  map.addLayer({
    id:     INCIDENT_SOURCE + '-labels',
    type:   'symbol',
    source: INCIDENT_SOURCE,
    minzoom: 12,
    layout: {
      'text-field':  ['get', 'title'],
      'text-size':   10,
      'text-offset': [0, 1.8],
      'text-anchor': 'top',
    },
    paint: {
      'text-color':      '#F0F0FF',
      'text-halo-color': '#07070D',
      'text-halo-width': 1.5,
    },
  })
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
