'use client'
import { useEffect, useState, useMemo } from 'react'
import { Calendar, MapPin, Users, TrendingUp, ChevronRight, Navigation, Ticket, Zap } from 'lucide-react'
import { fetchNearbyEvents } from '@/lib/api/events'
import type { UrbanEvent } from '@/lib/api/events'
import { generateEventsForCity, computeProximityImpact } from '@/lib/engine/events.engine'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import eventsData from '@/lib/data/events.json'

// ─── Config ───────────────────────────────────────────────────────────────

type Category = UrbanEvent['category'] | 'all'

const TABS = eventsData.tabs as { key: Category; label: string; emoji: string }[]

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> =
  eventsData.categoryConfig

const SOURCE_BADGE: Record<UrbanEvent['source'], { label: string; color: string }> =
  eventsData.sourceBadge as Record<UrbanEvent['source'], { label: string; color: string }>

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function severityColor(score: number) {
  const t = eventsData.severityThresholds
  if (score > t.high.min)   return { text: t.high.text,   bg: t.high.bg,   border: t.high.border   }
  if (score > t.medium.min) return { text: t.medium.text, bg: t.medium.bg, border: t.medium.border }
  if (score > t.low.min)    return { text: t.low.text,    bg: t.low.bg,    border: t.low.border    }
  return                           { text: t.none.text,   bg: t.none.bg,   border: t.none.border   }
}

// ─── Props ────────────────────────────────────────────────────────────────

interface EventsWidgetProps {
  lat:       number
  lng:       number
  radiusKm?: number
  maxItems?: number
}

// ─── Component ────────────────────────────────────────────────────────────

export function EventsWidget({ lat, lng, radiusKm = 15, maxItems = 8 }: EventsWidgetProps) {
  const city                = useMapStore(s => s.city)
  const [events, setEvents] = useState<UrbanEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Category>('all')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const [live, simulated] = await Promise.all([
        fetchNearbyEvents(lat, lng, radiusKm),
        Promise.resolve(generateEventsForCity(city)),
      ])

      if (!cancelled) {
        // Merge: live first, then simulated as fallback (avoid duplicates by title)
        const liveIds = new Set(live.map(e => e.title.toLowerCase().slice(0, 20)))
        const extras  = simulated.filter(e => !liveIds.has(e.title.toLowerCase().slice(0, 20)))
        const all     = [...live, ...extras].sort((a, b) => (b.trafficScore || 0) - (a.trafficScore || 0))
        setEvents(all.slice(0, maxItems))
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [lat, lng, radiusKm, maxItems, city])

  // ─── Filtered events by active tab ────────────────────────────────────

  const filtered = useMemo(() => {
    if (activeTab === 'all') return events
    return events.filter(e => e.category === activeTab)
  }, [events, activeTab])

  // ─── Count by category for badge ──────────────────────────────────────

  const countByCategory = useMemo(() => {
    const m: Partial<Record<Category, number>> = { all: events.length }
    for (const e of events) {
      m[e.category] = (m[e.category] ?? 0) + 1
    }
    return m
  }, [events])

  // ─── Loading skeleton ─────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="glass-card p-6 rounded-[24px] border border-white/5 animate-pulse">
        <div className="h-6 w-48 bg-white/5 rounded-lg mb-4" />
        <div className="flex gap-2 mb-4">
          {[1,2,3,4].map(i => <div key={i} className="h-7 w-20 bg-white/5 rounded-full" />)}
        </div>
        <div className="space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card rounded-[24px] border border-white/5 overflow-hidden flex flex-col shadow-apple h-full">

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-1.5 h-5 bg-brand rounded-full shadow-glow" />
            <h2 className="text-[13px] font-bold text-text-muted uppercase tracking-[0.18em]">
              Événements à proximité
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-secondary tabular-nums">
              {events.length}
            </span>
            <span className="text-[10px] font-bold text-text-muted flex items-center gap-1">
              <Navigation className="w-3 h-3" />{radiusKm}km
            </span>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {TABS.map(tab => {
            const count = countByCategory[tab.key]
            if (!count && tab.key !== 'all') return null
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 border',
                  activeTab === tab.key
                    ? 'bg-brand/15 border-brand/30 text-brand'
                    : 'bg-white/5 border-white/5 text-text-muted hover:border-white/15 hover:text-text-secondary'
                )}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
                {count && count > 0 && (
                  <span className={cn(
                    'text-[9px] px-1.5 py-0 rounded-full font-bold tabular-nums',
                    activeTab === tab.key ? 'bg-brand/25 text-brand' : 'bg-white/10 text-text-muted'
                  )}>{count}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-1 pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
            <span className="text-3xl">📭</span>
            <p className="text-[12px] font-medium">Aucun événement dans cette catégorie</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filtered.map(evt => {
              const cfg    = CATEGORY_CONFIG[evt.category] ?? CATEGORY_CONFIG['autre']
              const impact = computeProximityImpact(evt, lat, lng)
              const sc     = severityColor(evt.proximityScore ?? evt.trafficScore)
              const srcBadge = SOURCE_BADGE[evt.source]
              return (
                <EventCard
                  key={evt.id}
                  evt={evt}
                  cfg={cfg}
                  impact={impact}
                  sc={sc}
                  srcBadge={srcBadge}
                />
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {(['paris-opendata', 'openagenda', 'predicthq', 'ticketmaster'] as const)
            .filter(src => events.some(e => e.source === src))
            .map(src => {
              const badge = SOURCE_BADGE[src]
              return (
                <span key={src} className="text-[9px] font-bold px-1.5 py-0.5 rounded-md border"
                  style={{ color: badge.color, borderColor: `${badge.color}30`, background: `${badge.color}10` }}>
                  {badge.label}
                </span>
              )
            })}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider">Live IDF</span>
        </div>
      </div>
    </div>
  )
}

// ─── Single Event Card ────────────────────────────────────────────────────

interface EventCardProps {
  evt:      UrbanEvent
  cfg:      { emoji: string; color: string; bg: string }
  impact:   ReturnType<typeof computeProximityImpact>
  sc:       ReturnType<typeof severityColor>
  srcBadge: { label: string; color: string }
}

function EventCard({ evt, cfg, impact, sc, srcBadge }: EventCardProps) {
  const isPast = new Date(evt.startDate) < new Date()
  return (
    <button
      className={cn(
        'w-full text-left px-4 py-3 group hover:bg-white/[0.04] active:bg-white/[0.06] transition-all duration-200 rounded-2xl',
        isPast && 'opacity-50',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className="w-10 h-10 rounded-[14px] flex items-center justify-center text-xl flex-shrink-0 mt-0.5 shadow-sm transition-transform group-hover:scale-110"
          style={{ backgroundColor: cfg.bg }}
        >
          {cfg.emoji}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <h3 className="text-[13px] font-bold text-white truncate group-hover:text-brand transition-colors leading-tight">
              {evt.title}
            </h3>
            {/* Past event badge (#13) */}
            {isPast && (
              <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-muted uppercase tracking-wider">
                Passé
              </span>
            )}
          </div>

          {/* Date + venue */}
          <p className="text-[11px] font-medium text-text-secondary mb-1 truncate">
            {evt.venue ? `${evt.venue} · ` : ''}{formatDate(evt.startDate)}
          </p>

          {/* Impact row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Proximity persons */}
            {impact.impactPersonnes > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-text-muted">
                <Users className="w-3 h-3" />
                ~{impact.impactPersonnes.toLocaleString('fr-FR')} pers. &lt;1km
              </span>
            )}
            {/* Distance */}
            {evt.distanceKm !== undefined && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-text-muted">
                <MapPin className="w-3 h-3" />
                {evt.distanceKm} km
              </span>
            )}
            {/* Ticket link */}
            {evt.ticketUrl && (
              <span className="flex items-center gap-1 text-[10px] text-brand/70 font-medium">
                <Ticket className="w-3 h-3" />Billets
              </span>
            )}
          </div>
        </div>

        {/* Right side: impact badge + traffic delta */}
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0 pt-0.5">
          {/* Impact badge */}
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-lg border"
            style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
          >
            {evt.impactLabel ?? 'Impact léger'}
          </span>

          {/* Traffic delta */}
          <div className="flex items-center gap-1 font-bold text-[12px] text-white tabular-nums">
            <TrendingUp className="w-3 h-3" style={{ color: sc.text }} />
            +{evt.trafficIncrease ?? Math.round(evt.trafficScore * 100)}%
          </div>

          {/* Source badge */}
          <span className="text-[9px] font-bold px-1.5 py-0 rounded-md"
            style={{ color: srcBadge.color }}>
            {srcBadge.label}
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-text-muted mt-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0 flex-shrink-0" />
      </div>
    </button>
  )
}
