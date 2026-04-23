/**
 * Sytadin Map Layers Setup
 * Adds and manages Sytadin incident layers on the map
 */

import type maplibregl from 'maplibre-gl'

const SYTADIN_SOURCE = 'sytadin-incidents'
const SYTADIN_LINES_LAYER = 'sytadin-incidents-line'
const SYTADIN_POINTS_LAYER = 'sytadin-incidents-point'

export function setupSytadinLayers(map: maplibregl.Map): void {
  // Add Sytadin incident lines layer
  if (!map.getLayer(SYTADIN_LINES_LAYER)) {
    map.addLayer({
      id: SYTADIN_LINES_LAYER,
      type: 'line',
      source: SYTADIN_SOURCE,
      filter: ['==', ['geometry-type'], 'LineString'],
      paint: {
        'line-color': [
          'match',
          ['get', 'severity'],
          'critical', '#DC2626',    // red
          'high', '#F97316',        // orange
          'medium', '#EAB308',      // amber
          'low', '#22C55E',         // green
          '#6B7280'                 // gray fallback
        ],
        'line-width': 4,
        'line-opacity': 0.8,
        'line-blur': 1
      },
      layout: {
        'line-cap': 'round',
        'line-join': 'round'
      }
    }, 'incident-unclustered')
  }

  // Add Sytadin incident points layer
  if (!map.getLayer(SYTADIN_POINTS_LAYER)) {
    map.addLayer({
      id: SYTADIN_POINTS_LAYER,
      type: 'circle',
      source: SYTADIN_SOURCE,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'match',
          ['get', 'severity'],
          'critical', '#DC2626',
          'high', '#F97316',
          'medium', '#EAB308',
          'low', '#22C55E',
          '#6B7280'
        ],
        'circle-opacity': 0.9,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
        'circle-stroke-opacity': 0.9
      }
    }, 'incident-unclustered')
  }
}

export function updateSytadinData(map: maplibregl.Map, geojson: GeoJSON.FeatureCollection): void {
  const source = map.getSource(SYTADIN_SOURCE) as maplibregl.GeoJSONSource | undefined
  if (source) {
    source.setData(geojson)
  }
}

export function setSytadinLayerVisibility(map: maplibregl.Map, visible: boolean): void {
  const visibility = visible ? 'visible' : 'none'

  try {
    map.setLayoutProperty(SYTADIN_LINES_LAYER, 'visibility', visibility)
  } catch (e) {
    // Layer may not exist yet
  }

  try {
    map.setLayoutProperty(SYTADIN_POINTS_LAYER, 'visibility', visibility)
  } catch (e) {
    // Layer may not exist yet
  }
}
