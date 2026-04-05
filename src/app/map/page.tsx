'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { X } from 'lucide-react'
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

// ─── SKELETONS ───
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

function MapSkeleton() {
  return (
    <div className="absolute inset-0 bg-[#08090B] flex items-center justify-center">
       <div className="relative flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-brand animate-spin" />
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] animate-pulse">Initialisation Carte...</p>
       </div>
    </div>
  )
}

import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { PilotIsland } from '@/components/mobile/PilotIsland'
import { MobileInsightDrawer } from '@/components/mobile/MobileInsightDrawer'

export default function MapPage() {
  const [mounted, setMounted] = React.useState(false)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = React.useState(false)
  const [isTransportSheetOpen, setIsTransportSheetOpen] = React.useState(false)
  
  const { t } = useTranslation()
  const city  = useMapStore(s => s.city)
  const isMobile = useMediaQuery('(max-width: 768px)')

  // 🔄 HIGH-PERFORMANCE DATA FETCHING
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
  const selectedVehicleId = useMapStore(s => s.selectedVehicleId)

  // Optimized KPI generation
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
    if (layerProps.transport && isMobile) setIsTransportSheetOpen(true)
  }, [layerProps.transport, isMobile])

  return (
    <main id="main-content" aria-label="Carte de mobilité urbaine" className="flex flex-1 h-full overflow-hidden relative bg-[#030303]">
      
      {/* 🌑 TOP OVERLAY: Gradient for UI legibility */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-[#030303]/80 via-[#030303]/40 to-transparent z-10 pointer-events-none" />

      {/* Map area */}
      <div className="flex-1 relative overflow-hidden flex flex-col min-h-0">
        <CrossFlowMap />

        {/* --- DYNAMIC HUD LAYER --- */}

        {/* 📱 MOBILE OVERLAY SET */}
        {mounted && isMobile && !isAIPanelOpen && (
          <>
            <PilotIsland />
            <MobileInsightDrawer />
          </>
        )}

        {/* 💻 DESKTOP HUD: Unified Status & Tactical Dock */}
        {!isMobile && !isAIPanelOpen && mounted && (
          <div className="absolute top-4 left-4 z-30 pointer-events-none flex flex-col gap-4">
            
            {/* Mission Context & System Status */}
            <div className="flex items-center gap-2 pointer-events-auto">
              <div className="bg-bg-surface/60 backdrop-blur-3xl border border-white/10 px-3 py-1.5 rounded-xl shadow-prestige flex items-center gap-3">
                 <div className="flex flex-col">
                   <span className="text-[8px] font-black text-brand uppercase tracking-[0.2em] leading-none mb-1">Système</span>
                   <span className="text-[10px] font-bold text-white uppercase tracking-tighter leading-none">Opérationnel</span>
                 </div>
                 <div className="w-[1px] h-4 bg-white/10" />
                 <LiveSyncBadge refreshing={isFetching} lastSync={lastUpdated?.toLocaleTimeString()} className="!bg-transparent !border-none !p-0" />
              </div>

              <button 
                onClick={manualRefresh}
                className="w-9 h-9 rounded-xl bg-bg-surface/60 backdrop-blur-3xl border border-white/10 hover:bg-white/20 flex items-center justify-center transition-all shadow-prestige group pointer-events-auto"
                title="Rafraîchir les données"
              >
                <div className={cn("text-[10px] group-hover:scale-110", isFetching && "animate-spin")}>🔄</div>
              </button>
            </div>

            {/* Tactical KPI Dock */}
            <CityPulseHUD className="pointer-events-auto" />

            {timeSinceUpdate > 2 && (
              <div className="bg-status-critical/10 border border-status-critical/30 px-3 py-1.5 rounded-xl backdrop-blur-md animate-pulse w-fit">
                <span className="text-[8px] font-black text-status-critical uppercase tracking-[0.2em]">
                  LATENCE TÉLÉMÉTRIE: {timeSinceUpdate} MIN
                </span>
              </div>
            )}
          </div>
        )}

        {/* TOP RIGHT: System Meta (Desktop) */}
        {!isMobile && !isAIPanelOpen && mounted && (
          <div className="hidden lg:flex absolute top-4 right-4 z-30 pointer-events-auto items-center gap-3 bg-bg-surface/60 backdrop-blur-3xl border border-white/10 px-4 py-2 rounded-2xl shadow-prestige">
            <div className="flex flex-col text-right">
              <span className="text-[8px] font-black text-brand uppercase tracking-[0.2em] leading-none mb-1">Réseau Neuronal</span>
              <span className="text-[10px] font-bold text-white uppercase tracking-tighter leading-none">v4.0.2 Stable</span>
            </div>
            <div className="w-px h-6 bg-white/10" />
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand/10 border border-brand/20">
               <span className="text-xs">⚡</span>
            </div>
          </div>
        )}

        {/* 📱 MOBILE NAVIGATION & SHEETS (Legacy Compatibility) */}
        {mounted && isMobile && (
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
                {isTransportSheetOpen && <VehicleFilterPanel vehicleCount={0} />}
              </BottomSheet>
            )}
          </>
        )}

        {/* RIGHT HUD: Desktop Only */}
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

        {/* BOTTOM HUD: Contextual Legends (Repositioned for Mobile) */}
        {mounted && (
          <div className={cn(
            "absolute z-20 pointer-events-none transition-all duration-500",
            "bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:right-6",
            isMobile ? "bottom-32 left-auto translate-x-0 right-4" : "bottom-6"
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

        {/* FLOATING PANELS: Details (Hidden on small mobile if obstructing) */}
        {mounted && !isMobile && mode !== 'simulate' && <EdgeDetailPanel />}
        {mounted && !isMobile && <ZoneStatsPanel />}
        
        {/* Current Vehicle Detail */}
        {mounted && selectedVehicleId && (
           <VehicleInfoCard 
             vehicle={null}
             isDisrupted={false}
           />
        )}

        {/* SIMULATION CONTROLS */}
        {mounted && mode === 'simulate' && (
          <div className={cn(
            "absolute z-20 space-y-3 transition-all duration-500",
            "bottom-20 left-4 right-4 sm:bottom-auto sm:top-16 sm:right-4 sm:left-auto sm:w-80",
            isAIPanelOpen && "opacity-20 pointer-events-none sm:opacity-100 sm:pointer-events-auto"
          )}>
            <SimulationPanel />
            <SimulationResults />
          </div>
        )}
      </div>

      {/* AI SIDEBAR */}
      {mounted && isAIPanelOpen && (
        <div className="fixed inset-0 sm:inset-y-14 sm:right-0 w-full sm:w-80 bg-[#030303] sm:bg-[#030303] border-l border-white/5 z-[200] sm:relative sm:inset-auto sm:z-auto shadow-2xl animate-in fade-in slide-in-from-right duration-300">
          <div className="flex flex-col h-full">
            <div className="sm:hidden flex items-center justify-between p-4 border-b border-white/5">
               <h2 className="text-xs font-black uppercase tracking-widest text-brand">Analyse Intelligence</h2>
               <button onClick={() => setAIPanelOpen(false)} className="p-2 rounded-xl bg-white/5 text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
               </button>
            </div>
            <AIPanel onClose={() => setAIPanelOpen(false)} />
          </div>
        </div>
      )}
    </main>
  )
}
