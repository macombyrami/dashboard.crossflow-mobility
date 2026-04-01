'use client'
import { useEffect, useRef } from 'react'
import { useTrafficStore } from '@/store/trafficStore'
import { useMapStore } from '@/store/mapStore'

/**
 * 🛰️ TrafficSyncManager (Staff Engineer Orchestrator)
 * 
 * Periodically persists real-time snapshots to Supabase.
 * Decouples synchronization from UI renders.
 */
export function TrafficSyncManager() {
  const city          = useMapStore(s => s.city)
  const snapshot      = useTrafficStore(s => s.snapshot)
  const isSyncing     = useTrafficStore(s => s.isSyncing)
  const persist       = useTrafficStore(s => s.persistSnapshot)
  const setIsSyncing  = useTrafficStore(s => s.setIsSyncing)
  
  const lastSyncRef   = useRef<number>(0)
  const SYNC_INTERVAL = 5 * 60 * 1000 // 5 minutes standard for analytics persistence

  useEffect(() => {
    if (!snapshot || isSyncing) return

    const now = Date.now()
    if (now - lastSyncRef.current < SYNC_INTERVAL) return

    async function sync() {
      setIsSyncing(true)
      try {
        const stats = {
          avg_congestion:  snapshot!.segments.reduce((acc, s) => acc + s.congestionScore, 0) / snapshot!.segments.length,
          incident_count:  0, // To be linked to incident store
          active_segments: snapshot!.segments.length
        }

        await persist({
          city_id:      city.id,
          provider:     'tomtom', // Fallback context
          fetched_at:   new Date().toISOString(),
          stats,
          raw_segments: snapshot!.segments, // Compressed by api wrapper
          bbox:         city.bbox
        })
        
        lastSyncRef.current = Date.now()
      } catch (err) {
        console.error('[SyncManager] Persistence failed:', err)
      } finally {
        setIsSyncing(false)
      }
    }

    sync()
  }, [snapshot, city, isSyncing, persist, setIsSyncing])

  return null // Headless orchestrator
}
