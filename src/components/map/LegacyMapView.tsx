'use client'

import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Map as MapIcon } from 'lucide-react'

import { useMapStore } from '@/store/mapStore'
import { useSimulationStore, SIMULATION_INTERACTION_MODE } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'

type RoadFeature = GeoJSON.Feature<GeoJSON.LineString, Record<string, unknown>>

const CENTER: [number, number] = [48.9239, 2.2939]

export function LegacyMapView() {
  const city = useMapStore(s => s.city)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)
  const selectSegment = useMapStore(s => s.selectSegment)
  const interactionMode = useSimulationStore(s => s.interactionMode)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)
  const setEventLocation = useSimulationStore(s => s.setEventLocation)
  const locationPickerActive = useSimulationStore(s => s.locationPickerActive)
  const setLocationPickerActive = useSimulationStore(s => s.setLocationPickerActive)

  const [roads, setRoads] = useState<GeoJSON.FeatureCollection | null>(null)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch('/api/idf-roads?frc=1,2,3,4,5&limit=1000')
        const json = await res.json() as GeoJSON.FeatureCollection
        if (mounted) setRoads(json)
      } catch {
        if (mounted) setRoads({ type: 'FeatureCollection', features: [] })
      }
    }
    void load()
    return () => { mounted = false }
  }, [city.id])

  const roadStyle = useMemo(() => (feature: RoadFeature) => {
    const id = String(feature.properties?.id ?? '')
    const active = selectedSegmentId === id
    return {
      color: feature.properties?.status === 'blocked' ? '#FF1744' : feature.properties?.status === 'slow' ? '#FF6D00' : '#4A5568',
      weight: active ? 6 : feature.properties?.status ? 4 : 3,
      opacity: active ? 0.95 : 0.75,
    } as L.PathOptions
  }, [selectedSegmentId])

  const nodes = useMemo(() => buildNodes(roads), [roads])

  return (
    <div className="relative h-full w-full bg-black">
      <MapContainer
        center={CENTER}
        zoom={14}
        className="absolute inset-0"
        attributionControl={false}
        zoomControl
        preferCanvas
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution=""
        />
        <MapSync cityCenter={[city.center.lat, city.center.lng]} />
        <RoadLayer
          roads={roads}
          styleFn={roadStyle}
          onSelect={selectSegment}
          onBlock={() => setInteractionMode(SIMULATION_INTERACTION_MODE.BLOCK_ROAD)}
          onTraffic={() => setInteractionMode(SIMULATION_INTERACTION_MODE.ADD_TRAFFIC)}
        />
        <NodeLayer nodes={nodes} />
        <MarkerLayer
          locationPickerActive={locationPickerActive}
          setLocationPickerActive={setLocationPickerActive}
          setEventLocation={setEventLocation}
        />
      </MapContainer>

      <div className="absolute top-4 left-4 z-20 rounded-2xl border border-white/10 bg-bg-surface/90 backdrop-blur-md px-4 py-3 shadow-xl max-w-[320px]">
        <div className="flex items-center gap-2 mb-2">
          <MapIcon className="w-4 h-4 text-brand" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted font-semibold">Carte urbaine</p>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Carte Leaflet legere, avec reseau routier, noeuds notables et evenement local.
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

function MapSync({ cityCenter }: { cityCenter: [number, number] }) {
  const map = useMap()
  useEffect(() => {
    map.setView(cityCenter, 14, { animate: true })
  }, [cityCenter, map])
  return null
}

function RoadLayer({
  roads,
  styleFn,
  onSelect,
  onBlock,
  onTraffic,
}: {
  roads: GeoJSON.FeatureCollection | null
  styleFn: (feature: RoadFeature) => L.PathOptions
  onSelect: (id: string | null) => void
  onBlock: () => void
  onTraffic: () => void
}) {
  if (!roads?.features?.length) return null

  return (
    <GeoJSON
      data={roads as GeoJSON.GeoJsonObject}
      style={styleFn as any}
      onEachFeature={(feature, layer) => {
        const f = feature as RoadFeature
        const props = (f.properties ?? {}) as Record<string, unknown>
        const id = String(props.id ?? '')
        const label = String((props.roadName ?? props.name ?? id) || 'Sans nom')
        const highway = String(props.highway ?? props.frc ?? '')
        const length = Number(props.length ?? 0)
        const status = String(props.status ?? 'normal')

        layer.bindTooltip(
          `<strong>${label}</strong><br/>${highway ? `${highway} — ` : ''}${length ? `${Math.round(length)}m` : ''}${status !== 'normal' ? `<br/><span>${status.toUpperCase()}</span>` : ''}`,
          { sticky: true, className: 'crossflow-tooltip' },
        )

        const pathLayer = layer as L.Path
        pathLayer.on('click', () => onSelect(id))
        pathLayer.on('mouseover', () => {
          pathLayer.setStyle({ weight: 6, opacity: 1 })
          pathLayer.bringToFront()
        })
        pathLayer.on('mouseout', () => pathLayer.setStyle(styleFn(f)))
      }}
    />
  )
}

function NodeLayer({ nodes }: { nodes: GeoJSON.FeatureCollection }) {
  return (
    <>
      {(nodes.features as GeoJSON.Feature[]).map((feature, index) => {
        const props = feature.properties as Record<string, unknown> | undefined
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        const isSignal = Boolean(props?.is_traffic_signal)
        const isCrossing = Boolean(props?.is_crossing)
        const streetCount = Number(props?.street_count ?? 0)
        if (!isSignal && !isCrossing && streetCount < 3) return null

        const color = isSignal ? '#68D391' : isCrossing ? '#F6E05E' : '#A0AEC0'
        return (
          <CircleMarker
            key={String(props?.id ?? index)}
            center={[lat, lng]}
            radius={isSignal ? 4 : streetCount >= 4 ? 3 : 2}
            pathOptions={{ fillColor: color, fillOpacity: 0.85, color, weight: 1 }}
          >
            {isSignal && (
              <Tooltip direction="top" offset={[0, -4]}>
                Feu de signalisation
              </Tooltip>
            )}
          </CircleMarker>
        )
      })}
    </>
  )
}

function MarkerLayer({
  locationPickerActive,
  setLocationPickerActive,
  setEventLocation,
}: {
  locationPickerActive: boolean
  setLocationPickerActive: (v: boolean) => void
  setEventLocation: (v: { lat: number; lng: number } | null) => void
}) {
  useMapEvents({
    click(e) {
      if (!locationPickerActive) return
      setEventLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
      setLocationPickerActive(false)
    },
  })

  useEffect(() => {
    const container = document.querySelector('.leaflet-container') as HTMLElement | null
    if (container) container.style.cursor = locationPickerActive ? 'crosshair' : ''
  }, [locationPickerActive])

  return null
}

function buildNodes(network: GeoJSON.FeatureCollection | null): GeoJSON.FeatureCollection {
  if (!network?.features?.length) return { type: 'FeatureCollection', features: [] }
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
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          id: key,
          is_crossing: true,
          is_traffic_signal: isSignalNode(key),
          street_count: 3,
        },
      })
    }
    if (features.length >= 1200) break
  }

  return { type: 'FeatureCollection', features }
}

function isSignalNode(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
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
