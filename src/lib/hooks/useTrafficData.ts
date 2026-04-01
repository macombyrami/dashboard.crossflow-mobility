'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateTrafficSnapshot } from '@/lib/engine/traffic.engine'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useEffect, useRef, useState } from 'react'

const CACHE_KEY = 'cf_traffic_map_data'
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export function useTrafficData() {
  const queryClient = useQueryClient()
  const city = useMapStore(s => s.city)
  const setSnapshot = useTrafficStore(s => s.setSnapshot)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const fetchTraffic = async () => {
    // 1. Check persistent cache (localStorage)
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const { data, timestamp, cityId } = JSON.parse(cached)
      if (cityId === city.id && Date.now() - timestamp < CACHE_TTL) {
        console.log('[Traffic] Serving from Persistent Cache')
        return data
      }
    }

    // 2. Fetch Fresh Data (Synthetic for now, or real API)
    console.log('[Traffic] Fetching Fresh Data...')
    const fresh = generateTrafficSnapshot(city)
    
    // 3. Update Persistent Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: fresh,
      timestamp: Date.now(),
      cityId: city.id
    }))

    return fresh
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['traffic', city.id],
    queryFn: fetchTraffic,
    staleTime: CACHE_TTL,
    refetchInterval: CACHE_TTL, // Controlled polling
  })

  // Sync with global store & track update time
  useEffect(() => {
    if (data) {
      setSnapshot(data)
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const { timestamp } = JSON.parse(cached)
        setLastUpdated(new Date(timestamp))
      }
    }
  }, [data, setSnapshot])

  const manualRefresh = async () => {
    localStorage.removeItem(CACHE_KEY)
    await queryClient.invalidateQueries({ queryKey: ['traffic', city.id] })
    await refetch()
  }

  return {
    data,
    isLoading,
    isFetching,
    lastUpdated,
    manualRefresh,
    timeSinceUpdate: lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 60000) : 0
  }
}
