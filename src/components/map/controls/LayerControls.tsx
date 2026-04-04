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
    <div className={cn("flex items-center gap-1.5 p-1.5 bg-bg-surface/60 backdrop-blur-3xl border border-white/10 rounded-full shadow-2xl transition-all hover:border-white/20 group", className)}>
      {controlItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={cn(
            "relative flex items-center justify-center w-11 h-11 rounded-full transition-all duration-300 group/btn",
            item.active 
              ? "bg-white/10 text-brand shadow-[0_0_15px_rgba(0,255,157,0.1)]" 
              : "text-text-muted hover:bg-white/5 hover:text-white"
          )}
          title={item.label}
          aria-pressed={item.active}
        >
          <item.icon className={cn(
            "w-5 h-5 transition-transform group-hover/btn:scale-110",
            item.active ? "text-brand" : "text-text-muted"
          )} />
          
          {/* Active indicator dot */}
          {item.active && (
            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_#00FF9D] animate-pulse" />
          )}

          {/* Label tooltip (Desktop) */}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-[9px] font-black uppercase tracking-widest text-white rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap z-50">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}
