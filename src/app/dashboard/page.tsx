'use client'
import { useEffect } from 'react'
import { Activity, Clock, Wind, AlertTriangle, Zap, Network } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/dashboard/KPICard'
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              {city.flag} {city.name} — {t('dashboard.title')}
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              {t('dashboard.updated')} · {city.timezone}
            </p>
          </div>

          {/* Network status banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
            congCrit ? 'bg-[rgba(255,23,68,0.08)] border-[rgba(255,23,68,0.3)]' :
            congWarn ? 'bg-[rgba(255,109,0,0.08)] border-[rgba(255,109,0,0.3)]' :
                        'bg-brand-green-dim border-brand-green/20'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              congCrit ? 'bg-[#FF1744] animate-pulse' :
              congWarn ? 'bg-[#FF6D00] animate-pulse' : 'bg-brand-green'
            }`} />
            <span className="text-sm font-medium text-text-primary">
              {t('dashboard.performance')} {congCrit ? `⚠ ${t('common.incidents').toUpperCase()}` : congWarn ? '⚠ WARNING' : '✓ OK'}
            </span>
            {openMeteoWeather && (
              <span className="hidden sm:inline text-sm ml-2">
                {openMeteoWeather.weatherEmoji} {openMeteoWeather.temp}°C
                {openMeteoWeather.trafficImpact !== 'none' && (
                  <span className="ml-1 text-xs text-[#FF6D00]">· {t('common.weather')}: {openMeteoWeather.trafficImpact}</span>
                )}
              </span>
            )}
            <span className="ml-auto text-xs text-text-muted">
              {t('common.efficiency')}: <span className="font-semibold text-text-secondary">{Math.round(kpis.networkEfficiency * 100)}%</span>
            </span>
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

function EfficiencyBar({ label, value, color = '#00E676' }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-1.5 mb-3">
      <div className="flex justify-between">
        <span className="text-xs text-text-secondary">{label}</span>
        <span className="text-xs font-semibold" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
