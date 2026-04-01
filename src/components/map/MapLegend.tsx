import React, { useState } from 'react'
import { Info, AlertTriangle, Layers, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

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
        className="md:hidden flex items-center justify-between w-[calc(100vw-2rem)] h-12 px-4 rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-apple text-white/80"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          <span className="text-sm font-bold">Légende de la carte</span>
        </div>
        {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
      </button>

      <div className={cn(
        "flex-col gap-3 p-4 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/10 shadow-apple ring-1 ring-white/5 w-[calc(100vw-2rem)] md:w-64 transition-all hover:bg-black/90",
        "absolute md:relative bottom-14 md:bottom-auto",
        isOpen ? "flex" : "hidden md:flex"
      )}>
        
        {/* NIVEAU DE CONGESTION (Unified V3) */}
        {showTraffic && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Niveau de Congestion</span>
               <div className="group relative">
                  <Info className="w-3.5 h-3.5 text-white/20 hover:text-white transition-colors cursor-help" />
                  <div className="absolute bottom-full right-0 mb-3 w-48 p-2.5 bg-black/95 border border-white/10 rounded-xl text-[10px] text-white/60 leading-relaxed shadow-2xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all pointer-events-none z-30">
                     Analyse <strong>TOM</strong> (Time-Of-Movement) basée sur la différence entre le temps de trajet libre et actuel.
                  </div>
               </div>
            </div>

            <div className="flex flex-col gap-1.5">
               <div className="h-1.5 w-full rounded-full overflow-hidden flex bg-white/5 border border-white/5">
                  <div className="h-full w-1/3 bg-[#00D966] shadow-[0_0_10px_rgba(0,217,102,0.3)]" />
                  <div className="h-full w-1/3 bg-[#FF9500] shadow-[0_0_10px_rgba(255,149,0,0.3)]" />
                  <div className="h-full w-1/3 bg-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.3)]" />
               </div>
               <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-[#00D966]">Fluide</span>
                  <span className="text-[#FF9500]">Modéré</span>
                  <span className="text-[#FF3B30]">Critique</span>
               </div>
            </div>
            
            <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter italic">Basé sur l'analyse de flux routiers CrossFlow</p>
          </div>
        )}

        {showTraffic && showIncidents && <div className="h-px bg-white/5 w-full" />}

        {/* INCIDENTS (Unified V3) */}
        {showIncidents && (
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Type d'Événements</span>
            <div className="grid grid-cols-2 gap-2">
               <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_5px_rgba(255,59,48,0.5)]" />
                  <span className="text-[9px] font-black text-white/60 uppercase">Travaux</span>
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-[#FF9500] shadow-[0_0_5px_rgba(255,149,0,0.5)]" />
                  <span className="text-[9px] font-black text-white/60 uppercase">Incident</span>
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-[#007AFF] shadow-[0_0_5px_rgba(0,122,255,0.5)]" />
                  <span className="text-[9px] font-black text-white/60 uppercase">Social</span>
               </div>
               <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5 border border-white/5">
                  <div className="w-2 h-2 rounded-full bg-white/40" />
                  <span className="text-[9px] font-black text-white/60 uppercase">Autre</span>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
