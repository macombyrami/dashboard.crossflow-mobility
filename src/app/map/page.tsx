'use client'
import dynamic from 'next/dynamic'
import { ModeSelector } from '@/components/map/controls/ModeSelector'
import { LayerControls } from '@/components/map/controls/LayerControls'
import { MapLegend } from '@/components/map/controls/MapLegend'
import { EdgeDetailPanel } from '@/components/map/panels/EdgeDetailPanel'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { AIPanel } from '@/components/ai/AIPanel'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { hasKey } from '@/lib/api/tomtom'
import { useEffect } from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const { t } = useTranslation()
  const city           = useMapStore(s => s.city)
  const mode           = useMapStore(s => s.mode)
  const isAIPanelOpen  = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs        = useTrafficStore(s => s.setKPIs)

  const isLive = hasKey()

  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs])

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        <CrossFlowMap />

        {/* Mode selector — top center */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
          <ModeSelector />
        </div>

        {/* Layer controls — top left */}
        {mode !== 'simulate' && (
          <div className="absolute top-4 left-4 z-10 pointer-events-auto hidden sm:block">
            <LayerControls />
          </div>
        )}

        {/* Status indicators */}
        {mode === 'live' && (
          <div className="absolute bottom-16 left-4 z-10 pointer-events-none">
            <div className="bg-bg-surface/85 border border-bg-border rounded-lg px-3 py-2 backdrop-blur-sm">
              <LiveIndicator label={isLive ? `${t('common.live')} · TomTom` : `${t('common.live')} · ${t('common.demo')}`} color={isLive ? '#00E676' : '#8080A0'} />
            </div>
          </div>
        )}
        {mode === 'predict' && (
          <div className="absolute bottom-16 left-4 z-10">
            <div className="bg-bg-surface/90 border border-[rgba(41,121,255,0.5)] rounded-lg px-3 py-2 backdrop-blur-sm">
              <LiveIndicator label={`${t('nav.predictions').toUpperCase()} · +30 MIN`} color="#2979FF" />
            </div>
          </div>
        )}

        {/* Simulation panel */}
        {mode === 'simulate' && (
          <div className="absolute top-16 right-4 w-[calc(100%-32px)] sm:w-80 max-h-[calc(100vh-130px)] overflow-y-auto z-20 space-y-4">
            <SimulationPanel />
            <SimulationResults />
          </div>
        )}

        {/* Map legend */}
        <div className="absolute bottom-16 right-4 z-10 pointer-events-none hidden xs:block">
          <MapLegend />
        </div>

        {/* Edge detail panel */}
        {mode !== 'simulate' && <EdgeDetailPanel />}
      </div>

      {/* AI Panel — right sidebar */}
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
