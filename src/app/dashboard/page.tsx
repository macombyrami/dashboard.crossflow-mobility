'use client'
import { useEffect } from 'react'
import { Activity, Clock, Wind, AlertTriangle, Zap, Network } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/dashboard/KPICard'
import { cn } from '@/lib/utils/cn'
import { TrafficChart } from '@/components/dashboard/TrafficChart'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { ModalSplitChart } from '@/components/dashboard/ModalSplitChart'
import { WeatherCard } from '@/components/dashboard/WeatherCard'
import { AirQualityCard } from '@/components/dashboard/AirQualityCard'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'
import { fetchWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'

export default function DashboardPage() {
  const { t } = useTranslation()
  const city                = useMapStore(s => s.city)
  const kpis                = useTrafficStore(s => s.kpis)
  const setKPIs             = useTrafficStore(s => s.setKPIs)
  const setIncidents        = useTrafficStore(s => s.setIncidents)
  const openMeteoWeather    = useTrafficStore(s => s.openMeteoWeather)
  const setOpenMeteoWeather = useTrafficStore(s => s.setOpenMeteoWeather)
  const airQuality          = useTrafficStore(s => s.airQuality)
  const setAirQuality       = useTrafficStore(s => s.setAirQuality)

  // Synthetic KPIs + incidents
  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    setIncidents(generateIncidents(city))
    const interval = setInterval(() => {
      setKPIs(generateCityKPIs(city))
      setIncidents(generateIncidents(city))
    }, platformConfig.kpi.dashboardRefreshMs)
    return () => clearInterval(interval)
  }, [city, setKPIs, setIncidents])

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
    const interval = setInterval(load, 5 * 60 * 1000) // refresh every 5 min
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

  // Stable deltas (seeded by city + minute)
  const seed = city.id.charCodeAt(0) + new Date().getMinutes()
  const congDelta   = ((seed % 21) - 10) / 10
  const travelDelta = ((seed % 11) - 5)  / 10
  const pollDelta   = ((seed % 31) - 15) / 10

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar">
          {/* Title & Stats Summary */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-6 bg-brand-green rounded-full shadow-glow" />
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {city.flag} {city.name}
                </h1>
              </div>
              <p className="text-[13px] font-medium text-text-secondary">
                {t('dashboard.title')} · <span className="text-text-muted">{t('dashboard.updated')} · {city.timezone}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
               {openMeteoWeather && (
                 <div className="glass-light px-4 py-2 rounded-apple border border-white/5 flex items-center gap-2.5">
                   <span className="text-xl">{openMeteoWeather.weatherEmoji}</span>
                   <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-white leading-none">{openMeteoWeather.temp}°C</span>
                      <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider mt-1">{openMeteoWeather.weatherLabel}</span>
                   </div>
                 </div>
               )}
            </div>
          </div>

          {/* Network status banner — Ultra-premium */}
          <div className={cn(
            "relative overflow-hidden p-0.5 rounded-apple group",
            congCrit ? "bg-gradient-to-r from-red-500/20 to-transparent" :
            congWarn ? "bg-gradient-to-r from-orange-500/20 to-transparent" :
                      "bg-gradient-to-r from-brand-green/20 to-transparent"
          )}>
            <div className="glass-light px-6 py-4 rounded-[14px] flex items-center gap-4 border border-white/5">
              <div className="relative">
                <div className={cn(
                  "w-3 h-3 rounded-full shadow-glow animate-pulse",
                  congCrit ? "bg-red-500" : congWarn ? "bg-orange-500" : "bg-brand-green"
                )} />
                <div className={cn(
                  "absolute inset-0 w-3 h-3 rounded-full blur-sm",
                  congCrit ? "bg-red-500" : congWarn ? "bg-orange-500" : "bg-brand-green"
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
                              "text-brand-green border-brand-green/20 bg-brand-green/10"
                  )}>
                    {congCrit ? t('common.incidents') : congWarn ? 'Warning' : 'Optimal'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-8 pr-2">
                <div className="flex flex-col items-end">
                   <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Efficacité</p>
                   <p className="text-[15px] font-bold text-white tabular-nums">{Math.round(kpis.networkEfficiency * 100)}%</p>
                </div>
                <div className="w-[1px] h-8 bg-white/5 hidden sm:block" />
                <div className="flex flex-col items-end hidden sm:flex">
                   <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Impact Météo</p>
                   <p className={cn("text-[13px] font-bold tabular-nums", openMeteoWeather?.trafficImpact === 'none' ? 'text-brand-green' : 'text-orange-500')}>
                     {openMeteoWeather?.trafficImpact.toUpperCase() || 'N/A'}
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
              label={t('dashboard.pollution')}
              value={kpis.pollutionIndex.toFixed(1)}
              unit="/ 10"
              delta={pollDelta}
              deltaUnit=" pt"
              inverse
              icon={Wind}
              color={pollColor}
              warning={pollWarn}
              sub={pollutionLabel(kpis.pollutionIndex).label}
            />
            <KPICard
              label={t('dashboard.active_incidents')}
              value={kpis.activeIncidents}
              icon={AlertTriangle}
              color={kpis.activeIncidents > 5 ? '#FF6D00' : '#FFD600'}
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
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Network className="w-4 h-4 text-brand-green" />
                  <p className="text-sm font-semibold text-text-primary">{t('dashboard.performance')}</p>
                </div>
                <EfficiencyBar label="Main roads"       value={kpis.networkEfficiency * 0.9 + 0.1} />
                <EfficiencyBar label="Public transit"    value={0.78}   color="#2979FF" />
                <EfficiencyBar label="Cycle network"         value={0.85}   color="#00E5FF" />
                <EfficiencyBar label="Pedestrian zones"         value={0.92}   color="#AA00FF" />
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
      </div>
    </div>
  )
}

function EfficiencyBar({ label, value, color = '#22C55E' }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-2 mb-4 group">
      <div className="flex justify-between items-end">
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">{label}</span>
        <span className="text-[13px] font-bold tabular-nums" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out shadow-glow"
          style={{ width: `${value * 100}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
        />
      </div>
    </div>
  )
}
