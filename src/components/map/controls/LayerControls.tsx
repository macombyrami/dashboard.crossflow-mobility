'use client'
import { Car, Flame, Train, AlertTriangle, BrainCircuit, Layers } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { MapLayerId } from '@/types'

const LAYERS: { id: MapLayerId; label: string; icon: typeof Car; hint?: string }[] = [
  { id: 'traffic',    label: 'Trafic',     icon: Car,          hint: 'Flux en temps réel' },
  { id: 'heatmap',    label: 'Heatmap',    icon: Flame,        hint: 'Densité thermique' },
  { id: 'transport',  label: 'Transport',  icon: Train,        hint: 'Réseaux TC' },
  { id: 'incidents',  label: 'Incidents',  icon: AlertTriangle,hint: 'Accidents & travaux' },
  { id: 'prediction', label: 'Prédiction', icon: BrainCircuit, hint: '+30 min IA' },
]

export function LayerControls() {
  const activeLayers = useMapStore(s => s.activeLayers)
  const toggleLayer  = useMapStore(s => s.toggleLayer)

  return (
    <div className="bg-bg-surface border border-bg-border rounded-xl p-3 space-y-1 min-w-[160px]">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Calques</span>
      </div>
      {LAYERS.map(({ id, label, icon: Icon }) => {
        const active = activeLayers.has(id)
        return (
          <button
            key={id}
            onClick={() => toggleLayer(id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all',
              active
                ? 'bg-brand-green-dim text-brand-green'
                : 'text-text-muted hover:text-text-secondary hover:bg-bg-elevated',
            )}
          >
            <span className={cn(
              'w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 transition-all',
              active ? 'bg-brand-green border-brand-green' : 'border-bg-border',
            )}>
              {active && <span className="block w-2 h-1.5 border-b-2 border-r-2 border-bg-base rotate-45 mb-0.5" />}
            </span>
            <Icon className="w-3 h-3 flex-shrink-0 opacity-70" />
            {label}
          </button>
        )
      })}
    </div>
  )
}
