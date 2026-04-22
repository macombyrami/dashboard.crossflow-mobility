'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { BrainCircuit, ChevronUp, Layers3, PanelLeftClose, Radar, Siren, TrainFront } from 'lucide-react'
import { LayerControls } from '@/components/map/controls/LayerControls'
import { MapSearchControl } from '@/components/map/controls/MapSearchControl'
import { MapLegend } from '@/components/map/MapLegend'
import { EdgeDetailPanel } from '@/components/map/panels/EdgeDetailPanel'
import { ZoneStatsPanel } from '@/components/map/panels/ZoneStatsPanel'
import { AIPanel } from '@/components/ai/AIPanel'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

type SmartModeId = 'live' | 'simulation' | 'transport' | 'incidents'

const SMART_MODES: Array<{
  id: SmartModeId
  label: string
  icon: typeof Radar
  summary: string
}> = [
  { id: 'live', label: 'Live', icon: Radar, summary: 'Observed traffic first' },
  { id: 'simulation', label: 'Simulation', icon: BrainCircuit, summary: 'Synthetic city activity' },
  { id: 'transport', label: 'Transport', icon: TrainFront, summary: 'Animated transit network' },
  { id: 'incidents', label: 'Incidents', icon: Siren, summary: 'Critical disruptions only' },
]

export default function MapPage() {
  const city = useMapStore(s => s.city)
  const setMode = useMapStore(s => s.setMode)
  const setLayer = useMapStore(s => s.setLayer)
  const isAIPanelOpen = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  const kpis = useTrafficStore(s => s.kpis)
  const dataSource = useTrafficStore(s => s.dataSource)
  const [showLayers, setShowLayers] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true)
  const [smartMode, setSmartMode] = useState<SmartModeId>('simulation')

  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs])

  useEffect(() => {
    setSmartMode(dataSource === 'live' ? 'live' : 'simulation')
  }, [city.id, dataSource])

  useEffect(() => {
    if (smartMode === 'live') {
      setMode('live')
      setLayer('traffic', true)
      setLayer('transport', false)
      setLayer('incidents', false)
      setLayer('heatmap', false)
      setLayer('boundary', true)
      return
    }

    if (smartMode === 'simulation') {
      setMode('simulate')
      setLayer('traffic', true)
      setLayer('transport', true)
      setLayer('incidents', false)
      setLayer('heatmap', false)
      setLayer('boundary', true)
      return
    }

    if (smartMode === 'transport') {
      setMode('live')
      setLayer('transport', true)
      setLayer('traffic', false)
      setLayer('incidents', false)
      setLayer('heatmap', false)
      setLayer('boundary', true)
      return
    }

    setMode('live')
    setLayer('incidents', true)
    setLayer('traffic', false)
    setLayer('transport', false)
    setLayer('heatmap', false)
    setLayer('boundary', true)
  }, [setLayer, setMode, smartMode])

  const isParis = city.id === 'paris' || city.name.toLowerCase() === 'paris'
  const isCompactCity = !isParis && city.population > 0 && city.population < 300000
  const congestionPct = kpis ? Math.round(kpis.congestionRate * 100) : null
  const travelMinutes = kpis ? Math.round(kpis.avgTravelMin) : null
  const pollution = kpis ? kpis.pollutionIndex.toFixed(1) : null

  const hero = useMemo(() => {
    if (congestionPct === null) {
      return {
        title: `Building the city view for ${city.name}`,
        subline: 'Roads stay visible while CrossFlow composes live and simulated signals.',
        tone: 'Calibrating network intelligence',
      }
    }

    if (smartMode === 'transport') {
      return {
        title: `Transit activity is now leading ${city.name}`,
        subline: isParis
          ? 'Metro, tram and night lines stay visible to keep the city alive beyond road APIs.'
          : 'Synthetic vehicle movement keeps the network readable around main access corridors.',
        tone: 'Transport intelligence mode',
      }
    }

    if (smartMode === 'incidents') {
      return {
        title: `Incident watch is focused on ${city.name}`,
        subline: 'The map removes background noise and isolates actionable disruptions on top of the full street network.',
        tone: 'Incident command mode',
      }
    }

    if (dataSource === 'live') {
      return {
        title: `${congestionPct >= 65 ? 'Critical' : congestionPct >= 35 ? 'Moderate' : 'Fluid'} traffic detected in ${city.name}`,
        subline: `${isParis ? 'Inner corridors' : 'Main city axes'} remain fully visible while live traffic highlights only what needs attention.`,
        tone: 'Live network reading',
      }
    }

    return {
      title: `AI simulation is sustaining full city coverage in ${city.name}`,
      subline: `${isParis ? 'Arrondissements and nightlife corridors' : 'Entry routes and residential streets'} stay active even when external feeds are weak.`,
      tone: 'Synthetic intelligence active',
    }
  }, [city.name, congestionPct, dataSource, isParis, smartMode])

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#F3F4EF]">
      <div className="relative flex-1 overflow-hidden">
        <CrossFlowMap />

        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-3 px-3 sm:top-4 sm:px-4">
          <div className="pointer-events-auto w-[min(560px,calc(100vw-32px))] sm:w-[min(560px,calc(100vw-220px))]">
            <MapSearchControl />
          </div>

          <div className="pointer-events-auto hidden w-full max-w-[1120px] grid-cols-[minmax(0,1fr)_auto] items-start gap-4 lg:grid">
            <div className="rounded-[28px] border border-stone-200 bg-white/94 px-5 py-4 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-stone-400">
                <span>{hero.tone}</span>
                <span className="h-1 w-1 rounded-full bg-stone-300" />
                <span>{dataSource === 'live' ? 'Live + AI' : 'Synthetic + AI'}</span>
              </div>
              <p className="text-[20px] font-semibold tracking-[-0.03em] text-stone-950">{hero.title}</p>
              <p className="mt-1 text-[13px] leading-5 text-stone-500">{hero.subline}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusChip label="Congestion" value={congestionPct === null ? '...' : `${congestionPct}%`} />
                <StatusChip label="Travel time" value={travelMinutes === null ? '...' : `${travelMinutes} min`} />
                <StatusChip label="Impact" value={pollution === null ? '...' : `${pollution} AQ`} />
                <StatusChip label="City mode" value={isParis ? 'Paris dense' : isCompactCity ? 'Compact city' : 'Standard city'} />
              </div>
            </div>

            <div className="rounded-[28px] border border-stone-200 bg-white/94 p-3 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-xl">
              <div className="grid grid-cols-2 gap-2">
                {SMART_MODES.map(({ id, label, icon: Icon, summary }) => (
                  <button
                    key={id}
                    onClick={() => setSmartMode(id)}
                    className={`rounded-[20px] border px-3 py-3 text-left transition-all ${
                      smartMode === id
                        ? 'border-stone-900 bg-stone-950 text-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]'
                        : 'border-stone-200 bg-stone-50/90 text-stone-700 hover:border-stone-300 hover:bg-white'
                    }`}
                  >
                    <Icon className="mb-2 h-4 w-4" />
                    <div className="text-[12px] font-semibold">{label}</div>
                    <div className={`mt-1 text-[11px] leading-4 ${smartMode === id ? 'text-white/70' : 'text-stone-500'}`}>{summary}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute left-3 top-[118px] z-30 sm:left-4 lg:hidden">
          <button
            onClick={() => setShowLayers(value => !value)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-stone-300"
            aria-label="Toggle advanced layers"
          >
            {showLayers ? <PanelLeftClose className="h-4 w-4 text-stone-700" /> : <Layers3 className="h-4 w-4 text-stone-700" />}
            <span className="text-[13px] font-semibold text-stone-900">Layers</span>
          </button>
        </div>

        <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 hidden -translate-x-1/2 lg:block">
          <button
            onClick={() => setShowLayers(value => !value)}
            className="flex h-11 items-center gap-2 rounded-full border border-stone-200 bg-white/95 px-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-stone-300"
            aria-label="Toggle advanced layers"
          >
            {showLayers ? <PanelLeftClose className="h-4 w-4 text-stone-700" /> : <Layers3 className="h-4 w-4 text-stone-700" />}
            <span className="text-[13px] font-semibold text-stone-900">Advanced layers</span>
          </button>
        </div>

        {showLayers && (
          <>
            <div className="absolute inset-0 z-20 bg-black/8 backdrop-blur-[1px]" onClick={() => setShowLayers(false)} />
            <div className="absolute left-3 top-[172px] z-30 sm:left-4 lg:left-4 lg:top-[188px]">
              <LayerControls />
            </div>
          </>
        )}

        <MapLegend />
        <EdgeDetailPanel />
        <ZoneStatsPanel />

        <div className="pointer-events-auto absolute inset-x-3 bottom-4 z-30 lg:hidden">
          <div className="overflow-hidden rounded-[28px] border border-stone-200 bg-white/95 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <button
              onClick={() => setMobileSheetOpen(value => !value)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-stone-400">{hero.tone}</div>
                <div className="mt-1 text-[15px] font-semibold tracking-[-0.03em] text-stone-950">{hero.title}</div>
              </div>
              <ChevronUp className={`h-4 w-4 text-stone-400 transition-transform ${mobileSheetOpen ? '' : 'rotate-180'}`} />
            </button>

            {mobileSheetOpen && (
              <div className="border-t border-stone-200 px-4 pb-4 pt-3">
                <p className="text-[12px] leading-5 text-stone-500">{hero.subline}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MetricTile label="Congestion" value={congestionPct === null ? '...' : `${congestionPct}%`} />
                  <MetricTile label="Travel" value={travelMinutes === null ? '...' : `${travelMinutes}m`} />
                  <MetricTile label="Impact" value={pollution === null ? '...' : pollution} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {SMART_MODES.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setSmartMode(id)}
                      className={`rounded-[18px] border px-3 py-3 text-left transition-all ${
                        smartMode === id ? 'border-stone-900 bg-stone-950 text-white' : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      <Icon className="mb-2 h-4 w-4" />
                      <div className="text-[12px] font-semibold">{label}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 z-50 w-full border-l border-bg-border bg-bg-surface/95 pt-4 backdrop-blur-md sm:relative sm:inset-auto sm:z-auto sm:w-80 sm:pt-0">
          <AIPanel onClose={() => setAIPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}

function StatusChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-stone-200 bg-stone-50/90 px-3 py-1.5">
      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">{label}</span>
      <span className="ml-2 text-[12px] font-semibold text-stone-800">{value}</span>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-stone-200 bg-stone-50/80 px-3 py-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">{label}</div>
      <div className="mt-1 text-[15px] font-semibold text-stone-900">{value}</div>
    </div>
  )
}

function MapSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#F4F4F0]">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <span className="animate-pulse text-2xl">+</span>
        </div>
        <p className="text-sm text-stone-500">{t('common.calculating')}</p>
      </div>
    </div>
  )
}
