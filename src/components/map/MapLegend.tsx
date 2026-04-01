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
      {/* Mobile Toggle Button (48px touch target) */}
      <button 
        className="md:hidden flex items-center justify-between w-[calc(100vw-2rem)] h-12 px-4 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-apple text-white/80 transition-all hover:bg-black"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <span className="text-sm font-black uppercase tracking-widest">Légende</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
      </button>

      <div className={cn(
        "transition-all duration-500",
        isOpen ? "flex animate-in fade-in slide-in-from-bottom-4" : "hidden md:flex"
      )}>
        {showTraffic && (
          <Legend
            title="Niveau de Congestion"
            items={[
              { label: "Fluide", color: "#00D966" },
              { label: "Modéré", color: "#FF9500" },
              { label: "Critique", color: "#FF3B30" }
            ]}
            description="Analyse en temps réel des flux via TomTom Traffic Index."
            className="w-[calc(100vw-2rem)] md:w-64"
          />
        )}
      </div>
    </div>
  )
}
