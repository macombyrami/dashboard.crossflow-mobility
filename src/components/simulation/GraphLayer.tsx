'use client'

import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import L from 'leaflet'

import { SIMULATION_INTERACTION_MODE, useSimulationStore } from '@/store/simulationStore'
import { EDGE_COLORS, EDGE_WEIGHT, type RoadFeature } from './simulationMap.utils'

export function GraphLayer({
  edgesGeoJSON,
  selectedSegmentId,
  onSelectSegment,
}: {
  edgesGeoJSON: GeoJSON.FeatureCollection | null
  selectedSegmentId: string | null
  onSelectSegment: (id: string | null) => void
}) {
  const interactionMode = useSimulationStore(s => s.interactionMode)
  const trafficLevel = useSimulationStore(s => s.trafficLevel)
  const blockRoad = useSimulationStore(s => s.blockRoad)
  const setTrafficEdge = useSimulationStore(s => s.setTrafficEdge)
  const setInteractionMode = useSimulationStore(s => s.setInteractionMode)

  const styleForFeature = useMemo(() => {
    return (feature: GeoJSON.Feature) => {
      const props = feature.properties as Record<string, unknown> | undefined
      const status = String(props?.status ?? 'normal')
      const id = String(props?.id ?? '')
      const isSelected = selectedSegmentId === id
      return {
        color: EDGE_COLORS[status as keyof typeof EDGE_COLORS] || EDGE_COLORS.normal,
        weight: isSelected ? 7 : EDGE_WEIGHT[status as keyof typeof EDGE_WEIGHT] || EDGE_WEIGHT.normal,
        opacity: status === 'normal' ? 0.6 : 0.9,
        cursor: interactionMode === SIMULATION_INTERACTION_MODE.NONE ? 'pointer' : 'crosshair',
      }
    }
  }, [interactionMode, selectedSegmentId])

  if (!edgesGeoJSON?.features?.length) return null

  return (
    <GeoJSON
      key={JSON.stringify(edgesGeoJSON.features.length)}
      data={edgesGeoJSON as GeoJSON.GeoJsonObject}
      style={styleForFeature as any}
      onEachFeature={(feature, layer) => {
        const props = feature.properties || {}
        const label = props.roadName || props.name || 'Sans nom'
        layer.bindTooltip(
          `<div class="edge-tooltip">
            <strong>${label}</strong><br/>
            ${(props.highway || props.frc || '')} ${props.miles ? `— ${(props.miles * 1.609).toFixed(1)} km` : ''}
            ${props.status !== 'normal' ? `<br/><span class="status-${props.status}">${String(props.status).toUpperCase()}</span>` : ''}
          </div>`,
          { sticky: true, className: 'crossflow-tooltip' },
        )

        const pathLayer = layer as L.Path
        pathLayer.on('click', (e) => {
          L.DomEvent.stopPropagation(e)
          const edgeId = String(props.id ?? '')
          if (!edgeId) return
          onSelectSegment(edgeId)

          if (interactionMode === SIMULATION_INTERACTION_MODE.BLOCK_ROAD) {
            blockRoad(edgeId)
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
          } else if (interactionMode === SIMULATION_INTERACTION_MODE.ADD_TRAFFIC) {
            setTrafficEdge(edgeId, trafficLevel)
            setInteractionMode(SIMULATION_INTERACTION_MODE.NONE)
          }
        })

        pathLayer.on('mouseover', () => {
          pathLayer.setStyle({ weight: 6, opacity: 1 })
          pathLayer.bringToFront()
        })
        pathLayer.on('mouseout', () => {
          const status = String(props.status ?? 'normal')
          const id = String(props.id ?? '')
          const isSelected = selectedSegmentId === id
          pathLayer.setStyle({
            color: EDGE_COLORS[status as keyof typeof EDGE_COLORS] || EDGE_COLORS.normal,
            weight: isSelected ? 7 : EDGE_WEIGHT[status as keyof typeof EDGE_WEIGHT] || EDGE_WEIGHT.normal,
            opacity: status === 'normal' ? 0.6 : 0.9,
          })
        })
      }}
    />
  )
}
