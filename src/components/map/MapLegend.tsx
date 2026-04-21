'use client'

import { useMapStore } from '@/store/mapStore'

const TRAFFIC_LEVELS = [
  { label: 'Fluid', color: '#2BD576' },
  { label: 'Moderate', color: '#FFD24A' },
  { label: 'Dense', color: '#FF8A00' },
  { label: 'Critical', color: '#E5484D' },
]

const TRANSPORT_ITEMS = [
  { label: 'Bus corridors', color: '#3B82F6' },
  { label: 'Metro network', color: '#A855F7' },
  { label: 'Critical event', color: '#FF5A5F' },
]

export function MapLegend() {
  const activeLayers = useMapStore(s => s.activeLayers)
  const heatmapMode = useMapStore(s => s.heatmapMode)

  const isTraffic = activeLayers.has('traffic')
  const isHeatmap = activeLayers.has('heatmap')
  const isTransport = activeLayers.has('transport')
  const isIncidents = activeLayers.has('incidents')

  if (!isTraffic && !isHeatmap && !isTransport && !isIncidents) return null

  return (
    <div className="absolute bottom-5 left-4 z-10 pointer-events-none">
      <div className="min-w-[160px] rounded-xl border border-black/8 bg-white/80 px-3 py-2.5 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.10)] space-y-2.5 dark:bg-[rgba(12,15,22,0.82)] dark:border-white/10">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Trafic</span>
          <span className="text-[9px] font-medium text-text-muted/60">Live</span>
        </div>

        {isTraffic && (
          <div className="space-y-2">
            {TRAFFIC_LEVELS.map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div
                  className="h-1.5 w-9 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}50` }}
                />
                <span className="text-[11px] font-medium text-text-secondary">{label}</span>
              </div>
            ))}
          </div>
        )}

        {isHeatmap && (
          <div className="space-y-1.5">
            {(isTraffic || isTransport || isIncidents) && <div className="h-px bg-white/10" />}
            <p className="text-[9px] font-bold text-text-muted uppercase tracking-wider">
              {heatmapMode === 'congestion' ? 'Road pressure'
               : heatmapMode === 'passages' ? 'Flow density'
               : 'Emission load'}
            </p>
            <div
              className="h-2 rounded-full w-full"
              style={{ background: 'linear-gradient(to right, rgba(43,213,118,0.12), rgba(255,210,74,0.65), rgba(229,72,77,0.92))' }}
            />
            <div className="flex justify-between text-[9px] text-text-muted">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>
        )}

        {(isTransport || isIncidents) && (
          <div className="space-y-1.5">
            {(isTraffic || isHeatmap) && <div className="h-px bg-white/10" />}
            {isTransport && TRANSPORT_ITEMS.slice(0, 2).map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-medium text-text-secondary">{label}</span>
              </div>
            ))}
            {isIncidents && (
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: '#FF5A5F' }} />
                <span className="text-[10px] font-medium text-text-secondary">Incident intelligence</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
