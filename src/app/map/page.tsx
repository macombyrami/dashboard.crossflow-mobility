'use client'
import dynamic from 'next/dynamic'
import { ModeSelector } from '@/components/map/controls/ModeSelector'
import LayerControls from '@/components/map/controls/LayerControls'
import MapLegend from '@/components/map/MapLegend'
import { EdgeDetailPanel } from '@/components/map/panels/EdgeDetailPanel'
import { ZoneStatsPanel } from '@/components/map/panels/ZoneStatsPanel'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { AIPanel } from '@/components/ai/AIPanel'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { CityPulseHUD } from '@/components/dashboard/CityPulseHUD'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { hasKey } from '@/lib/api/tomtom'
import React from 'react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Metadata } from 'next'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const [mounted, setMounted] = React.useState(false)
  const { t } = useTranslation()
  const city  = useMapStore(s => s.city)

  React.useEffect(() => {
    setMounted(true)
    document.title = `Carte — ${city.name} | CrossFlow`
  }, [city.name])
  const mode           = useMapStore(s => s.mode)
  const isAIPanelOpen  = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const activeLayers   = useMapStore(s => s.activeLayers)
  const toggleLayer    = useMapStore(s => s.toggleLayer)
  const setKPIs        = useTrafficStore(s => s.setKPIs)

  const layerProps = {
    traffic:   activeLayers.has('traffic'),
    heatmap:   activeLayers.has('heatmap'),
    incidents: activeLayers.has('incidents'),
    boundary:  activeLayers.has('boundary'),
  }

  const isTomTom = hasKey()
  // Paris → IDFM/RATP data is real-time even without TomTom
  const isParis  = city.countryCode === 'FR' &&
    Math.abs(city.center.lat - 48.8566) < 0.6 &&
    Math.abs(city.center.lng - 2.3522) < 0.8
  const isLive   = isTomTom || isParis

  React.useEffect(() => {
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs])

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Map area */}
      <div className="flex-1 relative overflow-hidden">
        <CrossFlowMap />

        {/* City Pulse HUD — top center */}
        {mounted && <CityPulseHUD />}

        {/* Mode selector — top center (offset below HUD) */}
        {mounted && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
            <ModeSelector />
          </div>
        )}

        {/* Layer controls — top left */}
        {mounted && mode !== 'simulate' && (
          <div className="absolute top-4 left-4 z-10 pointer-events-auto hidden sm:block">
            <LayerControls 
              layers={layerProps} 
              onToggle={(l) => toggleLayer(l as any)} 
            />
          </div>
        )}

        {/* Status indicators */}
        {mounted && mode === 'live' && isLive && (
          <div className="absolute bottom-16 left-4 z-10 pointer-events-none">
            <div className="bg-bg-surface/85 border border-bg-border rounded-lg px-3 py-2 backdrop-blur-sm">
              <LiveIndicator
                label={
                  isTomTom && isParis ? 'TEMPS RÉEL · IDFM + TOMTOM' :
                  isTomTom           ? 'TEMPS RÉEL · TOMTOM' :
                                       'TEMPS RÉEL · IDFM'
                }
                color="#00E676"
              />
            </div>
          </div>
        )}
        {mounted && mode === 'predict' && (
          <div className="absolute bottom-16 left-4 z-10">
            <div className="bg-bg-surface/90 border border-[rgba(41,121,255,0.5)] rounded-lg px-3 py-2 backdrop-blur-sm">
              <LiveIndicator label={`${t('nav.predictions').toUpperCase()} · +30 MIN`} color="#2979FF" />
            </div>
          </div>
        )}

        {/* Simulation panel */}
        {mounted && mode === 'simulate' && (
          <div className="absolute top-16 right-4 w-[calc(100%-32px)] sm:w-80 max-h-[calc(100vh-130px)] overflow-y-auto z-20 space-y-4">
            <SimulationPanel />
            <SimulationResults />
          </div>
        )}

        {/* Map legend */}
        {mounted && <MapLegend showTraffic={layerProps.traffic} showIncidents={layerProps.incidents} />}

        {/* Edge detail panel */}
        {mounted && mode !== 'simulate' && <EdgeDetailPanel />}

        {/* Zone stats panel */}
        {mounted && <ZoneStatsPanel />}
      </div>

      {/* AI Panel — right sidebar */}
      {mounted && isAIPanelOpen && (
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
