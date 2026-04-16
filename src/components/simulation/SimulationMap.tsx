'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Activity, MapPin, Route, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { predictiveApi } from '@/lib/api/predictive'
import { simulationService } from '@/lib/services/SimulationService'
import { useMapStore } from '@/store/mapStore'
import { SIMULATION_INTERACTION_MODE, useSimulationStore } from '@/store/simulationStore'
import type { PredTrafficLevel } from '@/lib/api/predictive'

const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors © CARTO',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#08090B' },
    },
    {
      id: 'carto-layer',
      type: 'raster',
      source: 'carto',
      paint: {
        'raster-opacity': 0.86,
        'raster-brightness-max': 0.45,
        'raster-saturation': -0.45,
      },
    },
  ],
}

const EDGE_SOURCE = 'sim-edges'
const AFFECTED_SOURCE = 'sim-affected'
const NODE_SOURCE = 'sim-nodes'
const EVENT_SOURCE = 'sim-event'

export function SimulationMap() {
  const city = useMapStore(s => s.city)
  const selectSegment = useMapStore(s => s.selectSegment)
  const eventLocation = useSimulationStore(s => s.eventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const interactionMode = useSimulationStore(s => s.interactionMode)
  const trafficLevel = useSimulationStore(s => s.trafficLevel)
  const revision = useSimulationStore(s => s.revision)

  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)

  const center = useMemo(() => city.center, [city.center])

  const setSourceData = (sourceId: string, data: GeoJSON.FeatureCollection) => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined
    if (source) source.setData(data)
  }

  const refreshData = async () => {
    try {
      const [edges, nodes, affected] = await Promise.all([
        predictiveApi.getEdges('all'),
        predictiveApi.getNodes(),
        predictiveApi.getAffectedEdges().catch(() => ({ type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection)),
      ])
      setSourceData(EDGE_SOURCE, edges)
      setSourceData(NODE_SOURCE, nodes)
      setSourceData(AFFECTED_SOURCE, affected)
    } catch (err) {
      console.error('[SimulationMap] refresh failed:', err)
    }
  }

  useEffect(() => {
    void simulationService.initEngine(city)
  }, [city.id, city.name])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [center.lng, center.lat],
      zoom: 13.5,
      pitch: 0,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right')
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left')

    map.on('load', () => {
      map.addSource(EDGE_SOURCE, { type: 'geojson', data: emptyFC() })
      map.addSource(AFFECTED_SOURCE, { type: 'geojson', data: emptyFC() })
      map.addSource(NODE_SOURCE, { type: 'geojson', data: emptyFC() })
      map.addSource(EVENT_SOURCE, { type: 'geojson', data: emptyFC() })

      map.addLayer({
        id: `${EDGE_SOURCE}-layer`,
        type: 'line',
        source: EDGE_SOURCE,
        paint: {
          'line-color': [
            'match',
            ['get', 'status'],
            'blocked', '#FF1744',
            'slow', '#FF6D00',
            '#4A5568',
          ],
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 1.6,
            15, 3,
            17, 5,
          ],
          'line-opacity': 0.72,
        },
      })

      map.addLayer({
        id: `${AFFECTED_SOURCE}-layer`,
        type: 'line',
        source: AFFECTED_SOURCE,
        paint: {
          'line-color': '#FF1744',
          'line-width': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, 2.2,
            15, 4,
            17, 6,
          ],
          'line-opacity': 0.22,
          'line-blur': 1,
        },
      })

      map.addLayer({
        id: `${NODE_SOURCE}-layer`,
        type: 'circle',
        source: NODE_SOURCE,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            12, ['case', ['boolean', ['get', 'is_traffic_signal'], false], 3.5, 2],
            15, ['case', ['boolean', ['get', 'is_traffic_signal'], false], 6, 3],
            18, ['case', ['boolean', ['get', 'is_traffic_signal'], false], 9, 4],
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'is_traffic_signal'], false], '#68D391',
            ['boolean', ['get', 'is_crossing'], false], '#F6E05E',
            '#A0AEC0',
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#08090B',
        },
      })

      map.addLayer({
        id: `${EVENT_SOURCE}-layer`,
        type: 'circle',
        source: EVENT_SOURCE,
        paint: {
          'circle-radius': 8,
          'circle-color': '#2979FF',
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      })

      map.on('click', `${EDGE_SOURCE}-layer`, async (e) => {
        const feature = e.features?.[0]
        const edgeId = String(feature?.properties?.id ?? '')
        if (!edgeId) return

        selectSegment(edgeId)

        if (interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD) {
          try {
            await predictiveApi.blockRoad(edgeId)
            await refreshData()
            useSimulationStore.getState().bumpRevision()
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
            toast.success('Route bloquée')
          } catch (err) {
            console.error(err)
            toast.error('Blocage impossible')
          }
          return
        }

        if (interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC) {
          try {
            await predictiveApi.addTraffic(edgeId, trafficLevel)
            await refreshData()
            useSimulationStore.getState().bumpRevision()
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
            toast.success('Trafic appliqué')
          } catch (err) {
            console.error(err)
            toast.error('Trafic impossible')
          }
          return
        }
      })

      map.on('click', (e) => {
        if (!locationPickerActive) return
        setEventLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng })
        setLocationPickerActive(false)
      })

      map.on('mousemove', `${EDGE_SOURCE}-layer`, () => {
        map.getCanvas().style.cursor = interactionMode === SIMULATION_INTERACTION_MODE.NONE ? 'pointer' : 'crosshair'
      })

      map.on('mouseleave', `${EDGE_SOURCE}-layer`, () => {
        map.getCanvas().style.cursor = locationPickerActive ? 'crosshair' : ''
      })

      setMapLoaded(true)
      void refreshData()
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    void refreshData()
  }, [mapLoaded, revision, city.id])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    map.flyTo({ center: [center.lng, center.lat], zoom: 13.5, duration: 900 })
  }, [center.lng, center.lat, mapLoaded])

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const map = mapRef.current
    const source = map.getSource(EVENT_SOURCE) as maplibregl.GeoJSONSource | undefined
    if (!source) return

    if (!eventLocation) {
      source.setData(emptyFC())
      return
    }

    source.setData({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [eventLocation.lng, eventLocation.lat],
        },
        properties: {},
      }],
    })
  }, [eventLocation, mapLoaded])

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    map.getCanvas().style.cursor = locationPickerActive ? 'crosshair' : ''
  }, [locationPickerActive])

  return (
    <div className="relative h-full w-full bg-black">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="absolute top-4 left-4 z-10 max-w-[320px] rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Carte simulation</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Cliquez sur un segment pour agir, ou sur la carte pour placer un événement.
        </p>
      </div>

      <div className="absolute bottom-4 left-4 z-10 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Légende</div>
        <LegendItem color="#4A5568" label="Route normale" />
        <LegendItem color="#FF6D00" label="Trafic ralenti" />
        <LegendItem color="#FF1744" label="Route bloquée" />
        <LegendItem color="#68D391" label="Feu de signalisation" dot />
      </div>

      <div className="absolute top-4 right-4 z-10 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">Mode</p>
        <p className="text-xs font-semibold text-text-primary">
          {interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD
            ? 'Bloquer une route'
            : interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC
              ? 'Ajouter du trafic'
              : locationPickerActive
                ? 'Placer un événement'
                : 'Navigation libre'}
        </p>
      </div>
    </div>
  )
}

function LegendItem({ color, label, dot = false }: { color: string; label: string; dot?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary">
      {dot ? (
        <span className="w-2.5 h-2.5 rounded-full border border-black/40" style={{ backgroundColor: color }} />
      ) : (
        <span className="w-5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span>{label}</span>
    </div>
  )
}

function emptyFC(): GeoJSON.FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}
