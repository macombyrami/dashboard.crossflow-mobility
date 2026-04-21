'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Layers, X } from 'lucide-react'
import { ModeSelector } from '@/components/map/controls/ModeSelector'
import { LayerControls } from '@/components/map/controls/LayerControls'
import { MapSearchControl } from '@/components/map/controls/MapSearchControl'
import { TrafficFilterBar } from '@/components/map/controls/TrafficFilterBar'
import { MapLegend } from '@/components/map/MapLegend'
import { EdgeDetailPanel } from '@/components/map/panels/EdgeDetailPanel'
import { ZoneStatsPanel } from '@/components/map/panels/ZoneStatsPanel'
import { AIPanel } from '@/components/ai/AIPanel'
import { DataSourceBadge } from '@/components/map/DataSourceBadge'
import { GlobalTrafficBanner } from '@/components/dashboard/GlobalTrafficBanner'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const city          = useMapStore(s => s.city)
  const setMode       = useMapStore(s => s.setMode)
  const isAIPanelOpen = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs       = useTrafficStore(s => s.setKPIs)
  const [showMobileLayers, setShowMobileLayers] = useState(false)

  useEffect(() => {
    setMode('live')
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs, setMode])

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      <div className="flex-1 relative overflow-hidden">
        <CrossFlowMap />

        {/* ── Top centre: search + banner + mode/filter ── */}
        <div className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2 z-20
                        w-[calc(100vw-80px)] sm:w-[min(820px,calc(100vw-160px))]
                        pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="pointer-events-auto w-full">
              <MapSearchControl />
            </div>
            <div className="pointer-events-none w-max max-w-full">
              <GlobalTrafficBanner />
            </div>
            <div className="pointer-events-auto flex flex-col items-center gap-1.5">
              <ModeSelector />
              {/* filter bar scrolls horizontally on mobile */}
              <div className="overflow-x-auto max-w-[calc(100vw-96px)] sm:overflow-visible sm:max-w-none
                              no-scrollbar">
                <TrafficFilterBar />
              </div>
            </div>
          </div>
        </div>

        {/* ── Top right: data source badge ── */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10 pointer-events-auto">
          <DataSourceBadge />
        </div>

        {/* ── Desktop: LayerControls (left panel) ── */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10 pointer-events-auto hidden sm:block">
          <LayerControls />
        </div>

        {/* ── Mobile: floating layers button (bottom-left) ── */}
        <button
          onClick={() => setShowMobileLayers(v => !v)}
          className="sm:hidden absolute bottom-24 left-3 z-20 pointer-events-auto
                     w-11 h-11 rounded-xl bg-white/90 dark:bg-bg-elevated/90
                     backdrop-blur-md border border-black/8 dark:border-white/10
                     shadow-lg flex items-center justify-center
                     text-text-primary transition-all active:scale-95"
          aria-label="Calques"
        >
          <Layers className="w-5 h-5" />
        </button>

        {/* ── Mobile: LayerControls bottom-sheet ── */}
        {showMobileLayers && (
          <>
            {/* backdrop */}
            <div
              className="sm:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px]"
              onClick={() => setShowMobileLayers(false)}
            />
            {/* panel */}
            <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40
                            rounded-t-2xl bg-bg-elevated border-t border-bg-border
                            p-4 pb-8 shadow-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-text-primary">Calques</span>
                <button
                  onClick={() => setShowMobileLayers(false)}
                  className="p-1.5 rounded-lg hover:bg-bg-hover text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <LayerControls />
            </div>
          </>
        )}

        <MapLegend />
        <EdgeDetailPanel />
        <ZoneStatsPanel />
      </div>

      {isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 w-full sm:w-80 bg-bg-surface/95 backdrop-blur-md z-30
                        sm:relative sm:inset-auto sm:z-auto sm:border-l sm:border-bg-border">
          <AIPanel onClose={() => setAIPanelOpen(false)} />
        </div>
      )}
    </div>
  )
}

function MapSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="w-full h-full bg-bg-surface flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto">
          <span className="text-2xl animate-pulse">⚡</span>
        </div>
        <p className="text-sm text-text-secondary">{t('common.calculating')}</p>
      </div>
    </div>
  )
}
