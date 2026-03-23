'use client'
import { Radio, Brain, FlaskConical } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { TrafficMode } from '@/types'

const MODES: { id: TrafficMode; label: string; sublabel: string; icon: typeof Radio }[] = [
  { id: 'live',     label: 'Temps réel', sublabel: 'En direct',   icon: Radio },
  { id: 'predict',  label: 'Prévision',  sublabel: '+30 min',     icon: Brain },
  { id: 'simulate', label: 'Simulation', sublabel: 'Scénarios',   icon: FlaskConical },
]

export function ModeSelector() {
  const mode    = useMapStore(s => s.mode)
  const setMode = useMapStore(s => s.setMode)

  return (
    <div className="flex rounded-xl bg-bg-surface border border-bg-border p-1 gap-1">
      {MODES.map(({ id, label, sublabel, icon: Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all',
              active
                ? 'bg-brand-green text-bg-base shadow-glow'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated',
            )}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="tracking-wider">{label}</span>
            <span className={cn('text-[10px] font-normal', active ? 'text-bg-base/70' : 'text-text-muted')}>
              {sublabel}
            </span>
          </button>
        )
      })}
    </div>
  )
}
