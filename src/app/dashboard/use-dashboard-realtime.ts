'use client'

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { AggregatedCityPayload, DashboardCity, IntelligenceIncident, TransitLine } from './dashboard.types'

type DashboardRealtimeState = {
  snapshot: AggregatedCityPayload | null
  incidents: IntelligenceIncident[]
  lines: TransitLine[]
  updatedAt: string | null
  loading: boolean
}

const INITIAL_STATE: DashboardRealtimeState = {
  snapshot: null,
  incidents: [],
  lines: [],
  updatedAt: null,
  loading: true,
}

export function useDashboardRealtime(city: Pick<DashboardCity, 'id' | 'bbox'>) {
  const [state, setState] = useState<DashboardRealtimeState>(INITIAL_STATE)
  const controllerRef = useRef<AbortController | null>(null)

  const refreshRealtime = useCallback(async () => {
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl

    try {
      const bbox = city.bbox.join(',')
      const [aggRes, incRes, lineRes] = await Promise.all([
        fetch(`/api/aggregation/city?city_id=${encodeURIComponent(city.id)}&bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store', signal: ctrl.signal }),
        fetch(`/api/incidents/intelligence?bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store', signal: ctrl.signal }),
        fetch('/api/ratp-traffic', { cache: 'no-store', signal: ctrl.signal }),
      ])

      const [aggJson, incJson, lineJson] = await Promise.all([
        aggRes.ok ? aggRes.json() : null,
        incRes.ok ? incRes.json() : null,
        lineRes.ok ? lineRes.json() : null,
      ])

      if (ctrl.signal.aborted) return

      startTransition(() => {
        setState({
          snapshot: (aggJson ?? null) as AggregatedCityPayload | null,
          incidents: Array.isArray(incJson?.incidents) ? (incJson.incidents as IntelligenceIncident[]) : [],
          lines: Array.isArray(lineJson?.lines) ? (lineJson.lines as TransitLine[]) : [],
          updatedAt: new Date().toISOString(),
          loading: false,
        })
      })
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[dashboard] realtime fetch failed', error)
        startTransition(() => {
          setState(current => ({ ...current, loading: false }))
        })
      }
    }
  }, [city.bbox, city.id])

  useEffect(() => {
    refreshRealtime()
    const interval = window.setInterval(refreshRealtime, 60_000)

    return () => {
      window.clearInterval(interval)
      controllerRef.current?.abort()
    }
  }, [refreshRealtime])

  return {
    ...state,
    refreshRealtime,
  }
}
