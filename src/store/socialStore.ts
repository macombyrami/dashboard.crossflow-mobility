import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { getSocialTimeline, type SocialEvent } from '@/lib/api/social'

interface SocialStore {
  events: SocialEvent[]
  aggregates: any[]
  loading: boolean
  lastFetch: number
  timeRange: number // Minutes from NOW for the scrubber
  
  setEvents: (events: SocialEvent[]) => void
  setTimeRange: (range: number) => void
  fetchTimeline: (cityId: string) => Promise<void>
}

export const useSocialStore = create<SocialStore>()(
  subscribeWithSelector((set, get) => ({
    events: [],
    aggregates: [],
    loading: false,
    lastFetch: 0,
    timeRange: 1440, // 24h default

    setEvents: (events) => set({ events }),
    setTimeRange: (range) => set({ timeRange: range }),
    
    fetchTimeline: async (cityId) => {
      set({ loading: true })
      try {
        const data = await getSocialTimeline(cityId, 1440)
        set({ 
          events: data.events, 
          aggregates: data.aggregates,
          lastFetch: Date.now() 
        })
      } catch (err) {
        console.error('Failed to fetch social timeline:', err)
      } finally {
        set({ loading: false })
      }
    }
  }))
)
