'use client'

import { Circle, CircleMarker, Marker, Tooltip } from 'react-leaflet'

import { CROSSING_COLOR, INTERSECTION_COLOR, SIGNAL_COLOR } from './simulationMap.utils'

export function MarkersLayer({
  nodesGeoJSON,
  eventFeatures,
}: {
  nodesGeoJSON: GeoJSON.FeatureCollection
  eventFeatures: GeoJSON.FeatureCollection
}) {
  return (
    <>
      {(nodesGeoJSON.features as GeoJSON.Feature[]).map((feature, index) => {
        const props = feature.properties as Record<string, unknown> | undefined
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        const isSignal = Boolean(props?.is_traffic_signal)
        const isCrossing = Boolean(props?.is_crossing)
        const streetCount = Number(props?.street_count ?? 0)
        if (!isSignal && !isCrossing && streetCount < 3) return null

        const color = isSignal ? SIGNAL_COLOR : isCrossing ? CROSSING_COLOR : INTERSECTION_COLOR
        const radius = isSignal ? 4 : streetCount >= 4 ? 3 : 2

        return (
          <CircleMarker
            key={String(props?.id ?? index)}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{ fillColor: color, fillOpacity: 0.85, color, weight: 1 }}
          >
            {isSignal && (
              <Tooltip direction="top" offset={[0, -4]}>
                🚦 Feu de signalisation
              </Tooltip>
            )}
          </CircleMarker>
        )
      })}

      {(eventFeatures.features as GeoJSON.Feature[]).map((feature, index) => {
        const props = feature.properties as Record<string, unknown> | undefined
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
        const isCurrent = String(props?.id ?? '') === 'current-event'
        return (
          <Circle
            key={String(props?.id ?? index)}
            center={[lat, lng]}
            radius={isCurrent ? 260 : 220}
            pathOptions={{
              color: '#2979FF',
              fillColor: '#2979FF',
              fillOpacity: 0.12,
              weight: 1.5,
              dashArray: '4 4',
            }}
          />
        )
      })}
    </>
  )
}
