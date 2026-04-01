import React from 'react'
import { Layers, Activity, Thermometer, AlertTriangle, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LayerControlsProps {
  layers: {
    traffic: boolean
    heatmap: boolean
    incidents: boolean
    boundary: boolean
  }
  onToggle: (layer: string) => void
  className?: string
}

export default function LayerControls({ layers, onToggle, className }: LayerControlsProps) {
  const controlItems = [
    { id: 'traffic',   label: 'Traffic',   icon: Activity,      active: layers.traffic },
    { id: 'heatmap',   label: 'Pollution', icon: Thermometer,   active: layers.heatmap },
    { id: 'incidents', label: 'Incidents', icon: AlertTriangle, active: layers.incidents },
    { id: 'boundary',  label: 'Limites',   icon: MapIcon,       active: layers.boundary },
  ]

  return (
    <div className={cn("flex flex-col gap-2 z-20 transition-all duration-500", className)}>
      <div className="flex flex-col gap-1.5 bg-background-panel/80 backdrop-blur-xl border border-white/10 rounded-[18px] p-2 shadow-2xl overflow-hidden active:scale-95 transition-transform">
        {controlItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onToggle(item.id)}
            className={cn(
              "flex items-center gap-3 px-3 h-11 min-w-[120px] rounded-xl transition-all duration-300 group touch-manipulation",
              item.active 
                ? "bg-brand-primary/20 text-brand-primary shadow-[inset_0_0_12px_rgba(34,197,94,0.1)]" 
                : "text-text-muted hover:bg-white/5 hover:text-white"
            )}
            aria-pressed={item.active}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-transform group-hover:scale-110 shrink-0",
              item.active ? "text-brand-primary animate-pulse" : "text-text-muted"
            )} />
            <span className="text-xs font-medium pr-1">{item.label}</span>
            {item.active && (
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary shadow-[0_0_8px_#22C55E]" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
