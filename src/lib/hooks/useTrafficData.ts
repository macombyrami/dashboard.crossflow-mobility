'use client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { generateTrafficSnapshot } from '@/lib/engine/traffic.engine'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useEffect, useRef, useState } from 'react'

const CACHE_TTL = 10 * 60 * 1000 // 10 minutes
const MAX_CACHED_CITIES = 2

type SnapshotCacheEntry = {
  updatedAt: number
  data: ReturnType<typeof generateTrafficSnapshot>
}

const snapshotCache = new Map<string, SnapshotCacheEntry>()

function getCacheKey(cityId: string) {
  return `traffic:${cityId}`
}

function trimSnapshotCache() {
  while (snapshotCache.size > MAX_CACHED_CITIES) {
    const oldestKey = snapshotCache.keys().next().value as string | undefined
    if (!oldestKey) break
    snapshotCache.delete(oldestKey)
  }
}

export function useTrafficData() {
  const queryClient = useQueryClient()
  const city = useMapStore(s => s.city)
  const setSnapshot = useTrafficStore(s => s.setSnapshot)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const fetchTraffic = async () => {
    const key = getCacheKey(city.id)
    const cached = snapshotCache.get(key)
    if (cached && Date.now() - cached.updatedAt < CACHE_TTL) {
      return cached.data
    }

    const fresh = generateTrafficSnapshot(city)
    snapshotCache.set(key, { data: fresh, updatedAt: Date.now() })
    trimSnapshotCache()

    return fresh
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['traffic', city.id],
    queryFn: fetchTraffic,
    staleTime: CACHE_TTL,
    gcTime: CACHE_TTL * 2,
    refetchInterval: CACHE_TTL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    retry: 1,
  })

  // Sync with global store & track update time
  useEffect(() => {
    if (data) {
      setSnapshot(data)
      setLastUpdated(new Date(data.fetchedAt))
    }
  }, [data, setSnapshot])

  const manualRefresh = async () => {
    snapshotCache.delete(getCacheKey(city.id))
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
