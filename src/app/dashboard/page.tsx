'use client'
import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock, Wind, AlertTriangle, Zap, Download, BrainCircuit, ShieldAlert, ArrowRight, CalendarClock, CloudRain, Siren, Sparkles } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { cn } from '@/lib/utils/cn'
import { TrafficChart } from '@/components/dashboard/TrafficChart'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { ModalSplitChart } from '@/components/dashboard/ModalSplitChart'
import { WeatherCard } from '@/components/dashboard/WeatherCard'
import { AirQualityCard } from '@/components/dashboard/AirQualityCard'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { GlobalTrafficBanner } from '@/components/dashboard/GlobalTrafficBanner'
import { TrafficIndexWidget } from '@/components/dashboard/TrafficIndexWidget'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs, generateIncidents, generatePrediction } from '@/lib/engine/traffic.engine'
import { generateEventsForCity } from '@/lib/engine/events.engine'
import { fetchWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { exportToPdf } from '@/lib/utils/export'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'
import type { CityKPIs, TrafficSnapshot } from '@/types'
import type { TrafficIndexFactor } from '@/components/dashboard/TrafficIndexWidget'

type InsightPriority = 'critical' | 'high' | 'medium'

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

function DashboardSkeleton() {
  return (
    <main className="flex-1 min-h-0 overflow-y-auto page-scroll">
      <div className="page-container space-y-6 sm:space-y-8">
        <div className="h-10 bg-bg-subtle rounded-2xl animate-pulse" />
        <div className="h-8 w-48 bg-bg-subtle rounded-xl animate-pulse" />
        <div className="kpi-grid">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="glass-card p-6 rounded-[22px] h-36 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-bg-subtle rounded-[22px] animate-pulse" />
      </div>
    </main>
  )
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

  if (!kpis) return <DashboardSkeleton />

  const congPct    = Math.round(kpis.congestionRate * 100)
  const targets    = platformConfig.kpi.targets
  const congWarn   = kpis.congestionRate >= targets.congestion_rate.warning
  const congCrit   = kpis.congestionRate >= targets.congestion_rate.critical
  const travelWarn = kpis.avgTravelMin   >= targets.avg_travel_time_min.warning
  const pollWarn   = kpis.pollutionIndex >= targets.pollution_index.warning
  const pollColor  = pollutionLabel(kpis.pollutionIndex).color
  const events = useMemo(() => generateEventsForCity(city).slice(0, 4), [city])
  const prediction30 = useMemo(() => generatePrediction(city, 30), [city])
  const prediction60 = useMemo(() => generatePrediction(city, 60), [city])

  const weatherPenalty =
    openMeteoWeather?.trafficImpact === 'severe' ? -10 :
    openMeteoWeather?.trafficImpact === 'moderate' ? -6 :
    openMeteoWeather?.trafficImpact === 'minor' ? -2 :
    3
  const eventsPenalty = events.length > 0
    ? -Math.min(12, Math.max(...events.map(event => Math.round((event.trafficIncrease ?? 0) / 6))))
    : 2
  const congestionContribution = Math.round((0.5 - kpis.congestionRate) * 38)
  const baselineScore = Math.max(25, Math.min(82, 68 - congestionContribution - eventsPenalty - weatherPenalty))
  const scoreFactors: TrafficIndexFactor[] = [
    { label: 'Baseline', value: baselineScore, tone: 'neutral' },
    { label: 'Congestion', value: congestionContribution, tone: congestionContribution >= 0 ? 'positive' : 'negative' },
    { label: 'Events', value: eventsPenalty, tone: eventsPenalty >= 0 ? 'positive' : 'negative' },
    { label: 'Weather', value: weatherPenalty, tone: weatherPenalty >= 0 ? 'positive' : 'negative' },
  ]

  const topEvent = events[0]
  const topIncident = incidents[0]
  const topInsights = useMemo<Array<{
    id: string
    title: string
    detail: string
    priority: InsightPriority
    icon: typeof BrainCircuit
  }>>(() => {
    const insights = [
      {
        id: 'network',
        title: congCrit ? 'Network pressure requires immediate arbitration' : congWarn ? 'Network is stable but under pressure' : 'Network is fluid but still exposed to local shocks',
        detail: congCrit
          ? `Congestion is at ${congPct}% with ${kpis.activeIncidents} active incidents.`
          : `Traffic index remains serviceable, but ${kpis.activeIncidents} incidents can shift the network within 30 minutes.`,
        priority: (congCrit ? 'critical' : congWarn ? 'high' : 'medium') as InsightPriority,
        icon: ShieldAlert,
      },
      {
        id: 'event',
        title: topEvent
          ? `${topEvent.title} -> +${topEvent.trafficIncrease ?? Math.round(topEvent.trafficScore * 100)}% congestion expected`
          : 'No major event pressure detected in the next cycle',
        detail: topEvent
          ? `${topEvent.venue ?? topEvent.location.address} is likely to concentrate demand around ${formatTime(topEvent.startDate)}.`
          : 'The event layer is currently not the dominant driver.',
        priority: (topEvent && (topEvent.trafficIncrease ?? 0) >= 50 ? 'high' : 'medium') as InsightPriority,
        icon: CalendarClock,
      },
      {
        id: 'weather',
        title: openMeteoWeather
          ? openMeteoWeather.trafficImpact === 'none'
            ? 'Weather is not degrading road speed right now'
            : `${openMeteoWeather.weatherLabel} is slowing corridor efficiency`
          : 'Weather telemetry unavailable',
        detail: openMeteoWeather
          ? `${openMeteoWeather.windSpeedKmh} km/h wind, ${openMeteoWeather.precipitationMm} mm precipitation, visibility ${Math.round(openMeteoWeather.visibilityM / 1000)} km.`
          : 'Decision layer is falling back to traffic-only signals.',
        priority: (openMeteoWeather?.trafficImpact === 'severe' ? 'critical' : openMeteoWeather?.trafficImpact === 'moderate' ? 'high' : 'medium') as InsightPriority,
        icon: CloudRain,
      },
      {
        id: 'incidents',
        title: topIncident
          ? `${topIncident.title} is a direct delay driver`
          : 'Incident pressure remains manageable',
        detail: topIncident
          ? `${topIncident.address} is likely to increase delay and rerouting pressure in connected corridors.`
          : 'No single incident currently dominates the system.',
        priority: (topIncident?.severity === 'critical' ? 'critical' : topIncident?.severity === 'high' ? 'high' : 'medium') as InsightPriority,
        icon: Siren,
      },
    ]
    return insights
      .sort((a, b) => priorityWeight(b.priority) - priorityWeight(a.priority))
      .slice(0, 4)
  }, [congCrit, congPct, congWarn, incidents, kpis.activeIncidents, openMeteoWeather, topEvent, topIncident])

  const recommendations = useMemo(() => {
    const actions = [
      congCrit
        ? 'Increase signal regulation and prepare controlled rerouting on the most saturated corridors.'
        : 'Keep corridor regulation adaptive and pre-position rapid response capacity.',
      topEvent
        ? `Prepare traffic regulation around ${topEvent.venue ?? topEvent.location.address} before ${formatTime(topEvent.startDate)}.`
        : 'Keep event monitoring active; no major event-triggered action required right now.',
      openMeteoWeather && openMeteoWeather.trafficImpact !== 'none'
        ? 'Reduce response time on weather-sensitive axes and update roadside messaging.'
        : 'Maintain normal weather operations and preserve capacity for incidents.',
      incidents.length > 0
        ? 'Push rerouting guidance to affected zones and monitor spillover on adjacent sectors.'
        : 'Preserve operational reserve for the next 45 minutes as the network remains vulnerable to shocks.',
    ]
    return actions.slice(0, 4)
  }, [congCrit, incidents.length, openMeteoWeather, topEvent])

  const timeline = [
    {
      label: 'Now',
      score: congPct,
      detail: congCrit ? 'Critical operating window' : congWarn ? 'Under observation' : 'Operationally stable',
    },
    {
      label: '+30 min',
      score: Math.round(prediction30.globalCongestion * 100),
      detail: topEvent ? 'Event pressure enters active window' : 'Pressure driven by current incident load',
    },
    {
      label: '+1h',
      score: Math.round(prediction60.globalCongestion * 100),
      detail: openMeteoWeather?.trafficImpact && openMeteoWeather.trafficImpact !== 'none'
        ? 'Weather remains a drag on average speed'
        : 'Recovery depends on incident clearance and public transport absorption',
    },
  ]

  const scoreExplanation = `Traffic Index ${Math.round((1 - kpis.congestionRate) * 100)} is driven by corridor congestion, event pressure and weather drag. ${topEvent ? `${topEvent.title} is the strongest external driver.` : 'No major external event is dominating the score.'}`

  // Stable deltas (seeded by city + minute, only after mount to avoid hydration mismatch)
  const seed = mounted ? (city.id.charCodeAt(0) + new Date().getMinutes()) : city.id.charCodeAt(0)
  const congDelta   = ((seed % 21) - 10) / 10
  const travelDelta = ((seed % 11) - 5)  / 10
  const pollDelta   = ((seed % 31) - 15) / 10

  return (
    <main className="flex-1 min-h-0 overflow-y-auto page-scroll">
      <div className="page-container space-y-6 sm:space-y-8 2xl:space-y-10">

        {/* Bandeau état global — 3 secondes */}
        <GlobalTrafficBanner className="animate-slide-up" />

        {/* Title & Stats Summary */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-6">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2 animate-slide-up">
              <div className="w-1.5 h-6 sm:w-2 sm:h-7 bg-brand rounded-full shadow-glow" />
              <h1 className="heading-fluid-1 text-text-primary tracking-tight">
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
              onClick={() => exportToPdf(`CrossFlow — ${city.name} Dashboard`)}
              className="print-hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-xs text-text-secondary hover:text-text-primary"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </button>
            {openMeteoWeather && (
              <div className="glass-light px-4 py-2 rounded-xl flex items-center gap-2.5">
                <span className="text-xl">{openMeteoWeather.weatherEmoji}</span>
                <div className="flex flex-col">
                  <span className="text-[13px] font-bold text-text-primary leading-none">{openMeteoWeather.temp}°C</span>
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
          <div className="glass px-5 sm:px-7 py-4 sm:py-5 rounded-[21px] flex items-center gap-4">
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
                <span className="text-[14px] font-bold text-text-primary tracking-tight uppercase">
                  {t('dashboard.performance')}
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-widest uppercase",
                  congCrit ? "text-red-500 border-red-500/20 bg-red-500/10" :
                  congWarn ? "text-orange-500 border-orange-500/20 bg-orange-500/10" :
                            "text-brand border-brand/20 bg-brand/10"
                )}>
                  {congCrit ? 'Critique' : congWarn ? 'Attention' : 'Optimal'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-8 pr-1 sm:pr-2">
              <div className="flex flex-col items-end">
                <p className="text-[8px] sm:text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Efficacité</p>
                <p className="text-[13px] sm:text-[15px] font-bold text-text-primary tabular-nums">{Math.round(kpis.networkEfficiency * 100)}%</p>
              </div>
              <div className="w-[1px] h-6 sm:h-8 bg-bg-border hidden xs:block" />
              <div className="flex-col items-end hidden xs:flex">
                <p className="text-[8px] sm:text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] mb-1">Impact Météo</p>
                <p className={cn("text-[11px] sm:text-[13px] font-bold tabular-nums", openMeteoWeather?.trafficImpact === 'none' ? 'text-brand' : 'text-orange-500')}>
                  {openMeteoWeather
                    ? openMeteoWeather.trafficImpact === 'none' ? 'Aucun impact'
                      : openMeteoWeather.trafficImpact === 'minor' ? 'Impact mineur'
                      : openMeteoWeather.trafficImpact === 'moderate' ? 'Impact modéré'
                      : 'Impact sévère'
                    : 'Aucun impact'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Indice global de trafic */}
        <TrafficIndexWidget factors={scoreFactors} explanation={scoreExplanation} />

        {/* Decision intelligence layer */}
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-4">
          <div className="glass-card rounded-[22px] p-5 sm:p-6 space-y-5">
            <div className="flex items-center gap-2.5">
              <BrainCircuit className="w-4 h-4 text-brand" />
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">Decision intelligence</p>
                <p className="text-[13px] text-text-secondary mt-1">Top signals, causality and recommended actions in one view.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {topInsights.map((insight) => (
                <InsightCard key={insight.id} {...insight} />
              ))}
            </div>
          </div>

          <div className="glass-card rounded-[22px] p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-brand" />
              <div>
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">What should I do</p>
                <p className="text-[13px] text-text-secondary mt-1">Immediate operating actions for the next 60 minutes.</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {recommendations.map((action, index) => (
                <ActionRow key={action} index={index + 1} text={action} />
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[22px] p-5 sm:p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <CalendarClock className="w-4 h-4 text-brand" />
            <div>
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">Temporal intelligence</p>
              <p className="text-[13px] text-text-secondary mt-1">See how the network evolves now, in 30 minutes and in 1 hour.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {timeline.map((step, index) => (
              <TimelineStep key={step.label} {...step} accent={index === 0 ? '#22C55E' : index === 1 ? '#FFD600' : '#FF8A00'} />
            ))}
          </div>
        </div>

        {/* KPI grid */}
        <div className="kpi-grid">
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
            sub={`Seuil : ${Math.round(targets.congestion_rate.warning * 100)}%`}
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
            sub="Durée moyenne de trajet"
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
            sub="Incidents actifs"
          />
        </div>

        {/* Connected explanation row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <CausalityCard
            title="Events -> congestion"
            text={topEvent
              ? `${topEvent.title} at ${formatTime(topEvent.startDate)} can increase congestion by +${topEvent.trafficIncrease ?? Math.round(topEvent.trafficScore * 100)}% around ${topEvent.venue ?? topEvent.location.address}.`
              : 'No major event is currently expected to distort congestion significantly.'}
          />
          <CausalityCard
            title="Weather -> speed"
            text={openMeteoWeather
              ? openMeteoWeather.trafficImpact === 'none'
                ? 'Weather is neutral, so road speed remains driven primarily by demand and incidents.'
                : `${openMeteoWeather.weatherLabel} and ${openMeteoWeather.windSpeedKmh} km/h wind are reducing average speed on exposed axes.`
              : 'Weather signal unavailable; speed is explained only by traffic and incidents.'}
          />
          <CausalityCard
            title="Incidents -> delays"
            text={topIncident
              ? `${topIncident.title} is increasing delay pressure and secondary congestion around ${topIncident.address}.`
              : 'Incident pressure is currently distributed rather than dominated by a single point.'}
          />
        </div>

        {/* Charts + real data row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <TrafficChart />
          </div>
          <div className="space-y-4">
            <ModalSplitChart />
            <div className="glass-card rounded-[22px] p-6 shadow-sm group animate-scale-in [animation-delay:600ms]">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-1.5 h-4.5 bg-brand rounded-full shadow-glow" />
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">{t('dashboard.performance')}</p>
              </div>
              <EfficiencyBar label="Axes principaux"    value={kpis.networkEfficiency * 0.9 + 0.1} />
              <EfficiencyBar label="Transports publics" value={0.78}  color="#0A84FF" />
              <EfficiencyBar label="Réseau cyclable"    value={0.85}  color="#30D158" />
              <EfficiencyBar label="Zones piétonnes"    value={0.92}  color="#AF52DE" />
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
          <IncidentFeed
            maxItems={5}
            title="Priority incidents"
            subtitle="Ordered by likely impact on congestion and delay."
          />
        </div>
      </div>
    </main>
  )
}

function priorityWeight(priority: InsightPriority) {
  return priority === 'critical' ? 3 : priority === 'high' ? 2 : 1
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function InsightCard({
  title,
  detail,
  priority,
  icon: Icon,
}: {
  title: string
  detail: string
  priority: InsightPriority
  icon: typeof BrainCircuit
}) {
  const tone = priority === 'critical'
    ? 'border-red-500/20 bg-red-500/[0.06]'
    : priority === 'high'
      ? 'border-orange-500/20 bg-orange-500/[0.06]'
      : 'border-bg-border bg-bg-subtle/50'
  const accent = priority === 'critical' ? '#FF4D4F' : priority === 'high' ? '#FF8A00' : '#22C55E'

  return (
    <div className={cn('rounded-[20px] border p-4 space-y-3', tone)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" style={{ borderColor: `${accent}30`, backgroundColor: `${accent}12` }}>
            <Icon className="w-4 h-4" style={{ color: accent }} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent }}>{priority}</span>
        </div>
      </div>
      <p className="text-[15px] font-bold text-text-primary leading-snug">{title}</p>
      <p className="text-[12px] text-text-secondary leading-relaxed">{detail}</p>
    </div>
  )
}

function ActionRow({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-bg-border bg-bg-subtle/50 px-4 py-3">
      <div className="w-7 h-7 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center text-[11px] font-black text-brand flex-shrink-0">
        {index}
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <ArrowRight className="w-3.5 h-3.5 text-brand mt-1 flex-shrink-0" />
        <p className="text-[12px] text-text-secondary leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

function TimelineStep({
  label,
  score,
  detail,
  accent,
}: {
  label: string
  score: number
  detail: string
  accent: string
}) {
  return (
    <div className="rounded-[20px] border border-bg-border bg-bg-subtle/50 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">{label}</span>
        <span className="text-[22px] font-black tabular-nums" style={{ color: accent }}>{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-bg-border overflow-hidden mb-3">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: accent, boxShadow: `0 0 12px ${accent}55` }} />
      </div>
      <p className="text-[12px] text-text-secondary leading-relaxed">{detail}</p>
    </div>
  )
}

function CausalityCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="glass-card rounded-[22px] p-5">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em] mb-3">{title}</p>
      <p className="text-[13px] text-text-secondary leading-relaxed">{text}</p>
    </div>
  )
}

function EfficiencyBar({ label, value, color = '#22C55E' }: { label: string; value: number; color?: string }) {
  return (
    <div className="space-y-2 mb-4 group">
      <div className="flex justify-between items-end">
        <span className="text-[10px] sm:text-[11px] font-bold text-text-muted uppercase tracking-[0.1em]">{label}</span>
        <span className="text-[12px] sm:text-[13px] font-bold tabular-nums" style={{ color }}>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-bg-subtle overflow-hidden shadow-inner">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${value * 100}%`, backgroundColor: color, boxShadow: `0 0 12px ${color}40` }}
        />
      </div>
    </div>
  )
}
