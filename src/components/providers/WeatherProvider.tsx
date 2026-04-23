'use client'
/**
 * WeatherProvider — Global weather sync for all pages
 *
 * Mounted once in AppShell (above all routes).
 * Updates `weather` (Header display) + `openMeteoWeather` + `airQuality`
 * whenever the current city changes. No matter which page the user is on.
 */
import { useEffect, useRef } from 'react'
import { useMapStore }     from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { fetchWeather as fetchOpenMeteoWeather, fetchAirQuality } from '@/lib/api/openmeteo'

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function WeatherProvider() {
  const city                = useMapStore(s => s.city)
  const setWeather          = useTrafficStore(s => s.setWeather)
  const setOpenMeteoWeather = useTrafficStore(s => s.setOpenMeteoWeather)
  const setAirQuality       = useTrafficStore(s => s.setAirQuality)

  // Keep city ref up to date so the interval always uses the current city
  const cityRef = useRef(city)
  useEffect(() => { cityRef.current = city }, [city])

  useEffect(() => {
    let cancelled = false

    const load = async (lat: number, lng: number) => {
      try {
        const [w, aq] = await Promise.all([
          fetchOpenMeteoWeather(lat, lng),
          fetchAirQuality(lat, lng),
        ])
        if (cancelled) return
        setOpenMeteoWeather(w)
        setAirQuality(aq)
        // Legacy WeatherData shape used by the Header on all pages
        setWeather(w ? {
          description:   w.weatherLabel,
          temp:          w.temp,
          icon:          w.weatherEmoji,
          wind:          w.windSpeedKmh,
          rain:          w.precipitationMm > 0,
          snow:          w.snowDepthCm > 0,
          visibility:    w.visibilityM,
          trafficImpact: w.trafficImpact,
        } : null)
      } catch {
        // Network errors are silently ignored — weather is non-critical
      }
    }

    // Immediate load on city change
    load(city.center.lat, city.center.lng)

    // Periodic refresh uses cityRef so it always picks up the latest city
    const interval = setInterval(
      () => load(cityRef.current.center.lat, cityRef.current.center.lng),
      REFRESH_INTERVAL_MS,
    )

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  // Intentional: re-run only when city identity changes (lat + lng)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.center.lat, city.center.lng])

  // Renders nothing — pure side-effect provider
  return null
}
