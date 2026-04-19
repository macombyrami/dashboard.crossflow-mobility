'use client'

import { useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, BarChart3, CloudSun, Layers3, MapPinned, ScrollText } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { WeatherCard } from '@/components/dashboard/WeatherCard'
import { AirQualityCard } from '@/components/dashboard/AirQualityCard'
import { TimelineScrubber } from '@/components/dashboard/TimelineScrubber'
import { cn } from '@/lib/utils/cn'

type PredictionTab = 'alerts' | 'context' | 'data'

const TrafficChart = dynamic(() => import('@/components/dashboard/TrafficChart').then(m => m.TrafficChart), {
  ssr: false,
  loading: () => <PanelSkeleton />,
})
const ModalSplitChart = dynamic(() => import('@/components/dashboard/ModalSplitChart').then(m => m.ModalSplitChart), {
  ssr: false,
  loading: () => <PanelSkeleton height="180px" />,
})
const TrafficStabilityWidget = dynamic(() => import('@/components/dashboard/TrafficStabilityWidget').then(m => m.TrafficStabilityWidget), {
  ssr: false,
  loading: () => <PanelSkeleton height="200px" />,
})

function PanelSkeleton({ height = '240px' }: { height?: string }) {
  return <div className="w-full rounded-3xl border border-white/5 bg-white/[0.02] animate-pulse" style={{ height }} />
}

function sectionTitle(text: string) {
  return (
    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-text-muted">{text}</p>
  )
}

function severityOrder(severity: string) {
  const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  return order[severity] ?? 4
}

export function PredictionTabs() {
  const [activeTab, setActiveTab] = useState<PredictionTab>('alerts')
  const kpis = useTrafficStore(s => s.kpis)
  const incidents = useTrafficStore(s => s.incidents)
  const openMeteoWeather = useTrafficStore(s => s.openMeteoWeather)
  const airQuality = useTrafficStore(s => s.airQuality)

  const sortedIncidents = useMemo(
    () => [...incidents].sort((a, b) => severityOrder(a.severity) - severityOrder(b.severity)),
    [incidents],
  )

  const topIncidents = sortedIncidents.slice(0, 2)
  const predictionTitle = !kpis
    ? 'PROCHAINES 2 HEURES'
    : kpis.congestionRate >= 0.75
      ? 'CONGESTION CRITIQUE SUR 2 H'
      : kpis.congestionRate >= 0.55
        ? 'CONGESTION EN HAUSSE SUR 2 H'
        : 'RÉSEAU SOUS CONTRÔLE SUR 2 H'

  const predictionCopy = !kpis
    ? 'Lecture en cours'
    : kpis.congestionRate >= 0.75
      ? 'Montée progressive et saturation probable sur les axes principaux.'
      : kpis.congestionRate >= 0.55
        ? 'Pression attendue pendant la pointe. Anticiper les déviations.'
        : 'Risque contenu. Surveillance recommandée sur les créneaux de pointe.'

  const recommendation = !kpis
    ? 'Analyse en cours'
    : kpis.congestionRate >= 0.55
      ? 'Anticiper 30 min avant la pointe'
      : 'Maintenir la surveillance'

  const weatherLine = openMeteoWeather
    ? openMeteoWeather.trafficImpact === 'none'
      ? 'Météo : aucun impact'
      : openMeteoWeather.trafficImpact === 'minor'
        ? `Météo : ${openMeteoWeather.weatherLabel} · impact faible`
        : `Météo : ${openMeteoWeather.weatherLabel} · impact fort`
    : 'Météo : indisponible'

  const contextLine = airQuality
    ? `Air : ${airQuality.level.toUpperCase()} · IQA ${airQuality.aqiEuropean}/100`
    : 'Air : indisponible'

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#FF6D00]/20 bg-[#FF6D00]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#FF6D00]">
                <AlertTriangle className="w-3 h-3" />
                {predictionTitle}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <Layers3 className="w-3 h-3" />
                2h
              </span>
            </div>
            <p className="text-[12px] sm:text-[13px] text-text-secondary leading-relaxed max-w-2xl">
              {predictionCopy}
            </p>
          </div>

          <div className="flex flex-col items-start lg:items-end gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand">
              <MapPinned className="w-3 h-3" />
              {recommendation}
            </span>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
              3 secondes pour lire l&apos;état utile
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {topIncidents.map(inc => (
            <span
              key={inc.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                inc.severity === 'critical'
                  ? 'border-[#FF1744]/20 bg-[#FF1744]/10 text-[#FF1744]'
                  : inc.severity === 'high'
                    ? 'border-[#FF6D00]/20 bg-[#FF6D00]/10 text-[#FF6D00]'
                    : 'border-white/10 bg-white/[0.03] text-text-muted',
              )}
            >
              <span className="text-[9px]">{inc.severity === 'critical' ? '🔴' : inc.severity === 'high' ? '🟠' : '🟡'}</span>
              {inc.title}
            </span>
          ))}
          {sortedIncidents.length > topIncidents.length && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              + {sortedIncidents.length - topIncidents.length} autres alertes
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-2xl border border-white/5 bg-white/[0.02] p-1">
        {[
          { id: 'alerts', label: 'Alertes', icon: AlertTriangle },
          { id: 'context', label: 'Contexte', icon: CloudSun },
          { id: 'data', label: 'Données', icon: BarChart3 },
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as PredictionTab)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
                active ? 'bg-brand/15 text-brand' : 'text-text-secondary hover:bg-white/[0.03] hover:text-text-primary',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'alerts' && (
        <IncidentFeed
          maxItems={3}
          title="Alertes actives"
          subtitle="Triées par sévérité, 3 visibles maximum"
          ctaLabel="Voir sur la carte"
          onCtaClick={() => { window.location.href = '/map' }}
        />
      )}

      {activeTab === 'context' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {openMeteoWeather ? <WeatherCard weather={openMeteoWeather} /> : <EmptyState label={weatherLine} />}
          {airQuality ? <AirQualityCard aq={airQuality} /> : <EmptyState label={contextLine} />}
        </div>
      )}

      {activeTab === 'data' && (
        <div className="space-y-4">
          <section className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-4">
            <div className="space-y-1">
              {sectionTitle('Trafic · 24h passées')}
              <p className="text-[12px] sm:text-[13px] text-text-secondary">
                Pic 17h-18h hier, lecture directe des tendances et des écarts.
              </p>
            </div>
            <TrafficChart />
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <section className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                {sectionTitle('Répartition modale')}
                <p className="text-[12px] sm:text-[13px] text-text-secondary">
                  Pression transports visible d&apos;un coup d&apos;oeil.
                </p>
              </div>
              <ModalSplitChart />
            </section>

            <section className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 space-y-4">
              <div className="space-y-1">
                {sectionTitle('Stabilité du réseau')}
                <p className="text-[12px] sm:text-[13px] text-text-secondary">
                  Efficacité sur 24h passées et volatilité du flux.
                </p>
              </div>
              <TrafficStabilityWidget />
            </section>
          </div>

          <details className="rounded-3xl border border-white/5 bg-white/[0.02] overflow-hidden">
            <summary className="cursor-pointer list-none px-4 sm:px-5 py-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                {sectionTitle('Historique 24h')}
                <p className="text-[12px] sm:text-[13px] text-text-secondary">
                  Relecture complète des snapshots si vous avez besoin d&apos;un zoom temporel.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <ScrollText className="w-3 h-3" />
                Ouvrir
              </span>
            </summary>
            <div className="border-t border-white/5 p-4 sm:p-5">
              <TimelineScrubber />
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 text-sm text-text-secondary">
      {label}
    </div>
  )
}
