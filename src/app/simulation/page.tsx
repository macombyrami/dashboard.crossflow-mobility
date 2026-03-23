'use client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'
import { useEffect } from 'react'
import { FlaskConical, Info } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <div className="w-full h-full bg-bg-surface" /> },
)

export default function SimulationPage() {
  const { t } = useTranslation()
  const city       = useMapStore(s => s.city)
  const setKPIs    = useTrafficStore(s => s.setKPIs)
  const setIncidents = useTrafficStore(s => s.setIncidents)

  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    setIncidents(generateIncidents(city))
  }, [city, setKPIs, setIncidents])

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: config panel (Scrollable on desktop, part of stack on mobile) */}
          <div className="w-full lg:w-80 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-brand-green" />
              <h2 className="text-sm font-semibold text-text-primary">{t('simulation.title')}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-start gap-2.5 bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] rounded-xl p-3">
                <Info className="w-3.5 h-3.5 text-[#2979FF] flex-shrink-0 mt-0.5" />
                <p className="text-xs text-[#2979FF] leading-relaxed">
                  Select a scenario, configure parameters, and run to see the impact on <strong>{city.name}</strong>'s network.
                </p>
              </div>
              <SimulationPanel />
            </div>
          </div>

          {/* Center: map (Main area) */}
          <div className="flex-1 relative min-h-[300px]">
            <CrossFlowMap />
            <div className="absolute top-4 left-4 bg-bg-surface/90 border border-bg-border rounded-xl px-3 py-2 backdrop-blur-sm z-10">
              <p className="text-xs text-text-muted">Mode <span className="text-brand-green font-semibold">SIMULATION</span></p>
            </div>
          </div>

          {/* Right: results (Scrollable on desktop, bottom stack on mobile) */}
          <div className="w-full lg:w-80 flex-shrink-0 border-t lg:border-t-0 lg:border-l border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
            <div className="px-5 py-4 border-b border-bg-border">
              <h2 className="text-sm font-semibold text-text-primary">{t('simulation.results')}</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <SimulationResults />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
