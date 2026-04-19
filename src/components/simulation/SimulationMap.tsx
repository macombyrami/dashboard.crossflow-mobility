'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Activity } from 'lucide-react'

import { useMapStore } from '@/store/mapStore'
import { SIMULATION_INTERACTION_MODE, useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'
import { GraphLayer } from './GraphLayer'
import { MarkersLayer } from './MarkersLayer'
import { RouteLayer } from './RouteLayer'
import { buildEvents, buildNodeCollection, decorateEdges, GENNEVILLIERS_CENTER } from './simulationMap.utils'

export function SimulationMap() {
  const city = useMapStore(s => s.city)
  const selectSegment = useMapStore(s => s.selectSegment)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)

  const interactionMode = useSimulationStore(s => s.interactionMode)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const eventLocation = useSimulationStore(s => s.eventLocation)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)
  const roadNetwork = useSimulationStore(s => s.roadNetwork)
  const setRoadNetwork = useSimulationStore(s => s.setRoadNetwork)
  const setGraphLoaded = useSimulationStore(s => s.setGraphLoaded)
  const setBackendOnline = useSimulationStore(s => s.setBackendOnline)
  const setEngineStatus = useSimulationStore(s => s.setEngineStatus)
  const setLastError = useSimulationStore(s => s.setLastError)
  const blockedEdgeIds = useSimulationStore(s => s.blockedEdgeIds)
  const trafficEdges = useSimulationStore(s => s.trafficEdges)
  const localEvents = useSimulationStore(s => s.localEvents)
  const currentResult = useSimulationStore(s => s.currentResult)

  useEffect(() => {
    let mounted = true
    const loadRoads = async () => {
      try {
        setEngineStatus('initializing')
        const res = await fetch('/api/idf-roads?frc=1,2,3,4,5&limit=1000')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json() as GeoJSON.FeatureCollection
        if (!mounted) return
        setRoadNetwork(json)
        setGraphLoaded(true)
        setBackendOnline(true)
        setEngineStatus('ready')
        setLastError(null)
      } catch (err) {
        if (!mounted) return
        console.error('[SimulationMap] failed to load roads:', err)
        setRoadNetwork({ type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection)
        setGraphLoaded(true)
        setBackendOnline(true)
        setEngineStatus('ready')
        setLastError(null)
      }
    }

    void loadRoads()
    return () => { mounted = false }
  }, [setBackendOnline, setEngineStatus, setGraphLoaded, setLastError, setRoadNetwork])

  const center = city.center ?? { lat: GENNEVILLIERS_CENTER[0], lng: GENNEVILLIERS_CENTER[1] }

  const edgesGeoJSON = useMemo(
    () => decorateEdges(roadNetwork, blockedEdgeIds, trafficEdges),
    [blockedEdgeIds, roadNetwork, trafficEdges],
  )

  const nodesGeoJSON = useMemo(() => buildNodeCollection(edgesGeoJSON), [edgesGeoJSON])
  const eventFeatures = useMemo(
    () => buildEvents(eventLocation, localEvents),
    [eventLocation, localEvents],
  )

  return (
    <div className="relative h-full w-full bg-black">
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13.8}
        className="absolute inset-0"
        zoomControl
        preferCanvas
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; CARTO &copy; OpenStreetMap'
        />

        <GraphLayer
          edgesGeoJSON={edgesGeoJSON}
          selectedSegmentId={selectedSegmentId}
          onSelectSegment={selectSegment}
        />
        <RouteLayer currentResult={currentResult} />
        <MarkersLayer nodesGeoJSON={nodesGeoJSON} eventFeatures={eventFeatures} />
        <MapClickLayer
          locationPickerActive={locationPickerActive}
          setLocationPickerActive={setLocationPickerActive}
          setEventLocation={setEventLocation}
          setInteractionMode={setInteractionMode}
        />
      </MapContainer>

      <div className="absolute top-4 left-4 z-20 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl max-w-[320px]">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Carte simulation</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Meme carte que le projet source: reseau routier, noeuds notables et interactions par clic.
        </p>
      </div>

      <div className="absolute bottom-4 left-4 z-20 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Legende</div>
        <LegendItem color="#4A5568" label="Route normale" />
        <LegendItem color="#FF6D00" label="Trafic ralenti" />
        <LegendItem color="#FF1744" label="Route bloquee" />
        <LegendItem color="#68D391" label="Feu de signalisation" dot />
      </div>

      <div className="absolute top-4 right-4 z-20 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold mb-1">Mode</p>
        <p className="text-xs font-semibold text-text-primary">
          {interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD
            ? 'Bloquer une route'
            : interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC
              ? 'Ajouter du trafic'
              : locationPickerActive
                ? 'Placer un evenement'
                : 'Navigation libre'}
        </p>
      </div>
    </div>
  )
}

function MapClickLayer({
  locationPickerActive,
  setLocationPickerActive,
  setEventLocation,
  setInteractionMode,
}: {
  locationPickerActive: boolean
  setLocationPickerActive: (active: boolean) => void
  setEventLocation: (loc: { lat: number; lng: number } | null) => void
  setInteractionMode: (mode: typeof SIMULATION_INTERACTION_MODE[keyof typeof SIMULATION_INTERACTION_MODE]) => void
}) {
  useEffect(() => {
    const container = document.querySelector('.leaflet-container') as HTMLElement | null
    if (container) container.style.cursor = locationPickerActive ? 'crosshair' : ''
  }, [locationPickerActive])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setInteractionMode])

  return (
    <MapEventsBridge
      locationPickerActive={locationPickerActive}
      setLocationPickerActive={setLocationPickerActive}
      setEventLocation={setEventLocation}
    />
  )
}

function MapEventsBridge({
  locationPickerActive,
  setLocationPickerActive,
  setEventLocation,
}: {
  locationPickerActive: boolean
  setLocationPickerActive: (active: boolean) => void
  setEventLocation: (loc: { lat: number; lng: number } | null) => void
}) {
  useMapEvents({
    click(e) {
      if (!locationPickerActive) return
      setEventLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
      setLocationPickerActive(false)
    },
  })
  return null
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
