'use client'

import Link from 'next/link'
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
  MapPinned,
  Siren,
  Wind,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useKPIHistoryStore } from '@/store/kpiHistoryStore'
import { generateCityKPIs, generateIncidents, generatePrediction } from '@/lib/engine/traffic.engine'
import { generateEventsForCity } from '@/lib/engine/events.engine'
import { fetchWeather, fetchAirQuality } from '@/lib/api/openmeteo'
import { platformConfig } from '@/config/platform.config'
import { pollutionLabel } from '@/lib/utils/congestion'
import type { CityKPIs, TrafficSnapshot, Incident } from '@/types'

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
      color: '#DC2626',
      tint: 'bg-red-50 border-red-200 text-red-700',
      chip: 'bg-red-100 text-red-700 border-red-200',
    }
  }
  if (state === 'moderate') {
    return {
      label: 'Moderate',
      color: '#F59E0B',
      tint: 'bg-amber-50 border-amber-200 text-amber-700',
      chip: 'bg-amber-100 text-amber-700 border-amber-200',
    }
  }
  return {
    label: 'Fluid',
    color: '#16A34A',
    tint: 'bg-green-50 border-green-200 text-green-700',
    chip: 'bg-green-100 text-green-700 border-green-200',
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
  if (state30 === 'critical' || state60 === 'critical') return 'Pressure likely to intensify within 30 min'
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
      title: 'Secure the incident zone',
      impact: 'high',
      urgency: 'now',
      action: `Deploy field response and route diversion around ${topIncident.address}.`,
    })
  }

  if (topEvent) {
    actions.push({
      id: `event-${topEvent.id ?? topEvent.title}`,
      title: 'Prepare event traffic plan',
      impact: topEvent.trafficIncrease >= 40 ? 'high' : 'medium',
      urgency: 'soon',
      action: `Activate pre-event traffic control near ${topEvent.venue ?? topEvent.location.address} before ${formatTime(topEvent.startDate)}.`,
    })
  }

  if (weatherImpact && weatherImpact !== 'none') {
    actions.push({
      id: 'weather',
      title: 'Adapt operations to weather drag',
      impact: weatherImpact === 'severe' ? 'high' : 'medium',
      urgency: weatherImpact === 'severe' ? 'now' : 'soon',
      action: 'Reduce response latency on exposed corridors and update roadside guidance.',
    })
  }

  actions.push({
    id: 'network',
    title: state === 'critical' ? 'Arbitrate network capacity' : 'Maintain active monitoring',
    impact: state === 'critical' ? 'high' : state === 'moderate' ? 'medium' : 'low',
    urgency: state === 'critical' ? 'now' : state === 'moderate' ? 'soon' : 'watch',
    action: state === 'critical'
      ? `Prioritize signal control and dynamic rerouting across ${cityName}'s main corridors.`
      : state === 'moderate'
        ? 'Keep the main corridors under adaptive control and watch for spillover.'
        : 'Keep the simplified view active and preserve capacity for new incidents.',
  })

  return actions.slice(0, 3)
}

function DashboardSkeleton() {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#FCFCFA]">
      <div className="mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-14">
        <div className="space-y-8">
          <div className="h-40 rounded-[32px] bg-stone-100 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 rounded-[24px] bg-stone-100 animate-pulse" />
            ))}
          </div>
          <div className="h-72 rounded-[32px] bg-stone-100 animate-pulse" />
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  const city = useMapStore(s => s.city)
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

  const detailsCount = {
    weather: openMeteoWeather ? 1 : 0,
    events: events.length,
    incidents: incidents.length,
  }

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#FCFCFA] text-stone-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 md:gap-10 md:px-10 md:py-12">

        <section className="rounded-[34px] border border-stone-200 bg-white px-6 py-7 shadow-[0_24px_60px_rgba(15,23,42,0.05)] md:px-10 md:py-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-6">
              <div className="flex items-center gap-3">
                <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]', meta.chip)}>
                  {meta.label}
                </span>
                <span className="text-[11px] uppercase tracking-[0.24em] text-stone-400">
                  {city.name}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">
                  City Status
                </p>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-stone-950 md:text-6xl">
                  {state === 'critical'
                    ? 'Immediate action needed.'
                    : state === 'moderate'
                      ? 'Watch the network closely.'
                      : 'Network stable.'}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-stone-500 md:text-lg">
                  {cause.detail}. The most impacted area is <span className="font-semibold text-stone-800">{cause.area}</span>. {predictionLabel}.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:w-[320px] lg:grid-cols-1">
              <HeroFact label="Main cause" value={cause.label} tone={state} />
              <HeroFact label="Impacted area" value={cause.area} tone={state} />
              <HeroFact label="Time outlook" value={predictionLabel} tone={state} />
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
            icon={Wind}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[32px] border border-stone-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:px-8 md:py-8">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">
                  AI Decision Panel
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-950">
                  What should I do next?
                </h2>
                <p className="max-w-xl text-sm leading-6 text-stone-500">
                  Only the next best actions are shown. Raw monitoring data stays hidden until needed.
                </p>
              </div>
              <BrainCircuit className="mt-1 h-5 w-5 text-stone-300" />
            </div>

            <div className="space-y-4">
              {actions.map((action) => (
                <ActionCard key={action.id} action={action} />
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-stone-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:px-8 md:py-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">
                  Map Context
                </p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-950">
                  Spatial preview
                </h2>
                <p className="text-sm leading-6 text-stone-500">
                  Open the map only when spatial context is needed. The default dashboard stays simplified.
                </p>
              </div>

              <div className={cn('rounded-[28px] border px-5 py-5', meta.tint)}>
                <div className="mb-5 flex items-center justify-between">
                  <MapPinned className="h-5 w-5" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">
                    {dataSource === 'live' ? 'Live' : 'Synthetic'}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">Focus</p>
                    <p className="mt-1 text-lg font-semibold text-stone-900">{cause.area}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.18em] opacity-70">Current state</p>
                    <p className="mt-1 text-sm leading-6 text-stone-700">{cause.detail}</p>
                  </div>
                </div>
              </div>

              <Link
                href="/map"
                className="inline-flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:border-stone-950 hover:text-stone-950"
              >
                Open decision map
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border border-stone-200 bg-white px-6 py-6 shadow-[0_24px_60px_rgba(15,23,42,0.04)] md:px-8 md:py-8">
          <div className="mb-6 space-y-2">
            <p className="text-[12px] font-medium uppercase tracking-[0.24em] text-stone-400">
              Details
            </p>
            <h2 className="text-2xl font-semibold tracking-[-0.03em] text-stone-950">
              Advanced context
            </h2>
            <p className="text-sm leading-6 text-stone-500">
              Secondary information is available on demand to prevent overload in the default view.
            </p>
          </div>

          <div className="space-y-4">
            <DetailSection
              title="Weather"
              count={detailsCount.weather}
              icon={CloudRain}
              defaultOpen={false}
            >
              {openMeteoWeather ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <DetailMetric label="Condition" value={`${openMeteoWeather.weatherEmoji} ${openMeteoWeather.weatherLabel}`} />
                  <DetailMetric label="Temperature" value={`${openMeteoWeather.temp}°C`} />
                  <DetailMetric label="Wind" value={`${openMeteoWeather.windSpeedKmh} km/h`} />
                  <DetailMetric label="Visibility" value={`${Math.round(openMeteoWeather.visibilityM / 1000)} km`} />
                </div>
              ) : (
                <p className="text-sm text-stone-500">Weather telemetry unavailable.</p>
              )}
            </DetailSection>

            <DetailSection
              title="Events"
              count={detailsCount.events}
              icon={CalendarClock}
              defaultOpen={false}
            >
              {events.length > 0 ? (
                <div className="space-y-3">
                  {events.slice(0, 3).map((event) => (
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

            <DetailSection
              title="Incidents"
              count={detailsCount.incidents}
              icon={Siren}
              defaultOpen={false}
            >
              {incidents.length > 0 ? (
                <div className="space-y-3">
                  {incidents.slice(0, 4).map((incident) => (
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
          </div>
        </section>
      </div>
    </main>
  )
}

function HeroFact({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: DashboardState
}) {
  const meta = stateMeta(tone)

  return (
    <div className="rounded-[22px] border border-stone-200 bg-stone-50 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-2 text-sm font-semibold leading-6 text-stone-900">{value}</p>
      <div className="mt-4 h-1.5 rounded-full bg-stone-200">
        <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: meta.color }} />
      </div>
    </div>
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
    <div className="rounded-[26px] border border-stone-200 bg-stone-50 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', actionTone(action.impact))}>
          Impact {action.impact}
        </span>
        <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]', actionTone(action.urgency))}>
          {action.urgency}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-semibold tracking-[-0.02em] text-stone-950">{action.title}</h3>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600">{action.action}</p>
      <div className="mt-5 flex items-center gap-2 text-sm font-medium text-stone-800">
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
  defaultOpen,
}: {
  title: string
  count: number
  icon: typeof AlertTriangle
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[24px] border border-stone-200 bg-stone-50 px-5 py-4"
    >
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
      <div className="pt-5">
        {children}
      </div>
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
