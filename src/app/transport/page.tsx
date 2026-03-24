'use client'
import { useEffect, useState, useCallback } from 'react'
import {
  Train, Bus, RefreshCw, CheckCircle2, AlertTriangle, XCircle,
  Wrench, HelpCircle, Wifi, Globe,
} from 'lucide-react'
import { fetchAllTrafficStatus } from '@/lib/api/ratp'
import { fetchTransitRoutes, type OSMTransitLine } from '@/lib/api/overpass'
import { useMapStore } from '@/store/mapStore'
import type { TrafficLine, LineType } from '@/lib/api/ratp'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Shared status config ─────────────────────────────────────────────────────

const STATUS_CONFIG = {
  normal:     { icon: CheckCircle2, color: '#00E676', bg: 'rgba(0,230,118,0.1)',  border: 'rgba(0,230,118,0.25)',  label: 'Normal' },
  perturbé:   { icon: AlertTriangle,color: '#FFD600', bg: 'rgba(255,214,0,0.1)',  border: 'rgba(255,214,0,0.25)',  label: 'Perturbé' },
  travaux:    { icon: Wrench,        color: '#FF6D00', bg: 'rgba(255,109,0,0.1)',  border: 'rgba(255,109,0,0.25)',  label: 'Travaux' },
  interrompu: { icon: XCircle,       color: '#FF1744', bg: 'rgba(255,23,68,0.1)',  border: 'rgba(255,23,68,0.25)',  label: 'Interrompu' },
  inconnu:    { icon: HelpCircle,    color: '#8080A0', bg: 'rgba(128,128,160,0.1)',border: 'rgba(128,128,160,0.2)', label: 'Inconnu' },
} as const

const TYPE_LABELS: Record<LineType, string> = {
  metros:     'Métro',
  rers:       'RER',
  tramways:   'Tramway',
  buses:      'Bus',
  noctiliens: 'Noctilien',
}

const ROUTE_LABELS: Record<string, string> = {
  bus:      'Bus',
  tram:     'Tramway',
  subway:   'Métro',
  train:    'Train',
  monorail: 'Monorail',
  ferry:    'Ferry',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransportPage() {
  const city    = useMapStore(s => s.city)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const isParis = city.countryCode === 'FR' &&
    (city.name.toLowerCase().includes('paris') ||
     city.id === 'paris' ||
     (city.center.lat > 48.5 && city.center.lat < 49.2 &&
      city.center.lng > 1.8  && city.center.lng < 3.2))

  if (isParis) return <RatpView mounted={mounted} />
  return <OsmTransitView city={city} mounted={mounted} />
}

// ─── RATP / Paris view ────────────────────────────────────────────────────────

function RatpView({ mounted }: { mounted: boolean }) {
  const [lines,      setLines]      = useState<TrafficLine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filter,     setFilter]     = useState<LineType | 'all'>('all')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllTrafficStatus()
      setLines(data)
      setLastUpdate(new Date())
    } catch {
      setError("Impossible de contacter l'API RATP")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60_000)
    return () => clearInterval(interval)
  }, [refresh])

  const filtered = filter === 'all' ? lines : lines.filter(l => l.type === filter)
  const types    = [...new Set(lines.map(l => l.type))] as LineType[]

  const counts = {
    normal:     lines.filter(l => l.status === 'normal').length,
    perturbé:   lines.filter(l => l.status === 'perturbé').length,
    travaux:    lines.filter(l => l.status === 'travaux').length,
    interrompu: lines.filter(l => l.status === 'interrompu').length,
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Train className="w-5 h-5 text-brand" />
            Trafic RATP — Temps réel
          </h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Wifi className="w-3 h-3 text-brand" />
            Île-de-France Mobilités
            {lastUpdate && (
              <span className="text-text-muted">
                · {mounted ? formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true }) : '...'}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {lines.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          <SummaryCard label="En service" value={counts.normal}     color="#00E676" />
          <SummaryCard label="Perturbé"   value={counts.perturbé}   color="#FFD600" />
          <SummaryCard label="Travaux"    value={counts.travaux}    color="#FF6D00" />
          <SummaryCard label="Interrompu" value={counts.interrompu} color="#FF1744" />
        </div>
      )}
      {loading && lines.length === 0 && (
        <div className="grid grid-cols-4 gap-3">
          {['En service', 'Perturbé', 'Travaux', 'Interrompu'].map(l => (
            <div key={l} className="bg-bg-surface border border-bg-border rounded-xl p-4">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{l}</p>
              <div className="h-7 w-8 bg-bg-subtle rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-[rgba(255,23,68,0.08)] border border-[rgba(255,23,68,0.3)] rounded-xl p-4 text-sm text-[#FF1744]">
          {error} — L'API est non-officielle et peut être temporairement indisponible.
        </div>
      )}

      {loading && lines.length === 0 && (
        <div className="glass-light border border-white/5 rounded-3xl p-16 text-center animate-pulse">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-bold text-text-secondary tracking-tight uppercase">Initialisation du flux RATP...</p>
        </div>
      )}

      {types.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === 'all'
                ? 'bg-brand/10 text-brand border-brand/40'
                : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
            )}
          >
            Tout ({lines.length})
          </button>
          {types.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                filter === t
                  ? 'bg-brand/10 text-brand border-brand/40'
                  : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
              )}
            >
              {TYPE_LABELS[t]} ({lines.filter(l => l.type === t).length})
            </button>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-12 text-center">
          <p className="text-text-secondary text-sm">Aucune donnée disponible</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(line => {
          const cfg  = STATUS_CONFIG[line.status]
          const Icon = cfg.icon
          return (
            <div
              key={line.id}
              className="bg-bg-surface border rounded-xl p-4 space-y-2.5 hover:bg-bg-elevated transition-colors"
              style={{ borderColor: line.status !== 'normal' ? cfg.border : undefined }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-bg-base shrink-0"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.slug.toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{line.name}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wide">{TYPE_LABELS[line.type]}</p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0"
                  style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </div>
              </div>
              {line.message && line.status !== 'normal' && (
                <p className="text-xs text-text-secondary leading-relaxed pl-11">{line.message}</p>
              )}
              {line.status === 'normal' && (
                <p className="text-xs text-text-muted pl-11">Trafic normal sur l'ensemble de la ligne</p>
              )}
            </div>
          )
        })}
      </div>

      {lines.length > 0 && (
        <p className="text-xs text-text-muted text-center pb-2">
          Source: API RATP (api-ratp.pierre-grimaud.fr) · Données en temps réel · Actualisé toutes les 60 secondes
        </p>
      )}
    </main>
  )
}

// ─── OSM transit view (all non-Paris cities) ─────────────────────────────────

interface OsmTransitViewProps {
  city:    { name: string; flag: string; bbox: [number, number, number, number]; countryCode: string }
  mounted: boolean
}

function OsmTransitView({ city, mounted }: OsmTransitViewProps) {
  const [lines,      setLines]      = useState<OSMTransitLine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filter,     setFilter]     = useState<string>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTransitRoutes(city.bbox)
      setLines(data)
      setLastUpdate(new Date())
    } catch {
      setError('Impossible de charger les données de transport')
    } finally {
      setLoading(false)
    }
  }, [city.bbox])

  useEffect(() => {
    load()
  }, [load])

  const routeTypes = [...new Set(lines.map(l => l.route))].sort()
  const filtered   = filter === 'all' ? lines : lines.filter(l => l.route === filter)

  const counts = routeTypes.reduce((acc, t) => {
    acc[t] = lines.filter(l => l.route === t).length
    return acc
  }, {} as Record<string, number>)

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <Bus className="w-5 h-5 text-brand" />
            Réseau de transport — {city.flag} {city.name}
          </h1>
          <p className="text-sm text-text-secondary mt-1 flex items-center gap-2">
            <Globe className="w-3 h-3 text-[#3B82F6]" />
            OpenStreetMap
            {lastUpdate && (
              <span className="text-text-muted">
                · {mounted ? formatDistanceToNow(lastUpdate, { locale: fr, addSuffix: true }) : '...'}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm text-text-secondary hover:text-text-primary disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      {/* No real-time disclaimer */}
      <div className="bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.25)] rounded-xl px-4 py-3 flex items-start gap-3">
        <HelpCircle className="w-4 h-4 text-[#3B82F6] mt-0.5 shrink-0" />
        <p className="text-xs text-[#93C5FD] leading-relaxed">
          Réseau issu d'OpenStreetMap — lignes en service référencées par la communauté.
          Les perturbations en temps réel nécessitent une API opérateur spécifique.
        </p>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="glass-light border border-white/5 rounded-3xl p-16 text-center">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-bold text-text-secondary tracking-tight uppercase">
            Chargement du réseau OSM…
          </p>
        </div>
      )}

      {error && (
        <div className="bg-[rgba(255,23,68,0.08)] border border-[rgba(255,23,68,0.3)] rounded-xl p-4 text-sm text-[#FF1744]">
          {error}
        </div>
      )}

      {/* Summary badges */}
      {!loading && lines.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
              filter === 'all'
                ? 'bg-brand/10 text-brand border-brand/40'
                : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
            )}
          >
            Tout ({lines.length})
          </button>
          {routeTypes.map(t => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                filter === t
                  ? 'bg-brand/10 text-brand border-brand/40'
                  : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
              )}
            >
              {ROUTE_LABELS[t] ?? t} ({counts[t]})
            </button>
          ))}
        </div>
      )}

      {/* Lines grid */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-12 text-center">
          <p className="text-text-secondary text-sm">Aucune ligne de transport trouvée dans cette zone</p>
          <p className="text-text-muted text-xs mt-1">Les données OSM peuvent être incomplètes pour certaines villes</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map(line => (
          <OsmLineCard key={line.id} line={line} />
        ))}
      </div>

      {!loading && lines.length > 0 && (
        <p className="text-xs text-text-muted text-center pb-2">
          Source: OpenStreetMap / Overpass API · {lines.length} lignes référencées · Données communautaires
        </p>
      )}
    </main>
  )
}

function OsmLineCard({ line }: { line: OSMTransitLine }) {
  const colour = line.colour.startsWith('#') ? line.colour : `#${line.colour}`
  const label  = ROUTE_LABELS[line.route] ?? line.route
  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-4 space-y-2.5 hover:bg-bg-elevated transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shrink-0"
            style={{ backgroundColor: colour }}
          >
            {(line.ref || line.name).slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary truncate max-w-[160px]">
              {line.name || line.ref || `${label} ${line.id}`}
            </p>
            <p className="text-[10px] text-text-muted uppercase tracking-wide">{label}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0 text-[#00E676] bg-[rgba(0,230,118,0.1)] border-[rgba(0,230,118,0.25)]">
          <CheckCircle2 className="w-3 h-3" />
          En service
        </div>
      </div>
      {line.operator && (
        <p className="text-xs text-text-muted pl-11">{line.operator}</p>
      )}
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-4">
      <p className="text-xs text-text-muted uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: value > 0 && color !== '#00E676' ? color : '#F0F0FF' }}>
        {value}
      </p>
    </div>
  )
}
