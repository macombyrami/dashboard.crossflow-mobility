'use client'
import { useMapStore } from '@/store/mapStore'

const TRAFFIC_LEVELS = [
  { label: 'Fluide',    color: '#22C55E' },
  { label: 'Ralenti',   color: '#FFD600' },
  { label: 'Impacté',   color: '#FF6D00' },
  { label: 'Critique',  color: '#FF1744' },
]

const TRANSPORT_ITEMS = [
  { label: 'Bus',      color: '#3B82F6' },
  { label: 'Métro',    color: '#A855F7' },
  { label: 'Incident', color: '#FF3B30' },
]

export function MapLegend() {
  const activeLayers = useMapStore(s => s.activeLayers)
  const heatmapMode  = useMapStore(s => s.heatmapMode)

  const isTraffic   = activeLayers.has('traffic')
  const isHeatmap   = activeLayers.has('heatmap')
  const isTransport = activeLayers.has('transport')
  const isIncidents = activeLayers.has('incidents')

  if (!isTraffic && !isHeatmap && !isTransport && !isIncidents) return null

  return (
    <div className="absolute bottom-6 left-3 z-10 pointer-events-none">
      <div className="bg-bg-surface/90 backdrop-blur-md border border-bg-border rounded-xl px-3 py-2.5 shadow-lg space-y-2 min-w-[120px]">
        {/* Traffic flow levels */}
        {isTraffic && (
          <div className="space-y-1.5">
            {TRAFFIC_LEVELS.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className="w-6 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 4px ${color}60` }}
                />
                <span className="text-[10px] font-semibold text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Heatmap gradient */}
        {isHeatmap && (
          <div>
            {isTraffic && <div className="h-px bg-bg-border mb-2" />}
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-1.5">
              {heatmapMode === 'congestion' ? 'Congestion'
               : heatmapMode === 'passages' ? 'Passages'
               : 'CO₂'}
            </p>
            <div
              className="h-1.5 rounded-full w-full"
              style={{ background: 'linear-gradient(to right, #22C55E, #FFD600, #FF3B30)' }}
            />
            <div className="flex justify-between text-[8px] text-text-muted mt-0.5">
              <span>Faible</span>
              <span>Élevé</span>
            </div>
          </div>
        )}

        {/* Transport / incidents */}
        {(isTransport || isIncidents) && (
          <div>
            {(isTraffic || isHeatmap) && <div className="h-px bg-bg-border mb-2" />}
            <div className="space-y-1.5">
              {isTransport && TRANSPORT_ITEMS.slice(0, 2).map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[10px] font-semibold text-text-secondary">{label}</span>
                </div>
              ))}
              {isIncidents && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF3B30' }} />
                  <span className="text-[10px] font-semibold text-text-secondary">Incident</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
