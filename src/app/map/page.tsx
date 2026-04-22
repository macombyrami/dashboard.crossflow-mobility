'use client'

import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import { Layers3, PanelLeftClose, Sparkles } from 'lucide-react'
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

export default function MapPage() {
  const city = useMapStore(s => s.city)
  const setMode = useMapStore(s => s.setMode)
  const isAIPanelOpen = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  const kpis = useTrafficStore(s => s.kpis)
  const dataSource = useTrafficStore(s => s.dataSource)
  const [showLayers, setShowLayers] = useState(false)

  useEffect(() => {
    setMode('live')
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs, setMode])

  const isParis = city.id === 'paris' || city.name.toLowerCase() === 'paris'
  const isCompactCity = !isParis && city.population > 0 && city.population < 300000
  const congestionPct = kpis ? Math.round(kpis.congestionRate * 100) : null

  const banner = useMemo(() => {
    if (congestionPct === null) {
      return 'Loading city status...'
    }
    if (congestionPct >= 65) {
      return `Critical pressure on ${city.name}. Focus on ${isParis ? 'arrondissements and inner corridors' : 'main entry corridors'}.`
    }
    if (congestionPct >= 30) {
      return `Moderate pressure in ${city.name}. Keep the network under observation.`
    }
    return `${city.name} remains fluid. Clean mode is active by default.`
  }, [city.name, congestionPct, isParis])

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#F8F8F5]">
      <div className="relative flex-1 overflow-hidden">
        <CrossFlowMap />

        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex flex-col items-center gap-3 px-3 sm:top-4 sm:px-4">
          <div className="pointer-events-auto w-[min(540px,calc(100vw-32px))] sm:w-[min(540px,calc(100vw-180px))]">
            <MapSearchControl />
          </div>

          <div className="pointer-events-auto flex w-full max-w-[920px] items-center justify-center">
            <div className="flex h-10 w-full max-w-[920px] items-center justify-between gap-3 rounded-full border border-stone-200 bg-white/94 px-4 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
              <div className="min-w-0 flex-1 truncate text-[12px] font-medium text-stone-600">
                {banner}
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                <span>{dataSource === 'live' ? 'Live' : 'Synthetic'}</span>
                <span className="h-1 w-1 rounded-full bg-stone-300" />
                <span>{isParis ? 'Paris mode' : isCompactCity ? 'Compact city' : 'Standard city'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto absolute bottom-24 left-3 z-30 sm:bottom-auto sm:left-4 sm:top-4">
          <button
            onClick={() => setShowLayers(value => !value)}
            className="flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl transition-all hover:border-stone-300"
            aria-label="Toggle map layers"
          >
            {showLayers ? <PanelLeftClose className="h-4 w-4 text-stone-700" /> : <Layers3 className="h-4 w-4 text-stone-700" />}
            <span className="hidden text-[13px] font-semibold text-stone-900 sm:inline">Layers</span>
          </button>
        </div>

        {showLayers && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/8 backdrop-blur-[1px]"
              onClick={() => setShowLayers(false)}
            />
            <div className="absolute bottom-[136px] left-3 z-30 sm:bottom-auto sm:left-4 sm:top-[112px]">
              <LayerControls />
            </div>
          </>
        )}

        <div className="pointer-events-none absolute right-3 top-[108px] z-20 hidden sm:block">
          <div className="pointer-events-auto rounded-[22px] border border-stone-200 bg-white/92 px-3 py-2 shadow-[0_12px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-stone-500" />
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                  {isParis ? 'Granular network' : 'Boundary analysis'}
                </p>
                <p className="text-[12px] text-stone-600">
                  {isParis ? 'Arrondissements available' : 'Entry/exit points prioritized'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <MapLegend />
        <EdgeDetailPanel />
        <ZoneStatsPanel />
      </div>

      {isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 z-50 w-full border-l border-bg-border bg-bg-surface/95 pt-4 backdrop-blur-md sm:relative sm:inset-auto sm:z-auto sm:w-80 sm:pt-0">
          <AIPanel onClose={() => setAIPanelOpen(false)} />
        </div>
      )}
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
