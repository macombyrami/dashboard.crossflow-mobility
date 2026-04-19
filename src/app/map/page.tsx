'use client'

import { useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { AlertTriangle, Gauge, MapPinned, Radar, Route, Waves } from 'lucide-react'

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
  avgSpeed: number
  incidentCount: number
  segmentCount: number
  primarySegmentId: string | null
}

function toneClass(status: 'fluid' | 'moderate' | 'critical' | undefined) {
  if (status === 'critical') return 'text-[#FF8A6B] border-[#FF8A6B]/30 bg-[#FF8A6B]/10'
  if (status === 'moderate') return 'text-[#FFD166] border-[#FFD166]/30 bg-[#FFD166]/10'
  return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10'
}

function zoneKey(segment: TrafficSegment): string {
  return segment.arrondissement || segment.axisName || segment.streetName || 'Network core'
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function deriveZones(segments: TrafficSegment[], incidents: Incident[]): ZoneCard[] {
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

      return {
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        avgCongestion: average(zoneSegments.map(segment => segment.congestionScore)),
        avgSpeed: average(zoneSegments.map(segment => segment.speedKmh)),
        incidentCount,
        segmentCount: zoneSegments.length,
        primarySegmentId: strongest?.id ?? null,
      }
    })
    .sort((a, b) => (b.avgCongestion * 0.8 + b.incidentCount * 0.08) - (a.avgCongestion * 0.8 + a.incidentCount * 0.08))
    .slice(0, 3)
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

  useEffect(() => {
    return () => setHighlightedZoneLabel(null)
  }, [setHighlightedZoneLabel])

  const selectedSegment = useMemo(
    () => snapshot?.segments.find(segment => segment.id === selectedSegmentId) ?? null,
    [selectedSegmentId, snapshot],
  )

  const zones = useMemo(
    () => deriveZones(snapshot?.segments ?? [], incidents),
    [incidents, snapshot],
  )

  const averageSpeed = useMemo(() => {
    const segments = snapshot?.segments ?? []
    if (segments.length === 0) return 0
    return Math.round(segments.reduce((sum, segment) => sum + segment.speedKmh, 0) / segments.length)
  }, [snapshot])

  const primaryZone = zones[0] ?? null
  const statusSentence = useMemo(() => {
    if (!trafficSummary?.hasData) {
      return `Loading live traffic for ${city.name}.`
    }

    return `${trafficSummary.trafficLabel} on ${city.name} | ${trafficSummary.alertCount} alerts | ${trafficSummary.predictionLabel.toLowerCase()}`
  }, [city.name, trafficSummary])

  const pressurePct = Math.round((trafficSummary?.avgCongestion ?? 0) * 100)
  const speedPct = Math.min(100, Math.round((averageSpeed / 55) * 100))
  const alertPct = Math.min(100, Math.round(((trafficSummary?.alertCount ?? incidents.length) / 6) * 100))

  return (
    <main id="main-content" aria-label={`Live traffic map ${city.name}`} className="fixed inset-0 isolate overflow-hidden bg-[#050608] text-white">
      <div className="absolute inset-0">
        <CrossFlowMap />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.16),transparent_30%),linear-gradient(180deg,rgba(3,4,6,0.7)_0%,rgba(3,4,6,0.04)_30%,rgba(3,4,6,0.22)_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 lg:p-4">
        <div className="pointer-events-auto mx-auto max-w-[1520px] rounded-[1.6rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
                <MapPinned className="h-3.5 w-3.5 text-brand-green" />
                {city.name} live traffic
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-black tracking-tight sm:text-xl">Operational traffic view</h1>
                <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', toneClass(trafficSummary?.trafficStatus))}>
                  {trafficSummary?.trafficLabel ?? 'Loading'}
                </span>
              </div>
              <p className="mt-1 text-sm text-white/70">{statusSentence}</p>
            </div>

            <div className="flex items-center gap-2">
              <LiveSyncBadge className="hidden min-[1200px]:flex" />
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Source</div>
                <div className={cn('mt-0.5 text-xs font-bold', dataSource === 'live' ? 'text-brand-green' : 'text-traffic-warning')}>
                  {dataSource === 'live' ? 'Live synchronized' : 'Local fallback'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <GaugeWidget label="Pressure" value={pressurePct} suffix="%" icon={Radar} colorClass="text-[#FFB454]" />
            <BarWidget label="Average speed" value={averageSpeed} suffix=" km/h" percent={speedPct} icon={Gauge} barClass="from-[#4ADE80] via-[#A3E635] to-[#FACC15]" />
            <BarWidget label="Alerts" value={trafficSummary?.alertCount ?? incidents.length} suffix="" percent={alertPct} icon={AlertTriangle} barClass="from-[#FACC15] via-[#FB923C] to-[#EF4444]" />
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-[110px] left-0 right-0 z-30 flex justify-between gap-4 px-3 pb-[130px] lg:px-4">
        <aside className="pointer-events-auto hidden w-[320px] xl:block">
          <div className="rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] p-3 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Focus zones</div>
            <div className="mt-3 space-y-2">
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
                      <span className="text-[10px] font-black uppercase tracking-[0.16em] text-white/46">
                        {congestionLabel(zone.avgCongestion)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#22C55E_0%,#FACC15_55%,#EF4444_100%)] transition-all duration-300"
                        style={{ width: `${Math.max(10, Math.round(zone.avgCongestion * 100))}%` }}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-white/65">
                      <MetricMini label="Speed" value={`${Math.round(zone.avgSpeed)} km/h`} />
                      <MetricMini label="Alerts" value={zone.incidentCount} />
                      <MetricMini label="Axes" value={zone.segmentCount} />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="flex-1" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 lg:p-4">
        <div className="mx-auto flex max-w-[1520px] flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto w-full max-w-[430px] rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-white/45">Color logic</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <LegendPill colorClass="bg-[#22C55E]" label="Green" hint="Normal traffic" />
              <LegendPill colorClass="bg-[#FFD600]" label="Yellow" hint="Moderate slowdown" />
              <LegendPill colorClass="bg-[#FF9F0A]" label="Orange" hint="Dense traffic" />
              <LegendPill colorClass="bg-[#EF4444]" label="Red" hint="Critical area" />
            </div>
          </div>

          {(selectedSegment || primaryZone) && (
            <div className="pointer-events-auto w-full max-w-[430px] rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-white/45">
                <Waves className="h-3.5 w-3.5 text-brand-green" />
                {selectedSegment ? 'Selected corridor' : 'Primary hotspot'}
              </div>
              <div className="mt-2 text-base font-black text-white">
                {selectedSegment?.streetName || selectedSegment?.axisName || primaryZone?.label || 'Network focus'}
              </div>
              <div className="mt-1 text-sm text-white/62">
                {selectedSegment?.arrondissement || city.name} | {congestionLabel(selectedSegment?.congestionScore ?? primaryZone?.avgCongestion ?? 0)}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <MetricChip label="Speed" value={`${Math.round(selectedSegment?.speedKmh ?? primaryZone?.avgSpeed ?? averageSpeed)} km/h`} />
                <MetricChip label="Load" value={`${Math.round((selectedSegment?.congestionScore ?? primaryZone?.avgCongestion ?? 0) * 100)}%`} />
                <MetricChip label="Alerts" value={String(selectedSegment ? incidents.length : primaryZone?.incidentCount ?? 0)} />
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

function GaugeWidget({
  label,
  value,
  suffix,
  icon: Icon,
  colorClass,
}: {
  label: string
  value: number
  suffix: string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string
}) {
  const angle = Math.max(0, Math.min(100, value)) * 3.6
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
        <span className="font-black">{label}</span>
        <Icon className={cn('h-3.5 w-3.5', colorClass)} />
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div
          className="relative h-14 w-14 rounded-full border border-white/10"
          style={{ background: `conic-gradient(#4ADE80 0deg, #FACC15 180deg, #EF4444 ${angle}deg, rgba(255,255,255,0.06) ${angle}deg 360deg)` }}
        >
          <div className="absolute inset-[7px] rounded-full bg-[#0B0F14]" />
          <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white">{value}</div>
        </div>
        <div className="min-w-0">
          <div className="text-lg font-black tracking-tight text-white">{value}{suffix}</div>
          <div className="text-xs text-white/56">Live network pressure</div>
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
}: {
  label: string
  value: number
  suffix: string
  percent: number
  icon: React.ComponentType<{ className?: string }>
  barClass: string
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
        <span className="font-black">{label}</span>
        <Icon className="h-3.5 w-3.5 text-brand-green" />
      </div>
      <div className="mt-2 text-lg font-black tracking-tight text-white">{value}{suffix}</div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
        <div className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-300', barClass)} style={{ width: `${Math.max(6, Math.min(100, percent))}%` }} />
      </div>
    </div>
  )
}

function LegendPill({
  colorClass,
  label,
  hint,
}: {
  colorClass: string
  label: string
  hint: string
}) {
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

function MetricMini({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 px-2 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-white/36">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function MetricChip({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}
