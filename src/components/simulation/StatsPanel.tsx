'use client'

import { useEffect, useState } from 'react'
import { Activity, MapPin, Layers, RefreshCw, Server, XCircle } from 'lucide-react'

import { predictiveApi, type PredAnalytics } from '@/lib/api/predictive'
import { useMapStore } from '@/store/mapStore'
import { useSimulationStore } from '@/store/simulationStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { cn } from '@/lib/utils/cn'

interface HealthState {
  online: boolean
  graph_loaded?: boolean
  node_count?: number
  edge_count?: number
}

export function StatsPanel() {
  const city = useMapStore(s => s.city)
  const graphLoaded = useSimulationStore(s => s.graphLoaded)
  const backendOnline = useSimulationStore(s => s.backendOnline)
  const revision = useSimulationStore(s => s.revision)

  const [health, setHealth] = useState<HealthState | null>(null)
  const [analytics, setAnalytics] = useState<PredAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = async () => {
    setRefreshing(true)
    setError(null)

    try {
      const h = await predictiveApi.health()
      setHealth(h)
      useSimulationStore.getState().setBackendOnline(h.online)

      if (h.graph_loaded) {
        useSimulationStore.getState().setGraphLoaded(true)
        const a = await predictiveApi.getAnalytics()
        setAnalytics(a)
      } else {
        setAnalytics(null)
      }
    } catch (err: any) {
      setError(err?.message ?? 'Impossible de charger les métriques prédictives.')
      setAnalytics(null)
      setHealth({ online: false })
      useSimulationStore.getState().setBackendOnline(false)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphLoaded, revision])

  if (loading) {
    return (
      <div className="rounded-2xl border border-bg-border bg-bg-surface p-4 space-y-3 animate-pulse">
        <div className="h-3 w-32 bg-bg-elevated rounded" />
        <div className="h-24 bg-bg-elevated rounded-xl" />
        <div className="h-24 bg-bg-elevated rounded-xl" />
      </div>
    )
  }

  if (!backendOnline || !health?.online) {
    const kpis = generateCityKPIs(city)

    return (
      <div className="rounded-2xl border border-bg-border bg-bg-surface p-4 space-y-3">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[#2979FF]" />
          <span className="text-xs font-semibold text-[#2979FF]">Mode analytique local</span>
        </div>
        <p className="text-[11px] text-text-muted leading-relaxed">
          Le moteur FastAPI n&apos;est pas joignable depuis cette instance. L&apos;aperçu local reste disponible pour {city.name}.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat label="Congestion" value={`${Math.round(kpis.congestionRate * 100)}%`} accent="text-brand" />
          <MiniStat label="Efficacité" value={`${Math.round(kpis.networkEfficiency * 100)}%`} accent="text-brand-green" />
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-text-muted" />
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
              Fallback local
            </span>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            Les métriques prédictives complètes se réactivent automatiquement dès que FastAPI est disponible.
          </p>
        </div>
        <button
          onClick={refresh}
          className="w-full text-xs text-brand border border-brand/20 rounded-lg py-1.5 hover:bg-brand/5 transition-colors inline-flex items-center justify-center gap-2"
        >
          <RefreshCw className={cn('w-3 h-3', refreshing && 'animate-spin')} />
          Réessayer
        </button>
        {error && <p className="text-[10px] text-[#2979FF]">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Analytique moteur prédictif
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="Actualiser"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-text-muted', refreshing && 'animate-spin')} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile
            icon={<Server className="w-3 h-3" />}
            label="API Status"
            value={health?.online ? 'Online' : 'Offline'}
            color={health?.online ? 'text-brand-green' : 'text-red-400'}
          />
          <StatTile
            icon={<Layers className="w-3 h-3" />}
            label="Graphe OSM"
            value={health?.graph_loaded ? 'Chargé' : 'Non chargé'}
            color={health?.graph_loaded ? 'text-brand-green' : 'text-orange-400'}
          />
        </div>

        {health && (health.node_count || health.edge_count) && (
          <section className="space-y-2">
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
              Graphe OSM
            </p>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Nœuds" value={health.node_count?.toLocaleString('fr-FR') ?? '—'} />
              <MiniStat label="Arêtes" value={health.edge_count?.toLocaleString('fr-FR') ?? '—'} />
            </div>
          </section>
        )}

        {analytics && (
          <>
            <section className="space-y-2">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
                Simulation en cours
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Routes bloquées" value={analytics.blocked_roads} accent="text-red-400" />
                <MiniStat label="Routes ralenties" value={analytics.slow_roads} accent="text-orange-400" />
                <MiniStat label="Événements actifs" value={analytics.active_events} accent="text-purple-400" />
                <MiniStat label="Vitesse moy." value={`${analytics.average_speed_kph} km/h`} accent="text-brand-green" />
              </div>
            </section>

            <section className="space-y-2">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
                Couverture réseau
              </p>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Longueur totale" value={`${analytics.network_coverage_km} km`} accent="text-brand" />
                <MiniStat label="Routes totales" value={analytics.total_roads?.toLocaleString('fr-FR') ?? '—'} accent="text-brand" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MiniStat label="Intersections" value={analytics.total_intersections?.toLocaleString('fr-FR') ?? '—'} accent="text-text-secondary" />
                <MiniStat label="Feux OSM" value={analytics.traffic_signals?.toLocaleString('fr-FR') ?? '—'} accent="text-text-secondary" />
              </div>
            </section>
          </>
        )}

        {error && (
          <div className="rounded-lg bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] px-3 py-2 text-[10px] text-[#2979FF] leading-relaxed">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-text-muted" />
            <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
              Note de couverture
            </span>
          </div>
          <p className="text-[10px] text-text-muted leading-relaxed">
            Les feux et les segments dépendent de la qualité OSM. La couverture peut être partielle sur certains équipements.
          </p>
        </div>
      </div>
    </div>
  )
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-bg-surface/60 rounded-lg p-2 space-y-1 border border-bg-border/50">
      <div className="flex items-center gap-1 text-text-muted">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className={cn('text-xs font-semibold', color)}>{value}</p>
    </div>
  )
}

function MiniStat({
  label,
  value,
  accent = 'text-white',
}: {
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div className="rounded-xl bg-bg-elevated border border-bg-border px-3 py-2">
      <p className="text-[9px] uppercase tracking-widest text-text-muted">{label}</p>
      <p className={cn('text-sm font-bold mt-1', accent)}>{value}</p>
    </div>
  )
}
