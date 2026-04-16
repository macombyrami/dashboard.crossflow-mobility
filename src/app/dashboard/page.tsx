'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { ReactNode } from 'react'
import { Activity, ArrowRight, Clock, Download, Wind, AlertTriangle, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import appData from '@/lib/data/app.json'

import { KPICard } from '@/components/dashboard/KPICard'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { TimelineScrubber } from '@/components/dashboard/TimelineScrubber'
import { ZoneExportTool } from '@/components/dashboard/ZoneExportTool'
import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import { StatusBar } from '@/components/dashboard/StatusBar'

import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { MobileDashboardView } from '@/components/mobile/dashboard/MobileDashboardView'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'
import { exportToPdf } from '@/lib/utils/export'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'
import { getSnapshots } from '@/lib/api/snapshots'
import type { CityKPIs, TrafficSnapshot } from '@/types'

const TrafficChart = dynamic(() => import('@/components/dashboard/TrafficChart').then(m => m.TrafficChart), {
  ssr: false,
  loading: () => <ChartSkeleton />,
})
const ModalSplitChart = dynamic(() => import('@/components/dashboard/ModalSplitChart').then(m => m.ModalSplitChart), {
  ssr: false,
  loading: () => <CardSkeleton height="200px" />,
})
const TrafficStabilityWidget = dynamic(() => import('@/components/dashboard/TrafficStabilityWidget').then(m => m.TrafficStabilityWidget), {
  ssr: false,
  loading: () => <CardSkeleton height="150px" />,
})
const WeatherCard = dynamic(() => import('@/components/dashboard/WeatherCard').then(m => m.WeatherCard), { ssr: false })
const AirQualityCard = dynamic(() => import('@/components/dashboard/AirQualityCard').then(m => m.AirQualityCard), { ssr: false })

function ChartSkeleton() {
  return (
    <div className="w-full h-[320px] bg-bg-elevated/40 border border-bg-border rounded-3xl animate-pulse flex items-center justify-center">
      <Activity className="w-8 h-8 text-white/10" />
    </div>
  )
}

function CardSkeleton({ height }: { height: string }) {
  return <div className="w-full bg-bg-elevated/40 border border-bg-border rounded-3xl animate-pulse" style={{ height }} />
}

function kpisFromSnapshot(cityId: string, snapshot: TrafficSnapshot, incidentCount: number, base: CityKPIs): CityKPIs {
  const segs = snapshot.segments
  if (!segs.length) return base
  const congestionRate = segs.reduce((a, s) => a + s.congestionScore, 0) / segs.length
  const avgTravelMin = Math.max(5, 10 + congestionRate * 40)
  const pollutionIndex = Math.min(10, Math.max(0.5, congestionRate * 8 + 0.5))
  const networkEfficiency = Math.max(0.1, 1 - congestionRate * 0.85)
  return {
    ...base,
    cityId,
    congestionRate,
    avgTravelMin,
    pollutionIndex,
    activeIncidents: incidentCount,
    networkEfficiency,
    capturedAt: snapshot.fetchedAt,
  }
}

function SectionCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('card-premium overflow-hidden border border-white/5', className)}>
      <div className="px-5 sm:px-6 py-4 border-b border-white/5 bg-white/[0.02]">
        <div className="flex flex-col gap-1">
          <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-white">{title}</h2>
          {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  const setIncidents = useTrafficStore(s => s.setIncidents)
  const snapshot = useTrafficStore(s => s.snapshot)
  const incidents = useTrafficStore(s => s.incidents)
  const dataSource = useTrafficStore(s => s.dataSource)
  const openMeteoWeather = useTrafficStore(s => s.openMeteoWeather)
  const airQuality = useTrafficStore(s => s.airQuality)
  const lastUpdate = useTrafficStore(s => s.lastUpdate)
  const addSnapshot = useKPIHistoryStore(s => s.addSnapshot)
  const syncSnapshots = useKPIHistoryStore(s => s.syncHistoricalSnapshots)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { document.title = `Tableau de bord — ${city.name} | CrossFlow` }, [city.name])

  useEffect(() => {
    if (!mounted) return
    async function hydrate() {
      try {
        const history = await getSnapshots(city.id, 1440)
        if (history && history.length > 0) syncSnapshots(city.id, history)
      } catch (err) {
        console.warn('[Dashboard Hydration] Failed to fetch history, falling back to synthetic.', err)
      }
    }
    hydrate()
  }, [mounted, city.id, syncSnapshots])

  useEffect(() => {
    if (dataSource === 'live') return
    setKPIs(generateCityKPIs(city))
    setIncidents(generateIncidents(city))
    const interval = setInterval(() => {
      setKPIs(generateCityKPIs(city))
      setIncidents(generateIncidents(city))
    }, platformConfig.kpi.dashboardRefreshMs)
    return () => clearInterval(interval)
  }, [city, dataSource, setKPIs, setIncidents])

  useEffect(() => {
    if (!snapshot) return
    const base = generateCityKPIs(city)
    setKPIs(kpisFromSnapshot(city.id, snapshot, incidents.length, base))
  }, [snapshot, dataSource, city, incidents.length, setKPIs])

  useEffect(() => {
    if (kpis) addSnapshot(kpis)
  }, [kpis, addSnapshot])

  const isMobile = useMediaQuery('(max-width: 1023px)')

  const derived = useMemo(() => {
    if (!kpis) return null
    const targets = platformConfig.kpi.targets
    const congPct = Math.round(kpis.congestionRate * 100)
    const congWarn = kpis.congestionRate >= targets.congestion_rate.warning
    const congCrit = kpis.congestionRate >= targets.congestion_rate.critical
    const travelWarn = kpis.avgTravelMin >= targets.avg_travel_time_min.warning
    const pollWarn = kpis.pollutionIndex >= targets.pollution_index.warning
    const pollColor = pollutionLabel(kpis.pollutionIndex).color

    const history = useKPIHistoryStore.getState().getForCity(city.id, 96)
    let cDelta: number | undefined
    let tDelta: number | undefined
    if (history.length >= 2) {
      const BUCKET_24H = 48
      const latest = history[history.length - 1]
      const yesterday = history.find(s =>
        s.cityId === city.id && Math.abs(s.bucketKey - (latest.bucketKey - BUCKET_24H)) <= 2,
      )
      if (yesterday) {
        cDelta = Math.round((latest.congestion - yesterday.congestion) * 10) / 10
        tDelta = Math.round((latest.avgTravelMin - yesterday.avgTravelMin) * 10) / 10
      }
    }

    const weatherImpact: 'none' | 'low' | 'high' = !openMeteoWeather || openMeteoWeather.trafficImpact === 'none'
      ? 'none'
      : openMeteoWeather.trafficImpact === 'minor'
        ? 'low'
        : 'high'
    const status: 'optimal' | 'warning' | 'critical' = congCrit
      ? 'critical'
      : (congWarn && travelWarn) || pollWarn
        ? 'warning'
        : 'optimal'

    return {
      congPct,
      congWarn,
      congCrit,
      travelWarn,
      pollWarn,
      pollColor,
      cDelta,
      tDelta,
      status,
      weatherImpact,
    }
  }, [kpis, city.id, openMeteoWeather])

  if (!kpis || !derived) return null

  if (isMobile) {
    return (
      <MobileDashboardView
        kpis={kpis}
        city={city}
        incidents={incidents}
        status={derived.status}
        weatherImpact={derived.weatherImpact}
        refreshedAt={snapshot ? new Date(snapshot.fetchedAt) : lastUpdate}
      />
    )
  }

  const updatedAt = lastUpdate ?? (snapshot ? new Date(snapshot.fetchedAt) : null)
  const relativeUpdated = updatedAt
    ? `Mis à jour il y a ${formatDistanceToNow(updatedAt, { locale: fr, addSuffix: false })}`
    : t('dashboard.updated')

  return (
    <main className="min-h-full p-4 sm:p-6 lg:p-8 pb-safe space-y-6 lg:space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-2 h-8 bg-brand rounded-full shadow-glow" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase font-heading">
              {city.flag} {city.name}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] sm:text-[13px] font-medium text-text-secondary">
            <span>{t('dashboard.title')}</span>
            <span className="text-text-muted">•</span>
            <span>{relativeUpdated}</span>
            {dataSource === 'live' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand">
                <Zap className="w-2 h-2" />
                Live
              </span>
            )}
            <LiveSyncBadge className="scale-90 origin-left" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ZoneExportTool />
          <PDFButton city={city} />
          <button
            onClick={() => { window.location.href = '/map' }}
            className="print-hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-brand/10 border border-brand/20 hover:bg-brand/15 transition-all text-xs text-brand font-bold"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            Voir la carte
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]">
        <div className="space-y-5">
          <StatusBar
            status={derived.status}
            efficiency={Math.round(kpis.networkEfficiency * 100)}
            weatherImpact={derived.weatherImpact}
            refreshedAt={updatedAt}
            live={dataSource === 'live'}
          />

          <SectionCard
            title="État du réseau"
            subtitle="Vue prioritaire : congestion, retard, impacts et coûts"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <KPICard
                label="Congestion"
                value={derived.congPct}
                unit="%"
                delta={derived.cDelta}
                deltaLabel="vs 24h"
                deltaUnit="%"
                inverse
                icon={Activity}
                color={derived.congCrit ? '#FF1744' : derived.congWarn ? '#FF6D00' : '#00E676'}
                warning={derived.congWarn}
                critical={derived.congCrit}
                sub={derived.congCrit ? 'Réseau sous tension immédiate' : derived.congWarn ? 'Trafic à surveiller' : 'Réseau nominal'}
              />
              <KPICard
                label="Retard moyen"
                value={kpis.avgTravelMin.toFixed(0)}
                unit="min"
                delta={derived.tDelta}
                deltaLabel="vs 24h"
                deltaUnit=" min"
                inverse
                icon={Clock}
                color={derived.travelWarn ? '#FF6D00' : '#2979FF'}
                warning={derived.travelWarn}
                sub="Impact direct sur la productivité urbaine"
              />
              <KPICard
                label="Impact sanitaire"
                value={kpis.pollutionIndex.toFixed(1)}
                unit="/ 10"
                inverse
                icon={Wind}
                color={derived.pollColor}
                warning={derived.pollWarn}
                sub={`Exposition NO2 · ${pollutionLabel(kpis.pollutionIndex).label}`}
              />
              <KPICard
                label="Coût des incidents"
                value={incidents.length}
                icon={AlertTriangle}
                color={incidents.length > 5 ? '#FF6D00' : '#FFD600'}
                sub={`Est. ${incidents.length * 450} € de perte sèche / heure`}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Trafic : tendance 24h"
            subtitle={derived.congWarn ? 'Pic et ralentissements à surveiller' : 'Tendance stable avec marges de fluidité'}
          >
            <div className="space-y-4">
              <TrafficChart />
            </div>
          </SectionCard>

          <details className="card-premium overflow-hidden border border-white/5 rounded-3xl">
            <summary className="list-none cursor-pointer px-5 sm:px-6 py-4 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-[13px] font-black uppercase tracking-[0.18em] text-white">Historique 24h</h2>
                <p className="text-[11px] text-text-muted">Analyse détaillée disponible à la demande</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Ouvrir</span>
            </summary>
            <div className="p-4 sm:p-5">
              <TimelineScrubber />
            </div>
          </details>
        </div>

        <div className="space-y-5">
          <SectionCard
            title="Décision court terme"
            subtitle="Lecture rapide des prochains leviers d'action"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrafficStabilityWidget />
              <ModalSplitChart />
            </div>
          </SectionCard>

          <IncidentFeed
            maxItems={5}
            title="Alertes actives"
            subtitle="Incidents et anomalies à prioriser sur la carte"
            ctaLabel="Voir sur la carte"
            onCtaClick={() => { window.location.href = '/map' }}
          />

          <SectionCard
            title="Contexte opérationnel"
            subtitle="Événements, météo et qualité de l'air"
          >
            <div className="space-y-4">
              <EventsWidget lat={city.center.lat} lng={city.center.lng} radiusKm={15} maxItems={5} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {openMeteoWeather && <WeatherCard weather={openMeteoWeather} />}
                {airQuality && <AirQualityCard aq={airQuality} />}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  )
}

function PDFButton({ city }: { city: { name: string } }) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleExport = async () => {
    setIsGenerating(true)
    try {
      await exportToPdf(`${appData.name} — ${city.name} Dashboard`)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isGenerating}
      className={cn(
        'print-hidden flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-xs font-bold',
        isGenerating
          ? 'bg-bg-border border-transparent text-text-muted cursor-not-allowed opacity-70'
          : 'bg-bg-elevated border-bg-border hover:border-text-muted text-text-secondary hover:text-text-primary',
      )}
    >
      {isGenerating ? (
        <>
          <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
          Génération...
        </>
      ) : (
        <>
          <Download className="w-3.5 h-3.5" />
          PDF
        </>
      )}
    </button>
  )
}
