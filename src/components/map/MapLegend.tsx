import React from 'react'
import { AlertCircle, Zap, Ban, Timer } from 'lucide-react'

interface MapLegendProps {
  showTraffic: boolean
  showIncidents: boolean
}

export default function MapLegend({ showTraffic, showIncidents }: MapLegendProps) {
  if (!showTraffic && !showIncidents) return null

  return (
    <div className="absolute bottom-8 left-4 flex flex-col gap-3 bg-background-panel/60 backdrop-blur-md border border-white/5 rounded-xl p-3 shadow-2xl z-20">
      {/* Traffic Scale */}
      {showTraffic && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-text-muted">
            <Zap className="w-3 h-3 text-brand-primary" />
            <span>Congestion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-1 rounded-full bg-traffic-free shadow-[0_0_8px_#22C55E]" />
            <div className="w-6 h-1 rounded-full bg-traffic-slow shadow-[0_0_8px_#EAB308]" />
            <div className="w-6 h-1 rounded-full bg-traffic-heavy shadow-[0_0_8px_#F97316]" />
            <div className="w-6 h-1 rounded-full bg-traffic-blocked shadow-[0_0_8px_#EF4444]" />
            <span className="text-[10px] text-text-muted pl-1">Fluide ↔ Bloqué</span>
          </div>
        </div>
      )}

      {/* Incidents */}
      {showIncidents && (
        <div className="flex flex-col gap-2 pt-1 border-t border-white/5">
          <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-text-muted">
            <AlertCircle className="w-3 h-3 text-traffic-heavy" />
            <span>Incidents</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-traffic-heavy border border-white/20" />
              <span className="text-[10px] text-text-muted">Accident</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-traffic-slow border border-white/20" />
              <span className="text-[10px] text-text-muted">Travaux</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
