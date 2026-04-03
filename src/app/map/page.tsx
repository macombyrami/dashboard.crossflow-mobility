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
const AIPanel = dynamic(
  () => import('@/components/ai/AIPanel').then(m => m.AIPanel),
  { ssr: false, loading: () => <PanelSkeleton label="Consultant IA" /> }
)

const SimulationPanel = dynamic(
  () => import('@/components/simulation/SimulationPanel').then(m => m.SimulationPanel),
  { ssr: false, loading: () => <PanelSkeleton label="Moteur Simulation" /> }
)

const SimulationResults = dynamic(
  () => import('@/components/simulation/SimulationResults').then(m => m.SimulationResults),
  { ssr: false }
)
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

import { useTrafficData } from '@/lib/hooks/useTrafficData'

export default function MapPage() {
  const [mounted, setMounted] = React.useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [isTransportSheetOpen, setIsTransportSheetOpen] = React.useState(false) // STAFF OPTIMIZATION: Track open state
  
  const { t } = useTranslation()
  const city  = useMapStore(s => s.city)

  // 🔄 HIGH-PERFORMANCE DATA FETCHING (STAFF ENGINEER LAYER)
  const { lastUpdated, manualRefresh, isFetching, timeSinceUpdate } = useTrafficData()

  React.useEffect(() => {
    setMounted(true)
    document.title = `Carte — ${city.name} | CrossFlow`
  }, [city.name])

  const mode            = useMapStore(s => s.mode)
  const isAIPanelOpen   = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen  = useMapStore(s => s.setAIPanelOpen)
  const activeLayers    = useMapStore(s => s.activeLayers)
  const toggleLayer     = useMapStore(s => s.toggleLayer)
  const setKPIs         = useTrafficStore(s => s.setKPIs)
  // Track the selected vehicle to conditionally mount VehicleInfoCard
  const selectedVehicleId = useMapStore(s => s.selectedVehicleId)

  // Optimized KPI generation - only re-gen when traffic data actually updates
  React.useEffect(() => {
    if (mounted) {
      setKPIs(generateCityKPIs(city))
    }
  }, [city, setKPIs, lastUpdated, mounted])

  const layerProps = {
    traffic:   activeLayers.has('traffic'),
    heatmap:   activeLayers.has('heatmap'),
    incidents: activeLayers.has('incidents'),
    boundary:  activeLayers.has('boundary'),
    transport: activeLayers.has('transport'),
  }

  // 🧪 LAZY LOADING: Re-open transport sheet if layer toggled on mobile
  React.useEffect(() => {
    if (layerProps.transport) setIsTransportSheetOpen(true)
  }, [layerProps.transport])

  return (
    <main id="main-content" aria-label="Carte de mobilité urbaine" className="flex flex-1 h-full overflow-hidden relative bg-[#030303]">
      
      {/* 🌑 TOP OVERLAY: Gradient for UI legibility */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030303]/80 via-[#030303]/40 to-transparent z-10 pointer-events-none" />

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <CrossFlowMap />

        {/* --- DYNAMIC HUD LAYER --- */}

        {/* TOP HUD: Status & Health (Centralized for scannability) */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-2 w-full px-4 text-center">
           {mounted && (
             <div className="flex flex-col items-center gap-1.5 opacity-90 backdrop-blur-sm px-4 py-2 rounded-2xl">
               <div className="flex items-center gap-2 pointer-events-auto">
                 <LiveSyncBadge refreshing={isFetching} lastSync={lastUpdated?.toLocaleTimeString()} />
                 <button 
                   onClick={manualRefresh}
                   className="p-1 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                 >
                   <span className={cn("text-[10px] block", isFetching && "animate-spin")}>🔄</span>
                 </button>
               </div>
               <CityPulseHUD />
               {timeSinceUpdate > 1 && (
                 <span className="text-[9px] font-black text-white/30 uppercase tracking-widest animate-pulse">
                   Mise à jour il y a {timeSinceUpdate} min
                 </span>
               )}
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
                isOpen={isTransportSheetOpen} 
                onClose={() => setIsTransportSheetOpen(false)}
                title="Réseau de Transport"
                snapPoints={[0.2, 0.5, 0.9]}
                initialSnap={0.2}
              >
                {/* 🚀 LAZY MOUNT: Panel only active when sheet is visible */}
                {isTransportSheetOpen && <VehicleFilterPanel vehicleCount={0} />}
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
            <div className="bg-black/40 backdrop-blur-3xl p-4 rounded-3xl border border-white/5 w-80 shadow-2xl">
              <VehicleFilterPanel vehicleCount={0} />
            </div>
          )}
        </div>

        {/* CENTER COMPONENTS — only in predict mode */}
        {mounted && mode === 'predict' && <MapSplitSlider />}

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
        
        {/* Current Vehicle Detail — only mount when a vehicle is selected */}
        {mounted && selectedVehicleId && (
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
    </main>
  )
}

  )
}

function PanelSkeleton({ label }: { label: string }) {
  return (
    <div className="w-full h-full bg-bg-surface/80 backdrop-blur-xl flex flex-col p-6 items-center justify-center border-l border-white/5 animate-pulse">
      <div className="w-10 h-10 rounded-full bg-brand/10 mb-4 flex items-center justify-center">
        <span className="text-xl">✨</span>
      </div>
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em]">{label} — Chargement...</p>
    </div>
  )
}
