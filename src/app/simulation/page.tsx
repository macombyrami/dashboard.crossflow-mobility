'use client'
import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { PredictiveStatus } from '@/components/simulation/PredictiveStatus'
import { IdfNetworkStats } from '@/components/simulation/IdfNetworkStats'
import { MiroFishPanel } from '@/components/simulation/MiroFishPanel'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useSimulationStore } from '@/store/simulationStore'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'


import { useEffect, useState } from 'react'
import { Brain, GitBranch, Info, Rss } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { Metadata } from 'next'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <div className="w-full h-full bg-bg-surface" /> },
)

type RightTab = 'results' | 'social' | 'mirofish'

export default function SimulationPage() {
  const { t } = useTranslation()
  const city         = useMapStore((s: any) => s.city)

  useEffect(() => { document.title = `Simulation — ${city.name} | CrossFlow` }, [city.name])
  const setKPIs      = useTrafficStore((s: any) => s.setKPIs)
  const setIncidents = useTrafficStore((s: any) => s.setIncidents)
  const setGraphLoaded = useSimulationStore((s: any) => s.setGraphLoaded)
  const setBackendOnline = useSimulationStore((s: any) => s.setBackendOnline)


  const [rightTab, setRightTab] = useState<RightTab>('results')


  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    setIncidents(generateIncidents(city))

    // Predictive backend auto-load
    const initBackend = async () => {
      try {
        const h = await import('@/lib/api/predictive').then(m => m.predictiveApi.health())
        setBackendOnline(h.online)
        if (h.online) {
          if (!h.graph_loaded) {
            // Use full OSMnx city name, e.g. "Paris, France"
            const cityName = `${city.name}, ${city.country}`
            await import('@/lib/api/predictive').then(m => m.predictiveApi.loadGraph(cityName))
            setGraphLoaded(true)
          } else {
            setGraphLoaded(true)
          }
        }
      } catch (err) {
        console.error('Predictive backend failed to init:', err)
        setBackendOnline(false)
      }
    }
    initBackend()
  }, [city, setKPIs, setIncidents, setBackendOnline, setGraphLoaded])


  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">

      {/* ── Left: config panel ── */}
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-text-primary">{t('simulation.title')}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-2.5 bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] rounded-xl p-3">
            <Info className="w-3.5 h-3.5 text-[#2979FF] shrink-0 mt-0.5" />
            <p className="text-xs text-[#2979FF] leading-relaxed">
              Sélectionnez un scénario, configurez les paramètres, puis lancez pour voir l'impact sur le réseau de <strong>{city.name}</strong>.
            </p>
          </div>

          {/* Predictive backend status */}
          <PredictiveStatus />

          {/* IDF real network stats */}
          <IdfNetworkStats />

          <SimulationPanel />
        </div>
      </div>

      {/* ── Center: map ── */}
      <div className="flex-1 relative min-h-[300px]">
        <CrossFlowMap />
        <div className="absolute top-4 left-4 bg-bg-surface/90 border border-bg-border rounded-xl px-3 py-2 backdrop-blur-sm z-10">
          <p className="text-xs text-text-muted">Mode <span className="text-brand font-semibold">SIMULATION</span></p>
        </div>
      </div>

      {/* ── Right: tabbed panel (Results | Social) ── */}
      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">

        {/* Tab bar */}
        <div className="flex border-b border-bg-border shrink-0">
          <button
            onClick={() => setRightTab('results')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === 'results'
                ? 'border-brand text-brand bg-brand/5'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            {t('simulation.results')}
          </button>
          <button
            onClick={() => setRightTab('mirofish')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === 'mirofish'
                ? 'border-purple-400 text-purple-400 bg-purple-400/5'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            IA Agents
          </button>
          <button
            onClick={() => setRightTab('social')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === 'social'
                ? 'border-[#1DA1F2] text-[#1DA1F2] bg-[#1DA1F2]/5'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <Rss className="w-3.5 h-3.5" />
            Social
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          {rightTab === 'results' ? (
            <div className="h-full overflow-y-auto p-4">
              <SimulationResults />
            </div>
          ) : rightTab === 'mirofish' ? (
            <div className="h-full overflow-y-auto p-4">
              <MiroFishPanel />
            </div>
          ) : (
            <SytadinFeed />
          )}
        </div>
      </div>

    </div>
  )
}
