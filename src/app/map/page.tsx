'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { cn } from '@/lib/utils/cn'

// Components
import LayerControls from '@/components/map/controls/LayerControls'
import MapLegend from '@/components/map/MapLegend'
import { EdgeDetailPanel } from '@/components/map/panels/EdgeDetailPanel'
import { ZoneStatsPanel } from '@/components/map/panels/ZoneStatsPanel'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { AIPanel } from '@/components/ai/AIPanel'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { CityPulseHUD } from '@/components/dashboard/CityPulseHUD'
import { LiveSyncBadge } from '@/components/dashboard/LiveSyncBadge'
import { VehicleFilterPanel } from '@/components/map/VehicleFilterPanel'
import { MapSplitSlider } from '@/components/map/MapSplitSlider'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

import { VehicleInfoCard } from '@/components/map/VehicleInfoCard'

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
  const selectedVehicleId = useMapStore(s => s.selectedVehicleId)

  // KPI generation loop
  React.useEffect(() => {
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs])

  const layerProps = {
    traffic:   activeLayers.has('traffic'),
    heatmap:   activeLayers.has('heatmap'),
    incidents: activeLayers.has('incidents'),
    boundary:  activeLayers.has('boundary'),
    transport: activeLayers.has('transport'),
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden relative bg-[#08090B]">
      {/* Map area: Shrinks when AI Sidebar is open if sm:relative is used */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <CrossFlowMap />

        {/* --- DYNAMIC HUD LAYER --- */}

        {/* TOP HUD: Status & Health (Centralized for scannability) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-3 w-full px-4">
           {mounted && <LiveSyncBadge />}
           {mounted && <CityPulseHUD />}
        </div>

        {/* RIGHT HUD: Interaction Stack */}
        <div className={cn(
          "absolute right-4 z-40 transition-all duration-500 flex flex-col items-end gap-3",
          "md:top-4 top-24" // Push down on mobile to avoid CityPulseHUD overlap if stacked
        )}>
          {mounted && mode !== 'simulate' && (
            <LayerControls 
              layers={layerProps} 
              onToggle={(l) => toggleLayer(l as any)} 
            />
          )}

          {mounted && layerProps.transport && (
            <div className="md:static fixed bottom-24 left-1/2 -translate-x-1/2 md:translate-x-0 w-fit">
              <VehicleFilterPanel vehicleCount={0} />
            </div>
          )}
        </div>

        {/* CENTER COMPONENTS */}
        {mounted && <MapSplitSlider />}

        {/* BOTTOM HUD: Contextual Legends */}
        {mounted && (
          <div className={cn(
            "absolute z-20 pointer-events-none transition-all duration-500",
            "bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6",
            mode === 'predict' && "bottom-20"
          )}>
            {mode === 'predict' && (
              <div className="bg-bg-surface/90 border border-brand-blue/30 rounded-full px-4 py-2 backdrop-blur-md pointer-events-auto mb-4 w-fit flex mx-auto shadow-glow-blue/10">
                <LiveIndicator label={`${t('nav.predictions').toUpperCase()} · +30 MIN`} color="#2979FF" />
              </div>
            )}
            <MapLegend 
              showTraffic={layerProps.traffic} 
              showIncidents={layerProps.incidents} 
              className="pointer-events-auto shadow-2xl"
            />
          </div>
        )}

        {/* FLOATING PANELS: Details */}
        {mounted && mode !== 'simulate' && <EdgeDetailPanel />}
        {mounted && <ZoneStatsPanel />}
        
        {/* Current Vehicle Detail */}
        {mounted && (
           <VehicleInfoCard 
             vehicle={null} // Simplified: uses state inside or needs better sync
             isDisrupted={false}
           />
        )}

        {/* SIMULATION CONTROLS */}
        {mounted && mode === 'simulate' && (
          <div className="absolute top-16 right-4 w-[calc(100%-32px)] sm:w-80 max-h-[calc(100vh-130px)] overflow-y-auto z-20 space-y-4">
            <SimulationPanel />
            <SimulationResults />
          </div>
        )}
      </div>

      {/* AI SIDEBAR: Fixed on mobile, pushes on desktop */}
      {mounted && isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 w-full sm:w-80 bg-bg-surface border-l border-bg-border z-50 sm:relative sm:inset-auto sm:z-auto shadow-2xl">
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
