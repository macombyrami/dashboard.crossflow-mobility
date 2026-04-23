'use client'

import { useEffect, useRef } from 'react'
import type { Map } from 'maplibre-gl'
import type { WeatherData } from '@/lib/aggregation/AggregationEngine'

interface WeatherLayerProps {
  map: Map | null
  weatherData: WeatherData | null
  visible: boolean
}

export function WeatherLayer({ map, weatherData, visible }: WeatherLayerProps) {
  const layerAdded = useRef(false)

  useEffect(() => {
    if (!map || !weatherData || !visible) return

    // Add weather layer source
    if (!map.getSource('weather-source')) {
      map.addSource('weather-source', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [map.getCenter().lng, map.getCenter().lat],
              },
              properties: {
                temperature: weatherData.current.temperature,
                humidity: weatherData.current.humidity,
                windSpeed: weatherData.current.wind_speed,
              },
            },
          ],
        },
      })
    }

    // Add weather layer
    if (!map.getLayer('weather-layer')) {
      map.addLayer({
        id: 'weather-layer',
        type: 'circle',
        source: 'weather-source',
        paint: {
          'circle-radius': 10,
          'circle-color': '#00ff00',
          'circle-opacity': 0.5,
        },
      })
      layerAdded.current = true
    }

    return () => {
      if (layerAdded.current && map.getLayer('weather-layer')) {
        map.removeLayer('weather-layer')
        map.removeSource('weather-source')
        layerAdded.current = false
      }
    }
  }, [map, weatherData, visible])

  return null
}
