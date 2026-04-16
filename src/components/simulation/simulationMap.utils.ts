export const GENNEVILLIERS_CENTER: [number, number] = [48.9239, 2.2939]

export const EDGE_COLORS = {
  normal: '#4a5568',
  slow: '#ed8936',
  blocked: '#e53e3e',
} as const

export const EDGE_WEIGHT = {
  normal: 1.5,
  slow: 2.5,
  blocked: 3,
} as const

export const SIGNAL_COLOR = '#68d391'
export const INTERSECTION_COLOR = '#a0aec0'
export const CROSSING_COLOR = '#f6e05e'

export type RoadFeature = GeoJSON.Feature<GeoJSON.LineString, Record<string, unknown>>

export function decorateEdges(
  network: GeoJSON.FeatureCollection | null,
  blockedEdgeIds: string[],
  trafficEdges: Record<string, 'light' | 'medium' | 'heavy'>,
) : GeoJSON.FeatureCollection | null {
  if (!network?.features?.length) return null

  return {
    type: 'FeatureCollection',
    features: (network.features as RoadFeature[]).map(feature => {
      const id = String(feature.properties?.id ?? '')
      const status = blockedEdgeIds.includes(id)
        ? 'blocked'
        : trafficEdges[id]
          ? 'slow'
          : 'normal'
      return {
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          status,
        },
      }
    }),
  } satisfies GeoJSON.FeatureCollection
}

export function buildNodeCollection(network: GeoJSON.FeatureCollection | null): GeoJSON.FeatureCollection {
  if (!network?.features?.length) return { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection
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

  return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection
}

export function buildEvents(
  eventLocation: { lat: number; lng: number } | null,
  localEvents: Array<{ id: string; lat: number; lng: number; label: string }>,
): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = []
  if (eventLocation) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [eventLocation.lng, eventLocation.lat] },
      properties: { label: 'Point d’impact', id: 'current-event' },
    })
  }
  for (const evt of localEvents) {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [evt.lng, evt.lat] },
      properties: { label: evt.label, id: evt.id },
    })
  }
  return { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection
}

export function buildRouteFeature(distanceM: number, timeS: number): GeoJSON.FeatureCollection {
  const half = Math.max(0.01, Math.min(0.06, distanceM / 30000))
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [GENNEVILLIERS_CENTER[1] - half, GENNEVILLIERS_CENTER[0] - half],
            [GENNEVILLIERS_CENTER[1] + half, GENNEVILLIERS_CENTER[0] + half],
          ],
        },
        properties: { timeS },
      },
    ],
  } as GeoJSON.FeatureCollection
}

export function isSignalNode(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % 7 === 0
}
