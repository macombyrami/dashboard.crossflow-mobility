'use client'

import { useEffect } from 'react'
import { GitBranch, Info } from 'lucide-react'

import { SimulationPanel } from '@/components/simulation/SimulationPanel'
import { StatsPanel } from '@/components/simulation/StatsPanel'
import { SimulationMap } from '@/components/simulation/SimulationMap'
import { useMapStore } from '@/store/mapStore'

export default function SimulationPage() {
  const city = useMapStore(s => s.city)

  useEffect(() => {
    document.title = `Simulation — ${city.name} | CrossFlow`
  }, [city.name])

  return (
    <div className="flex flex-1 flex-col h-full overflow-hidden">
      <div className="px-4 sm:px-6 lg:px-8 py-4 border-b border-bg-border bg-bg-surface/40">
        <div className="flex items-center gap-3">
          <div className="w-2 h-8 rounded-full bg-brand shadow-glow" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase font-heading">
              Simulation
            </h1>
            <p className="text-[11px] sm:text-xs text-text-muted uppercase tracking-[0.18em] font-bold">
              Tester l&apos;impact
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
        <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
          <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-text-primary">Simulation</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-start gap-2.5 bg-[rgba(41,121,255,0.08)] border border-[rgba(41,121,255,0.2)] rounded-xl p-3">
              <Info className="w-3.5 h-3.5 text-[#2979FF] shrink-0 mt-0.5" />
              <p className="text-xs text-[#2979FF] leading-relaxed">
                Sélectionnez un segment ou un point sur la carte, puis appliquez le blocage, le trafic ou l&apos;événement sur le réseau de <strong>{city.name}</strong>.
              </p>
            </div>

            <SimulationPanel />
          </div>
        </div>

        <div className="flex-1 relative min-h-[300px]">
          <SimulationMap />
          <div className="absolute top-4 left-4 bg-bg-surface/90 border border-bg-border rounded-xl px-3 py-2 backdrop-blur-sm z-10">
            <p className="text-xs text-text-muted">
              Mode <span className="text-brand font-semibold">SIMULATION</span>
            </p>
          </div>
        </div>

        <div className="w-full lg:w-80 shrink-0 border-t lg:border-t-0 lg:border-l border-bg-border flex flex-col max-h-[40vh] lg:max-h-full overflow-hidden">
          <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-text-primary">Analytique réseau</h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <StatsPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
