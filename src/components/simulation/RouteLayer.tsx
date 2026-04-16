'use client'

import { GeoJSON } from 'react-leaflet'

import type { SimulationResult } from '@/types'
import { buildRouteFeature } from './simulationMap.utils'

export function RouteLayer({ currentResult }: { currentResult: SimulationResult | null }) {
  if (!currentResult?.predictive) return null
  const { normal, simulated } = currentResult.predictive
  return (
    <>
      <GeoJSON
        data={buildRouteFeature(normal.total_distance_m, normal.total_time_s) as GeoJSON.GeoJsonObject}
        style={{ color: '#68d391', weight: 5, opacity: 0.7, dashArray: '8 4' }}
      />
      <GeoJSON
        data={buildRouteFeature(simulated.total_distance_m, simulated.total_time_s) as GeoJSON.GeoJsonObject}
        style={{ color: '#fc8181', weight: 5, opacity: 0.9 }}
      />
    </>
  )
}
