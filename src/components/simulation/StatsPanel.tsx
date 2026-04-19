'use client'

import { useMemo } from 'react'
import { Activity, MapPin, Layers, RefreshCw, Server } from 'lucide-react'

import { useMapStore } from '@/store/mapStore'
import { useSimulationStore } from '@/store/simulationStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { cn } from '@/lib/utils/cn'

export function StatsPanel() {
  const city = useMapStore(s => s.city)
  const roadNetwork = useSimulationStore(s => s.roadNetwork)
  const blockedEdgeIds = useSimulationStore(s => s.blockedEdgeIds)
  const trafficEdges = useSimulationStore(s => s.trafficEdges)
  const localEvents = useSimulationStore(s => s.localEvents)
  const resetLocalSimulation = useSimulationStore(s => s.resetLocalSimulation)

  const summary = useMemo(() => {
    const cityKpis = generateCityKPIs(city)
    const totalEdges = roadNetwork?.features.length ?? 0
    const blocked = blockedEdgeIds.length
    const slow = Object.values(trafficEdges).length
    const events = localEvents.length

    const congestion = Math.min(1, cityKpis.congestionRate + blocked * 0.01 + slow * 0.005)
    const efficiency = Math.max(0.3, cityKpis.networkEfficiency - blocked * 0.01 - slow * 0.008)

    return {
      congestion,
      efficiency,
      totalEdges,
      blocked,
      slow,
      events,
      cityKpis,
    }
  }, [blockedEdgeIds.length, city, localEvents.length, roadNetwork, trafficEdges])

  return (
    <div className="rounded-2xl border border-bg-border bg-bg-surface overflow-hidden">
      <div className="px-4 py-3 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand" />
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">
            Analytique réseau
          </p>
        </div>
        <button
          onClick={resetLocalSimulation}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          title="Réinitialiser"
        >
          <RefreshCw className={cn('w-3.5 h-3.5 text-text-muted')} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={<Server className="w-3 h-3" />} label="Mode" value="Local" color="text-brand-green" />
          <StatTile icon={<Layers className="w-3 h-3" />} label="Carte" value={roadNetwork ? 'Chargée' : 'Vide'} color={roadNetwork ? 'text-brand-green' : 'text-orange-400'} />
        </div>

        <section className="space-y-2">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
            Résumé de simulation
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Routes bloquées" value={summary.blocked} accent="text-red-400" />
            <MiniStat label="Routes ralenties" value={summary.slow} accent="text-orange-400" />
            <MiniStat label="Événements actifs" value={summary.events} accent="text-brand-green" />
            <MiniStat label="Axes totaux" value={summary.totalEdges} accent="text-brand" />
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
            Impact estimé
          </p>
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Congestion" value={`${Math.round(summary.congestion * 100)}%`} accent="text-red-400" />
            <MiniStat label="Efficacité" value={`${Math.round(summary.efficiency * 100)}%`} accent="text-brand-green" />
          </div>
          <div className="rounded-lg bg-white/[0.03] border border-white/5 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-3 h-3 text-text-muted" />
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-widest">
                Carte locale
              </span>
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed">
              Les données affichées sont calculées localement depuis le graphe chargé dans l’instance.
            </p>
          </div>
        </section>

        <div className="rounded-lg bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] px-3 py-2 text-[10px] text-[#2979FF] leading-relaxed">
          Le panneau reste opérationnel sans moteur distant. La page s’appuie sur les données locales du projet.
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
