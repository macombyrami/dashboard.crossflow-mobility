'use client'
import React, { useState } from 'react'
import { Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Legend } from '@/components/ui/Legend'

interface MapLegendProps {
  showTraffic?: boolean
  showIncidents?: boolean
  className?: string
}

export default function MapLegend({ showTraffic = true, showIncidents = true, className }: MapLegendProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!showTraffic && !showIncidents) return null

  return (
    <div className={cn("z-20 pointer-events-auto transition-all duration-500", className)}>
      {/* 🔘 HUD Toggle Button */}
      <button 
        className={cn(
          "flex items-center justify-between gap-3 h-10 px-4 rounded-xl transition-all duration-300",
          "bg-bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-prestige",
          "hover:bg-white/10 text-white/80 hover:text-white",
          isOpen ? "mb-2" : ""
        )}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Légende Flux</span>
        </div>
        {isOpen ? <ChevronDown className="w-4 h-4 opacity-40" /> : <ChevronUp className="w-4 h-4 opacity-40" />}
      </button>

      <div className={cn(
        "transition-all duration-500",
        isOpen ? "flex animate-in fade-in slide-in-from-bottom-2" : "hidden md:flex"
      )}>
        {showTraffic && (
          <Legend
            title="Index de Congestion"
            items={[
              { label: "Nominal", color: "#00FF9D" },
              { label: "Saturé", color: "#FFD60A" },
              { label: "Critique", color: "#FF3B30" }
            ]}
            description="Télémétrie multisources (TomTom + HERE + Flux V2X)."
            className="w-56"
          />
        )}
      </div>
    </div>
  )
}
