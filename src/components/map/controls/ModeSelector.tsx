'use client'
import { Radio, Brain, FlaskConical, Sparkles } from 'lucide-react'
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
    <div className="flex bg-black/40 backdrop-blur-3xl rounded-2xl p-1 gap-1 border border-white/10 shadow-[0_15px_35px_rgba(0,0,0,0.6)] ring-1 ring-white/5">
      {MODES.map(({ id, label, sublabel, icon: Icon }) => {
        const active = mode === id
        return (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={cn(
              'flex items-center gap-3 px-5 py-2.5 rounded-xl text-xs font-black transition-all duration-500 relative group overflow-hidden border',
              active
                ? 'bg-brand-green text-bg-base border-brand-green shadow-[0_0_25px_rgba(0,230,118,0.4)] scale-[1.02] z-10'
                : 'text-text-muted hover:text-white hover:bg-white/10 border-transparent grayscale-[0.5] hover:grayscale-0',
            )}
          >
            {/* Active Glow Indicator */}
            {active && (
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50 blur-xl animate-pulse" />
            )}
            
            <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 relative z-10", active ? "text-bg-base" : "text-text-muted group-hover:text-brand-green")} />
            
            <div className="flex flex-col items-start relative z-10">
               <span className={cn("tracking-[0.05em] uppercase leading-none whitespace-nowrap", active ? "text-bg-base" : "text-white")}>
                 {label}
               </span>
               <div className="flex items-center gap-1 mt-1">
                 {active && <span className="w-1 h-1 rounded-full bg-bg-base animate-ping" />}
                 <span className={cn('text-[8px] font-black uppercase tracking-widest transition-opacity', active ? 'text-bg-base/70' : 'text-text-muted')}>
                   {sublabel}
                 </span>
               </div>
            </div>
            
            {/* Hover Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          </button>
        )
      })}
    </div>
  )
}
