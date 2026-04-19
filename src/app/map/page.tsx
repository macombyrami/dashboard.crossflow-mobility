'use client'

import { useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import { AlertTriangle, Gauge, MapPinned, Radar, Route, ShieldAlert, Waves } from 'lucide-react'

import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import type { Incident, TrafficSegment } from '@/types'
import { cn } from '@/lib/utils/cn'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => m.CrossFlowMap),
  { ssr: false },
)

type ZoneCard = {
  id: string
  label: string
  avgCongestion: number
  avgSpeed: number | null
  incidentCount: number
  segmentCount: number
  primarySegmentId: string | null
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function computeDisplaySpeed(segments: TrafficSegment[], congestionRate: number, status?: 'fluid' | 'moderate' | 'critical'): number | null {
  if (segments.length === 0) return null

  const rawSpeed = average(segments.map(segment => segment.speedKmh).filter(speed => Number.isFinite(speed) && speed > 0))
  if (rawSpeed >= 5) return Math.round(rawSpeed)

  const freeFlow = average(segments.map(segment => segment.freeFlowSpeedKmh).filter(speed => Number.isFinite(speed) && speed > 0))
  if (freeFlow <= 0) return null

  const estimated = freeFlow * (1 - Math.min(0.78, congestionRate * 0.62))
  const floor = status === 'fluid' ? 18 : status === 'moderate' ? 12 : 8
  return Math.max(floor, Math.round(estimated))
}

function zoneKey(segment: TrafficSegment): string {
  return segment.arrondissement || segment.axisName || segment.streetName || 'Network core'
}

function deriveZones(segments: TrafficSegment[], incidents: Incident[], trafficStatus?: 'fluid' | 'moderate' | 'critical'): ZoneCard[] {
  const groups = new Map<string, TrafficSegment[]>()
  for (const segment of segments) {
    const key = zoneKey(segment)
    const list = groups.get(key)
    if (list) list.push(segment)
    else groups.set(key, [segment])
  }

  return [...groups.entries()]
    .map(([label, zoneSegments]) => {
      const strongest = [...zoneSegments].sort((a, b) => b.congestionScore - a.congestionScore)[0] ?? null
      const lowerLabel = label.toLowerCase()
      const incidentCount = incidents.filter(incident =>
        incident.address?.toLowerCase().includes(lowerLabel) ||
        incident.title?.toLowerCase().includes(lowerLabel)
      ).length
      const avgCongestion = average(zoneSegments.map(segment => segment.congestionScore))

      return {
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        avgCongestion,
        avgSpeed: computeDisplaySpeed(zoneSegments, avgCongestion, trafficStatus),
        incidentCount,
        segmentCount: zoneSegments.length,
        primarySegmentId: strongest?.id ?? null,
      }
    })
    .sort((a, b) => (b.avgCongestion * 0.82 + b.incidentCount * 0.08) - (a.avgCongestion * 0.82 + a.incidentCount * 0.08))
    .slice(0, 4)
}

function toneClass(status: 'fluid' | 'moderate' | 'critical' | undefined) {
  if (status === 'critical') return 'text-[#FF8A6B] border-[#FF8A6B]/30 bg-[#FF8A6B]/10'
  if (status === 'moderate') return 'text-[#FFD166] border-[#FFD166]/30 bg-[#FFD166]/10'
  return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10'
}

function congestionLabel(score: number) {
  if (score >= 0.72) return 'Critical'
  if (score >= 0.42) return 'Dense'
  if (score >= 0.2) return 'Moderate'
  return 'Fluid'
}

export default function MapPage() {
  const city = useMapStore(s => s.city)
  const setLayer = useMapStore(s => s.setLayer)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)
  const selectSegment = useMapStore(s => s.selectSegment)
  const highlightedZoneLabel = useMapStore(s => s.highlightedZoneLabel)
  const setHighlightedZoneLabel = useMapStore(s => s.setHighlightedZoneLabel)
  const snapshot = useTrafficStore(s => s.snapshot)
  const incidents = useTrafficStore(s => s.incidents)
  const trafficSummary = useTrafficStore(s => s.trafficSummary)
  const dataSource = useTrafficStore(s => s.dataSource)
  const didInitLayers = useRef(false)

  useEffect(() => {
    document.title = `${city.name} live traffic | CrossFlow`
  }, [city.name])

  useEffect(() => {
    if (didInitLayers.current) return
    didInitLayers.current = true
    setLayer('traffic', true)
    setLayer('incidents', true)
    setLayer('flow', true)
    setLayer('boundary', true)
  }, [setLayer])

  useEffect(() => () => setHighlightedZoneLabel(null), [setHighlightedZoneLabel])

  const segments = snapshot?.segments ?? []

  const selectedSegment = useMemo(
    () => segments.find(segment => segment.id === selectedSegmentId) ?? null,
    [segments, selectedSegmentId],
  )

  const averageSpeed = useMemo(
    () => computeDisplaySpeed(segments, trafficSummary?.avgCongestion ?? 0, trafficSummary?.trafficStatus),
    [segments, trafficSummary?.avgCongestion, trafficSummary?.trafficStatus],
  )

  const zones = useMemo(
    () => deriveZones(segments, incidents, trafficSummary?.trafficStatus),
    [incidents, segments, trafficSummary?.trafficStatus],
  )

  const primaryZone = zones[0] ?? null
  const activeAlerts = useMemo(
    () => [...incidents].sort((a, b) => ({ critical: 4, high: 3, medium: 2, low: 1 }[b.severity] - { critical: 4, high: 3, medium: 2, low: 1 }[a.severity])).slice(0, 3),
    [incidents],
  )

  const focusAnalysis = selectedSegment
    ? {
        title: selectedSegment.streetName || selectedSegment.axisName || 'Selected corridor',
        subtitle: selectedSegment.arrondissement || city.name,
        speed: computeDisplaySpeed([selectedSegment], selectedSegment.congestionScore, trafficSummary?.trafficStatus),
        load: Math.round(selectedSegment.congestionScore * 100),
        alerts: activeAlerts.length,
        status: congestionLabel(selectedSegment.congestionScore),
      }
    : primaryZone
      ? {
          title: primaryZone.label,
          subtitle: `${primaryZone.segmentCount} monitored corridors`,
          speed: primaryZone.avgSpeed,
          load: Math.round(primaryZone.avgCongestion * 100),
          alerts: primaryZone.incidentCount,
          status: congestionLabel(primaryZone.avgCongestion),
        }
      : null

  const statusSentence = useMemo(() => {
    if (!trafficSummary?.hasData) return `No data available for ${city.name}.`
    if ((trafficSummary.alertCount ?? 0) === 0) {
      return `${trafficSummary.trafficLabel} on ${city.name} | calm state | ${trafficSummary.predictionLabel.toLowerCase()}`
    }
    return `${trafficSummary.trafficLabel} on ${city.name} | ${trafficSummary.alertCount} active incidents | ${trafficSummary.predictionLabel.toLowerCase()}`
  }, [city.name, trafficSummary])

  const pressurePct = Math.round((trafficSummary?.avgCongestion ?? 0) * 100)
  const speedPct = averageSpeed ? Math.min(100, Math.round((averageSpeed / 55) * 100)) : 0
  const alertPct = Math.min(100, Math.round(((trafficSummary?.alertCount ?? incidents.length) / 6) * 100))

  return (
    <main id="main-content" aria-label={`Live traffic map ${city.name}`} className="fixed inset-0 isolate overflow-hidden bg-[#050608] text-white">
      <div className="absolute inset-0">
        <CrossFlowMap />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.14),transparent_30%),linear-gradient(180deg,rgba(3,4,6,0.62)_0%,rgba(3,4,6,0.02)_30%,rgba(3,4,6,0.18)_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 lg:p-4">
        <div className="pointer-events-auto mx-auto max-w-[1560px] rounded-[1.6rem] border border-white/10 bg-[rgba(7,10,14,0.84)] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                <MapPinned className="h-3.5 w-3.5 text-brand-green" />
                {city.name} urban command center
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-black tracking-tight sm:text-xl">Live traffic intelligence</h1>
                <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', toneClass(trafficSummary?.trafficStatus))}>
                  {trafficSummary?.trafficLabel ?? 'No data available'}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/70">{statusSentence}</p>
            </div>

            <div className="flex items-center gap-2">
              <LiveSyncBadge className="hidden min-[1200px]:flex" />
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Engine</div>
                <div className={cn('mt-0.5 text-xs font-bold', dataSource === 'live' ? 'text-brand-green' : 'text-white/72')}>
                  {dataSource === 'live' ? 'Live synchronized data' : 'CrossFlow Intelligence Engine'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <GaugeWidget label="Pressure" value={pressurePct} suffix="%" icon={Radar} colorClass="text-[#FFB454]" helper={trafficSummary?.hasData ? 'Operational pressure' : 'No data available'} />
            <BarWidget label="Average speed" value={averageSpeed} suffix=" km/h" percent={speedPct} icon={Gauge} barClass="from-[#4ADE80] via-[#A3E635] to-[#FACC15]" helper={averageSpeed ? 'Network moving' : 'No data available'} />
            <BarWidget label="Active incidents" value={trafficSummary?.alertCount ?? incidents.length} suffix="" percent={alertPct} icon={AlertTriangle} barClass="from-[#FACC15] via-[#FB923C] to-[#EF4444]" helper={(trafficSummary?.alertCount ?? incidents.length) === 0 ? 'Calm state' : 'Attention required'} />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-[108px] left-0 right-0 z-30 flex justify-between gap-4 px-3 pb-[110px] lg:px-4">
        <aside className="pointer-events-auto hidden w-[320px] xl:block">
          <PanelCard title="Focus zones" subtitle="Where attention is needed">
            {zones.length > 0 ? (
              <div className="space-y-2">
                {zones.map(zone => {
                  const active = highlightedZoneLabel === zone.label
                  return (
                    <button
                      key={zone.id}
                      type="button"
                      onMouseEnter={() => setHighlightedZoneLabel(zone.label)}
                      onMouseLeave={() => setHighlightedZoneLabel(null)}
                      onClick={() => {
                        setHighlightedZoneLabel(zone.label)
                        if (zone.primarySegmentId) selectSegment(zone.primarySegmentId)
                      }}
                      className={cn(
                        'w-full rounded-2xl border px-3 py-3 text-left transition-all',
                        active ? 'border-brand-green/35 bg-brand-green/10 shadow-[0_12px_26px_rgba(0,0,0,0.24)]' : 'border-white/8 bg-white/[0.04] hover:bg-white/[0.08]'
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-white">{zone.label}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/46">{congestionLabel(zone.avgCongestion)}</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                        <div className="h-full rounded-full bg-[linear-gradient(90deg,#22C55E_0%,#FACC15_55%,#EF4444_100%)] transition-all duration-300" style={{ width: `${Math.max(10, Math.round(zone.avgCongestion * 100))}%` }} />
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-white/65">
                        <MetricMini label="Speed" value={zone.avgSpeed ? `${zone.avgSpeed} km/h` : 'No data'} />
                        <MetricMini label="Alerts" value={zone.incidentCount} />
                        <MetricMini label="Axes" value={zone.segmentCount} />
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <EmptyState title="No critical zones detected" description="The network remains distributed with no dominant pressure zone." />
            )}
          </PanelCard>

          <div className="mt-3">
            <PanelCard title="Live alerts" subtitle="Current incident state">
              {activeAlerts.length > 0 ? (
                <div className="space-y-2">
                  {activeAlerts.map(alert => (
                    <div key={alert.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-white">{alert.title}</span>
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#FFB454]">{alert.severity}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-white/56">{alert.address || alert.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState title="No active incidents" description="Traffic is calm and no incident currently requires escalation." />
              )}
            </PanelCard>
          </div>
        </aside>

        <div className="flex-1" />

        <aside className="pointer-events-auto hidden w-[360px] lg:block">
          <PanelCard title="Local analysis" subtitle={focusAnalysis?.subtitle || 'No area selected'}>
            {focusAnalysis ? (
              <>
                <div className="text-base font-black text-white">{focusAnalysis.title}</div>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MetricMini label="Speed" value={focusAnalysis.speed ? `${focusAnalysis.speed} km/h` : 'No data'} />
                  <MetricMini label="Load" value={`${focusAnalysis.load}%`} />
                  <MetricMini label="Alerts" value={focusAnalysis.alerts} />
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#22C55E_0%,#FACC15_55%,#EF4444_100%)]" style={{ width: `${Math.max(8, focusAnalysis.load)}%` }} />
                </div>
                <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-sm text-white/68">
                  Status: <span className="font-bold text-white">{focusAnalysis.status}</span>. Use the map and focus zones to inspect nearby corridors and incident spillover.
                </div>
              </>
            ) : (
              <EmptyState title="No area selected" description="Click a corridor or a focus zone to inspect local metrics." />
            )}
          </PanelCard>
        </aside>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 lg:p-4">
        <div className="mx-auto flex max-w-[1560px] items-end justify-between gap-3">
          <div className="pointer-events-auto w-full max-w-[430px] rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Traffic logic</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <LegendPill colorClass="bg-[#22C55E]" label="Green" hint="Fluid traffic" />
              <LegendPill colorClass="bg-[#FFD600]" label="Yellow" hint="Moderate slowdown" />
              <LegendPill colorClass="bg-[#FF9F0A]" label="Orange" hint="Dense traffic" />
              <LegendPill colorClass="bg-[#EF4444]" label="Red" hint="Critical focus" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function PanelCard({ title, subtitle, children }: { title: string, subtitle: string, children: React.ReactNode }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
      <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">{title}</div>
      <div className="mt-1 text-sm text-white/62">{subtitle}</div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string, description: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-4">
      <div className="flex items-center gap-2 text-white">
        <ShieldAlert className="h-4 w-4 text-brand-green" />
        <span className="text-sm font-bold">{title}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/58">{description}</p>
    </div>
  )
}

function GaugeWidget({
  label,
  value,
  suffix,
  icon: Icon,
  colorClass,
  helper,
}: {
  label: string
  value: number
  suffix: string
  icon: ComponentType<{ className?: string }>
  colorClass: string
  helper: string
}) {
  const angle = Math.max(0, Math.min(100, value)) * 3.6
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
        <span className="font-black">{label}</span>
        <Icon className={cn('h-3.5 w-3.5', colorClass)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="relative h-14 w-14 rounded-full border border-white/10" style={{ background: `conic-gradient(#4ADE80 0deg, #FACC15 180deg, #EF4444 ${angle}deg, rgba(255,255,255,0.06) ${angle}deg 360deg)` }}>
          <div className="absolute inset-[7px] rounded-full bg-[#0B0F14]" />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{value}</div>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black tracking-tight text-white">{value}{suffix}</div>
          <div className="text-xs text-white/56">{helper}</div>
        </div>
      </div>
    </div>
  )
}

function BarWidget({
  label,
  value,
  suffix,
  percent,
  icon: Icon,
  barClass,
  helper,
}: {
  label: string
  value: number | null
  suffix: string
  percent: number
  icon: ComponentType<{ className?: string }>
  barClass: string
  helper: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
        <span className="font-black">{label}</span>
        <Icon className="h-3.5 w-3.5 text-brand-green" />
      </div>
      <div className="mt-2 text-lg font-black tracking-tight text-white">{value === null ? 'No data' : `${value}${suffix}`}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-300', barClass)} style={{ width: `${Math.max(6, Math.min(100, percent))}%` }} />
      </div>
      <div className="mt-2 text-xs text-white/56">{helper}</div>
    </div>
  )
}

function LegendPill({ colorClass, label, hint }: { colorClass: string, label: string, hint: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 rounded-full', colorClass)} />
        <span className="text-sm font-bold text-white">{label}</span>
      </div>
      <div className="mt-1 text-[11px] text-white/58">{hint}</div>
    </div>
  )
}

function MetricMini({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 px-2 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}
