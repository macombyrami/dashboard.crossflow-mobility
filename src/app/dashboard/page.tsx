'use client'
import { useEffect, useState, useMemo, memo } from 'react'
import { Activity, Clock, Wind, AlertTriangle, Network, Zap, Download } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { cn } from '@/lib/utils/cn'
import appData from '@/lib/data/app.json'
import { TrafficChart } from '@/components/dashboard/TrafficChart'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { ModalSplitChart } from '@/components/dashboard/ModalSplitChart'
import { WeatherCard } from '@/components/dashboard/WeatherCard'
import { AirQualityCard } from '@/components/dashboard/AirQualityCard'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'
import { fetchWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { exportToPdf } from '@/lib/utils/export'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'
import type { CityKPIs, TrafficSnapshot } from '@/types'

import type { Metadata } from 'next'

function kpisFromSnapshot(cityId: string, snapshot: TrafficSnapshot, incidentCount: number, base: CityKPIs): CityKPIs {
  const segs = snapshot.segments
  if (!segs.length) return base
  const congestionRate     = segs.reduce((a, s) => a + s.congestionScore, 0) / segs.length
  const avgTravelMin       = Math.max(5, 10 + congestionRate * 40)
  const pollutionIndex     = Math.min(10, Math.max(0.5, congestionRate * 8 + 0.5))
  const networkEfficiency  = Math.max(0.1, 1 - congestionRate * 0.85)
  return {
    ...base,
    cityId,
    congestionRate,
    avgTravelMin,
    pollutionIndex,
    activeIncidents:  incidentCount,
    networkEfficiency,
    capturedAt: snapshot.fetchedAt,
  }
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const city                = useMapStore(s => s.city)
  const kpis                = useTrafficStore(s => s.kpis)
  const setKPIs             = useTrafficStore(s => s.setKPIs)
  const setIncidents        = useTrafficStore(s => s.setIncidents)
  const snapshot            = useTrafficStore(s => s.snapshot)
  const incidents           = useTrafficStore(s => s.incidents)
  const dataSource          = useTrafficStore(s => s.dataSource)
  const openMeteoWeather    = useTrafficStore(s => s.openMeteoWeather)
  const setOpenMeteoWeather = useTrafficStore(s => s.setOpenMeteoWeather)
  const airQuality          = useTrafficStore(s => s.airQuality)
  const setAirQuality       = useTrafficStore(s => s.setAirQuality)
  const addSnapshot  = useKPIHistoryStore(s => s.addSnapshot)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { document.title = `Tableau de bord — ${city.name} | CrossFlow` }, [city.name])

  // Synthetic KPIs + incidents baseline (only when no live data)
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

  // Real KPIs derived from HERE live snapshot
  useEffect(() => {
    if (!snapshot || dataSource !== 'live') return
    const base = generateCityKPIs(city)
    setKPIs(kpisFromSnapshot(city.id, snapshot, incidents.length, base))
  }, [snapshot, dataSource, city, incidents.length, setKPIs])

  // Record KPI snapshot to history store (30-min buckets)
  useEffect(() => {
    if (kpis) addSnapshot(kpis)
  }, [kpis, addSnapshot])

  // Real weather from OpenMeteo (free, no key)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [w, a] = await Promise.all([
        fetchWeather(city.center.lat, city.center.lng),
        fetchAirQuality(city.center.lat, city.center.lng),
      ])
      if (!cancelled) {
        setOpenMeteoWeather(w)
        setAirQuality(a)
      }
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [city.center.lat, city.center.lng, setOpenMeteoWeather, setAirQuality])

  if (!kpis) return null

  const congPct    = Math.round(kpis.congestionRate * 100)
  const targets    = platformConfig.kpi.targets
  const congWarn   = kpis.congestionRate >= targets.congestion_rate.warning
  const congCrit   = kpis.congestionRate >= targets.congestion_rate.critical
  const travelWarn = kpis.avgTravelMin   >= targets.avg_travel_time_min.warning
  const pollWarn   = kpis.pollutionIndex >= targets.pollution_index.warning
  const pollColor  = pollutionLabel(kpis.pollutionIndex).color

  // Stable deltas — recompute only when city changes or on mount (not every minute)
  const { congDelta, travelDelta, pollDelta } = useMemo(() => {
    const seed = mounted ? (city.id.charCodeAt(0) + new Date().getMinutes()) : city.id.charCodeAt(0)
    return {
      congDelta:   ((seed % 21) - 10) / 10,
      travelDelta: ((seed % 11) - 5)  / 10,
      pollDelta:   ((seed % 31) - 15) / 10,
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city.id, mounted])

  return (
    <main className="min-h-full p-4 sm:p-8 space-y-6 sm:space-y-8 pb-safe">
      {/* Title & Stats Summary */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 animate-slide-up">
            <div className="w-1.5 h-6 sm:w-2 sm:h-7 bg-brand rounded-full shadow-glow" />
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {city.flag} {city.name}
            </h1>
          </div>
          <p className="text-[12px] sm:text-[14px] font-medium text-text-secondary flex flex-wrap items-center gap-2 animate-slide-up [animation-delay:100ms]">
            {t('dashboard.title')} · <span className="text-text-muted">{t('dashboard.updated')}</span>
            {dataSource === 'live' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/30 text-brand text-[9px] font-bold uppercase tracking-wider">
                <Zap className="w-2 h-2" />Live
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => exportToPdf(`${appData.name} — ${city.name} Dashboard`)}
            className="print-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-xs text-text-secondary hover:text-text-primary"
          >
            <Download className="w-3.5 h-3.5" />
            PDF
          </button>
          {openMeteoWeather && (
            <div className="glass-light px-4 py-2 rounded-xl border border-white/5 flex items-center gap-2.5">
              <span className="text-xl">{openMeteoWeather.weatherEmoji}</span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-white leading-none">{openMeteoWeather.temp}°C</span>
                <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1">{openMeteoWeather.weatherLabel}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Network status banner */}
      <div className={cn(
        "relative overflow-hidden p-[1px] rounded-[22px] group animate-slide-up [animation-delay:200ms]",
        congCrit ? "bg-gradient-to-r from-red-500/30 to-transparent" :
        congWarn ? "bg-gradient-to-r from-orange-500/30 to-transparent" :
                  "bg-gradient-to-r from-brand/30 to-transparent"
      )}>
        <div className="glass px-5 sm:px-7 py-4 sm:py-5 rounded-[21px] flex items-center gap-4 border border-white/5">
          <div className="relative">
            <div className={cn(
              "w-3 h-3 rounded-full shadow-glow animate-pulse",
              congCrit ? "bg-red-500" : congWarn ? "bg-orange-500" : "bg-brand"
            )} />
            <div className={cn(
              "absolute inset-0 w-3 h-3 rounded-full blur-sm",
              congCrit ? "bg-red-500" : congWarn ? "bg-orange-500" : "bg-brand"
            )} />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[14px] font-bold text-white tracking-tight uppercase">
                {t('dashboard.performance')}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-widest uppercase",
                congCrit ? "text-red-500 border-red-500/20 bg-red-500/10" :
                congWarn ? "text-orange-500 border-orange-500/20 bg-orange-500/10" :
                          "text-brand border-brand/20 bg-brand/10"
              )}>
                {congCrit ? t('common.incidents') : congWarn ? 'Warning' : 'Optimal'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8 pr-1 sm:pr-2">
            <div className="flex flex-col items-end">
              <p className="text-[8px] sm:text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Efficacité</p>
              <p className="text-[13px] sm:text-[15px] font-bold text-white tabular-nums">{Math.round(kpis.networkEfficiency * 100)}%</p>
            </div>
            <div className="w-[1px] h-6 sm:h-8 bg-white/5 hidden xs:block" />
            <div className="flex-col items-end hidden xs:flex">
              <p className="text-[8px] sm:text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Météo → Trafic</p>
              <p className={cn("text-[11px] sm:text-[13px] font-bold tabular-nums", openMeteoWeather?.trafficImpact === 'none' ? 'text-brand' : 'text-orange-500')}>
                {openMeteoWeather?.trafficImpact === 'none' ? 'Aucun' : openMeteoWeather?.trafficImpact.toUpperCase() || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t('dashboard.congestion')}
          value={congPct}
          unit="%"
          delta={congDelta}
          inverse
          icon={Activity}
          color={congCrit ? '#FF1744' : congWarn ? '#FF6D00' : '#00E676'}
          warning={congWarn}
          critical={congCrit}
          sub={`Target: ${Math.round(targets.congestion_rate.warning * 100)}%`}
        />
        <KPICard
          label={t('dashboard.travel_time')}
          value={kpis.avgTravelMin.toFixed(0)}
          unit="min"
          delta={travelDelta}
          deltaUnit=" min"
          inverse
          icon={Clock}
          color={travelWarn ? '#FF6D00' : '#2979FF'}
          warning={travelWarn}
          sub="Avg trip duration"
        />
        <KPICard
          label="Congestion-Pollution"
          value={kpis.pollutionIndex.toFixed(1)}
          unit="/ 10"
          delta={pollDelta}
          deltaUnit=" pt"
          inverse
          icon={Wind}
          color={pollColor}
          warning={pollWarn}
          sub={`Indice trafic · ${pollutionLabel(kpis.pollutionIndex).label}`}
        />
        <KPICard
          label={t('dashboard.active_incidents')}
          value={incidents.length}
          icon={AlertTriangle}
          color={incidents.length > 5 ? '#FF6D00' : '#FFD600'}
          sub="Accidents + works"
        />
      </div>

      {/* Charts + real data row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TrafficChart />
        </div>
        <div className="space-y-4">
          <ModalSplitChart />
          <div className="glass-card border border-white/5 rounded-[22px] p-6 shadow-sm group animate-scale-in [animation-delay:600ms]">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-4.5 bg-brand rounded-full shadow-glow" />
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">{t('dashboard.performance')}</p>
            </div>
            <EfficiencyBar label="Main roads"       value={kpis.networkEfficiency * 0.9 + 0.1} />
            <EfficiencyBar label="Public transit"   value={0.78}  color="#0A84FF" />
            <EfficiencyBar label="Cycle network"    value={0.85}  color="#30D158" />
            <EfficiencyBar label="Pedestrian zones" value={0.92}  color="#AF52DE" />
          </div>
        </div>
      </div>

      {/* Real weather + air quality (OpenMeteo, no key) */}
      {(openMeteoWeather || airQuality) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {openMeteoWeather && <WeatherCard weather={openMeteoWeather} />}
          {airQuality       && <AirQualityCard aq={airQuality} />}
        </div>
      )}

      {/* Événements & incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EventsWidget lat={city.center.lat} lng={city.center.lng} radiusKm={15} maxItems={5} />
        <IncidentFeed maxItems={5} />
      </div>
    </main>
  )
}

const EfficiencyBar = memo(function EfficiencyBar({
  label, value, color = '#22C55E',
}: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-2 mb-4 group">
      <div className="flex justify-between items-end">
        <span className="text-[10px] sm:text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">{label}</span>
        <span className="text-[12px] sm:text-[13px] font-bold tabular-nums" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${value * 100}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
        />
      </div>
    </div>
  )
})
