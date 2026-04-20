'use client'
import { Radio, Brain, FlaskConical } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { TrafficMode } from '@/types'

const MODES: { id: TrafficMode; label: string; sublabel: string; icon: typeof Radio }[] = [
  { id: 'live',     label: 'Temps réel', sublabel: 'En direct', icon: Radio        },
  { id: 'predict',  label: 'Prévision',  sublabel: '+30 min',   icon: Brain        },
  { id: 'simulate', label: 'Simulation', sublabel: 'Scénarios', icon: FlaskConical },
]

export function ModeSelector() {
  const mode    = useMapStore(s => s.mode)
  const setMode = useMapStore(s => s.setMode)

  return (
    <div className="glass-card flex rounded-xl p-1 gap-1">
      {MODES.map(({ id, label, sublabel, icon: Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 group',
              active
                ? 'bg-brand text-black shadow-md'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle',
            )}
          >
            <Icon
              className={cn('w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110', active ? 'text-black' : 'text-text-muted group-hover:text-text-secondary')}
              strokeWidth={2}
            />
            <div className="flex flex-col items-start leading-none">
              <span className="tracking-tight">{label}</span>
              <span className={cn('text-[9px] font-bold uppercase tracking-wider mt-0.5 opacity-70', active ? 'text-black' : 'text-text-muted')}>
                {sublabel}
              </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
