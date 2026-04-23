'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BrainCircuit,
  ChartLine,
  Clock3,
  Flame,
  Layers,
  MapPinned,
  Radar,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

type OperatorMode = 'dashboard' | 'control'
type TransitTab = 'metros' | 'rers' | 'tramways'
type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical'
type IncidentKind = 'accident' | 'roadwork' | 'congestion' | 'anomaly' | 'event'

type AggregatedCityPayload = {
  city_id?: string
  timestamp?: string
  traffic?: {
    average_speed?: number
    congestion_level?: 'free' | 'slow' | 'congested' | 'critical'
    incident_count?: number
    segments?: Array<{
      id?: string
      axisName?: string
      streetName?: string
      roadType?: string
      congestionScore?: number
      flowVehiclesPerHour?: number
      speedKmh?: number
      freeFlowSpeedKmh?: number
    }>
  }
}

type IntelligenceIncident = {
  id: string
  road: string
  direction: string
  location: string
  type: IncidentKind
  severity: IncidentSeverity
  timestamp: string
  source: string
  sourceLabel: string
  status: 'active' | 'finished'
  description: string
  confidence: 'high' | 'medium' | 'low'
  sources: string[]
  lat: number
  lng: number
}

type IncidentSelection = {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  type: string
  source: string
  address: string
  startedAt: string
  lng: number
  lat: number
}

type TransitLine = {
  slug: string
  type: TransitTab
  title: string
  message: string
  source?: string
}

type PriorityItem =
  | {
      id: string
      kind: 'incident'
      severity: IncidentSeverity
      title: string
      subtitle: string
      impact: string
      lat: number
      lng: number
      timestamp: string
    }
  | {
      id: string
      kind: 'line'
      severity: IncidentSeverity
      title: string
      subtitle: string
      impact: string
      lineType: TransitTab
    }

const TAB_LABEL: Record<TransitTab, string> = {
  metros: 'Metro',
  rers: 'RER',
  tramways: 'Tram',
}

const SEVERITY_STYLE: Record<IncidentSeverity, { dot: string; badge: string; text: string }> = {
  critical: { dot: 'bg-red-600', badge: 'bg-red-100 text-red-700', text: 'Critical' },
  high: { dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700', text: 'High' },
  medium: { dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700', text: 'Medium' },
  low: { dot: 'bg-emerald-500', badge: 'bg-emerald-100 text-emerald-700', text: 'Low' },
}

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-stone-100" />
}

function severityRank(value: IncidentSeverity) {
  return value === 'critical' ? 4 : value === 'high' ? 3 : value === 'medium' ? 2 : 1
}

function asSeverityFromTransitTitle(title: string, message: string): IncidentSeverity {
  const t = `${title} ${message}`.toLowerCase()
  if (t.includes('interrompu') || t.includes('suspendu')) return 'critical'
  if (t.includes('perturb')) return 'high'
  if (t.includes('ralenti') || t.includes('incident')) return 'medium'
  return 'low'
}

function lineLoadIndex(line: TransitLine): number {
  const base = asSeverityFromTransitTitle(line.title, line.message)
  if (base === 'critical') return 95
  if (base === 'high') return 82
  if (base === 'medium') return 68
  return 38
}

function congestionPercent(level?: 'free' | 'slow' | 'congested' | 'critical') {
  if (level === 'critical') return 86
  if (level === 'congested') return 68
  if (level === 'slow') return 46
  return 24
}

function networkStatusFromMetrics(avgLoadPct: number, criticalCount: number) {
  if (criticalCount >= 3 || avgLoadPct >= 78) return 'CRITICAL'
  if (criticalCount >= 1 || avgLoadPct >= 55) return 'TENSE'
  return 'NORMAL'
}

function trendLabel(current: number, previous: number | null) {
  if (previous == null) return { label: 'stable', tone: 'text-stone-500' }
  const delta = current - previous
  if (delta > 4) return { label: 'rising', tone: 'text-red-600' }
  if (delta < -4) return { label: 'falling', tone: 'text-emerald-600' }
  return { label: 'stable', tone: 'text-stone-500' }
}

function formatAge(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 'just now'
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min} min ago`
  const h = Math.floor(min / 60)
  return `${h} h ago`
}

export default function DashboardPage() {
  const city = useMapStore(s => s.city)
  const setLayer = useMapStore(s => s.setLayer)
  const setMode = useMapStore(s => s.setMode)
  const setSearchFocus = useMapStore(s => s.setSearchFocus)
  const selectSegment = useMapStore(s => s.selectSegment)

  const [operatorMode, setOperatorMode] = useState<OperatorMode>('dashboard')
  const [tab, setTab] = useState<TransitTab>('metros')
  const [snapshot, setSnapshot] = useState<AggregatedCityPayload | null>(null)
  const [incidents, setIncidents] = useState<IntelligenceIncident[]>([])
  const [lines, setLines] = useState<TransitLine[]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<IncidentSelection | null>(null)
  const [loading, setLoading] = useState(true)
  const lastLoadRef = useRef<number | null>(null)
  const mapAreaRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  const refreshRealtime = useCallback(async () => {
    controllerRef.current?.abort()
    const ctrl = new AbortController()
    controllerRef.current = ctrl

    try {
      const bbox = city.bbox.join(',')
      const [aggRes, incRes, lineRes] = await Promise.all([
        fetch(`/api/aggregation/city?city_id=${encodeURIComponent(city.id)}&bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store', signal: ctrl.signal }),
        fetch(`/api/incidents/intelligence?bbox=${encodeURIComponent(bbox)}`, { cache: 'no-store', signal: ctrl.signal }),
        fetch('/api/ratp-traffic', { cache: 'no-store', signal: ctrl.signal }),
      ])

      const [aggJson, incJson, lineJson] = await Promise.all([
        aggRes.ok ? aggRes.json() : null,
        incRes.ok ? incRes.json() : null,
        lineRes.ok ? lineRes.json() : null,
      ])

      if (ctrl.signal.aborted) return

      setSnapshot((aggJson ?? null) as AggregatedCityPayload | null)
      setIncidents(Array.isArray(incJson?.incidents) ? (incJson.incidents as IntelligenceIncident[]) : [])
      setLines(Array.isArray(lineJson?.lines) ? (lineJson.lines as TransitLine[]) : [])
      setUpdatedAt(new Date().toISOString())
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('[dashboard] realtime fetch failed', error)
      }
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [city.bbox, city.id])

  useEffect(() => {
    setMode('live')
    setLayer('traffic', true)
    setLayer('incidents', true)
    setLayer('transport', true)
    setLayer('heatmap', false)
    refreshRealtime()
    const interval = window.setInterval(refreshRealtime, 60_000)
    return () => {
      window.clearInterval(interval)
      controllerRef.current?.abort()
    }
  }, [refreshRealtime, setLayer, setMode])

  useEffect(() => {
    if (operatorMode === 'control') {
      setMode('live')
      setLayer('traffic', true)
      setLayer('incidents', true)
      setLayer('transport', true)
    }
  }, [operatorMode, setLayer, setMode])

  const avgLoadPct = useMemo(() => {
    if (lines.length > 0) {
      const sum = lines.reduce((acc, line) => acc + lineLoadIndex(line), 0)
      return Math.round(sum / Math.max(lines.length, 1))
    }
    return congestionPercent(snapshot?.traffic?.congestion_level)
  }, [lines, snapshot?.traffic?.congestion_level])

  const incidentCount = incidents.filter(item => item.status === 'active').length
  const criticalCount = incidents.filter(item => item.status === 'active' && (item.severity === 'critical' || item.severity === 'high')).length
  const networkStatus = networkStatusFromMetrics(avgLoadPct, criticalCount)
  const trend = trendLabel(avgLoadPct, lastLoadRef.current)

  useEffect(() => {
    lastLoadRef.current = avgLoadPct
  }, [avgLoadPct])

  const priorityItems = useMemo<PriorityItem[]>(() => {
    const incidentItems: PriorityItem[] = incidents
      .filter(item => item.status === 'active')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 5)
      .map(item => ({
        id: item.id,
        kind: 'incident',
        severity: item.severity,
        title: `${item.road} ${item.direction ? `- ${item.direction}` : ''}`.trim(),
        subtitle: item.description,
        impact: `${item.confidence} confidence`,
        lat: item.lat,
        lng: item.lng,
        timestamp: item.timestamp,
      }))

    const lineItems: PriorityItem[] = lines
      .filter(item => asSeverityFromTransitTitle(item.title, item.message) !== 'low')
      .slice(0, 4)
      .map(item => ({
        id: `line-${item.slug}`,
        kind: 'line',
        severity: asSeverityFromTransitTitle(item.title, item.message),
        title: `${TAB_LABEL[item.type]} ${item.slug}`,
        subtitle: item.message || item.title,
        impact: item.title,
        lineType: item.type,
      }))

    return [...incidentItems, ...lineItems]
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 5)
  }, [incidents, lines])

  const tabLines = useMemo(() => {
    return lines
      .filter(item => item.type === tab)
      .sort((a, b) => lineLoadIndex(b) - lineLoadIndex(a))
      .slice(0, 5)
  }, [lines, tab])

  const insight = useMemo(() => {
    const topIncident = incidents
      .filter(item => item.status === 'active')
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0]

    if (topIncident) {
      return `${topIncident.road} under ${SEVERITY_STYLE[topIncident.severity].text.toLowerCase()} pressure. Recommended: activate rerouting on ${topIncident.location || 'adjacent corridors'} within 15 minutes.`
    }

    if (networkStatus === 'TENSE' || networkStatus === 'CRITICAL') {
      return `Network load is ${avgLoadPct}%. Activate preventive flow regulation on top 3 constrained lines before the next peak.`
    }

    return 'Network remains stable. Keep control mode on standby and monitor incident confidence updates.'
  }, [avgLoadPct, incidents, networkStatus])

  const goToMapFocus = useCallback((incident: IntelligenceIncident) => {
    setSelectedIncident({
      id: incident.id,
      title: incident.road,
      description: incident.description,
      severity: incident.severity,
      type: incident.type,
      source: incident.sourceLabel,
      address: incident.location || incident.direction || '',
      startedAt: incident.timestamp,
      lng: incident.lng,
      lat: incident.lat,
    })
    setSearchFocus({
      id: `incident-${incident.id}`,
      label: incident.description,
      latitude: incident.lat,
      longitude: incident.lng,
      kind: 'incident',
    })
    setLayer('incidents', true)
    setLayer('traffic', true)
  }, [setLayer, setSearchFocus])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<IncidentSelection>
      if (!custom.detail?.id) return
      setSelectedIncident(custom.detail)
      setLayer('incidents', true)
    }

    window.addEventListener('cf:incident-selected', handler as EventListener)
    return () => window.removeEventListener('cf:incident-selected', handler as EventListener)
  }, [setLayer])

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-[#F7F8FA] text-stone-900">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-3 py-3 sm:px-4 sm:py-4">
        <section className="rounded-3xl border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={networkStatus} />
              <TopMetric icon={AlertTriangle} label="Active incidents" value={String(incidentCount)} />
              <TopMetric icon={Activity} label="Average load" value={`${avgLoadPct}%`} />
              <TopMetric icon={ChartLine} label="Flow trend" value={trend.label} tone={trend.tone} />
              <TopMetric icon={Clock3} label="Updated" value={updatedAt ? formatAge(updatedAt) : 'syncing'} />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => mapAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
              >
                <MapPinned className="h-4 w-4" />
                View On Map
              </button>
              <button
                onClick={() => setMode('simulate')}
                className="inline-flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
              >
                <Flame className="h-4 w-4" />
                Activate Simulation
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="grid w-full grid-cols-2 gap-1">
            <button
              onClick={() => setOperatorMode('dashboard')}
              className={cn(
                'h-10 rounded-2xl text-sm font-semibold transition-all',
                operatorMode === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              Dashboard Mode
            </button>
            <button
              onClick={() => setOperatorMode('control')}
              className={cn(
                'h-10 rounded-2xl text-sm font-semibold transition-all',
                operatorMode === 'control' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100',
              )}
            >
              Control Mode
            </button>
          </div>
        </section>

        <section className={cn('grid gap-4', operatorMode === 'control' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]')}>
          {operatorMode !== 'control' && (
            <aside className="flex min-h-[620px] flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
              <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">Critical Situation</p>
                  <Radar className="h-4 w-4 text-red-500" />
                </div>
                <div className="space-y-2">
                  {priorityItems.length === 0 && (
                    <p className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
                      No critical signal currently active.
                    </p>
                  )}
                  {priorityItems.map(item => (
                    <button
                      key={item.id}
                      onMouseEnter={() => {
                        if (item.kind === 'incident') {
                          setSearchFocus({
                            id: `hover-${item.id}`,
                            label: item.subtitle,
                            latitude: item.lat,
                            longitude: item.lng,
                            kind: 'incident',
                          })
                        }
                      }}
                      onMouseLeave={() => setSearchFocus(null)}
                      onClick={() => {
                        if (item.kind === 'incident') {
                          setSearchFocus({
                            id: `focus-${item.id}`,
                            label: item.subtitle,
                            latitude: item.lat,
                            longitude: item.lng,
                            kind: 'incident',
                          })
                          setLayer('incidents', true)
                        } else {
                          setLayer('transport', true)
                        }
                      }}
                      className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all hover:border-stone-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center gap-2">
                          <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[item.severity].dot)} />
                          <span className="text-sm font-semibold text-stone-900">{item.title}</span>
                        </div>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_STYLE[item.severity].badge)}>
                          {SEVERITY_STYLE[item.severity].text}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-stone-600">{item.subtitle}</p>
                      <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                        <span>{item.impact}</span>
                        <span>{item.kind === 'incident' ? formatAge(item.timestamp) : 'live'}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BrainCircuit className="h-4 w-4 text-stone-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Smart Insights</p>
                </div>
                <p className="text-sm leading-relaxed text-stone-700">{insight}</p>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Network Overview</p>
                  <Link href="/map" className="text-xs font-semibold text-stone-500 hover:text-stone-900">
                    View Full Network
                  </Link>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
                  {(['metros', 'rers', 'tramways'] as TransitTab[]).map(item => (
                    <button
                      key={item}
                      onClick={() => setTab(item)}
                      className={cn(
                        'h-9 rounded-lg text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                        tab === item ? 'bg-white text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-stone-500 hover:text-stone-800',
                      )}
                    >
                      {TAB_LABEL[item]}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  {tabLines.length === 0 && (
                    <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
                      No line telemetry available for this tab.
                    </p>
                  )}
                  {tabLines.map(line => {
                    const load = lineLoadIndex(line)
                    const severity = asSeverityFromTransitTitle(line.title, line.message)
                    return (
                      <button
                        key={`${line.type}-${line.slug}`}
                        onMouseEnter={() => selectSegment(null)}
                        className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all hover:border-stone-300"
                      >
                        <div className="flex items-center justify-between">
                          <div className="inline-flex items-center gap-2">
                            <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[severity].dot)} />
                            <span className="text-sm font-bold text-stone-900">{line.slug}</span>
                            <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-500">
                              {TAB_LABEL[line.type]}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-stone-800">{load}%</span>
                        </div>
                        <p className="mt-1 text-sm text-stone-600">{line.title}</p>
                        <p className="mt-1 line-clamp-1 text-xs text-stone-500">{line.message || 'No additional disruption details.'}</p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              severity === 'critical' ? 'bg-red-600' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-500',
                            )}
                            style={{ width: `${load}%` }}
                          />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-stone-600" />
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Incident Map Fusion</p>
                </div>
                <div className="space-y-2">
                  {incidents.slice(0, 5).map(incident => (
                    <button
                      key={incident.id}
                      onClick={() => goToMapFocus(incident)}
                      className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-stone-900">{incident.road}</span>
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_STYLE[incident.severity].badge)}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-stone-600">{incident.description}</p>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                        <span>{incident.sourceLabel}</span>
                        <span>{incident.confidence} confidence</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Link href="/incidents" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900">
                  Open incident intelligence
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </aside>
          )}

          <div ref={mapAreaRef} className={cn('relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]', operatorMode === 'control' ? 'h-[calc(100vh-220px)]' : 'h-[780px]')}>
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                <div className="inline-flex items-center gap-2">
                  <Zap className="h-4 w-4 text-stone-700" />
                  <p className="text-sm font-semibold text-stone-900">Real-Time Urban Map</p>
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-stone-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  {loading ? 'Syncing live layers...' : `${incidentCount} incidents live`}
                </div>
              </div>
              <div className="min-h-0 flex-1">
                <CrossFlowMap />
              </div>
            </div>
            {selectedIncident && (
              <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-[min(400px,calc(100%-2rem))]">
                <div className="pointer-events-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[selectedIncident.severity].dot)} />
                        <p className="text-sm font-bold text-stone-900">{selectedIncident.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-stone-500">{selectedIncident.type} • {selectedIncident.source}</p>
                    </div>
                    <button
                      onClick={() => setSelectedIncident(null)}
                      className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:text-stone-900"
                      aria-label="Close incident details"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-sm text-stone-700">{selectedIncident.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                    {selectedIncident.address && <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{selectedIncident.address}</span>}
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{SEVERITY_STYLE[selectedIncident.severity].text}</span>
                    <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{formatAge(selectedIncident.startedAt)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() =>
                        setSearchFocus({
                          id: `selected-${selectedIncident.id}`,
                          label: selectedIncident.description,
                          latitude: selectedIncident.lat,
                          longitude: selectedIncident.lng,
                          kind: 'incident',
                        })
                      }
                      className="inline-flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100"
                    >
                      <MapPinned className="h-3.5 w-3.5" />
                      Focus On Map
                    </button>
                    <Link href="/incidents" className="inline-flex h-9 items-center gap-1 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                      Open Incident Page
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function StatusPill({ status }: { status: 'NORMAL' | 'TENSE' | 'CRITICAL' }) {
  const style =
    status === 'CRITICAL'
      ? 'bg-red-100 text-red-700'
      : status === 'TENSE'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]', style)}>
      {status}
    </span>
  )
}

function TopMetric({
  icon: Icon,
  label,
  value,
  tone = 'text-stone-900',
}: {
  icon: typeof Activity
  label: string
  value: string
  tone?: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
      <Icon className="h-3.5 w-3.5 text-stone-500" />
      <span className="text-xs text-stone-500">{label}</span>
      <span className={cn('text-xs font-semibold', tone)}>{value}</span>
    </span>
  )
}
