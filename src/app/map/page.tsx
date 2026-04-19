'use client'

import { useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'
import {
  AlertTriangle,
  Bot,
  Gauge,
  Layers3,
  MapPinned,
  Navigation2,
  Radar,
  ShieldAlert,
  Siren,
  Sparkles,
  TrendingUp,
  Waves,
} from 'lucide-react'

import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import type { Incident, MapLayerId, TrafficSegment } from '@/types'
import { cn } from '@/lib/utils/cn'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => m.CrossFlowMap),
  { ssr: false },
)

type PresetId = 'monitoring' | 'crisis' | 'prediction'

type ZoneInsight = {
  id: string
  label: string
  segmentCount: number
  avgCongestion: number
  avgSpeed: number
  incidentCount: number
  risk: 'low' | 'medium' | 'high'
}

const TIMELINE_STEPS = [
  { label: 'Now', minutes: 0 },
  { label: '+15m', minutes: 1 },
  { label: '+30m', minutes: 2 },
  { label: '+1h', minutes: 3 },
] as const

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function riskTone(risk: 'low' | 'medium' | 'high') {
  if (risk === 'high') return 'text-[#FF8A6B] border-[#FF8A6B]/30 bg-[#FF8A6B]/10'
  if (risk === 'medium') return 'text-[#FFD166] border-[#FFD166]/30 bg-[#FFD166]/10'
  return 'text-[#4ADE80] border-[#4ADE80]/30 bg-[#4ADE80]/10'
}

function deriveZones(segments: TrafficSegment[], incidents: Incident[]): ZoneInsight[] {
  const groups = new Map<string, TrafficSegment[]>()

  for (const segment of segments) {
    const key = segment.arrondissement || segment.axisName || segment.streetName || 'Network Core'
    const list = groups.get(key)
    if (list) {
      list.push(segment)
    } else {
      groups.set(key, [segment])
    }
  }

  return [...groups.entries()]
    .map(([label, zoneSegments]) => {
      const avgCongestion = average(zoneSegments.map(segment => segment.congestionScore))
      const avgSpeed = average(zoneSegments.map(segment => segment.speedKmh))
      const incidentCount = incidents.filter(incident =>
        incident.address?.toLowerCase().includes(label.toLowerCase()) ||
        incident.title?.toLowerCase().includes(label.toLowerCase())
      ).length
      const risk: ZoneInsight['risk'] =
        avgCongestion >= 0.72 || incidentCount >= 2 ? 'high' :
        avgCongestion >= 0.42 || incidentCount >= 1 ? 'medium' :
        'low'

      return {
        id: label.toLowerCase().replace(/\s+/g, '-'),
        label,
        segmentCount: zoneSegments.length,
        avgCongestion,
        avgSpeed,
        incidentCount,
        risk,
      }
    })
    .sort((a, b) => {
      const impactA = a.avgCongestion * 0.75 + Math.min(0.25, a.incidentCount * 0.08)
      const impactB = b.avgCongestion * 0.75 + Math.min(0.25, b.incidentCount * 0.08)
      return impactB - impactA
    })
    .slice(0, 5)
}

export default function MapPage() {
  const city = useMapStore(s => s.city)
  const setLayer = useMapStore(s => s.setLayer)
  const activeLayers = useMapStore(s => s.activeLayers)
  const toggleLayer = useMapStore(s => s.toggleLayer)
  const mode = useMapStore(s => s.mode)
  const setMode = useMapStore(s => s.setMode)
  const timeOffsetMinutes = useMapStore(s => s.timeOffsetMinutes)
  const setTimeOffset = useMapStore(s => s.setTimeOffset)
  const selectedSegmentId = useMapStore(s => s.selectedSegmentId)
  const snapshot = useTrafficStore(s => s.snapshot)
  const incidents = useTrafficStore(s => s.incidents)
  const trafficSummary = useTrafficStore(s => s.trafficSummary)
  const dataSource = useTrafficStore(s => s.dataSource)
  const didInitCommandLayers = useRef(false)

  const trafficEnabled = activeLayers.has('traffic')
  const incidentsEnabled = activeLayers.has('incidents')
  const flowEnabled = activeLayers.has('flow')

  useEffect(() => {
    document.title = `${city.name} Urban Command Center | CrossFlow`
  }, [city.name])

  useEffect(() => {
    if (didInitCommandLayers.current) return
    didInitCommandLayers.current = true
    setLayer('traffic', true)
    setLayer('incidents', true)
    setLayer('flow', true)
    setLayer('boundary', true)
  }, [setLayer])

  const selectedSegment = useMemo(
    () => snapshot?.segments.find(segment => segment.id === selectedSegmentId) ?? null,
    [selectedSegmentId, snapshot],
  )

  const zones = useMemo(
    () => deriveZones(snapshot?.segments ?? [], incidents),
    [incidents, snapshot],
  )

  const globalRisk: 'low' | 'medium' | 'high' = trafficSummary?.trafficStatus === 'critical'
    ? 'high'
    : trafficSummary?.trafficStatus === 'moderate'
      ? 'medium'
      : 'low'

  const riskLabel = globalRisk === 'high' ? 'High' : globalRisk === 'medium' ? 'Medium' : 'Low'
  const activeZoneCount = zones.filter(zone => zone.risk !== 'low').length
  const criticalZones = zones.filter(zone => zone.risk === 'high')
  const topAlerts = [...incidents]
    .sort((a, b) => {
      const severityScore = { critical: 4, high: 3, medium: 2, low: 1 }
      return severityScore[b.severity] - severityScore[a.severity]
    })
    .slice(0, 4)

  const timelineStates = useMemo(() => {
    const base = trafficSummary?.avgCongestion ?? 0.28
    const delta = (trafficSummary?.predictionDeltaPct ?? 0) / 100
    return TIMELINE_STEPS.map((step, index) => {
      const projected = clamp01(base + delta * (index / Math.max(1, TIMELINE_STEPS.length - 1)))
      return {
        ...step,
        congestion: projected,
        speed: Math.max(11, Math.round((1 - projected * 0.72) * 46)),
      }
    })
  }, [trafficSummary])

  const currentTimelineState = timelineStates[timeOffsetMinutes] ?? timelineStates[0]

  const aiRecommendations = useMemo(() => {
    const items: string[] = []
    if (criticalZones[0]) {
      items.push(`Stabilize ${criticalZones[0].label} with signal priority and corridor rerouting.`)
    }
    if ((trafficSummary?.predictionDeltaPct ?? 0) >= 12) {
      items.push(`Prepare mitigation for a ${trafficSummary?.predictionDeltaPct}% congestion rise within 45 minutes.`)
    }
    if (topAlerts.length > 0) {
      items.push(`Dispatch field verification on ${topAlerts[0].address || topAlerts[0].title}.`)
    }
    if (items.length === 0) {
      items.push('Maintain monitoring mode and keep flow overlays active on major corridors.')
    }
    return items.slice(0, 3)
  }, [criticalZones, topAlerts, trafficSummary?.predictionDeltaPct])

  const selectedAnalysis = useMemo(() => {
    if (selectedSegment) {
      const delayMinutes = Math.max(
        0,
        Math.round((selectedSegment.travelTimeSeconds - (selectedSegment.length / 1000 / selectedSegment.freeFlowSpeedKmh) * 3600) / 60)
      )
      return {
        title: selectedSegment.streetName || selectedSegment.axisName || 'Selected corridor',
        subtitle: selectedSegment.arrondissement || 'Operational segment',
        speed: Math.round(selectedSegment.speedKmh),
        reliability: Math.max(48, Math.round((1 - selectedSegment.congestionScore * 0.55) * 100)),
        delay: delayMinutes,
        trend: selectedSegment.flowTrend || 'stable',
        insight: selectedSegment.congestionScore >= 0.7
          ? 'Pressure is concentrated on a major axis. Keep flow and incidents visible to assess spillover.'
          : 'Segment remains actionable. Use this corridor as a relief path if nearby zones escalate.',
      }
    }

    const leadZone = zones[0]
    return {
      title: leadZone?.label || `${city.name} network`,
      subtitle: leadZone ? `${leadZone.segmentCount} monitored segments` : 'No dense zone selected',
      speed: leadZone ? Math.round(leadZone.avgSpeed) : currentTimelineState.speed,
      reliability: leadZone ? Math.max(50, Math.round((1 - leadZone.avgCongestion * 0.5) * 100)) : 82,
      delay: leadZone ? Math.round(leadZone.avgCongestion * 18) : Math.round(currentTimelineState.congestion * 14),
      trend: (trafficSummary?.predictionDeltaPct ?? 0) > 8 ? 'worsening' : 'stable',
      insight: leadZone
        ? `Primary hotspot is ${leadZone.label}. Congestion and incidents indicate a localized operational issue.`
        : 'Traffic remains distributed. Prioritize monitoring, not intervention, until a corridor is selected.',
    }
  }, [city.name, currentTimelineState.congestion, currentTimelineState.speed, selectedSegment, trafficSummary?.predictionDeltaPct, zones])

  const strategicSentence = `Traffic: ${trafficSummary?.trafficLabel ?? 'Loading'} | ${criticalZones.length} critical zones | +${trafficSummary?.predictionDeltaPct ?? 0}% in 45 min | Risk: ${riskLabel}`

  const layerPills: Array<{ id: MapLayerId, label: string, hint: string }> = [
    { id: 'traffic', label: 'Traffic', hint: 'Road pressure' },
    { id: 'incidents', label: 'Incidents', hint: 'Clusters + pins' },
    { id: 'flow', label: 'Flow', hint: 'Animated corridors' },
  ]

  const applyPreset = (preset: PresetId) => {
    if (preset === 'monitoring') {
      setMode('live')
      setTimeOffset(0)
      setLayer('traffic', true)
      setLayer('incidents', true)
      setLayer('flow', false)
      return
    }

    if (preset === 'crisis') {
      setMode('live')
      setTimeOffset(1)
      setLayer('traffic', true)
      setLayer('incidents', true)
      setLayer('flow', true)
      return
    }

    setMode('predict')
    setTimeOffset(2)
    setLayer('traffic', true)
    setLayer('incidents', true)
    setLayer('flow', true)
  }

  return (
    <main id="main-content" aria-label={`Urban command center ${city.name}`} className="fixed inset-0 isolate overflow-hidden bg-[#050608] text-white">
      <div className="absolute inset-0">
        <CrossFlowMap />
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.18),transparent_32%),linear-gradient(180deg,rgba(3,4,6,0.82)_0%,rgba(3,4,6,0.08)_30%,rgba(3,4,6,0.18)_100%)]" />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 p-3 lg:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-[1800px] items-center gap-3 rounded-[1.75rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-white/45">
              <MapPinned className="h-3.5 w-3.5 text-brand-green" />
              {city.name} urban command center
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <h1 className="text-lg font-black tracking-tight sm:text-xl">Strategic traffic command</h1>
              <span className={cn('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]', riskTone(globalRisk))}>
                Risk {riskLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/68">{strategicSentence}</p>
          </div>

          <div className="hidden xl:grid min-w-[360px] grid-cols-4 gap-2">
            <MetricCard label="Traffic" value={trafficSummary?.trafficLabel ?? 'Loading'} icon={Radar} />
            <MetricCard label="Critical zones" value={criticalZones.length} icon={ShieldAlert} />
            <MetricCard label="Prediction" value={trafficSummary?.predictionLabel ?? '-'} icon={TrendingUp} />
            <MetricCard label="Speed" value={`${currentTimelineState.speed} km/h`} icon={Gauge} />
          </div>

          <div className="flex items-center gap-2">
            <LiveSyncBadge className="hidden min-[1500px]:flex" />
            <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">Source</div>
              <div className={cn('mt-0.5 text-xs font-bold', dataSource === 'live' ? 'text-brand-green' : 'text-traffic-warning')}>
                {dataSource === 'live' ? 'Live synchronized' : 'Synthetic fallback'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-y-[92px] left-0 z-30 flex w-full justify-between gap-4 px-3 pb-[112px] lg:px-4">
        <aside className="pointer-events-auto hidden h-full w-[350px] flex-col gap-3 lg:flex">
          <CommandPanel title="Operational control" subtitle="Real-time insights, alerts, and recommendations">
            <div className="grid grid-cols-3 gap-2">
              {layerPills.map((layer) => {
                const active =
                  layer.id === 'traffic' ? trafficEnabled :
                  layer.id === 'incidents' ? incidentsEnabled :
                  flowEnabled

                return (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition-all',
                      active ? 'border-white/20 bg-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.22)]' : 'border-white/10 bg-white/[0.04] text-white/45'
                    )}
                  >
                    <div className="text-[10px] font-black uppercase tracking-[0.18em]">{layer.label}</div>
                    <div className="mt-1 text-[11px] text-white/62">{layer.hint}</div>
                  </button>
                )
              })}
            </div>

            <SectionBlock title="Presets" eyebrow="Command modes">
              <div className="grid grid-cols-3 gap-2">
                <PresetButton active={mode === 'live' && !flowEnabled} label="Monitoring" onClick={() => applyPreset('monitoring')} />
                <PresetButton active={mode === 'live' && flowEnabled && timeOffsetMinutes === 1} label="Crisis" onClick={() => applyPreset('crisis')} />
                <PresetButton active={mode === 'predict'} label="Prediction" onClick={() => applyPreset('prediction')} />
              </div>
            </SectionBlock>

            <SectionBlock title="Active zones" eyebrow="Operational focus">
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div key={zone.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-white">{zone.label}</div>
                        <div className="mt-1 text-[11px] text-white/48">{zone.segmentCount} segments monitored</div>
                      </div>
                      <span className={cn('rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em]', riskTone(zone.risk))}>
                        {zone.risk}
                      </span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-white/72">
                      <MiniStat label="Pressure" value={`${Math.round(zone.avgCongestion * 100)}%`} />
                      <MiniStat label="Speed" value={`${Math.round(zone.avgSpeed)} km/h`} />
                      <MiniStat label="Alerts" value={zone.incidentCount} />
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="AI recommendations" eyebrow="What should I do?">
              <div className="space-y-2">
                {aiRecommendations.map((recommendation, index) => (
                  <div key={index} className="rounded-2xl border border-brand-green/15 bg-brand-green/5 p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="mt-0.5 h-4 w-4 flex-none text-brand-green" />
                      <p className="text-sm leading-relaxed text-white/78">{recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Recent alerts" eyebrow="Immediate attention">
              <div className="space-y-2">
                {topAlerts.length > 0 ? topAlerts.map((incident) => (
                  <div key={incident.id} className="rounded-2xl border border-white/8 bg-white/[0.04] p-3">
                    <div className="flex items-center gap-2">
                      <Siren className="h-3.5 w-3.5 text-traffic-warning" />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/48">{incident.severity}</span>
                    </div>
                    <div className="mt-2 text-sm font-bold">{incident.title}</div>
                    <div className="mt-1 text-[11px] text-white/56">{incident.address || incident.description}</div>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-sm text-white/56">
                    No major incident requires escalation right now.
                  </div>
                )}
              </div>
            </SectionBlock>
          </CommandPanel>
        </aside>

        <aside className="pointer-events-auto hidden h-full w-[390px] xl:flex">
          <CommandPanel title="Analytics" subtitle="Local diagnosis, evolution, and decision support">
            <SectionBlock title={selectedAnalysis.title} eyebrow={selectedAnalysis.subtitle}>
              <div className="grid grid-cols-3 gap-2">
                <MetricTile label="Speed" value={`${selectedAnalysis.speed} km/h`} icon={Gauge} />
                <MetricTile label="Delay" value={`${selectedAnalysis.delay} min`} icon={Navigation2} />
                <MetricTile label="Reliability" value={`${selectedAnalysis.reliability}%`} icon={ShieldAlert} />
              </div>
              <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-sm leading-relaxed text-white/72">
                {selectedAnalysis.insight}
              </div>
            </SectionBlock>

            <SectionBlock title="Evolution over time" eyebrow="What will happen?">
              <div className="space-y-3">
                {timelineStates.map((step) => (
                  <div key={step.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px] text-white/58">
                      <span>{step.label}</span>
                      <span>{Math.round(step.congestion * 100)}% pressure</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/6">
                      <div
                        className="h-full rounded-full bg-[linear-gradient(90deg,#38BDF8_0%,#FACC15_55%,#FF6B57_100%)] transition-all duration-500"
                        style={{ width: `${Math.max(8, step.congestion * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </SectionBlock>

            <SectionBlock title="Micro insights" eyebrow="Why is it happening?">
              <div className="space-y-2 text-sm text-white/72">
                <InsightRow icon={Waves} text={`${activeZoneCount} active zones are currently distorting network flow.`} />
                <InsightRow icon={AlertTriangle} text={`${criticalZones.length} zones require intervention priority.`} />
                <InsightRow icon={Bot} text={`Prediction confidence rises with ${trafficEnabled && incidentsEnabled ? 'traffic + incident overlays combined' : 'partial situational context'}.`} />
              </div>
            </SectionBlock>
          </CommandPanel>
        </aside>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 lg:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-[1800px] items-end gap-3">
          <div className="flex-1 rounded-[1.5rem] border border-white/10 bg-[rgba(7,10,14,0.82)] px-4 py-3 shadow-[0_24px_80px_rgba(0,0,0,0.36)] backdrop-blur-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/45">Timeline system</div>
                <div className="mt-1 text-sm text-white/72">
                  {currentTimelineState.label} | projected pressure {Math.round(currentTimelineState.congestion * 100)}% | expected speed {currentTimelineState.speed} km/h
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {TIMELINE_STEPS.map((step, index) => (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => {
                      setTimeOffset(step.minutes)
                      setMode(step.minutes === 0 ? 'live' : 'predict')
                    }}
                    className={cn(
                      'rounded-2xl border px-3 py-2 text-left transition-all',
                      timeOffsetMinutes === index
                        ? 'border-brand-green/40 bg-brand-green/12 text-white shadow-[0_10px_28px_rgba(0,0,0,0.24)]'
                        : 'border-white/10 bg-white/[0.04] text-white/52 hover:bg-white/[0.07]'
                    )}
                    >
                    <div className="text-[10px] font-black uppercase tracking-[0.18em]">{step.label}</div>
                    <div className="mt-1 text-xs text-white/72">{Math.round((timelineStates[index]?.congestion ?? 0) * 100)}% load</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

function CommandPanel({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[rgba(7,10,14,0.82)] shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-2xl">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/42">{title}</div>
        <div className="mt-1 text-sm text-white/66">{subtitle}</div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">{children}</div>
    </div>
  )
}

function SectionBlock({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-3">
      <div className="mb-3">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/42">{eyebrow}</div>
        <div className="mt-1 text-sm font-bold text-white">{title}</div>
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-white/42">
        <span className="font-black">{label}</span>
        <Icon className="h-3.5 w-3.5 text-brand-green" />
      </div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function PresetButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition-all',
        active ? 'border-brand-green/40 bg-brand-green/12 text-white' : 'border-white/10 bg-white/[0.04] text-white/52'
      )}
    >
      {label}
    </button>
  )
}

function MetricTile({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.05] px-3 py-3">
      <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/42">
        <span>{label}</span>
        <Icon className="h-3.5 w-3.5 text-brand-green" />
      </div>
      <div className="mt-2 text-lg font-black tracking-tight text-white">{value}</div>
    </div>
  )
}

function MiniStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-black/20 px-2 py-2">
      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-white/38">{label}</div>
      <div className="mt-1 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

function InsightRow({
  icon: Icon,
  text,
}: {
  icon: ComponentType<{ className?: string }>
  text: string
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-white/8 bg-black/20 px-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 flex-none text-brand-green" />
      <p>{text}</p>
    </div>
  )
}
