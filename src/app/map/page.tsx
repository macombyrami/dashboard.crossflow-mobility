'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { ModeSelector }      from '@/components/map/controls/ModeSelector'
import { LayerControls }     from '@/components/map/controls/LayerControls'
import { TrafficFilterBar }  from '@/components/map/controls/TrafficFilterBar'
import { MapLegend }         from '@/components/map/MapLegend'
import { EdgeDetailPanel }   from '@/components/map/panels/EdgeDetailPanel'
import { ZoneStatsPanel }    from '@/components/map/panels/ZoneStatsPanel'
import { SimulationPanel }   from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { AIPanel }           from '@/components/ai/AIPanel'
import { DataSourceBadge }   from '@/components/map/DataSourceBadge'
import { GlobalTrafficBanner } from '@/components/dashboard/GlobalTrafficBanner'
import { IncidentFeed }   from '@/components/dashboard/IncidentFeed'
import { ControlRoomStatus } from '@/components/map/controlRoom/ControlRoomStatus'
import { CriticalEventsPanel } from '@/components/map/controlRoom/CriticalEventsPanel'
import { TransportOverview } from '@/components/map/controlRoom/TransportOverview'
import { SmartIncidentFeed } from '@/components/map/controlRoom/SmartIncidentFeed'
import { SimulationControlPanel } from '@/components/map/controlRoom/SimulationControlPanel'
import { useMapStore }       from '@/store/mapStore'
import { useTrafficStore }   from '@/store/trafficStore'
import { generateCityKPIs }  from '@/lib/engine/traffic.engine'
import { useEffect }         from 'react'
import { useTranslation }    from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const [activeControlTab, setActiveControlTab] = useState<'transport' | 'incidents' | 'simulation'>('transport')
  const city           = useMapStore(s => s.city)
  const mode           = useMapStore(s => s.mode)
  const isAIPanelOpen  = useMapStore(s => s.isAIPanelOpen)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const setKPIs        = useTrafficStore(s => s.setKPIs)

  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    const interval = setInterval(() => setKPIs(generateCityKPIs(city)), 30_000)
    return () => clearInterval(interval)
  }, [city, setKPIs])


  return (
    <div className="flex flex-1 h-full w-full overflow-hidden bg-bg-base">
      {/* ─── LEFT CONTROL PANEL (Desktop: 30%, Hidden on mobile) ───────────── */}
      <div className="hidden lg:flex lg:w-[30%] flex-col bg-bg-surface border-r border-bg-border overflow-hidden">
        {/* Header with city name */}
        <div className="flex-shrink-0 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">{city.name}</h2>
          </div>

          {/* Control Room Status */}
          <ControlRoomStatus />

          {/* Critical Events (only first 2-3) */}
          <div>
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-2">
              Critical Events
            </h3>
            <CriticalEventsPanel />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 border-b border-bg-border">
          <div className="flex gap-0 px-4">
            {(['transport', 'incidents', 'simulation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveControlTab(tab)}
                className={`
                  flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider
                  border-b-2 transition-colors relative
                  ${activeControlTab === tab
                    ? 'border-white/40 text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable content area - Tab content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
          {/* Transport Tab */}
          {activeControlTab === 'transport' && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-3">
                Busiest Transit Lines
              </h3>
              <TransportOverview />
            </div>
          )}

          {/* Incidents Tab */}
          {activeControlTab === 'incidents' && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-3">
                Active Incidents
              </h3>
              <SmartIncidentFeed />
            </div>
          )}

          {/* Simulation Tab */}
          {activeControlTab === 'simulation' && (
            <div>
              <SimulationControlPanel />
            </div>
          )}

          {/* Layer Controls (always available) */}
          {mode !== 'simulate' && (
            <div className="space-y-2 pt-4 border-t border-bg-border">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2">
                Map Layers
              </h3>
              <LayerControls />
            </div>
          )}
        </div>
      </div>

      {/* ─── MAP CONTAINER (Desktop: 70%, Mobile: 100%) ──────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <CrossFlowMap />

        {/* Global traffic banner — top center (Mobile & Tablet only) */}
        {mode !== 'simulate' && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none w-max max-w-[calc(100vw-280px)] lg:hidden">
            <GlobalTrafficBanner />
          </div>
        )}

        {/* Mode selector */}
        <div className="absolute top-14 lg:top-3 left-1/2 -translate-x-1/2 lg:left-3 lg:translate-x-0 z-10 pointer-events-auto">
          <ModeSelector />
        </div>

        {/* Filter bar */}
        {mode === 'live' && (
          <div className="absolute top-[108px] lg:top-16 left-1/2 -translate-x-1/2 lg:left-3 lg:translate-x-0 z-10 pointer-events-auto">
            <TrafficFilterBar />
          </div>
        )}

        {/* Data source badge — top right */}
        <div className="absolute top-3 right-3 z-10 pointer-events-auto">
          <DataSourceBadge />
        </div>

        {/* Layer controls — top left (Mobile/Tablet only) */}
        {mode !== 'simulate' && (
          <div className="absolute top-3 left-3 z-10 pointer-events-auto lg:hidden">
            <LayerControls />
          </div>
        )}

        {/* Simulation panel — top right (below badge) */}
        {mode === 'simulate' && (
          <div className="absolute top-16 right-3 w-[calc(100%-24px)] sm:w-80 max-h-[calc(100vh-130px)] overflow-y-auto z-20 space-y-3 lg:hidden">
            <SimulationPanel />
            <SimulationResults />
          </div>
        )}

        {/* Map legend */}
        <MapLegend />

        {/* Edge detail panel */}
        {mode !== 'simulate' && <EdgeDetailPanel />}

        {/* Zone stats panel */}
        <ZoneStatsPanel />
      </div>

      {/* ─── AI PANEL (Right sidebar on desktop, overlay on mobile) ──────── */}
      {isAIPanelOpen && (
        <div className="fixed inset-y-14 right-0 w-full sm:w-80 bg-bg-surface/95 backdrop-blur-md z-30 lg:relative lg:inset-auto lg:z-auto lg:w-80 lg:border-l lg:border-bg-border">
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
