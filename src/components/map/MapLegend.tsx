import React from 'react'
import { AlertCircle, Zap, Info, Timer, Globe } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MapLegendProps {
  showTraffic: boolean
  showIncidents: boolean
}

export default function MapLegend({ showTraffic, showIncidents }: MapLegendProps) {
  if (!showTraffic && !showIncidents) return null

  return (
    <div className="absolute bottom-8 left-4 flex flex-col gap-3 bg-bg-surface/80 backdrop-blur-3xl border border-white/10 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.4)] z-20 transition-all hover:bg-bg-surface/90 ring-1 ring-white/5">
      
      {/* 🧩 Header Audit: Label context & Source */}
      <div className="flex items-center justify-between mb-1 pb-2 border-b border-white/5">
        <span className="text-[9px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-brand-green" />
          Légende de Carte
        </span>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 group cursor-help">
          <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">TOM</span>
          <Info className="w-2.5 h-2.5 text-white/30 group-hover:text-white transition-colors" />
          
          {/* Tooltip for TOM acronym */}
          <div className="absolute left-full bottom-0 ml-3 px-3 py-2 bg-black/95 border border-white/10 rounded-xl text-[9px] text-white/70 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all invisible group-hover:visible translate-x-[-10px] group-hover:translate-x-0 shadow-2xl">
             <span className="text-brand-green font-black">TOM</span> = TomTom Live Traffic Network
          </div>
        </div>
      </div>

      {/* 🚦 Traffic Scale: Labeled with min/max */}
      {showTraffic && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.1em] text-white/60">
            <Zap className="w-3.5 h-3.5 text-brand-green" />
            <span>Niveau de Congestion</span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <div className="flex-1 h-1.5 rounded-full bg-traffic-free shadow-[0_0_12px_rgba(34,197,94,0.4)]" title="Fluide" />
              <div className="flex-1 h-1.5 rounded-full bg-traffic-slow shadow-[0_0_12px_rgba(234,179,8,0.4)]" title="Ralenti" />
              <div className="flex-1 h-1.5 rounded-full bg-traffic-heavy shadow-[0_0_12px_rgba(249,115,22,0.4)]" title="Dense" />
              <div className="flex-1 h-1.5 rounded-full bg-traffic-blocked shadow-[0_0_12px_rgba(239,68,68,0.4)]" title="Bloqué" />
            </div>
            <div className="flex justify-between items-center text-[9px] font-black text-white/30 uppercase tracking-[0.1em] px-0.5">
              <span>Fluide</span>
              <span>Modéré</span>
              <span>Critique</span>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ Incidents */}
      {showIncidents && (
        <div className="flex flex-col gap-2 pt-2 mt-1 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-[0.1em] text-white/60">
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
            <span>Types de Perturbations</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)] border border-white/20" />
              <span className="text-[10px] text-text-muted font-bold group-hover:text-white transition-colors">Accident</span>
            </div>
            <div className="flex items-center gap-2 group cursor-default">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,191,36,0.4)] border border-white/20" />
              <span className="text-[10px] text-text-muted font-bold group-hover:text-white transition-colors">Incident</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
