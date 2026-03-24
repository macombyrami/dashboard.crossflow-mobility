'use client'
import { Car, Flame, Train, AlertTriangle, BrainCircuit, Layers, MapPinned, Users, Wind, PenLine } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { MapLayerId, HeatmapMode } from '@/types'

const LAYERS: { id: MapLayerId; label: string; icon: typeof Car; hint?: string }[] = [
  { id: 'traffic',    label: 'Trafic',     icon: Car,          hint: 'Flux en temps réel' },
  { id: 'heatmap',    label: 'Heatmap',    icon: Flame,        hint: 'Densité thermique' },
  { id: 'transport',  label: 'Transport',  icon: Train,        hint: 'Réseaux TC' },
  { id: 'incidents',  label: 'Incidents',  icon: AlertTriangle,hint: 'Accidents & travaux' },
  { id: 'prediction', label: 'Prédiction', icon: BrainCircuit, hint: '+30 min IA' },
  { id: 'boundary',   label: 'Contour ville', icon: MapPinned, hint: 'Délimitation administrative' },
]

export function LayerControls() {
  const activeLayers   = useMapStore(s => s.activeLayers)
  const toggleLayer    = useMapStore(s => s.toggleLayer)
  const heatmapMode    = useMapStore(s => s.heatmapMode)
  const setHeatmapMode = useMapStore(s => s.setHeatmapMode)
  const zoneActive     = useMapStore(s => s.zoneActive)
  const setZoneActive  = useMapStore(s => s.setZoneActive)
  const zoneDraft      = useMapStore(s => s.zoneDraft)
  const zonePolygon    = useMapStore(s => s.zonePolygon)
  const finalizeZone   = useMapStore(s => s.finalizeZone)
  const clearZone      = useMapStore(s => s.clearZone)

  return (
    <div className="glass rounded-apple p-4 space-y-2 min-w-[180px] shadow-apple border border-white/5">
      <div className="flex items-center gap-2.5 mb-4 px-1">
        <Layers className="w-4 h-4 text-text-muted" />
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.2em]">Calques</span>
      </div>
      {LAYERS.map(({ id, label, icon: Icon }) => {
        const active = activeLayers.has(id)
        return (
          <button
            key={id}
            onClick={() => toggleLayer(id)}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-apple text-[13px] font-medium transition-all group duration-200',
              active
                ? 'bg-brand-green/10 text-brand-green'
                : 'text-text-secondary hover:text-white hover:bg-white/5',
            )}
          >
            <div className={cn(
              'w-4 h-4 rounded-apple border flex items-center justify-center flex-shrink-0 transition-all duration-300',
              active ? 'bg-brand-green border-brand-green shadow-glow' : 'border-white/10 group-hover:border-white/20',
            )}>
              {active && <span className="block w-2 h-1.5 border-b-2 border-r-2 border-bg-base rotate-45 mb-0.5" />}
            </div>
            <Icon className={cn("w-4 h-4 flex-shrink-0 transition-colors", active ? "text-brand-green" : "text-text-muted group-hover:text-text-secondary")} />
            <span className="tracking-tight">{label}</span>
          </button>
        )
      })}

      {/* Heatmap mode selector — shown when heatmap layer is active */}
      {activeLayers.has('heatmap') && (
        <div className="ml-7 mt-1 mb-2 flex gap-1.5">
          {([
            { id: 'congestion' as HeatmapMode, label: 'Congestion', icon: Flame },
            { id: 'passages'   as HeatmapMode, label: 'Passages',   icon: Users },
            { id: 'co2'        as HeatmapMode, label: 'CO₂',        icon: Wind  },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setHeatmapMode(id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-all',
                heatmapMode === id
                  ? 'bg-brand-green/20 text-brand-green border border-brand-green/40'
                  : 'text-text-muted hover:text-text-secondary border border-transparent hover:border-white/10'
              )}
            >
              <Icon className="w-2.5 h-2.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Zone drawing tool */}
      <div className="mt-2 pt-2 border-t border-white/5">
        <button
          onClick={() => {
            if (zoneActive) clearZone()
            else { clearZone(); setZoneActive(true) }
          }}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-apple text-[13px] font-medium transition-all duration-200',
            zoneActive
              ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30'
              : 'text-text-secondary hover:text-white hover:bg-white/5',
          )}
        >
          <PenLine className="w-4 h-4 flex-shrink-0" />
          <span>{zoneActive ? 'Cliquez sur la carte…' : 'Définir une zone'}</span>
        </button>
        {zoneActive && zoneDraft.length >= 3 && (
          <button
            onClick={() => finalizeZone()}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-2 rounded-apple text-[12px] font-semibold bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 transition-all"
          >
            ✓ Valider la zone ({zoneDraft.length} pts)
          </button>
        )}
        {(zoneActive || zonePolygon) && (
          <button
            onClick={() => clearZone()}
            className="w-full mt-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-apple text-[11px] text-text-muted hover:text-text-secondary transition-all"
          >
            Effacer
          </button>
        )}
      </div>
    </div>
  )
}
