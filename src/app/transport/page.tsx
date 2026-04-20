'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Train, Bus, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Wrench, HelpCircle, Wifi, Globe, Users, Zap, Clock, TrendingUp,
  ArrowRight, Activity,
} from 'lucide-react'
import { fetchAllTrafficStatus } from '@/lib/api/ratp'
import { fetchTransitRoutes, type OSMTransitLine } from '@/lib/api/overpass'
import { useMapStore } from '@/store/mapStore'
import type { TrafficLine, LineType } from '@/lib/api/ratp'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Transit traffic metrics ──────────────────────────────────────────────────

interface TransitMetrics {
  freqMin:      number   // minutes between vehicles
  capacityPph:  number   // passengers per hour at capacity
  loadPct:      number   // current occupancy %
  nextMin:      number   // next arrival in minutes
  paxPerHour:   number   // estimated passengers/h right now
}

const ROUTE_BASES: Record<string, { rushFreq: number; offFreq: number; rushCap: number; offCap: number }> = {
  subway:   { rushFreq: 3,  offFreq: 7,  rushCap: 38000, offCap: 12000 },
  train:    { rushFreq: 6,  offFreq: 15, rushCap: 22000, offCap: 7000  },
  tram:     { rushFreq: 5,  offFreq: 10, rushCap: 5500,  offCap: 2000  },
  bus:      { rushFreq: 8,  offFreq: 16, rushCap: 1800,  offCap: 700   },
  monorail: { rushFreq: 4,  offFreq: 9,  rushCap: 9000,  offCap: 3000  },
  ferry:    { rushFreq: 15, offFreq: 30, rushCap: 600,   offCap: 200   },
}

function getMetrics(routeType: string, lineKey: string, now: Date): TransitMetrics {
  const h   = now.getHours()
  const min = now.getMinutes()
  const isRush  = (h >= 7 && h <= 9) || (h >= 17 && h <= 19)
  const isPeak  = (h >= 9 && h <= 12) || (h >= 14 && h <= 17) || (h >= 19 && h <= 21)
  const isNight = h < 6 || h > 22

  const b         = ROUTE_BASES[routeType] ?? ROUTE_BASES.bus
  const freqMin   = isNight
    ? b.offFreq * 2
    : isRush  ? b.rushFreq
    : isPeak  ? Math.round((b.rushFreq + b.offFreq) / 2)
    :           b.offFreq

  const cap       = isNight  ? Math.round(b.offCap * 0.4)
    : isRush   ? b.rushCap
    : isPeak   ? Math.round((b.rushCap + b.offCap) / 2)
    :            b.offCap

  // Deterministic seed so card values don't flicker on re-render
  const seed  = lineKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + min
  const baseLoad  = isRush ? 72 : isPeak ? 47 : isNight ? 14 : 31
  const variance  = (seed % 28) - 14
  const loadPct   = Math.min(98, Math.max(5, baseLoad + variance))
  const nextMin   = Math.max(1, (seed % freqMin) + 1)
  const paxPerHour = Math.round(cap * (loadPct / 100))

  return { freqMin, capacityPph: cap, loadPct, nextMin, paxPerHour }
}

function loadColor(pct: number): string {
  if (pct >= 85) return '#EF4444'
  if (pct >= 60) return '#F97316'
  if (pct >= 35) return '#FACC15'
  return '#22C55E'
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  normal:     { icon: CheckCircle2, color: '#22C55E', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',   label: 'Normal' },
  perturbé:   { icon: AlertTriangle,color: '#FACC15', bg: 'rgba(250,204,21,0.1)',  border: 'rgba(250,204,21,0.25)',  label: 'Perturbé' },
  travaux:    { icon: Wrench,        color: '#F97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)',  label: 'Travaux' },
  interrompu: { icon: XCircle,       color: '#EF4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',   label: 'Interrompu' },
  inconnu:    { icon: HelpCircle,    color: '#6B7280', bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.2)', label: 'Inconnu' },
} as const

const TYPE_LABELS: Record<LineType, string> = {
  metros: 'Métro', rers: 'RER', tramways: 'Tramway', buses: 'Bus', noctiliens: 'Noctilien',
}

const ROUTE_LABELS: Record<string, string> = {
  bus: 'Bus', tram: 'Tramway', subway: 'Métro', train: 'Train', monorail: 'Monorail', ferry: 'Ferry',
}


// ─── Main ─────────────────────────────────────────────────────────────────────

export default function TransportPage() {
  const city    = useMapStore(s => s.city)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isParis = city.countryCode === 'FR' &&
    (city.id === 'paris' || city.name.toLowerCase().includes('paris') ||
     (city.center.lat > 48.5 && city.center.lat < 49.2 &&
      city.center.lng > 1.8 && city.center.lng < 3.2))

  if (isParis) return <RatpView mounted={mounted} cityPop={city.population} />
  return <OsmTransitView city={city} mounted={mounted} />
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({
  total, totalPax, avgLoad, disrupted, loading,
}: { total: number; totalPax: number; avgLoad: number; disrupted: number; loading: boolean }) {
  const cards = [
    { label: 'Lignes actives', value: total,                      unit: '',     color: '#22C55E', icon: Activity },
    { label: 'Pax réseau / h', value: Math.round(totalPax / 1000), unit: 'k',  color: '#3B82F6', icon: Users },
    { label: 'Charge moyenne', value: Math.round(avgLoad),        unit: '%',    color: loadColor(avgLoad), icon: TrendingUp },
    { label: 'Perturbations',  value: disrupted,                  unit: '',     color: disrupted > 0 ? '#EF4444' : '#22C55E', icon: AlertTriangle },
  ]
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-bg-surface border border-bg-border rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-1.5 mb-2">
            <c.icon className="w-3.5 h-3.5" style={{ color: c.color }} />
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">{c.label}</p>
          </div>
          {loading
            ? <div className="h-7 w-16 bg-bg-elevated rounded animate-pulse" />
            : <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}{c.unit}</p>
          }
        </div>
      ))}
    </div>
  )
}

// ─── Line card ────────────────────────────────────────────────────────────────

function LineCard({
  badge, name, subLabel, colour, status = 'normal', operator,
  metrics, now,
}: {
  badge:     string
  name:      string
  subLabel:  string
  colour:    string
  status?:   keyof typeof STATUS_CONFIG
  operator?: string
  metrics:   TransitMetrics
  now:       Date
}) {
  const cfg   = STATUS_CONFIG[status]
  const Icon  = cfg.icon
  const lc    = loadColor(metrics.loadPct)

  return (
    <div
      className="bg-bg-surface border rounded-xl p-4 space-y-3 hover:bg-bg-elevated transition-colors"
      style={{ borderColor: status !== 'normal' ? cfg.border : 'var(--bg-border)' }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[13px] font-black text-text-primary shrink-0"
            style={{ backgroundColor: colour }}
          >
            {badge.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{name}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wide">{subLabel}</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-semibold shrink-0"
          style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </div>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-bg-elevated rounded-lg py-2 px-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5 flex items-center justify-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> Fréq.
          </p>
          <p className="text-[13px] font-bold text-text-primary">{metrics.freqMin} <span className="text-[9px] text-text-muted">min</span></p>
        </div>
        <div className="bg-bg-elevated rounded-lg py-2 px-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5 flex items-center justify-center gap-0.5">
            <Users className="w-2.5 h-2.5" /> Pax/h
          </p>
          <p className="text-[13px] font-bold text-text-primary">
            {metrics.paxPerHour >= 1000
              ? `${(metrics.paxPerHour / 1000).toFixed(1)}k`
              : metrics.paxPerHour}
          </p>
        </div>
        <div className="bg-bg-elevated rounded-lg py-2 px-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted mb-0.5 flex items-center justify-center gap-0.5">
            <ArrowRight className="w-2.5 h-2.5" /> Suivant
          </p>
          <p className="text-[13px] font-bold text-text-primary">{metrics.nextMin} <span className="text-[9px] text-text-muted">min</span></p>
        </div>
      </div>

      {/* Load bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-muted font-medium">Charge réseau</span>
          <span className="text-[11px] font-bold" style={{ color: lc }}>{metrics.loadPct}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${metrics.loadPct}%`, backgroundColor: lc, boxShadow: `0 0 6px ${lc}60` }}
          />
        </div>
        {operator && <p className="text-[10px] text-text-muted truncate">{operator}</p>}
      </div>
    </div>
  )
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

function FilterTabs({ options, value, onChange }: {
  options: { key: string; label: string; count: number }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
            value === o.key
              ? 'bg-brand/10 text-brand border-brand/40'
              : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
          )}
        >
          {o.label} <span className="opacity-60">({o.count})</span>
        </button>
      ))}
    </div>
  )
}

// ─── RATP view (Paris) ────────────────────────────────────────────────────────

function RatpView({ mounted, cityPop }: { mounted: boolean; cityPop: number }) {
  const [lines,      setLines]      = useState<TrafficLine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filter,     setFilter]     = useState('all')
  const [now,        setNow]        = useState(() => new Date())

  const refresh = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const trafficStatus = await fetchAllTrafficStatus()
      setLines(trafficStatus.lines)
      setLastUpdate(new Date())
    } catch {
      setError("Impossible de contacter l'API RATP")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 60_000)
    return () => clearInterval(iv)
  }, [refresh])

  // Tick every minute to refresh metrics
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(iv)
  }, [])

  const routeTypeFor = (t: LineType): string =>
    t === 'metros' ? 'subway' : t === 'rers' ? 'train' : t === 'tramways' ? 'tram' : 'bus'

  const types    = [...new Set(lines.map(l => l.type))] as LineType[]
  const filtered = filter === 'all' ? lines : lines.filter(l => l.type === filter)

  const allMetrics = useMemo(() => lines.map(l => getMetrics(routeTypeFor(l.type), l.id, now)), [lines, now])
  const totalPax   = allMetrics.reduce((a, m) => a + m.paxPerHour, 0)
  const avgLoad    = allMetrics.length ? allMetrics.reduce((a, m) => a + m.loadPct, 0) / allMetrics.length : 0
  const disrupted  = lines.filter(l => l.status !== 'normal').length

  const filterOpts = [
    { key: 'all', label: 'Tout', count: lines.length },
    ...types.map(t => ({ key: t, label: TYPE_LABELS[t], count: lines.filter(l => l.type === t).length })),
  ]

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Train className="w-5 h-5 text-brand" />
            Trafic RATP — Temps réel
          </h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Wifi className="w-3 h-3 text-brand" />
            Île-de-France Mobilités
            {lastUpdate && mounted && (
              <span className="text-text-muted">· {formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true })}</span>
            )}
          </p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm text-text-secondary hover:text-text-primary disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Summary */}
      <SummaryBar total={lines.length} totalPax={totalPax} avgLoad={avgLoad} disrupted={disrupted} loading={loading} />

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm text-[#EF4444]">
          {error} — L'API est non-officielle et peut être temporairement indisponible.
        </div>
      )}

      {loading && lines.length === 0 && (
        <div className="border border-bg-border rounded-3xl p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-bold text-text-secondary uppercase tracking-tight">Initialisation du flux RATP…</p>
        </div>
      )}

      {/* Filters */}
      {types.length > 0 && <FilterTabs options={filterOpts} value={filter} onChange={setFilter} />}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((line, i) => {
          const m = allMetrics[lines.indexOf(line)] ?? getMetrics(routeTypeFor(line.type), line.id, now)
          return (
            <LineCard
              key={line.id}
              badge={line.slug}
              name={line.name}
              subLabel={TYPE_LABELS[line.type]}
              colour={line.color ?? '#6B7280'}
              status={line.status}
              operator={line.message && line.status !== 'normal' ? line.message.slice(0, 60) : undefined}
              metrics={m}
              now={now}
            />
          )
        })}
      </div>

      {lines.length > 0 && (
        <p className="text-xs text-text-muted text-center pb-2">
          Source: API RATP · Charge & fréquences estimées en temps réel · Actualisé toutes les 60 s
        </p>
      )}
    </main>
  )
}

// ─── OSM transit view (non-Paris) ────────────────────────────────────────────

interface OsmCity {
  name: string; flag: string
  bbox: [number, number, number, number]
  population: number
}

function OsmTransitView({ city, mounted }: { city: OsmCity; mounted: boolean }) {
  const [lines,      setLines]      = useState<OSMTransitLine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filter,     setFilter]     = useState('all')
  const [now,        setNow]        = useState(() => new Date())

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      setLines(await fetchTransitRoutes(city.bbox))
      setLastUpdate(new Date())
    } catch {
      setError('Impossible de charger les données de transport OSM')
    } finally {
      setLoading(false)
    }
  }, [city.bbox])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(iv)
  }, [])

  const routeTypes = useMemo(() => [...new Set(lines.map(l => l.route))].sort(), [lines])
  const filtered   = filter === 'all' ? lines : lines.filter(l => l.route === filter)

  const allMetrics = useMemo(() => lines.map(l => getMetrics(l.route, String(l.id), now)), [lines, now])
  const totalPax   = allMetrics.reduce((a, m) => a + m.paxPerHour, 0)
  const avgLoad    = allMetrics.length ? allMetrics.reduce((a, m) => a + m.loadPct, 0) / allMetrics.length : 0

  const filterOpts = [
    { key: 'all', label: 'Tout', count: lines.length },
    ...routeTypes.map(t => ({ key: t, label: ROUTE_LABELS[t] ?? t, count: lines.filter(l => l.route === t).length })),
  ]

  return (
    <main className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Bus className="w-5 h-5 text-brand" />
            Réseau transport — {city.flag} {city.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Globe className="w-3 h-3 text-[#3B82F6]" />
            OpenStreetMap
            {lastUpdate && mounted && (
              <span className="text-text-muted">· {formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true })}</span>
            )}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm text-text-secondary hover:text-text-primary disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* Summary */}
      <SummaryBar total={lines.length} totalPax={totalPax} avgLoad={avgLoad} disrupted={0} loading={loading} />

      {/* OSM disclaimer */}
      <div className="bg-[rgba(59,130,246,0.07)] border border-[rgba(59,130,246,0.2)] rounded-xl px-4 py-3 flex items-start gap-3">
        <Zap className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
        <p className="text-xs text-[#93C5FD] leading-relaxed">
          Réseau issu d'OpenStreetMap. Charge & fréquences estimées selon le type de ligne et l'heure actuelle.
          Les perturbations temps réel nécessitent l'API opérateur de {city.name}.
        </p>
      </div>

      {loading && (
        <div className="border border-bg-border rounded-3xl p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-bold text-text-secondary uppercase tracking-tight">Chargement réseau OSM…</p>
        </div>
      )}

      {error && (
        <div className="bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.3)] rounded-xl p-4 text-sm text-[#EF4444]">{error}</div>
      )}

      {/* Filters */}
      {!loading && lines.length > 0 && <FilterTabs options={filterOpts} value={filter} onChange={setFilter} />}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-12 text-center">
          <p className="text-text-secondary text-sm">Aucune ligne trouvée dans cette zone</p>
          <p className="text-text-muted text-xs mt-1">Les données OSM peuvent être incomplètes pour certaines villes</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((line, i) => {
          const colour = line.colour.startsWith('#') ? line.colour : `#${line.colour}`
          const idx    = lines.indexOf(line)
          const m      = allMetrics[idx] ?? getMetrics(line.route, String(line.id), now)
          return (
            <LineCard
              key={line.id}
              badge={line.ref || line.name}
              name={line.name || `${ROUTE_LABELS[line.route] ?? line.route} ${line.ref}`}
              subLabel={ROUTE_LABELS[line.route] ?? line.route}
              colour={colour}
              operator={line.operator || line.network || undefined}
              metrics={m}
              now={now}
            />
          )
        })}
      </div>

      {!loading && lines.length > 0 && (
        <p className="text-xs text-text-muted text-center pb-2">
          Source: OpenStreetMap / Overpass API · {lines.length} lignes · Fréquences & charge estimées
        </p>
      )}
    </main>
  )
}
