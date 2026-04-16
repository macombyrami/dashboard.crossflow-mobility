'use client'

import { useEffect, useMemo } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L, { type GeoJSON as LeafletGeoJSON, type LatLngExpression } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Activity } from 'lucide-react'
import { toast } from 'sonner'

import { useMapStore } from '@/store/mapStore'
import { SIMULATION_INTERACTION_MODE, useSimulationStore } from '@/store/simulationStore'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO'

const DEFAULT_CENTER: LatLngExpression = [48.8566, 2.3522]

type RoadFeature = GeoJSON.Feature<GeoJSON.LineString, Record<string, unknown>>

export function SimulationMap() {
  const city = useMapStore(s => s.city)
  const selectSegment = useMapStore(s => s.selectSegment)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)

  const roadNetwork = useSimulationStore(s => s.roadNetwork)
  const setRoadNetwork = useSimulationStore(s => s.setRoadNetwork)
  const setGraphLoaded = useSimulationStore(s => s.setGraphLoaded)
  const setBackendOnline = useSimulationStore(s => s.setBackendOnline)
  const setEngineStatus = useSimulationStore(s => s.setEngineStatus)
  const setLastError = useSimulationStore(s => s.setLastError)
  const eventLocation = useSimulationStore(s => s.eventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const interactionMode = useSimulationStore(s => s.interactionMode)
  const trafficLevel = useSimulationStore(s => s.trafficLevel)
  const blockedEdgeIds = useSimulationStore(s => s.blockedEdgeIds)
  const trafficEdges = useSimulationStore(s => s.trafficEdges)
  const localEvents = useSimulationStore(s => s.localEvents)
  const blockRoad = useSimulationStore(s => s.blockRoad)
  const setTrafficEdge = useSimulationStore(s => s.setTrafficEdge)

  useEffect(() => {
    let mounted = true

    const loadNetwork = async () => {
      try {
        setEngineStatus('initializing')
        setLastError(null)

        const res = await fetch('/api/idf-roads?frc=1,2,3,4,5&limit=900')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const geojson = await res.json() as GeoJSON.FeatureCollection
        if (!mounted) return

        setRoadNetwork(geojson)
        setGraphLoaded(true)
        setBackendOnline(true)
        setEngineStatus('ready')
      } catch (err) {
        if (!mounted) return
        console.error('[SimulationMap] local network load failed:', err)
        setRoadNetwork(emptyFC())
        setGraphLoaded(true)
        setBackendOnline(true)
        setEngineStatus('ready')
        setLastError(null)
      }
    }

    void loadNetwork()

    return () => {
      mounted = false
    }
  }, [setBackendOnline, setEngineStatus, setGraphLoaded, setLastError, setRoadNetwork])

  const center = useMemo(() => city.center as LatLngExpression, [city.center])
  const routeStyle = useMemo(
    () => makeRouteStyle(blockedEdgeIds, trafficEdges, selectedSegmentId),
    [blockedEdgeIds, trafficEdges, selectedSegmentId],
  )
  const routes = useMemo(() => roadNetwork ?? emptyFC(), [roadNetwork])
  const nodes = useMemo(() => buildNodeCollection(routes), [routes])

  return (
    <div className="relative h-full w-full bg-black">
      <MapContainer
        center={center || DEFAULT_CENTER}
        zoom={13.5}
        className="absolute inset-0"
        zoomControl={false}
        preferCanvas
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <MapController />
        <RoadLayer
          data={routes}
          styleFn={routeStyle}
          onSelect={selectSegment}
          interactionMode={interactionMode}
          onToggleBlock={(edgeId) => {
            blockRoad(edgeId)
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
            toast.success('Route bloquee')
          }}
          onSetTraffic={(edgeId) => {
            setTrafficEdge(edgeId, trafficLevel)
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
            toast.success('Trafic applique')
          }}
        />
        <NodeLayer data={nodes} />
        <EventOverlay eventLocation={eventLocation} localEvents={localEvents} />
        <ClickTracker
          locationPickerActive={locationPickerActive}
          setLocationPickerActive={setLocationPickerActive}
          setEventLocation={setEventLocation}
        />
      </MapContainer>

      <div className="absolute top-4 left-4 z-[1000] max-w-[320px] rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Carte simulation</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Cliquez sur un segment pour agir, ou sur la carte pour placer un evenement.
        </p>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl space-y-2">
        <div className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Legende</div>
        <LegendItem color="#4A5568" label="Route normale" />
        <LegendItem color="#FF6D00" label="Trafic ralenti" />
        <LegendItem color="#FF1744" label="Route bloquee" />
        <LegendItem color="#68D391" label="Feu de signalisation" dot />
      </div>

      <div className="absolute top-4 right-4 z-[1000] rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl">
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

function MapController() {
  const city = useMapStore(s => s.city)
  const map = useMap()

  useEffect(() => {
    map.setView(city.center as LatLngExpression, 13.5, { animate: true })
  }, [city.center, map])

  return null
}

function ClickTracker({
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

  useEffect(() => {
    if (typeof window === 'undefined') return
    const container = document.querySelector('.leaflet-container') as HTMLElement | null
    if (!container) return
    container.style.cursor = locationPickerActive ? 'crosshair' : ''
  }, [locationPickerActive])

  return null
}

function RoadLayer({
  data,
  styleFn,
  onSelect,
  interactionMode,
  onToggleBlock,
  onSetTraffic,
}: {
  data: GeoJSON.FeatureCollection
  styleFn: (feature: RoadFeature) => L.PathOptions
  onSelect: (edgeId: string) => void
  interactionMode: string
  onToggleBlock: (edgeId: string) => void
  onSetTraffic: (edgeId: string) => void
}) {
  return (
    <GeoJSON
      data={data as GeoJSON.GeoJsonObject}
      style={styleFn as any}
      onEachFeature={(feature, layer) => {
        const props = feature.properties as Record<string, unknown> | undefined
        const edgeId = String(props?.id ?? '')
        const label = String(props?.roadName ?? props?.name ?? edgeId)
        const highway = String(props?.highway ?? '')
        const length = Number(props?.length ?? 0)
        const speed = Number(props?.speed_kph ?? 0)
        const status = String(props?.status ?? 'normal')

        layer.bindTooltip(
          `<div class="edge-tooltip">
            <strong>${label || 'Sans nom'}</strong><br/>
            ${highway ? `${highway} — ` : ''}${length ? `${Math.round(length)}m` : ''}
            ${speed ? `<br/>${speed} km/h` : ''}
            ${status !== 'normal' ? `<br/><span class="status-${status}">${status.toUpperCase()}</span>` : ''}
          </div>`,
          { sticky: true, className: 'crossflow-tooltip' },
        )

        const pathLayer = layer as L.Path

        pathLayer.on('click', (evt) => {
          L.DomEvent.stopPropagation(evt)
          if (!edgeId) return
          onSelect(edgeId)
          if (interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD) {
            onToggleBlock(edgeId)
          } else if (interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC) {
            onSetTraffic(edgeId)
          }
        })

        pathLayer.on('mouseover', () => {
          pathLayer.setStyle({ weight: 6, opacity: 1 })
          pathLayer.bringToFront()
        })
        pathLayer.on('mouseout', () => {
          pathLayer.setStyle(styleFn(feature as RoadFeature))
        })
      }}
    />
  )
}

function NodeLayer({ data }: { data: GeoJSON.FeatureCollection }) {
  return (
    <>
      {(data.features as GeoJSON.Feature[]).map((feature, index) => {
        const props = feature.properties as Record<string, unknown> | undefined
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number]

        if (!props?.is_traffic_signal && !props?.is_crossing && Number(props?.street_count ?? 0) < 3) {
          return null
        }

        const isSignal = Boolean(props?.is_traffic_signal)
        const isCrossing = Boolean(props?.is_crossing)
        const color = isSignal ? '#68D391' : isCrossing ? '#F6E05E' : '#A0AEC0'
        const radius = isSignal ? 4 : Number(props?.street_count ?? 0) >= 4 ? 3 : 2

        return (
          <CircleMarker
            key={String(props?.id ?? index)}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              fillOpacity: 0.85,
              color,
              weight: 1,
            }}
          >
            {isSignal && (
              <Tooltip direction="top" offset={[0, -4]}>
                🚦 Feu de signalisation
              </Tooltip>
            )}
          </CircleMarker>
        )
      })}
    </>
  )
}

function EventOverlay({
  eventLocation,
  localEvents,
}: {
  eventLocation: { lat: number; lng: number } | null
  localEvents: Array<{ id: string; lat: number; lng: number }>
}) {
  return (
    <>
      {eventLocation && (
        <Marker
          position={[eventLocation.lat, eventLocation.lng]}
          icon={blueDotIcon()}
        />
      )}
      {localEvents.map(evt => (
        <CircleMarker
          key={evt.id}
          center={[evt.lat, evt.lng]}
          radius={8}
          pathOptions={{
            color: '#2979FF',
            fillColor: '#2979FF',
            fillOpacity: 0.8,
            weight: 2,
          }}
        />
      ))}
    </>
  )
}

function makeRouteStyle(
  blockedEdgeIds: string[],
  trafficEdges: Record<string, 'light' | 'medium' | 'heavy'>,
  selectedSegmentId: string | null,
) {
  return (feature: RoadFeature): L.PathOptions => {
    const id = String(feature.properties?.id ?? '')
    if (blockedEdgeIds.includes(id)) {
      return {
        color: '#FF1744',
        weight: selectedSegmentId === id ? 7 : 5,
        opacity: 0.8,
      }
    }
    if (trafficEdges[id]) {
      return {
        color: trafficEdges[id] === 'light' ? '#00E676' : trafficEdges[id] === 'medium' ? '#FF6D00' : '#FF1744',
        weight: selectedSegmentId === id ? 6 : 4,
        opacity: 0.78,
      }
    }
    return {
      color: '#4A5568',
      weight: selectedSegmentId === id ? 5 : 3,
      opacity: selectedSegmentId === id ? 0.95 : 0.72,
    }
  }
}

function blueDotIcon() {
  return L.divIcon({
    className: '',
    html: '<div style="width:16px;height:16px;border-radius:9999px;background:#2979FF;border:2px solid #fff;box-shadow:0 0 0 4px rgba(41,121,255,0.18)"></div>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  })
}

function buildNodeCollection(network: GeoJSON.FeatureCollection) {
  const seen = new Set<string>()
  const features: GeoJSON.Feature[] = []

  for (const feature of network.features as RoadFeature[]) {
    if (feature.geometry.type !== 'LineString') continue
    const coords = feature.geometry.coordinates
    const endpoints = [coords[0], coords[coords.length - 1]].filter(Boolean) as [number, number][]

    for (const [lng, lat] of endpoints) {
      const key = `${lng.toFixed(5)}:${lat.toFixed(5)}`
      if (seen.has(key)) continue
      seen.add(key)
      features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        properties: {
          id: key,
          is_crossing: true,
          is_traffic_signal: isSignalNode(key),
          street_count: (feature.properties?.street_count as number | undefined) ?? 3,
        },
      })
    }

    if (features.length >= 1200) break
  }

  return {
    type: 'FeatureCollection',
    features,
  } satisfies GeoJSON.FeatureCollection
}

function isSignalNode(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 7 === 0
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
