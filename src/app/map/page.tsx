'use client'

import dynamic from 'next/dynamic'
import { ModeSelector } from '@/components/map/controls/ModeSelector'
import { LayerControls } from '@/components/map/controls/LayerControls'
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
  const city = useMapStore(s => s.city)
  const setMode = useMapStore(s => s.setMode)
  const isAIPanelOpen = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs = useTrafficStore(s => s.setKPIs)

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

        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 w-[min(920px,calc(100vw-32px))] pointer-events-none">
          <div className="flex flex-col items-center gap-2.5">
            <div className="pointer-events-none w-max max-w-full">
              <GlobalTrafficBanner />
            </div>

            <div className="pointer-events-auto flex flex-col items-center gap-2">
              <ModeSelector />
              <TrafficFilterBar />
            </div>
          </div>
        </div>

        <div className="absolute top-3 right-3 z-10 pointer-events-auto">
          <DataSourceBadge />
        </div>

        <div className="absolute top-3 left-3 z-10 pointer-events-auto hidden sm:block">
          <LayerControls />
        </div>

        <MapLegend />
        <EdgeDetailPanel />
        <ZoneStatsPanel />
      </div>

      {isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 w-full sm:w-80 bg-bg-surface/95 backdrop-blur-md z-30 sm:relative sm:inset-auto sm:z-auto sm:border-l sm:border-bg-border">
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
