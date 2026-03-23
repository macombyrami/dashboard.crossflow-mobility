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
    <div className="flex glass rounded-apple p-1.5 gap-1.5 shadow-apple border border-white/5">
      {MODES.map(({ id, label, sublabel, icon: Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center gap-2.5 px-5 py-2 rounded-apple text-[13px] font-semibold transition-all duration-300 relative group overflow-hidden',
              active
                ? 'bg-brand-green text-bg-base shadow-glow'
                : 'text-text-secondary hover:text-white hover:bg-white/5',
            )}
          >
            <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", active ? "text-bg-base" : "text-text-muted group-hover:text-text-secondary")} />
            <div className="flex flex-col items-start translate-y-[-1px]">
               <span className="tracking-tight leading-none">{label}</span>
               <span className={cn('text-[9px] font-bold uppercase tracking-wider mt-1 opacity-60', active ? 'text-bg-base' : 'text-text-muted')}>
                 {sublabel}
               </span>
            </div>
          </button>
        )
      })}
    </div>
  )
}
