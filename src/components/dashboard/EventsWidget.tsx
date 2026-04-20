'use client'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, TrendingUp, ChevronRight } from 'lucide-react'
import { fetchNearbyEvents } from '@/lib/api/events'
import type { UrbanEvent } from '@/lib/api/events'
import { generateEventsForCity } from '@/lib/engine/events.engine'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

const CATEGORY_CONFIG: Record<UrbanEvent['category'], { emoji: string; color: string; bg: string }> = {
  concert:        { emoji: '🎵', color: '#AF52DE', bg: 'rgba(175,82,222,0.12)' },
  sport:          { emoji: '⚽', color: '#0A84FF', bg: 'rgba(10,132,255,0.12)' },
  manifestation:  { emoji: '📢', color: '#FF453A', bg: 'rgba(255,69,58,0.12)'  },
  exposition:     { emoji: '🏛️', color: '#64D2FF', bg: 'rgba(100,210,255,0.12)' },
  marché:         { emoji: '🛒', color: '#FFD60A', bg: 'rgba(255,214,10,0.12)'  },
  congrès:        { emoji: '🏛️', color: '#FF9F0A', bg: 'rgba(255,159,10,0.12)'  },
  autre:          { emoji: '📍', color: '#8E8E93', bg: 'rgba(142,142,147,0.12)'},
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface EventsWidgetProps {
  lat:      number
  lng:      number
  radiusKm?: number
  maxItems?: number
}

export function EventsWidget({ lat, lng, radiusKm = 15, maxItems = 6 }: EventsWidgetProps) {
  const city = useMapStore(s => s.city)
  const [events, setEvents] = useState<UrbanEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      // Try live, then fallback/append simulation for "more data" as requested
      const live = await fetchNearbyEvents(lat, lng, radiusKm)
      const simulated = generateEventsForCity(city)
      
      if (!cancelled) {
        // Merge and prioritize featured/high impact
        const all = [...live, ...simulated].sort((a, b) => (b.trafficScore || 0) - (a.trafficScore || 0))
        setEvents(all.slice(0, maxItems))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [lat, lng, radiusKm, maxItems, city])

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-[24px] border border-bg-border animate-pulse">
        <div className="h-6 w-48 bg-bg-subtle rounded-lg mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-bg-subtle rounded-2xl" />)}
        </div>
      </div>
    )
  }

  // Group by district for better organization
  const groupedEvents = events.reduce((acc, event) => {
    const d = event.location.district || 'Général'
    if (!acc[d]) acc[d] = []
    acc[d].push(event)
    return acc
  }, {} as Record<string, UrbanEvent[]>)

  return (
    <div className="glass-card rounded-[24px] border border-bg-border overflow-hidden flex flex-col shadow-apple h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-4.5 bg-brand rounded-full shadow-glow" />
            <h2 className="text-[13px] font-bold text-text-muted uppercase tracking-[0.18em]">Événements à proximité</h2>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-bg-subtle border border-bg-border text-text-secondary tabular-nums">
            {events.length}
          </span>
        </div>
      </div>

      {/* Events Scroll Area */}
      <div className="flex-1 overflow-y-auto px-1 custom-scrollbar pb-4">
        {Object.entries(groupedEvents).map(([district, distEvents]) => (
          <div key={district} className="mb-4">
            <div className="px-5 mb-2">
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest">{district}</span>
            </div>
            
            <div className="space-y-1">
              {distEvents.map(evt => {
                const cfg = CATEGORY_CONFIG[evt.category]
                return (
                  <button 
                    key={evt.id} 
                    className="w-full text-left px-5 py-3 group hover:bg-bg-subtle transition-all duration-200 relative"
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl flex-shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: cfg.bg }}>
                        {cfg.emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <h3 className="text-[14px] font-bold text-text-primary truncate group-hover:text-brand transition-colors">{evt.title}</h3>
                        </div>

                        <div className="flex flex-col gap-1">
                          <p className="text-[12px] font-medium text-text-secondary">
                            {formatDate(evt.startDate)}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-text-muted font-medium">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              ~{evt.attendance} pers.
                            </span>
                            {evt.location.address && (
                              <span className="flex items-center gap-1 truncate max-w-[180px]">
                                <MapPin className="w-3 h-3" />
                                {evt.location.address}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Impact Info */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-lg border",
                          evt.trafficScore > 0.6 ? "text-red-500 border-red-500/20 bg-red-500/10" :
                          evt.trafficScore > 0.3 ? "text-orange-500 border-orange-500/20 bg-orange-500/10" :
                          "text-brand border-brand/20 bg-brand/10"
                        )}>
                          {evt.impactLabel || 'Impact léger'}
                        </span>
                        <div className="flex items-center gap-1.5 font-bold text-[12px] text-text-primary tabular-nums">
                          <TrendingUp className="w-3 h-3 text-brand" />
                          +{evt.trafficIncrease || Math.round(evt.trafficScore * 100)}%
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto px-6 py-4 border-t border-bg-border bg-bg-subtle/40 flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Source: PredictHQ</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em]">Rayon {radiusKm}km</span>
        </div>
      </div>
    </div>
  )
}
