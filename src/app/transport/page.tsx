'use client'
import { useEffect, useState, useCallback } from 'react'
import { Train, RefreshCw, CheckCircle2, AlertTriangle, XCircle, Wrench, HelpCircle, Wifi } from 'lucide-react'
import { fetchAllTrafficStatus } from '@/lib/api/ratp'
import { useMapStore } from '@/store/mapStore'
import type { TrafficLine, LineType } from '@/lib/api/ratp'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

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

export default function TransportPage() {
  const city         = useMapStore(s => s.city)
  const [lines,      setLines]      = useState<TrafficLine[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [filter,     setFilter]     = useState<LineType | 'all'>('all')
  const [mounted,    setMounted]    = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isParis = city.countryCode === 'FR' &&
    (city.name.toLowerCase().includes('paris') ||
     city.name.toLowerCase().includes('île-de-france') ||
     city.name.toLowerCase().includes('gennevillier') ||
     city.id === 'paris' ||
     (city.center.lat > 48.5 && city.center.lat < 49.2 && city.center.lng > 1.8 && city.center.lng < 3.2))

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchAllTrafficStatus()
      setLines(data)
      setLastUpdate(new Date())
    } catch (e) {
      setError('Impossible de contacter l\'API RATP')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isParis) {
      refresh()
      const interval = setInterval(refresh, 60_000)
      return () => clearInterval(interval)
    }
  }, [isParis, refresh])

  const filtered = filter === 'all' ? lines : lines.filter(l => l.type === filter)

  const counts = {
    total:      lines.length,
    normal:     lines.filter(l => l.status === 'normal').length,
    perturbé:   lines.filter(l => l.status === 'perturbé').length,
    travaux:    lines.filter(l => l.status === 'travaux').length,
    interrompu: lines.filter(l => l.status === 'interrompu').length,
  }

  const types = [...new Set(lines.map(l => l.type))] as LineType[]

  if (!isParis) {
    return (
      <main className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
        <div className="max-w-md w-full glass border border-white/10 rounded-3xl p-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto shadow-glow">
            <Train className="w-10 h-10 text-brand" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Expansion en cours</h2>
            <p className="text-[13px] font-medium text-text-secondary leading-relaxed">
              L'intégration des données de transport pour <span className="text-white">{city.name}</span> est actuellement en phase de déploiement Enterprise.
            </p>
          </div>

          <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-3">
            <p className="text-[10px] font-black text-brand uppercase tracking-[0.2em]">Région Disponible</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-bg-elevated flex items-center justify-center text-xs font-bold text-white">IDFM</div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Île-de-France Mobilités</span>
                <span className="text-[10px] text-text-muted">Réseau complet RATP & SNCF</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-text-muted font-medium italic">
            Support pour {city.name} ({city.countryCode}) prévu au Q3 2026.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 space-y-5">
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

      {/* Status summary */}
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

      {/* Error */}
      {error && (
        <div className="bg-[rgba(255,23,68,0.08)] border border-[rgba(255,23,68,0.3)] rounded-xl p-4 text-sm text-[#FF1744]">
          {error} — L'API est non-officielle et peut être temporairement indisponible.
        </div>
      )}

      {/* Loading */}
      {loading && lines.length === 0 && (
        <div className="glass-light border border-white/5 rounded-3xl p-16 text-center animate-pulse">
          <div className="w-10 h-10 border-[3px] border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-bold text-text-secondary tracking-tight uppercase">Initialisation du flux RATP...</p>
        </div>
      )}

      {/* Type filters */}
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

      {/* Lines list */}
      {!loading && filtered.length === 0 && !error && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-12 text-center">
          <p className="text-text-secondary text-sm">Aucune donnée disponible</p>
          <p className="text-text-muted text-xs mt-1">L'API RATP peut être temporairement indisponible</p>
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
                {/* Line badge */}
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

                {/* Status badge */}
                <div
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold shrink-0"
                  style={{ color: cfg.color, backgroundColor: cfg.bg, borderColor: cfg.border }}
                >
                  <Icon className="w-3 h-3" />
                  {cfg.label}
                </div>
              </div>

              {/* Message */}
              {line.message && line.status !== 'normal' && (
                <p className="text-xs text-text-secondary leading-relaxed pl-11">
                  {line.message}
                </p>
              )}
              {line.status === 'normal' && (
                <p className="text-xs text-text-muted pl-11">Trafic normal sur l'ensemble de la ligne</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Source note */}
      {lines.length > 0 && (
        <p className="text-xs text-text-muted text-center pb-2">
          Source: API RATP (api-ratp.pierre-grimaud.fr) · Données en temps réel · Actualisé toutes les 60 secondes
        </p>
      )}
    </main>
  )
}

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
