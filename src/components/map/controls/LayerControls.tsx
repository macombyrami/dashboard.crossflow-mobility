'use client'
import { Car, Flame, Train, AlertTriangle, BrainCircuit, Layers, MapPinned } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { MapLayerId } from '@/types'

const LAYERS: { id: MapLayerId; label: string; icon: typeof Car; hint?: string }[] = [
  { id: 'traffic',    label: 'Trafic',     icon: Car,          hint: 'Flux en temps réel' },
  { id: 'heatmap',    label: 'Heatmap',    icon: Flame,        hint: 'Densité thermique' },
  { id: 'transport',  label: 'Transport',  icon: Train,        hint: 'Réseaux TC' },
  { id: 'incidents',  label: 'Incidents',  icon: AlertTriangle,hint: 'Accidents & travaux' },
  { id: 'prediction', label: 'Prédiction', icon: BrainCircuit, hint: '+30 min IA' },
  { id: 'boundary',   label: 'Contour ville', icon: MapPinned, hint: 'Délimitation administrative' },
]

export function LayerControls() {
  const activeLayers = useMapStore(s => s.activeLayers)
  const toggleLayer  = useMapStore(s => s.toggleLayer)

  return (
    <div className="glass rounded-apple p-4 space-y-2 min-w-[180px] shadow-apple border border-white/5">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <Layers className="w-4 h-4 text-text-muted" />
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Calques</span>
      </div>
      {LAYERS.map(({ id, label, icon: Icon }) => {
        const active = activeLayers.has(id)
        return (
          <button
            key={id}
            onClick={() => toggleLayer(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-apple text-[13px] font-medium transition-all group duration-200',
              active
                ? 'bg-brand-green/10 text-brand-green'
                : 'text-text-secondary hover:text-white hover:bg-white/5',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-apple border flex items-center justify-center flex-shrink-0 transition-all duration-300',
              active ? 'bg-brand-green border-brand-green shadow-glow' : 'border-white/10 group-hover:border-white/20',
            )}>
              {active && <span className="block w-2 h-1.5 border-b-2 border-r-2 border-bg-base rotate-45 mb-0.5" />}
            </div>
            <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-brand-green" : "text-text-muted group-hover:text-text-secondary")} />
            <span className="tracking-tight">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
