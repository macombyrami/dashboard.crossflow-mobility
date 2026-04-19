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
  
  const lastSyncRef     = useRef<number>(0)
  const lastScoreRef    = useRef<number>(0)
  const SYNC_INTERVAL   = 5 * 60 * 1000 // 5 minutes 
  const DIRTY_THRESHOLD = 0.02 // 2% change required to justify DB Write

  useEffect(() => {
    if (!snapshot || isSyncing) return

    const now = Date.now()
    if (now - lastSyncRef.current < SYNC_INTERVAL) return

    async function sync() {
      setIsSyncing(true)
      try {
        const totalSegments = snapshot!.segments.length
        const avgCongestion = snapshot!.segments.reduce((acc, s) => acc + s.congestionScore, 0) / totalSegments
        
        // 🧠 DIRTY CHECK: Is this significantly different from last sync?
        // Prevents write-amplification on stable traffic states.
        const delta = Math.abs(avgCongestion - lastScoreRef.current)
        if (delta < DIRTY_THRESHOLD && lastSyncRef.current !== 0) {
          console.debug(`[SyncManager] Change too small (${(delta*100).toFixed(2)}%). Skipping DB write to save IOPS.`)
          lastSyncRef.current = now
          return
        }

        const stats = {
          avg_congestion:  avgCongestion,
          incident_count:  0, 
          active_segments: totalSegments
        }

        await persist({
          city_id:      city.id,
          provider:     'tomtom', 
          fetched_at:   new Date().toISOString(),
          stats,
          // 📦 PAYLOAD COMPRESSION: Only store ID and score to minimize JSONB size
          raw_segments: snapshot!.segments.map(s => ({ i: s.id, c: s.congestionScore })), 
          bbox:         city.bbox
        })
        
        lastSyncRef.current = now
        lastScoreRef.current = avgCongestion
      } catch (err) {
        console.error('[SyncManager] Persistence failed:', err)
      } finally {
        setIsSyncing(false)
      }
    }

    sync()
  }, [snapshot, city.id, city.bbox, isSyncing, persist, setIsSyncing])

  return null // Headless orchestrator
}
