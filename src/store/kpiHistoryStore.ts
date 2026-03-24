import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CityKPIs } from '@/types'

export interface KPISnapshot {
  time:         string  // HH:MM display label
  congestion:   number  // 0-100
  avgTravelMin: number
  cityId:       string
  bucketKey:    number  // floor(ms / 30min) — deduplication key
}

const BUCKET_MS     = 30 * 60 * 1000          // 30 minutes
const MAX_BUCKETS   = 7 * 24 * 2              // 7 days × 48 buckets/day = 336
const MAX_AGE_MS    = 7 * 24 * 60 * 60 * 1000 // 7 days

interface KPIHistoryStore {
  snapshots:   KPISnapshot[]
  addSnapshot: (kpis: CityKPIs) => void
  getForCity:  (cityId: string, maxPoints?: number) => KPISnapshot[]
  clear:       () => void
}

function formatTime(ms: number): string {
  const d = new Date(ms)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export const useKPIHistoryStore = create<KPIHistoryStore>()(
  persist(
    (set, get) => ({
      snapshots: [],

      addSnapshot: (kpis: CityKPIs) => {
        const now       = Date.now()
        const bucketKey = Math.floor(now / BUCKET_MS)
        const cutoff    = now - MAX_AGE_MS

        set(state => {
          // Remove stale entries and de-duplicate by (cityId + bucketKey)
          const fresh = (state as KPIHistoryStore).snapshots.filter(
            s => s.bucketKey * BUCKET_MS > cutoff
          )
          const exists = fresh.some(s => s.cityId === kpis.cityId && s.bucketKey === bucketKey)
          if (exists) return state

          const next: KPISnapshot = {
            time:         formatTime(bucketKey * BUCKET_MS),
            congestion:   Math.round(kpis.congestionRate * 100),
            avgTravelMin: Math.round(kpis.avgTravelMin),
            cityId:       kpis.cityId,
            bucketKey,
          }

          const updated = [...fresh, next]
          // Keep last MAX_BUCKETS per city globally
          return { snapshots: updated.slice(-MAX_BUCKETS * 10) }
        })
      },

      getForCity: (cityId: string, maxPoints = 48) => {
        const now    = Date.now()
        const cutoff = now - MAX_AGE_MS
        return (get() as KPIHistoryStore).snapshots
          .filter(s => s.cityId === cityId && s.bucketKey * BUCKET_MS > cutoff)
          .sort((a, b) => a.bucketKey - b.bucketKey)
          .slice(-maxPoints)
      },

      clear: () => set({ snapshots: [] }),
    }),
    {
      name: 'cf-kpi-history',
      partialize: (state) => ({ snapshots: (state as KPIHistoryStore).snapshots }),
    }
  )
)
