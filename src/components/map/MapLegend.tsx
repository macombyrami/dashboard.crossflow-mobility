'use client'
import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

const ROAD_TYPES = [
  { label: 'Autoroute',      color: '#FF1744', width: 7 },
  { label: 'Route nationale',color: '#FF6D00', width: 5.5 },
  { label: 'Axe principal',  color: '#FFD600', width: 4 },
  { label: 'Axe secondaire', color: '#22C55E', width: 3 },
]

const HEATMAP_LEGENDS = {
  congestion: {
    title: 'Congestion Routière',
    unit:  'Intensité',
    steps: [
      { label: 'Fluide',    color: 'rgba(34, 197, 94, 0.8)' },
      { label: 'Ralenti',   color: 'rgba(255, 214, 0, 0.8)' },
      { label: 'Saturé',    color: 'rgba(255, 59, 48, 0.9)' },
    ]
  },
  passages: {
    title: 'Flux de Passages',
    unit:  'Véhicules / h',
    steps: [
      { label: '< 500',     color: 'rgba(0, 150, 255, 0.6)' },
      { label: '2000',      color: 'rgba(0, 255, 150, 0.8)' },
      { label: '5000+',     color: 'rgba(255, 255, 0, 0.9)' },
    ]
  },
  co2: {
    title: 'Émissions CO₂',
    unit:  'g/km/véh',
    steps: [
      { label: 'Faible',    color: 'rgba(100, 0, 200, 0.6)' },
      { label: 'Moyen',     color: 'rgba(200, 50, 50, 0.8)' },
      { label: 'Critique',  color: 'rgba(255, 30, 30, 0.9)' },
    ]
  }
}

export function MapLegend() {
  const [open, setOpen] = useState(false)
  const activeLayers = useMapStore(s => s.activeLayers)
  const heatmapMode  = useMapStore(s => s.heatmapMode)
  
  const isHeatmap    = activeLayers.has('heatmap')
  const isTraffic    = activeLayers.has('traffic')
  const isTransport  = activeLayers.has('transport')
  const isBoundary   = activeLayers.has('boundary')

  return (
    <div className="absolute bottom-16 lg:bottom-24 right-2 lg:right-3 z-10 flex flex-col items-end gap-2">
      {/* District choropleth legend pill (shown when boundary is active) */}
      {isBoundary && (
        <div className="glass px-3 py-2.5 rounded-2xl border border-white/10 animate-in fade-in slide-in-from-right-4 w-44 shadow-xl">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2 flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
            Densité par quartier
          </p>
          <div className="h-2 w-full rounded-full mb-1.5" style={{ background: 'linear-gradient(to right, rgba(34,197,94,0.8), rgba(255,214,0,0.8), rgba(255,159,10,0.8), rgba(255,59,48,0.8))' }} />
          <div className="flex justify-between text-[9px] text-text-muted font-medium">
            <span>Fluide</span>
            <span>Modéré</span>
            <span>Dense</span>
            <span>Saturé</span>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-bg-surface/90 border border-bg-border backdrop-blur-sm text-[10px] sm:text-xs font-semibold text-text-secondary hover:text-text-primary transition-all shadow-apple hover:scale-105 active:scale-95"
      >
        <Info className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
        <span className="hidden xs:inline">Légende</span>
        <ChevronDown className={cn("w-3 sm:w-3.5 h-3 sm:h-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="bg-bg-surface/95 backdrop-blur-md border border-bg-border rounded-2xl p-3 sm:p-4 w-48 sm:w-56 shadow-2xl space-y-3 sm:space-y-4 animate-in zoom-in-95 fade-in duration-200 origin-bottom-right">
          {/* Heatmap Section */}
          {isHeatmap && (
            <div className="pb-3 border-b border-white/5">
              <p className="text-[10px] font-bold text-brand-green uppercase tracking-[0.12em] mb-3 flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-brand-green animate-pulse" />
                {HEATMAP_LEGENDS[heatmapMode].title}
              </p>
              <div className="relative h-2 w-full rounded-full overflow-hidden mb-2 bg-white/5">
                <div 
                  className="absolute inset-0"
                  style={{ 
                    background: `linear-gradient(to right, ${HEATMAP_LEGENDS[heatmapMode].steps.map(s => s.color).join(', ')})` 
                  }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] text-text-muted font-medium">
                {HEATMAP_LEGENDS[heatmapMode].steps.map(s => (
                  <span key={s.label}>{s.label}</span>
                ))}
              </div>
            </div>
          )}

          {/* Traffic flow */}
          {isTraffic && (
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Flux de trafic</p>
              <div className="space-y-2">
                {[
                  { label: 'Fluide',    color: '#22C55E' },
                  { label: 'Ralenti',   color: '#FFD600' },
                  { label: 'Impacté',   color: '#FF6D00' },
                  { label: 'Critique',  color: '#FF1744' },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2.5">
                    <div className="w-8 h-1 rounded-full shadow-glow" style={{ backgroundColor: c.color, boxShadow: `0 0 6px ${c.color}40` }} />
                    <span className="text-xs text-text-secondary font-medium">{c.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Road hierarchy */}
          {isTraffic && (
            <div>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Structure Voirie</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                {ROAD_TYPES.map(r => (
                  <div key={r.label} className="flex items-center gap-2">
                    <div className="h-0.5 rounded-full bg-text-muted/40" style={{ width: 14 }} />
                    <span className="text-[10px] text-text-muted leading-tight">{r.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transport / POIs */}
          {isTransport && (
            <div className="pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Infrastructures</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Bus', color: '#3B82F6' },
                  { label: 'Métro', color: '#A855F7' },
                  { label: 'Signaux', color: '#FFD600' },
                  { label: 'Incident', color: '#FF3B30' },
                ].map(p => (
                  <div key={p.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-[10px] text-text-secondary">{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
