'use client'
import { useEffect, useState } from 'react'
import { Calendar, MapPin, Users, TrendingUp, ExternalLink } from 'lucide-react'
import { fetchNearbyEvents } from '@/lib/api/events'
import type { UrbanEvent } from '@/lib/api/events'
import { cn } from '@/lib/utils/cn'

const CATEGORY_CONFIG: Record<UrbanEvent['category'], { emoji: string; color: string; bg: string }> = {
  concert:        { emoji: '🎵', color: '#AA00FF', bg: 'rgba(170,0,255,0.10)' },
  sport:          { emoji: '⚽', color: '#2979FF', bg: 'rgba(41,121,255,0.10)' },
  manifestation:  { emoji: '📢', color: '#FF1744', bg: 'rgba(255,23,68,0.10)'  },
  exposition:     { emoji: '🖼️', color: '#00E5FF', bg: 'rgba(0,229,255,0.10)'  },
  marché:         { emoji: '🛒', color: '#FFD600', bg: 'rgba(255,214,0,0.10)'  },
  congrès:        { emoji: '🏛️', color: '#FF6D00', bg: 'rgba(255,109,0,0.10)'  },
  autre:          { emoji: '📍', color: '#8080A0', bg: 'rgba(128,128,160,0.10)'},
}

function trafficImpactLabel(score: number): { label: string; color: string } {
  if (score >= 0.7) return { label: 'Impact fort',   color: '#FF1744' }
  if (score >= 0.4) return { label: 'Impact modéré', color: '#FF6D00' }
  if (score >= 0.2) return { label: 'Impact léger',  color: '#FFD600' }
  return                   { label: 'Impact faible', color: '#00E676' }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function formatAttendance(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M pers.`
  if (n >= 1_000)     return `${Math.round(n / 1_000)}k pers.`
  return `${n} pers.`
}

interface EventsWidgetProps {
  lat:      number
  lng:      number
  radiusKm?: number
  maxItems?: number
  compact?:  boolean
}

export function EventsWidget({ lat, lng, radiusKm = 15, maxItems = 6, compact = false }: EventsWidgetProps) {
  const [events,  setEvents]  = useState<UrbanEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const data = await fetchNearbyEvents(lat, lng, radiusKm)
      if (!cancelled) {
        // Sort by traffic impact desc, then by date
        const sorted = [...data].sort((a, b) => b.trafficScore - a.trafficScore || a.startDate.localeCompare(b.startDate))
        setEvents(sorted.slice(0, maxItems))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [lat, lng, radiusKm, maxItems])

  if (loading) {
    return (
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-brand-green" />
          <p className="text-sm font-semibold text-text-primary">Événements à proximité</p>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-14 bg-bg-elevated rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-text-muted" />
          <p className="text-sm font-semibold text-text-primary">Événements à proximité</p>
        </div>
        <p className="text-xs text-text-muted text-center py-4">Aucun événement majeur détecté dans un rayon de {radiusKm} km</p>
      </div>
    )
  }

  // High-impact events (score ≥ 0.5)
  const highImpact = events.filter(e => e.trafficScore >= 0.5)

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-green" />
          <p className="text-sm font-semibold text-text-primary">Événements à proximité</p>
          <span className="text-xs bg-bg-elevated border border-bg-border px-2 py-0.5 rounded-full text-text-muted">
            {events.length}
          </span>
        </div>
        {highImpact.length > 0 && (
          <span className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-[rgba(255,109,0,0.10)] text-[#FF6D00]">
            ⚠ {highImpact.length} fort{highImpact.length > 1 ? 's' : ''} impact
          </span>
        )}
      </div>

      {/* Events list */}
      <div className="divide-y divide-bg-border">
        {events.map(evt => {
          const cfg    = CATEGORY_CONFIG[evt.category]
          const impact = trafficImpactLabel(evt.trafficScore)
          const isNow  = new Date() >= new Date(evt.startDate) && new Date() <= new Date(evt.endDate)

          return (
            <div key={evt.id} className={cn(
              'px-5 py-3.5 hover:bg-bg-elevated transition-colors',
              isNow && 'border-l-2 border-l-[#FF6D00]',
            )}>
              <div className="flex items-start gap-3">
                {/* Category icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: cfg.bg }}
                >
                  {cfg.emoji}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Title + NOW badge */}
                  <div className="flex items-center gap-2 mb-0.5">
                    {isNow && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[rgba(255,109,0,0.15)] text-[#FF6D00] uppercase tracking-wider flex-shrink-0">
                        En cours
                      </span>
                    )}
                    <p className="text-sm font-medium text-text-primary truncate">{evt.title}</p>
                  </div>

                  {/* Meta row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 text-[10px] text-text-muted">
                      <Calendar className="w-2.5 h-2.5" />
                      {formatDate(evt.startDate)}
                    </span>
                    {evt.attendance > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-text-muted">
                        <Users className="w-2.5 h-2.5" />
                        ~{formatAttendance(evt.attendance)}
                      </span>
                    )}
                    {evt.location.address && (
                      <span className="flex items-center gap-1 text-[10px] text-text-muted truncate max-w-[140px]">
                        <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                        {evt.location.address}
                      </span>
                    )}
                  </div>
                </div>

                {/* Traffic impact badge */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-lg"
                    style={{ color: impact.color, backgroundColor: `${impact.color}18` }}
                  >
                    {impact.label}
                  </span>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-text-muted" />
                    <span className="text-[10px] text-text-muted">
                      +{Math.round(evt.trafficScore * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-bg-border flex items-center justify-between">
        <p className="text-[10px] text-text-muted">
          Source: {events.some(e => e.source === 'predicthq') ? 'PredictHQ' : ''}{events.some(e => e.source === 'paris-opendata') ? (events.some(e => e.source === 'predicthq') ? ' + ' : '') + 'Paris Open Data' : ''}
        </p>
        <p className="text-[10px] text-text-muted">Rayon {radiusKm} km</p>
      </div>
    </div>
  )
}
