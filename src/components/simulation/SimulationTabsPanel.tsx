'use client'

import { useState } from 'react'
import { BarChart2, Sliders } from 'lucide-react'

import { SimulationResults } from '@/components/simulation/SimulationResults'
import { StatsPanel } from '@/components/simulation/StatsPanel'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { id: 'simulation', label: 'Simulation', icon: Sliders },
  { id: 'analytics', label: 'Analytique', icon: BarChart2 },
] as const

type TabId = typeof TABS[number]['id']

export function SimulationTabsPanel() {
  const [tab, setTab] = useState<TabId>('simulation')

  return (
    <div className="h-full flex flex-col">
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all border',
                active
                  ? 'bg-brand/10 text-brand border-brand/20'
                  : 'bg-white/[0.03] text-text-secondary border-white/5 hover:bg-white/5 hover:text-text-primary',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'simulation' && <SimulationResults />}
        {tab === 'analytics' && <StatsPanel />}
      </div>
    </div>
  )
}
