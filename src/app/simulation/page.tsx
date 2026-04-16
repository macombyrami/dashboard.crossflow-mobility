'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ChartColumnBig, GitBranch, Info, Rss } from 'lucide-react'

import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { SimulationResults } from '@/components/simulation/SimulationResults'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { StatsPanel } from '@/components/simulation/StatsPanel'

import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateCityKPIs, generateIncidents } from '@/lib/engine/traffic.engine'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <div className="w-full h-full bg-bg-surface" /> },
)

type RightTab = 'results' | 'analytics' | 'social'

export default function SimulationPage() {
  const { t } = useTranslation()
  const city = useMapStore(s => s.city)
  const setKPIs = useTrafficStore(s => s.setKPIs)
  const setIncidents = useTrafficStore(s => s.setIncidents)
  const [rightTab, setRightTab] = useState<RightTab>('results')

  useEffect(() => { document.title = `Simulation — ${city.name} | CrossFlow` }, [city.name])

  useEffect(() => {
    setKPIs(generateCityKPIs(city))
    setIncidents(generateIncidents(city))
  }, [city, setKPIs, setIncidents])

  return (
    <div className="flex flex-1 flex-col lg:flex-row h-full overflow-hidden">
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-brand" />
          <h2 className="text-sm font-semibold text-text-primary">{t('simulation.title')}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-start gap-2.5 bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] rounded-xl p-3">
            <Info className="w-3.5 h-3.5 text-[#2979FF] shrink-0 mt-0.5" />
            <p className="text-xs text-[#2979FF] leading-relaxed">
              Sélectionnez un scénario, configurez les paramètres, puis lancez pour voir l&apos;impact sur le réseau de <strong>{city.name}</strong>.
            </p>
          </div>

          <SimulationPanel />
        </div>
      </div>

      <div className="flex-1 relative min-h-[300px]">
        <CrossFlowMap />
        <div className="absolute top-4 left-4 bg-bg-surface/90 border border-bg-border rounded-xl px-3 py-2 backdrop-blur-sm z-10">
          <p className="text-xs text-text-muted">
            Mode <span className="text-brand font-semibold">SIMULATION</span>
          </p>
        </div>
      </div>

      <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
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
            onClick={() => setRightTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-semibold transition-colors border-b-2 ${
              rightTab === 'analytics'
                ? 'border-brand text-brand bg-brand/5'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
            }`}
          >
            <ChartColumnBig className="w-3.5 h-3.5" />
            Analytique
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

        <div className="flex-1 overflow-hidden">
          {rightTab === 'results' ? (
            <div className="h-full overflow-y-auto p-4">
              <SimulationResults />
            </div>
          ) : rightTab === 'analytics' ? (
            <div className="h-full overflow-y-auto p-4">
              <StatsPanel />
            </div>
          ) : (
            <SytadinFeed />
          )}
        </div>
      </div>
    </div>
  )
}
