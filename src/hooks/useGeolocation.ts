'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UserPosition {
  lat: number
  lng: number
  accuracy: number     // meters
  heading: number | null
  speed: number | null // m/s
  timestamp: number
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean
  watchMode?: boolean          // continuous tracking vs one-shot
  timeout?: number
  maximumAge?: number
}

interface UseGeolocationResult {
  position: UserPosition | null
  error: GeolocationPositionError | null
  isLocating: boolean
  isTracking: boolean
  locate: () => void
  stopTracking: () => void
  clearPosition: () => void
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationResult {
  const {
    enableHighAccuracy = true,
    watchMode = false,
    timeout = 10_000,
    maximumAge = 5_000,
  } = options

  const [position, setPosition]   = useState<UserPosition | null>(null)
  const [error, setError]         = useState<GeolocationPositionError | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef                = useRef<number | null>(null)

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      lat:       pos.coords.latitude,
      lng:       pos.coords.longitude,
      accuracy:  pos.coords.accuracy,
      heading:   pos.coords.heading,
      speed:     pos.coords.speed,
      timestamp: pos.timestamp,
    })
    setError(null)
    setIsLocating(false)
  }, [])

  const handleError = useCallback((err: GeolocationPositionError) => {
    setError(err)
    setIsLocating(false)
    setIsTracking(false)
  }, [])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setIsTracking(false)
  }, [])

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      const err = { code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError
      setError(err)
      return
    }

    setIsLocating(true)
    setError(null)

    // Stop any existing watch
    stopTracking()

    const geoOptions: PositionOptions = { enableHighAccuracy, timeout, maximumAge }

    if (watchMode) {
      setIsTracking(true)
      watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, geoOptions)
    } else {
      navigator.geolocation.getCurrentPosition(handleSuccess, handleError, geoOptions)
    }
  }, [enableHighAccuracy, timeout, maximumAge, watchMode, handleSuccess, handleError, stopTracking])

  const clearPosition = useCallback(() => {
    stopTracking()
    setPosition(null)
    setError(null)
    setIsLocating(false)
  }, [stopTracking])

  // Cleanup on unmount
  useEffect(() => () => stopTracking(), [stopTracking])

  return { position, error, isLocating, isTracking, locate, stopTracking, clearPosition }
}
