'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Clock3,
  CloudRain,
  Leaf,
  Siren,
  Wind,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { generateCityKPIs, generateIncidents, generatePrediction } from '@/lib/engine/traffic.engine'
import { generateEventsForCity } from '@/lib/engine/events.engine'
import { fetchAirQuality, fetchWeather } from '@/lib/api/openmeteo'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'
import type { CityKPIs, Incident, TrafficSnapshot } from '@/types'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

type DashboardState = 'fluid' | 'moderate' | 'critical'
type ActionImpact = 'high' | 'medium' | 'low'
type ActionUrgency = 'now' | 'soon' | 'watch'

type DecisionAction = {
  id: string
  title: string
  impact: ActionImpact
  urgency: ActionUrgency
  action: string
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

function getDashboardState(rate: number): DashboardState {
  if (rate < 0.3) return 'fluid'
  if (rate < 0.65) return 'moderate'
  return 'critical'
}

function stateMeta(state: DashboardState) {
  if (state === 'critical') {
    return {
      label: 'Critical',
      chip: 'bg-red-100 text-red-700 border-red-200',
      soft: 'bg-red-50 border-red-200',
      accent: '#DC2626',
    }
  }
  if (state === 'moderate') {
    return {
      label: 'Moderate',
      chip: 'bg-amber-100 text-amber-700 border-amber-200',
      soft: 'bg-amber-50 border-amber-200',
      accent: '#F59E0B',
    }
  }
  return {
    label: 'Fluid',
    chip: 'bg-green-100 text-green-700 border-green-200',
    soft: 'bg-green-50 border-green-200',
    accent: '#16A34A',
  }
}

function actionTone(value: ActionImpact | ActionUrgency) {
  if (value === 'high' || value === 'now') return 'bg-red-50 text-red-700 border-red-200'
  if (value === 'medium' || value === 'soon') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-green-50 text-green-700 border-green-200'
}

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function getMainCause(topIncident: Incident | undefined, topEvent: any, congestionRate: number) {
  if (topIncident && (topIncident.severity === 'critical' || topIncident.severity === 'high')) {
    return {
      label: 'Incident',
      detail: topIncident.title,
      area: topIncident.address || 'Priority corridor',
    }
  }
  if (topEvent) {
    return {
      label: 'Event',
      detail: topEvent.title,
      area: topEvent.venue ?? topEvent.location.address ?? 'Event zone',
    }
  }
  return {
    label: 'Congestion',
    detail: congestionRate > 0.5 ? 'Peak demand across main corridors' : 'Localized pressure on main roads',
    area: 'Primary network',
  }
}

function getPredictionLabel(now: DashboardState, p30: number, p60: number) {
  const state30 = getDashboardState(p30)
  const state60 = getDashboardState(p60)

  if (now === 'critical' && state60 !== 'critical') return 'Recovery expected within 60 min'
  if (state30 === 'critical' || state60 === 'critical') return 'Peak expected within 1 hour'
  if (state30 === 'moderate' || state60 === 'moderate') return 'Moderate pressure expected for the next hour'
  return 'Stable for the next 60 min'
}

function buildDecisionActions({
  state,
  topEvent,
  topIncident,
  weatherImpact,
  cityName,
}: {
  state: DashboardState
  topEvent: any
  topIncident: Incident | undefined
  weatherImpact: 'none' | 'minor' | 'moderate' | 'severe' | undefined
  cityName: string
}): DecisionAction[] {
  const actions: DecisionAction[] = []

  if (topIncident && (topIncident.severity === 'critical' || topIncident.severity === 'high')) {
    actions.push({
      id: `incident-${topIncident.id}`,
      title: 'Secure incident zone',
      impact: 'high',
      urgency: 'now',
      action: `Deploy field response and rerouting around ${topIncident.address}.`,
    })
  }

  if (topEvent) {
    actions.push({
      id: `event-${topEvent.id ?? topEvent.title}`,
      title: 'Prepare event traffic plan',
      impact: topEvent.trafficIncrease >= 40 ? 'high' : 'medium',
      urgency: 'soon',
      action: `Activate traffic control near ${topEvent.venue ?? topEvent.location.address} before ${formatTime(topEvent.startDate)}.`,
    })
  }

  if (weatherImpact && weatherImpact !== 'none') {
    actions.push({
      id: 'weather',
      title: 'Adapt to weather drag',
      impact: weatherImpact === 'severe' ? 'high' : 'medium',
      urgency: weatherImpact === 'severe' ? 'now' : 'soon',
      action: 'Reduce response latency on exposed corridors and update roadside guidance.',
    })
  }

  actions.push({
    id: 'network',
    title: state === 'critical' ? 'Prepare traffic rerouting' : state === 'moderate' ? 'Maintain active monitoring' : 'No action required',
    impact: state === 'critical' ? 'high' : state === 'moderate' ? 'medium' : 'low',
    urgency: state === 'critical' ? 'now' : state === 'moderate' ? 'soon' : 'watch',
    action: state === 'critical'
      ? `Prioritize signal control and dynamic rerouting across ${cityName}'s main corridors.`
      : state === 'moderate'
        ? 'Keep corridor regulation adaptive and watch for spillover.'
        : 'Maintain monitoring and preserve response capacity.',
  })

  return actions.slice(0, 3)
}

function buildHeroAction({
  state,
  cause,
  predictionLabel,
  action,
}: {
  state: DashboardState
  cause: { detail: string; area: string }
  predictionLabel: string
  action: DecisionAction | undefined
}) {
  const stateText =
    state === 'critical'
      ? 'Critical congestion detected'
      : state === 'moderate'
        ? 'Moderate congestion detected'
        : 'Fluid traffic detected'

  return `${stateText} in ${cause.area}. ${predictionLabel}. Action recommended: ${action?.title.toLowerCase() ?? 'maintain monitoring'}.`
}

function DashboardSkeleton() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#FCFCFA]">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div className="space-y-6">
          <div className="h-40 rounded-[32px] bg-stone-100 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-24 rounded-[24px] bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="h-[480px] rounded-[32px] bg-stone-100 animate-pulse" />
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  const city = useMapStore(s => s.city)
  const setMode = useMapStore(s => s.setMode)
  const setLayer = useMapStore(s => s.setLayer)
  const kpis = useTrafficStore(s => s.kpis)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  const setIncidents = useTrafficStore(s => s.setIncidents)
  const snapshot = useTrafficStore(s => s.snapshot)
  const incidents = useTrafficStore(s => s.incidents)
  const dataSource = useTrafficStore(s => s.dataSource)
  const openMeteoWeather = useTrafficStore(s => s.openMeteoWeather)
  const setOpenMeteoWeather = useTrafficStore(s => s.setOpenMeteoWeather)
  const airQuality = useTrafficStore(s => s.airQuality)
  const setAirQuality = useTrafficStore(s => s.setAirQuality)
  const addSnapshot = useKPIHistoryStore(s => s.addSnapshot)

  useEffect(() => {
    setMode('live')
    setLayer('traffic', true)
    setLayer('heatmap', false)
    setLayer('incidents', false)
    setLayer('boundary', true)
  }, [setLayer, setMode, city.id])

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
    if (!snapshot || dataSource !== 'live') return
    const base = generateCityKPIs(city)
    setKPIs(kpisFromSnapshot(city.id, snapshot, incidents.length, base))
  }, [snapshot, dataSource, city, incidents.length, setKPIs])

  useEffect(() => {
    if (kpis) addSnapshot(kpis)
  }, [kpis, addSnapshot])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [weather, aq] = await Promise.all([
        fetchWeather(city.center.lat, city.center.lng),
        fetchAirQuality(city.center.lat, city.center.lng),
      ])

      if (!cancelled) {
        setOpenMeteoWeather(weather)
        setAirQuality(aq)
      }
    }

    load()
    const interval = setInterval(load, 5 * 60 * 1000)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [city.center.lat, city.center.lng, setOpenMeteoWeather, setAirQuality])

  if (!kpis) return <DashboardSkeleton />

  const state = getDashboardState(kpis.congestionRate)
  const meta = stateMeta(state)
  const congestionPct = Math.round(kpis.congestionRate * 100)
  const pollution = pollutionLabel(kpis.pollutionIndex)
  const events = useMemo(() => generateEventsForCity(city).slice(0, 4), [city])
  const topEvent = events[0]
  const topIncident = incidents[0]
  const cause = getMainCause(topIncident, topEvent, kpis.congestionRate)
  const prediction30 = useMemo(() => generatePrediction(city, 30), [city])
  const prediction60 = useMemo(() => generatePrediction(city, 60), [city])
  const predictionLabel = getPredictionLabel(state, prediction30.globalCongestion, prediction60.globalCongestion)
  const actions = buildDecisionActions({
    state,
    topEvent,
    topIncident,
    weatherImpact: openMeteoWeather?.trafficImpact,
    cityName: city.name,
  })
  const heroAction = buildHeroAction({ state, cause, predictionLabel, action: actions[0] })

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#FCFCFA] text-stone-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:gap-8 md:px-8 md:py-8">

        <section className="rounded-[32px] border border-stone-200 bg-white px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.05)] md:px-8 md:py-7">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]', meta.chip)}>
                {meta.label}
              </span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{city.name}</span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-stone-300">•</span>
              <span className="text-[11px] uppercase tracking-[0.24em] text-stone-400">{dataSource === 'live' ? 'Live' : 'Synthetic'}</span>
            </div>

            <div className="space-y-3">
              <h1 className="max-w-5xl text-3xl font-semibold tracking-[-0.05em] text-stone-950 md:text-5xl">
                {heroAction}
              </h1>
              <div className="flex flex-wrap gap-2.5">
                <HeroChip icon={AlertTriangle} label={cause.label} />
                <HeroChip icon={CalendarClock} label={cause.area} />
                <HeroChip icon={ChevronRight} label={predictionLabel} />
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Congestion"
            value={`${congestionPct}%`}
            sub={state === 'critical' ? 'Network saturated' : state === 'moderate' ? 'Localized pressure' : 'Traffic fluid'}
            tone={state}
            icon={Activity}
          />
          <MetricCard
            label="Travel time"
            value={`${kpis.avgTravelMin.toFixed(0)} min`}
            sub="Average city trip"
            tone={kpis.avgTravelMin >= platformConfig.kpi.targets.avg_travel_time_min.critical ? 'critical' : kpis.avgTravelMin >= platformConfig.kpi.targets.avg_travel_time_min.warning ? 'moderate' : 'fluid'}
            icon={Clock3}
          />
          <MetricCard
            label="Environmental impact"
            value={`${kpis.pollutionIndex.toFixed(1)} / 10`}
            sub={pollution.label}
            tone={kpis.pollutionIndex >= platformConfig.kpi.targets.pollution_index.critical ? 'critical' : kpis.pollutionIndex >= platformConfig.kpi.targets.pollution_index.warning ? 'moderate' : 'fluid'}
            icon={Leaf}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.56fr_0.44fr]">
          <div className="order-2 xl:order-1">
            <div className="rounded-[32px] border border-stone-200 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:p-4">
              <div className="mb-3 flex items-center justify-between px-2">
                <div>
                  <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">Live map</p>
                  <p className="mt-1 text-sm text-stone-500">Roads and traffic always visible.</p>
                </div>
              </div>
              <div className="relative overflow-hidden rounded-[26px] border border-stone-200 bg-[#F8F8F5]">
                <div className="h-[420px] md:h-[520px] xl:h-[640px]">
                  <CrossFlowMap />
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 xl:order-2 flex flex-col gap-5">
            <section className="rounded-[32px] border border-stone-200 bg-white px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:px-6 md:py-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">AI Decision Panel</p>
                  <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-950">What should I do now?</h2>
                </div>
                <BrainCircuit className="mt-1 h-5 w-5 text-stone-300" />
              </div>
              <div className="space-y-3">
                {actions.map(action => (
                  <ActionCard key={action.id} action={action} />
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-stone-200 bg-white px-5 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:px-6 md:py-6">
              <div className="mb-5 space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">Advanced context</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-950">Details on demand</h2>
              </div>

              <div className="space-y-3">
                <DetailSection title="Weather" count={openMeteoWeather ? 1 : 0} icon={CloudRain}>
                  {openMeteoWeather ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailMetric label="Condition" value={`${openMeteoWeather.weatherEmoji} ${openMeteoWeather.weatherLabel}`} />
                      <DetailMetric label="Temperature" value={`${openMeteoWeather.temp}°C`} />
                      <DetailMetric label="Wind" value={`${openMeteoWeather.windSpeedKmh} km/h`} />
                      <DetailMetric label="Visibility" value={`${Math.round(openMeteoWeather.visibilityM / 1000)} km`} />
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">Weather telemetry unavailable.</p>
                  )}
                </DetailSection>

                <DetailSection title="Events" count={events.length} icon={CalendarClock}>
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {events.slice(0, 3).map(event => (
                        <ListRow
                          key={event.id ?? event.title}
                          title={event.title}
                          subtitle={`${event.venue ?? event.location.address} · ${formatTime(event.startDate)}`}
                          meta={`+${event.trafficIncrease ?? Math.round(event.trafficScore * 100)}%`}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No major event pressure detected.</p>
                  )}
                </DetailSection>

                <DetailSection title="Incidents" count={incidents.length} icon={Siren}>
                  {incidents.length > 0 ? (
                    <div className="space-y-3">
                      {incidents.slice(0, 4).map(incident => (
                        <ListRow
                          key={incident.id}
                          title={incident.title}
                          subtitle={incident.address}
                          meta={incident.severity}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-stone-500">No active incident requiring review.</p>
                  )}
                </DetailSection>

                {airQuality && (
                  <DetailSection title="Air quality" count={1} icon={Wind}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DetailMetric label="AQI" value={`${airQuality.level} (${Math.round(airQuality.aqiEuropean)})`} />
                      <DetailMetric label="Traffic impact" value={airQuality.trafficImpact > 0 ? `+${Math.round(airQuality.trafficImpact * 100)}% drag` : 'None'} />
                    </div>
                  </DetailSection>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  )
}

function MapSkeleton() {
  return <div className="h-full w-full bg-stone-100 animate-pulse" />
}

function HeroChip({ icon: Icon, label }: { icon: typeof AlertTriangle; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-[12px] font-medium text-stone-700">
      <Icon className="h-3.5 w-3.5 text-stone-400" />
      {label}
    </span>
  )
}

function MetricCard({
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  label: string
  value: string
  sub: string
  tone: DashboardState
  icon: typeof Activity
}) {
  const meta = stateMeta(tone)

  return (
    <div className="rounded-[28px] border border-stone-200 bg-white px-5 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{value}</p>
          <p className="mt-2 text-sm leading-6 text-stone-500">{sub}</p>
        </div>
        <div className={cn('rounded-2xl border p-3', meta.chip)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function ActionCard({ action }: { action: DecisionAction }) {
  return (
    <div className="rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', actionTone(action.impact))}>
          {action.impact}
        </span>
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', actionTone(action.urgency))}>
          {action.urgency}
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold tracking-[-0.02em] text-stone-950">{action.title}</h3>
      <p className="mt-2 text-sm leading-6 text-stone-600">{action.action}</p>
      <div className="mt-3 flex items-center gap-2 text-sm font-medium text-stone-800">
        <ArrowRight className="h-4 w-4" />
        Recommended action
      </div>
    </div>
  )
}

function DetailSection({
  title,
  count,
  icon: Icon,
  children,
}: {
  title: string
  count: number
  icon: typeof AlertTriangle
  children: React.ReactNode
}) {
  return (
    <details className="group rounded-[24px] border border-stone-200 bg-stone-50 px-4 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-stone-200 bg-white p-2.5">
            <Icon className="h-4 w-4 text-stone-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">{title}</p>
            <p className="text-xs uppercase tracking-[0.18em] text-stone-400">{count} item{count > 1 ? 's' : ''}</p>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-stone-400 transition-transform group-open:rotate-90" />
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  )
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-stone-200 bg-white px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-stone-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-stone-900">{value}</p>
    </div>
  )
}

function ListRow({
  title,
  subtitle,
  meta,
}: {
  title: string
  subtitle: string
  meta: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-stone-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      </div>
      <span className="inline-flex rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600">
        {meta}
      </span>
    </div>
  )
}
