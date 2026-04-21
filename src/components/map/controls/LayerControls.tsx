'use client'

import { useState } from 'react'
import { Car, Flame, Train, AlertTriangle, Layers, MapPinned, Users, Wind, PenLine, ChevronDown } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { MapLayerId, HeatmapMode } from '@/types'

type LayerDef = {
  id: MapLayerId
  label: string
  icon: typeof Car
  hint: string
  color: string
}

const LAYERS: LayerDef[] = [
  { id: 'traffic', label: 'Trafic', icon: Car, hint: 'Flux en temps réel', color: '#22C55E' },
  { id: 'heatmap', label: 'Heatmap', icon: Flame, hint: 'Densité thermique', color: '#FF6D00' },
  { id: 'transport', label: 'Transport', icon: Train, hint: 'Bus, métro, tramway', color: '#3B82F6' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, hint: 'Accidents et travaux', color: '#FF3B30' },
  { id: 'boundary', label: 'Contour ville', icon: MapPinned, hint: 'Périmètre administratif', color: '#22C55E' },
]

export function LayerControls() {
  const [collapsed, setCollapsed] = useState(false)
  const activeLayers = useMapStore(s => s.activeLayers)
  const toggleLayer = useMapStore(s => s.toggleLayer)
  const heatmapMode = useMapStore(s => s.heatmapMode)
  const setHeatmapMode = useMapStore(s => s.setHeatmapMode)
  const zoneActive = useMapStore(s => s.zoneActive)
  const setZoneActive = useMapStore(s => s.setZoneActive)
  const zoneDraft = useMapStore(s => s.zoneDraft)
  const zonePolygon = useMapStore(s => s.zonePolygon)
  const finalizeZone = useMapStore(s => s.finalizeZone)
  const clearZone = useMapStore(s => s.clearZone)

  const activeCount = activeLayers.size

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="glass-card flex items-center gap-2 px-3 h-11 rounded-xl text-text-primary hover:border-brand/40 transition-all"
        title="Afficher les calques"
      >
        <Layers className="w-4 h-4 text-brand" />
        <span className="text-[13px] font-semibold">Calques</span>
        <span className="ml-1 min-w-[20px] h-5 px-1.5 rounded-full bg-brand/15 text-brand text-[11px] font-bold tabular-nums flex items-center justify-center">
          {activeCount}
        </span>
      </button>
    )
  }

  return (
    <div className="glass-card rounded-xl shadow-lg w-[232px] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-bg-border">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-brand" />
          <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.18em]">Calques</span>
          <span className="min-w-[18px] h-4 px-1 rounded-full bg-brand/15 text-brand text-[10px] font-bold tabular-nums flex items-center justify-center">
            {activeCount}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
          aria-label="Réduire"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 space-y-0.5">
        {LAYERS.map(({ id, label, icon: Icon, hint, color }) => {
          const active = activeLayers.has(id)
          return (
            <button
              key={id}
              onClick={() => toggleLayer(id)}
              title={hint}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group',
                active ? 'bg-bg-hover' : 'hover:bg-bg-subtle',
              )}
            >
              <span
                className={cn(
                  'w-4 h-4 rounded-[5px] border flex items-center justify-center flex-shrink-0 transition-all',
                  active ? 'border-transparent' : 'border-bg-border group-hover:border-text-muted',
                )}
                style={active ? { background: color, boxShadow: `0 0 10px ${color}66` } : undefined}
              >
                {active && (
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: '#fff' }}>
                    <path d="M2 5.5L4 7.5L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </svg>
                )}
              </span>
              <Icon
                className={cn('w-4 h-4 flex-shrink-0 transition-colors', active ? '' : 'text-text-muted group-hover:text-text-secondary')}
                style={active ? { color } : undefined}
                strokeWidth={2}
              />
              <span className={cn('flex-1 text-[13px] font-medium tracking-tight', active ? 'text-text-primary' : 'text-text-secondary group-hover:text-text-primary')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {activeLayers.has('heatmap') && (
        <div className="px-2.5 pb-2 pt-0.5">
          <p className="text-[9px] font-bold text-text-muted uppercase tracking-[0.18em] mb-1.5 px-1">Mode heatmap</p>
          <div className="grid grid-cols-3 gap-1">
            {([
              { id: 'congestion' as HeatmapMode, label: 'Congestion', icon: Flame },
              { id: 'passages' as HeatmapMode, label: 'Passages', icon: Users },
              { id: 'co2' as HeatmapMode, label: 'CO₂', icon: Wind },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setHeatmapMode(id)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 rounded-md text-[10px] font-semibold transition-all border',
                  heatmapMode === id
                    ? 'bg-brand/15 text-brand border-brand/30'
                    : 'text-text-muted border-bg-border hover:text-text-secondary hover:border-text-muted',
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="p-2 border-t border-bg-border">
        <button
          onClick={() => {
            if (zoneActive) clearZone()
            else {
              clearZone()
              setZoneActive(true)
            }
          }}
          className={cn(
            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all',
            zoneActive
              ? 'bg-yellow-400/15 text-yellow-500 border border-yellow-400/30'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-subtle border border-transparent',
          )}
        >
          <PenLine className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1 text-left">{zoneActive ? 'Cliquez sur la carte…' : 'Définir une zone'}</span>
        </button>
        {zoneActive && zoneDraft.length >= 3 && (
          <button
            onClick={() => finalizeZone()}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-yellow-400/20 text-yellow-500 hover:bg-yellow-400/30 transition-all"
          >
            ✓ Valider ({zoneDraft.length} pts)
          </button>
        )}
        {(zoneActive || zonePolygon) && (
          <button
            onClick={() => clearZone()}
            className="w-full mt-1 flex items-center justify-center px-3 py-1 rounded-lg text-[11px] text-text-muted hover:text-text-secondary transition-all"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
