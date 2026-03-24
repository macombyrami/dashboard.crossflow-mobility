'use client'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const ROAD_TYPES = [
  { label: 'Autoroute',      color: '#FF1744', width: 7 },
  { label: 'Route nationale',color: '#FF6D00', width: 5.5 },
  { label: 'Axe principal',  color: '#FFD600', width: 4 },
  { label: 'Axe secondaire', color: '#22C55E', width: 3 },
  { label: 'Voie tertiaire', color: '#22C55E', width: 2 },
]

const POIS = [
  { label: 'Feux tricolores', color: '#FFD600' },
  { label: 'Arrêt de bus',    color: '#3B82F6' },
  { label: 'Entrée métro',    color: '#A855F7' },
  { label: 'Incident',        color: '#FF3B30' },
]

export function MapLegend() {
  const [open, setOpen] = useState(false)

  return (
    <div className="absolute bottom-24 right-3 z-10">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-surface/90 border border-bg-border backdrop-blur-sm text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
      >
        Légende
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-1 bg-bg-surface/95 backdrop-blur-sm border border-bg-border rounded-2xl p-4 w-52 shadow-xl space-y-3">
          {/* Traffic flow */}
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Flux de trafic</p>
            <div className="space-y-1.5">
              {[
                { label: 'Fluide',    color: '#22C55E' },
                { label: 'Ralenti',   color: '#FFD600' },
                { label: 'Congestionné', color: '#FF6D00' },
                { label: 'Critique',  color: '#FF1744' },
              ].map(c => (
                <div key={c.label} className="flex items-center gap-2">
                  <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-text-secondary">{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Road hierarchy */}
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Hiérarchie routière</p>
            <div className="space-y-1.5">
              {ROAD_TYPES.map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className="rounded-full bg-text-secondary" style={{ width: Math.min(r.width * 3, 24), height: Math.max(r.width * 0.5, 1.5) }} />
                  <span className="text-xs text-text-secondary">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* POIs */}
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.12em] mb-2">Points d'intérêt</p>
            <div className="space-y-1.5">
              {POIS.map(p => (
                <div key={p.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }} />
                  <span className="text-xs text-text-secondary">{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
