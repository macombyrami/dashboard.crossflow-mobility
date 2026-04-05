import React from 'react'
import { Layers, Activity, Thermometer, AlertTriangle, Map as MapIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LayerControlsProps {
  layers: {
    traffic: boolean
    heatmap: boolean
    incidents: boolean
    boundary: boolean
    transport?: boolean
  }
  onToggle: (layer: string) => void
  className?: string
}

export default function LayerControls({ layers, onToggle, className }: LayerControlsProps) {
  const controlItems = [
    { id: 'traffic',   label: 'TRAFFIC',   icon: Activity,      active: layers.traffic },
    { id: 'heatmap',   label: 'ANALYSE',   icon: Thermometer,   active: layers.heatmap },
    { id: 'incidents', label: 'ALERTE',    icon: AlertTriangle, active: layers.incidents },
    { id: 'boundary',  label: 'BASSIN',    icon: MapIcon,       active: layers.boundary },
  ]

  return (
    <div className={cn(
      "flex flex-col gap-1 p-1 bg-bg-surface/80 backdrop-blur-3xl border border-white/5 rounded-xl shadow-2xl transition-all",
      className
    )}>
      {controlItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={cn(
            "relative flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-300 group/btn",
            item.active 
              ? "bg-brand/10 text-brand border border-brand/20 shadow-glow-sm" 
              : "text-text-muted hover:bg-white/5 hover:text-text-secondary"
          )}
          title={item.label}
          aria-pressed={item.active}
        >
          <item.icon className={cn(
            "w-4 h-4 transition-transform group-hover/btn:scale-110",
            item.active ? "text-brand" : "text-text-muted"
          )} />
          
          {/* Active indicator dot (High Precision) */}
          {item.active && (
            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-[2px] h-4 bg-brand rounded-full shadow-glow" />
          )}

          {/* Label tooltip (Desktop) */}
          <span className="absolute left-[calc(100%+12px)] px-2 py-1 bg-bg-elevated text-[8px] font-black uppercase tracking-[0.2em] text-white rounded border border-white/10 whitespace-nowrap opacity-0 group-hover/btn:opacity-100 transition-all pointer-events-none translate-x-[-10px] group-hover/btn:translate-x-0 z-50">
            {item.label}
          </span>
        </button>
      ))}
    </div>
  )
}
