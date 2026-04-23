'use client'

import dynamic from 'next/dynamic'
import { type ReactNode, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpDown,
  Clock3,
  Map,
  Search,
  Sparkles,
  TrainFront,
  Users,
  Waves,
  X,
} from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { fetchAllTrafficStatus, type LineType, type TrafficLine } from '@/lib/api/ratp'
import { cn } from '@/lib/utils/cn'
import { useMapStore } from '@/store/mapStore'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then((module) => ({ default: module.CrossFlowMap })),
  { ssr: false, loading: () => <MapSurfaceSkeleton /> },
)

type TransitFilter = 'all' | 'metros' | 'rers' | 'tramways' | 'critical'
type SortMode = 'severity' | 'load' | 'delay'
type LineSeverity = 'critical' | 'warning' | 'caution' | 'normal'

type TransitMetrics = {
  loadPct: number
  estimatedDelayMin: number
  nextArrivalMin: number
  frequencyMin: number
  passengersPerHour: number
}

type EnrichedLine = TrafficLine & {
  severity: LineSeverity
  severityScore: number
  metrics: TransitMetrics
  statusLabel: string
  incidentLabel: string | null
}

type NetworkState = 'NORMAL' | 'TENSION' | 'CRITICAL'

const FILTER_OPTIONS: Array<{ key: TransitFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'metros', label: 'Metro' },
  { key: 'rers', label: 'RER' },
  { key: 'tramways', label: 'Tram' },
  { key: 'critical', label: 'Critical' },
]

const TYPE_LABELS: Record<LineType, string> = {
  metros: 'Metro',
  rers: 'RER',
  tramways: 'Tram',
  buses: 'Bus',
  noctiliens: 'Night',
}

const ROUTE_BASES: Record<'subway' | 'train' | 'tram' | 'bus', { rushFreq: number; offFreq: number; rushCap: number; offCap: number }> = {
  subway: { rushFreq: 3, offFreq: 7, rushCap: 38000, offCap: 12000 },
  train: { rushFreq: 6, offFreq: 15, rushCap: 22000, offCap: 7000 },
  tram: { rushFreq: 5, offFreq: 10, rushCap: 5500, offCap: 2000 },
  bus: { rushFreq: 8, offFreq: 16, rushCap: 1800, offCap: 700 },
}

const compactNumber = new Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

function toRouteType(type: LineType): keyof typeof ROUTE_BASES {
  if (type === 'metros') return 'subway'
  if (type === 'rers') return 'train'
  if (type === 'tramways') return 'tram'
  return 'bus'
}

function getSeverity(line: TrafficLine): LineSeverity {
  if (line.status === 'interrompu') return 'critical'
  if (line.status === 'perturbé') return 'warning'
  if (line.status === 'travaux') return 'caution'

  const message = `${line.status} ${line.message}`.toLowerCase()
  if (message.includes('interrompu') || message.includes('suspendu')) return 'critical'
  if (message.includes('perturb') || message.includes('retard') || message.includes('delay')) return 'warning'
  if (message.includes('travaux') || message.includes('incident') || message.includes('ralenti')) return 'caution'
  return 'normal'
}

function getSeverityScore(severity: LineSeverity) {
  if (severity === 'critical') return 3
  if (severity === 'warning') return 2
  if (severity === 'caution') return 1
  return 0
}

function deriveMetrics(line: TrafficLine, now: Date, severity: LineSeverity): TransitMetrics {
  const hour = now.getHours()
  const minute = now.getMinutes()
  const isRush = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)
  const isPeak = (hour >= 10 && hour <= 12) || (hour >= 14 && hour <= 17)
  const isNight = hour < 6 || hour >= 22

  const base = ROUTE_BASES[toRouteType(line.type)]
  const frequencyMin = isNight
    ? base.offFreq * 2
    : isRush
    ? base.rushFreq
    : isPeak
    ? Math.round((base.rushFreq + base.offFreq) / 2)
    : base.offFreq

  const capacity = isNight
    ? Math.round(base.offCap * 0.4)
    : isRush
    ? base.rushCap
    : isPeak
    ? Math.round((base.rushCap + base.offCap) / 2)
    : base.offCap

  const seed = line.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) + minute
  const baseLoad = isRush ? 72 : isPeak ? 50 : isNight ? 18 : 34
  const severityBump = severity === 'critical' ? 24 : severity === 'warning' ? 16 : severity === 'caution' ? 8 : 0
  const lineBias = line.type === 'rers' ? 8 : line.type === 'metros' ? 4 : 0
  const variance = (seed % 22) - 11
  const loadPct = Math.max(8, Math.min(99, baseLoad + severityBump + lineBias + variance))
  const delayBase = severity === 'critical' ? 18 : severity === 'warning' ? 9 : severity === 'caution' ? 5 : 0
  const estimatedDelayMin = Math.max(0, delayBase + (seed % 4))
  const nextArrivalMin = Math.max(1, Math.min(frequencyMin + estimatedDelayMin, (seed % frequencyMin) + 1 + Math.floor(estimatedDelayMin / 3)))
  const passengersPerHour = Math.round(capacity * (loadPct / 100))

  return {
    loadPct,
    estimatedDelayMin,
    nextArrivalMin,
    frequencyMin,
    passengersPerHour,
  }
}

function getStatusLabel(severity: LineSeverity) {
  if (severity === 'critical') return 'Critical'
  if (severity === 'warning') return 'Delayed'
  if (severity === 'caution') return 'Watch'
  return 'Normal'
}

function getIncidentLabel(line: TrafficLine, severity: LineSeverity) {
  if (severity === 'normal') return null
  const message = line.message.trim()
  if (!message) return null
  return message.length > 84 ? `${message.slice(0, 84)}…` : message
}

function deriveNetworkState(lines: EnrichedLine[]): NetworkState {
  const critical = lines.filter((line) => line.severity === 'critical').length
  const strained = lines.filter((line) => line.severity !== 'normal' || line.metrics.loadPct >= 70).length
  const avgLoad = lines.length
    ? lines.reduce((sum, line) => sum + line.metrics.loadPct, 0) / lines.length
    : 0

  if (critical >= 2 || avgLoad >= 78 || strained >= Math.max(5, Math.round(lines.length * 0.28))) return 'CRITICAL'
  if (critical >= 1 || avgLoad >= 58 || strained >= Math.max(3, Math.round(lines.length * 0.16))) return 'TENSION'
  return 'NORMAL'
}

function sortLines(lines: EnrichedLine[], mode: SortMode) {
  const ranked = [...lines]

  ranked.sort((left, right) => {
    if (mode === 'load') {
      if (right.metrics.loadPct !== left.metrics.loadPct) return right.metrics.loadPct - left.metrics.loadPct
    } else if (mode === 'delay') {
      if (right.metrics.estimatedDelayMin !== left.metrics.estimatedDelayMin) {
        return right.metrics.estimatedDelayMin - left.metrics.estimatedDelayMin
      }
    } else {
      if (right.severityScore !== left.severityScore) return right.severityScore - left.severityScore
      if (right.metrics.loadPct !== left.metrics.loadPct) return right.metrics.loadPct - left.metrics.loadPct
      if (right.metrics.estimatedDelayMin !== left.metrics.estimatedDelayMin) {
        return right.metrics.estimatedDelayMin - left.metrics.estimatedDelayMin
      }
    }

    return left.slug.localeCompare(right.slug, undefined, { numeric: true })
  })

  return ranked
}

function matchesFilter(line: EnrichedLine, filter: TransitFilter) {
  if (filter === 'all') return line.type !== 'buses' && line.type !== 'noctiliens'
  if (filter === 'critical') return line.severity !== 'normal' || line.metrics.loadPct > 70
  return line.type === filter
}

function getNetworkTone(state: NetworkState) {
  if (state === 'CRITICAL') return 'text-[#ef4444]'
  if (state === 'TENSION') return 'text-[#f59e0b]'
  return 'text-[#22c55e]'
}

function getBadgeTone(severity: LineSeverity) {
  if (severity === 'critical') return 'bg-[#3a1518] text-[#fca5a5] border-[#7f1d1d]'
  if (severity === 'warning') return 'bg-[#402312] text-[#fdba74] border-[#9a3412]'
  if (severity === 'caution') return 'bg-[#403316] text-[#fde68a] border-[#a16207]'
  return 'bg-[#11261a] text-[#86efac] border-[#166534]'
}

export default function TransportPage() {
  const city = useMapStore((state) => state.city)
  const setMode = useMapStore((state) => state.setMode)
  const setLayer = useMapStore((state) => state.setLayer)
  const setHoveredTransitLineSlug = useMapStore((state) => state.setHoveredTransitLineSlug)
  const setFocusedTransitLineSlug = useMapStore((state) => state.setFocusedTransitLineSlug)

  const [lines, setLines] = useState<TrafficLine[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<TransitFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('severity')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [mobileMapOpen, setMobileMapOpen] = useState(false)
  const isMobile = useMediaQuery('(max-width: 1023px)')
  const mapPanelRef = useRef<HTMLDivElement | null>(null)
  const deferredQuery = useDeferredValue(query)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetchAllTrafficStatus()
      setLines(Array.isArray(response.lines) ? response.lines : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    setMode('live')
    setLayer('traffic', false)
    setLayer('transport', true)
    setLayer('incidents', true)
    setLayer('heatmap', false)
    setLayer('boundary', false)
    refresh()

    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [refresh, setLayer, setMode])

  useEffect(() => () => {
    setHoveredTransitLineSlug(null)
    setFocusedTransitLineSlug(null)
  }, [setFocusedTransitLineSlug, setHoveredTransitLineSlug])

  const enrichedLines = useMemo(() => {
    const now = new Date()
    return lines
      .filter((line) => line.type !== 'buses' && line.type !== 'noctiliens')
      .map((line) => {
        const severity = getSeverity(line)
        const metrics = deriveMetrics(line, now, severity)
        return {
          ...line,
          severity,
          severityScore: getSeverityScore(severity),
          metrics,
          statusLabel: getStatusLabel(severity),
          incidentLabel: getIncidentLabel(line, severity),
        } satisfies EnrichedLine
      })
  }, [lines])

  const networkState = useMemo(() => deriveNetworkState(enrichedLines), [enrichedLines])

  const searchedAndFilteredLines = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()
    const filtered = enrichedLines.filter((line) => {
      if (!matchesFilter(line, activeFilter)) return false
      if (!normalizedQuery) return true
      return (
        line.slug.toLowerCase().includes(normalizedQuery) ||
        line.name.toLowerCase().includes(normalizedQuery) ||
        TYPE_LABELS[line.type].toLowerCase().includes(normalizedQuery)
      )
    })

    return sortLines(filtered, sortMode)
  }, [activeFilter, deferredQuery, enrichedLines, sortMode])

  const pressureLines = useMemo(
    () =>
      sortLines(
        enrichedLines.filter((line) => line.metrics.loadPct > 70 || line.metrics.estimatedDelayMin > 0 || line.severity !== 'normal'),
        'severity',
      ).slice(0, 5),
    [enrichedLines],
  )

  const topLines = useMemo(() => searchedAndFilteredLines.slice(0, 6), [searchedAndFilteredLines])
  const selectedLine = useMemo(
    () => enrichedLines.find((line) => line.id === selectedLineId) ?? null,
    [enrichedLines, selectedLineId],
  )
  const previewLine = selectedLine ?? pressureLines[0] ?? searchedAndFilteredLines[0] ?? null

  const summary = useMemo(() => {
    const activeLines = enrichedLines.length
    const avgLoad = activeLines
      ? Math.round(enrichedLines.reduce((sum, line) => sum + line.metrics.loadPct, 0) / activeLines)
      : 0
    const alerts = enrichedLines.filter((line) => line.severity !== 'normal').length
    const passengers = enrichedLines.reduce((sum, line) => sum + line.metrics.passengersPerHour, 0)
    return { activeLines, avgLoad, alerts, passengers }
  }, [enrichedLines])

  const handleLineFocus = useCallback((line: EnrichedLine, openMapOnMobile: boolean = false) => {
    setSelectedLineId(line.id)
    setFocusedTransitLineSlug(line.slug)
    if (openMapOnMobile && isMobile) {
      setMobileMapOpen(true)
      return
    }

    if (!isMobile) {
      mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isMobile, setFocusedTransitLineSlug])

  return (
    <main className="page-scroll bg-[#f3f1eb] text-[#111318]">
      <div className="page-container space-y-6">
        <section className="rounded-[32px] border border-[#ddd9ce] bg-white px-5 py-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:px-6 lg:px-7">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6b7280]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Real-Time Control
                </div>
                <div>
                  <h1 className="text-[clamp(1.9rem,3vw,3.2rem)] font-semibold leading-[0.95] tracking-[-0.05em] text-[#111318]">
                    Transport decisions in under three seconds.
                  </h1>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5f6672] sm:text-[15px]">
                    {city.name} network command view with incident prioritization, compact operational cards, and map-linked actions.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    if (isMobile) {
                      setMobileMapOpen(true)
                    } else {
                      mapPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
                    }
                  }}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#111318] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d2129]"
                >
                  <Map className="h-4 w-4" />
                  View on map
                </button>
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#d9d4c8] bg-[#faf8f3] px-4 py-3 text-sm font-semibold text-[#111318] transition-colors hover:bg-[#f4f0e7] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Clock3 className={cn('h-4 w-4', loading && 'animate-spin')} />
                  Refresh feed
                </button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryStat title="Network status" value={networkState} tone={getNetworkTone(networkState)} subValue="Live operating posture" />
              <SummaryStat title="Active lines" value={String(summary.activeLines)} tone="text-[#111318]" subValue="Visible in command scope" />
              <SummaryStat title="Average load" value={`${summary.avgLoad}%`} tone="text-[#111318]" subValue={`${compactNumber.format(summary.passengers)} riders/hour`} />
              <SummaryStat title="Alerts count" value={String(summary.alerts)} tone={summary.alerts > 0 ? 'text-[#ef4444]' : 'text-[#22c55e]'} subValue="Delays, works, incidents" />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
          <div className="space-y-6">
            <section className="rounded-[30px] bg-[#111318] p-4 text-white shadow-[0_24px_72px_rgba(17,19,24,0.28)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Priority</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em]">Lines under pressure</h2>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/65">
                  Max 5 lines
                </div>
              </div>

              {loading && pressureLines.length === 0 ? (
                <SkeletonLoader type="card" count={3} />
              ) : pressureLines.length === 0 ? (
                <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-6 text-sm text-white/72">
                  No active pressure lines. The network is stable and within nominal load.
                </div>
              ) : (
                <div className="space-y-3">
                  {pressureLines.map((line) => (
                    <PriorityRow
                      key={line.id}
                      line={line}
                      active={selectedLine?.id === line.id}
                      onHover={setHoveredTransitLineSlug}
                      onSelect={handleLineFocus}
                    />
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[30px] border border-[#ddd9ce] bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a818d]">Operator filters</p>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#111318]">Scan only what matters</h2>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative min-w-[220px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b7280]" />
                      <input
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search line"
                        className="h-11 w-full rounded-2xl border border-[#ddd9ce] bg-[#faf8f3] pl-10 pr-10 text-sm text-[#111318] outline-none transition-colors placeholder:text-[#8b94a1] focus:border-[#111318]"
                      />
                      {query && (
                        <button
                          onClick={() => setQuery('')}
                          className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#6b7280] transition-colors hover:bg-[#ece7dc] hover:text-[#111318]"
                          aria-label="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#ddd9ce] bg-[#faf8f3] px-3 text-sm text-[#4b5563]">
                      <ArrowUpDown className="h-4 w-4" />
                      <select
                        value={sortMode}
                        onChange={(event) => setSortMode(event.target.value as SortMode)}
                        className="cursor-pointer bg-transparent font-medium text-[#111318] outline-none"
                      >
                        <option value="severity">Sort by severity</option>
                        <option value="load">Sort by load</option>
                        <option value="delay">Sort by delay</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {FILTER_OPTIONS.map((option) => {
                    const count =
                      option.key === 'all'
                        ? enrichedLines.length
                        : option.key === 'critical'
                        ? enrichedLines.filter((line) => line.severity !== 'normal' || line.metrics.loadPct > 70).length
                        : enrichedLines.filter((line) => line.type === option.key).length

                    return (
                      <button
                        key={option.key}
                        onClick={() => setActiveFilter(option.key)}
                        className={cn(
                          'inline-flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all',
                          activeFilter === option.key
                            ? 'border-[#111318] bg-[#111318] text-white'
                            : 'border-[#ddd9ce] bg-[#faf8f3] text-[#4b5563] hover:border-[#bcb4a5] hover:bg-[#f3eee4] hover:text-[#111318]',
                        )}
                      >
                        {option.label}
                        <span className={cn('rounded-full px-2 py-0.5 text-xs', activeFilter === option.key ? 'bg-white/12 text-white/80' : 'bg-[#ece7dc] text-[#6b7280]')}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#ddd9ce] bg-white p-4 shadow-[0_16px_42px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a818d]">Top lines</p>
                  <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#111318]">Six lines. Zero clutter.</h2>
                </div>
                <button
                  onClick={() => startTransition(() => setExpanded((value) => !value))}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#ddd9ce] bg-[#faf8f3] px-4 py-2 text-sm font-semibold text-[#111318] transition-colors hover:bg-[#f3eee4]"
                >
                  {expanded ? 'Collapse list' : 'View all lines'}
                </button>
              </div>

              {loading && topLines.length === 0 ? (
                <SkeletonLoader type="card" count={6} />
              ) : topLines.length === 0 ? (
                <EmptyState
                  icon=" "
                  title="No matching lines"
                  description="Adjust the active filter or search query to restore the line list."
                />
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {topLines.map((line) => (
                    <CompactLineCard
                      key={line.id}
                      line={line}
                      active={selectedLine?.id === line.id}
                      onHover={setHoveredTransitLineSlug}
                      onSelect={handleLineFocus}
                    />
                  ))}
                </div>
              )}

              {expanded && searchedAndFilteredLines.length > 6 && (
                <div className="mt-5 border-t border-[#ece7dc] pt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a818d]">All lines</p>
                      <p className="mt-1 text-sm text-[#5f6672]">Virtualized list for long networks and mobile-safe scrolling.</p>
                    </div>
                    <div className="rounded-full bg-[#f4efe6] px-3 py-1 text-xs font-medium text-[#5f6672]">
                      {searchedAndFilteredLines.length} lines
                    </div>
                  </div>
                  <VirtualizedLineList
                    lines={searchedAndFilteredLines}
                    activeLineId={selectedLine?.id ?? null}
                    onHover={setHoveredTransitLineSlug}
                    onSelect={handleLineFocus}
                  />
                </div>
              )}
            </section>
          </div>

          <aside className="hidden xl:block">
            <div ref={mapPanelRef} className="sticky top-6 space-y-4">
              <MapPanel
                selectedLine={previewLine}
                onOpenFullscreen={() => setMobileMapOpen(true)}
              />
            </div>
          </aside>
        </div>
      </div>

      <BottomSheet
        isOpen={Boolean(isMobile && selectedLine && !mobileMapOpen)}
        title={selectedLine ? `Line ${selectedLine.slug}` : undefined}
        onClose={() => setSelectedLineId(null)}
        className="xl:hidden bg-[#111318] text-white"
      >
        {selectedLine && (
          <div className="space-y-4">
            <MobileLineSummary line={selectedLine} />
            <button
              onClick={() => setMobileMapOpen(true)}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-[#111318] transition-colors hover:bg-[#f2f4f7]"
            >
              <Map className="h-4 w-4" />
              Open fullscreen map
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        isOpen={mobileMapOpen}
        title="Transport map"
        onClose={() => setMobileMapOpen(false)}
        className="xl:hidden bg-[#0e1116] text-white"
      >
        <div className="space-y-4">
          <div className="overflow-hidden rounded-[24px] border border-white/10">
            <div className="h-[58vh] min-h-[420px] bg-[#f4f4f0]">
              <CrossFlowMap />
            </div>
          </div>
          {selectedLine && <MobileLineSummary line={selectedLine} compact />}
        </div>
      </BottomSheet>
    </main>
  )
}

function SummaryStat({
  title,
  value,
  tone,
  subValue,
}: {
  title: string
  value: string
  tone: string
  subValue: string
}) {
  return (
    <div className="rounded-[24px] border border-[#ece7dc] bg-[#faf8f3] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a818d]">{title}</p>
      <p className={cn('mt-3 text-[clamp(1.6rem,2vw,2.25rem)] font-semibold tracking-[-0.05em]', tone)}>{value}</p>
      <p className="mt-2 text-sm text-[#5f6672]">{subValue}</p>
    </div>
  )
}

function PriorityRow({
  line,
  active,
  onHover,
  onSelect,
}: {
  line: EnrichedLine
  active: boolean
  onHover: (slug: string | null) => void
  onSelect: (line: EnrichedLine, openMapOnMobile?: boolean) => void
}) {
  return (
    <button
      onMouseEnter={() => onHover(line.slug)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(line.slug)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(line, true)}
      className={cn(
        'grid w-full cursor-pointer gap-3 rounded-[24px] border px-4 py-4 text-left transition-all',
        active ? 'border-white/20 bg-white/[0.08]' : 'border-white/10 bg-white/[0.04] hover:border-white/16 hover:bg-white/[0.07]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <LineBadge line={line} />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">{line.name}</span>
              <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', getBadgeTone(line.severity))}>
                {line.statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/62">{TYPE_LABELS[line.type]} · {line.metrics.estimatedDelayMin} min delay · {line.metrics.loadPct}% load</p>
          </div>
        </div>
        <AlertTriangle className={cn('h-4 w-4 flex-shrink-0', line.severity === 'critical' ? 'text-[#f87171]' : line.severity === 'warning' ? 'text-[#fb923c]' : 'text-[#facc15]')} />
      </div>
      {line.incidentLabel && <p className="text-sm leading-6 text-white/74">{line.incidentLabel}</p>}
    </button>
  )
}

function CompactLineCard({
  line,
  active,
  onHover,
  onSelect,
}: {
  line: EnrichedLine
  active: boolean
  onHover: (slug: string | null) => void
  onSelect: (line: EnrichedLine, openMapOnMobile?: boolean) => void
}) {
  const loadColor =
    line.metrics.loadPct >= 85 ? '#ef4444' : line.metrics.loadPct >= 70 ? '#f97316' : line.metrics.loadPct >= 45 ? '#eab308' : '#22c55e'

  return (
    <button
      onMouseEnter={() => onHover(line.slug)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(line.slug)}
      onBlur={() => onHover(null)}
      onClick={() => onSelect(line, true)}
      className={cn(
        'cursor-pointer rounded-[26px] border bg-[#111318] p-4 text-left text-white transition-all',
        active ? 'border-[#2b3443] shadow-[0_18px_40px_rgba(17,19,24,0.22)]' : 'border-[#1e232c] hover:border-[#313744] hover:-translate-y-0.5',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <LineBadge line={line} />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{TYPE_LABELS[line.type]}</p>
            <h3 className="truncate text-base font-semibold">{line.name}</h3>
          </div>
        </div>
        <span className={cn('rounded-full border px-2 py-1 text-[11px] font-semibold', getBadgeTone(line.severity))}>
          {line.statusLabel}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MetricCell label="Passengers/h" value={compactNumber.format(line.metrics.passengersPerHour)} />
        <MetricCell label="Frequency" value={`${line.metrics.frequencyMin} min`} />
        <MetricCell label="Next" value={`${line.metrics.nextArrivalMin} min`} />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-white/60">Load</span>
          <span className="font-semibold" style={{ color: loadColor }}>{line.metrics.loadPct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${line.metrics.loadPct}%`, backgroundColor: loadColor }}
          />
        </div>
      </div>

      {line.incidentLabel && <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/62">{line.incidentLabel}</p>}
    </button>
  )
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] bg-white/[0.05] px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

function LineBadge({ line }: { line: EnrichedLine }) {
  const textColor = getContrastColor(line.color)
  return (
    <div
      className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
      style={{ backgroundColor: line.color, color: textColor }}
    >
      {line.slug}
    </div>
  )
}

function MobileLineSummary({ line, compact = false }: { line: EnrichedLine; compact?: boolean }) {
  return (
    <div className={cn('rounded-[24px] border border-white/10 bg-white/[0.04] p-4', compact && 'p-3')}>
      <div className="flex items-center gap-3">
        <LineBadge line={line} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">{TYPE_LABELS[line.type]}</p>
          <h3 className="text-base font-semibold text-white">{line.name}</h3>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/72">
        <DetailCell icon={<Users className="h-4 w-4" />} label="Passengers/h" value={compactNumber.format(line.metrics.passengersPerHour)} />
        <DetailCell icon={<Waves className="h-4 w-4" />} label="Load" value={`${line.metrics.loadPct}%`} />
        <DetailCell icon={<Clock3 className="h-4 w-4" />} label="Frequency" value={`${line.metrics.frequencyMin} min`} />
        <DetailCell icon={<TrainFront className="h-4 w-4" />} label="Next arrival" value={`${line.metrics.nextArrivalMin} min`} />
      </div>
      {line.incidentLabel && <p className="mt-4 text-sm leading-6 text-white/68">{line.incidentLabel}</p>}
    </div>
  )
}

function DetailCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[18px] bg-white/[0.04] px-3 py-3">
      <div className="flex items-center gap-2 text-white/45">
        {icon}
        <span className="text-xs uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="mt-2 text-base font-semibold text-white">{value}</div>
    </div>
  )
}

function MapPanel({
  selectedLine,
  onOpenFullscreen,
}: {
  selectedLine: EnrichedLine | null
  onOpenFullscreen: () => void
}) {
  return (
    <section className="overflow-hidden rounded-[30px] border border-[#ddd9ce] bg-white shadow-[0_20px_52px_rgba(15,23,42,0.09)]">
      <div className="flex items-center justify-between border-b border-[#ece7dc] px-5 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7a818d]">Map sync</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[#111318]">
            {selectedLine ? `Focused on line ${selectedLine.slug}` : 'Transit network map'}
          </h2>
        </div>
        <button
          onClick={onOpenFullscreen}
          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-[#ddd9ce] bg-[#faf8f3] px-3 py-2 text-sm font-semibold text-[#111318] transition-colors hover:bg-[#f3eee4]"
        >
          <Map className="h-4 w-4" />
          Fullscreen
        </button>
      </div>

      <div className="h-[520px] bg-[#f4f4f0]">
        <CrossFlowMap />
      </div>

      <div className="border-t border-[#ece7dc] bg-[#faf8f3] px-5 py-4">
        <p className="text-sm leading-6 text-[#5f6672]">
          Hover a line card to highlight its route. Click a card to fit the route on the map and keep incidents in view.
        </p>
      </div>
    </section>
  )
}

function VirtualizedLineList({
  lines,
  activeLineId,
  onHover,
  onSelect,
}: {
  lines: EnrichedLine[]
  activeLineId: string | null
  onHover: (slug: string | null) => void
  onSelect: (line: EnrichedLine, openMapOnMobile?: boolean) => void
}) {
  const rowHeight = 92
  const overscan = 4
  const isMobile = useMediaQuery('(max-width: 767px)')
  const containerHeight = isMobile ? 420 : 520
  const [scrollTop, setScrollTop] = useState(0)

  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan)
  const visibleCount = Math.ceil(containerHeight / rowHeight) + overscan * 2
  const endIndex = Math.min(lines.length, startIndex + visibleCount)
  const visibleLines = lines.slice(startIndex, endIndex)
  const topSpacerHeight = startIndex * rowHeight
  const bottomSpacerHeight = Math.max(0, (lines.length - endIndex) * rowHeight)

  return (
    <div
      className="overflow-y-auto rounded-[24px] border border-[#ece7dc] bg-[#faf8f3]"
      style={{ height: containerHeight }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: topSpacerHeight }} />
      <div className="space-y-2 p-2">
        {visibleLines.map((line) => (
          <button
            key={line.id}
            onMouseEnter={() => onHover(line.slug)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(line.slug)}
            onBlur={() => onHover(null)}
            onClick={() => onSelect(line, true)}
            className={cn(
              'grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[18px] border px-3 py-3 text-left transition-colors',
              activeLineId === line.id
                ? 'border-[#111318] bg-white'
                : 'border-transparent bg-transparent hover:border-[#ddd9ce] hover:bg-white',
            )}
            style={{ minHeight: rowHeight - 8 }}
          >
            <LineBadge line={line} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-[#111318]">{line.name}</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[11px] font-semibold', getBadgeTone(line.severity))}>
                  {line.statusLabel}
                </span>
              </div>
              <p className="mt-1 truncate text-sm text-[#5f6672]">
                {TYPE_LABELS[line.type]} · {line.metrics.passengersPerHour.toLocaleString('en-US')} passengers/h · {line.metrics.frequencyMin} min headway
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-[#111318]">{line.metrics.loadPct}%</p>
              <p className="text-xs text-[#7a818d]">{line.metrics.estimatedDelayMin} min delay</p>
            </div>
          </button>
        ))}
      </div>
      <div style={{ height: bottomSpacerHeight }} />
    </div>
  )
}

function MapSurfaceSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#f4f4f0]">
      <div className="space-y-3 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-[#111318] border-t-transparent" />
        <p className="text-sm text-[#6b7280]">Loading transport map</p>
      </div>
    </div>
  )
}

function getContrastColor(hex: string) {
  const normalized = hex.replace('#', '')
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => `${char}${char}`).join('')
    : normalized
  const r = parseInt(safe.slice(0, 2), 16)
  const g = parseInt(safe.slice(2, 4), 16)
  const b = parseInt(safe.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.6 ? '#111318' : '#f8fafc'
}
