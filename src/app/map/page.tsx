'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { generateCityKPIs } from '@/lib/engine/traffic.engine'
import { cn } from '@/lib/utils/cn'

// Components
import { BottomSheet } from '@/components/ui/BottomSheet'
import { FilterFAB }   from '@/components/ui/FilterFAB'
import LayerControls   from '@/components/map/controls/LayerControls'
import MapLegend       from '@/components/map/MapLegend'
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
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [isVehicleSheetOpen, setIsVehicleSheetOpen] = React.useState(false)
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
    <div className="flex flex-1 h-full overflow-hidden relative bg-[#030303]">
      
      {/* 🌑 TOP OVERLAY: Gradient for UI legibility */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030303]/80 via-[#030303]/40 to-transparent z-10 pointer-events-none" />

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <CrossFlowMap />

        {/* --- DYNAMIC HUD LAYER --- */}

        {/* TOP HUD: Status & Health (Centralized for scannability) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 w-full px-4">
           {mounted && (
             <div className="flex flex-col items-center gap-1.5 opacity-90 backdrop-blur-sm px-4 py-2 rounded-2xl">
               <LiveSyncBadge />
               <CityPulseHUD />
             </div>
           )}
        </div>

        {/* 📱 MOBILE NAVIGATION & SHEETS */}
        {mounted && (
          <>
            <FilterFAB 
              isOpen={isFilterSheetOpen} 
              onClick={() => setIsFilterSheetOpen(!isFilterSheetOpen)} 
              activeCount={activeLayers.size}
            />

            <BottomSheet 
              isOpen={isFilterSheetOpen} 
              onClose={() => setIsFilterSheetOpen(false)}
              title="Calques & Affichage"
              snapPoints={[0.4]}
            >
              <LayerControls 
                layers={layerProps} 
                onToggle={(l) => toggleLayer(l as any)}
                className="w-full !p-0 !bg-transparent !border-none !shadow-none"
              />
            </BottomSheet>

            {layerProps.transport && (
              <BottomSheet
                isOpen={true} // Persistent draggable sheet on mobile if transport active
                onClose={() => {}}
                title="Réseau de Transport"
                snapPoints={[0.2, 0.5, 0.9]}
                initialSnap={0.2}
              >
                <VehicleFilterPanel vehicleCount={0} />
              </BottomSheet>
            )}
          </>
        )}

        {/* RIGHT HUD: Desktop Only (Hidden on mobile) */}
        <div className={cn(
          "hidden md:flex absolute right-4 z-40 transition-all duration-500 flex flex-col items-end gap-3 top-4",
        )}>
          {mounted && mode !== 'simulate' && (
            <LayerControls 
              layers={layerProps} 
              onToggle={(l) => toggleLayer(l as any)} 
            />
          )}

          {mounted && layerProps.transport && (
            <VehicleFilterPanel vehicleCount={0} />
          )}
        </div>

        {/* CENTER COMPONENTS */}
        {mounted && <MapSplitSlider />}

        {/* BOTTOM HUD: Contextual Legends (Desktop only or pushed up by sheet) */}
        {mounted && (
          <div className={cn(
            "absolute z-20 pointer-events-none transition-all duration-500",
            "bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6",
            "md:bottom-6 bottom-24", // Pushed up above Nav on mobile
            mode === 'predict' && "bottom-32 md:bottom-20"
          )}>
            {mode === 'predict' && (
              <div className="bg-bg-surface/90 border border-brand-green/30 rounded-full px-4 py-2 backdrop-blur-md pointer-events-auto mb-4 w-fit flex mx-auto shadow-glow-green/10">
                <LiveIndicator label={`${t('nav.predictions').toUpperCase()} · +30 MIN`} color="#22C55E" />
              </div>
            )}
            <MapLegend 
              showTraffic={layerProps.traffic} 
              showIncidents={layerProps.incidents} 
              className="pointer-events-auto shadow-2xl scale-90 md:scale-100"
            />
          </div>
        )}

        {/* FLOATING PANELS: Details (Desktop-oriented or hidden on small mobile) */}
        {mounted && mode !== 'simulate' && <EdgeDetailPanel />}
        {mounted && <ZoneStatsPanel />}
        
        {/* Current Vehicle Detail */}
        {mounted && (
           <VehicleInfoCard 
             vehicle={null} 
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
        <div className="fixed inset-y-14 right-0 w-full sm:w-80 bg-[#030303] border-l border-white/5 z-[80] sm:relative sm:inset-auto sm:z-auto shadow-2xl">
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
