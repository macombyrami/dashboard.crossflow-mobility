'use client'

import { useState } from 'react'
import { AlertTriangle, Car, ChevronUp, Flame, MapPinned } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

const TRAFFIC_LEVELS = [
  { label: 'Fluid', color: '#16A34A' },
  { label: 'Moderate', color: '#FACC15' },
  { label: 'Dense', color: '#F97316' },
  { label: 'Critical', color: '#DC2626' },
]

export function MapLegend() {
  const [expanded, setExpanded] = useState(false)
  const activeLayers = useMapStore(s => s.activeLayers)
  const heatmapMode = useMapStore(s => s.heatmapMode)

  const items = [
    activeLayers.has('traffic') ? { key: 'traffic', label: 'Traffic', icon: Car } : null,
    activeLayers.has('heatmap') ? { key: 'heatmap', label: heatmapMode === 'congestion' ? 'Heatmap' : heatmapMode === 'passages' ? 'Flow heatmap' : 'CO2 heatmap', icon: Flame } : null,
    activeLayers.has('incidents') ? { key: 'incidents', label: 'Incidents', icon: AlertTriangle } : null,
    activeLayers.has('boundary') ? { key: 'boundary', label: 'Boundaries', icon: MapPinned } : null,
  ].filter(Boolean) as Array<{ key: string; label: string; icon: typeof Car }>

  if (items.length === 0) return null

  return (
    <div className="pointer-events-auto absolute bottom-5 right-4 z-10">
      <button
        onClick={() => setExpanded(value => !value)}
        className={cn(
          'group overflow-hidden rounded-[22px] border border-stone-200 bg-white/95 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all',
          expanded ? 'w-[220px]' : 'w-auto',
        )}
        aria-label="Toggle map legend"
      >
        <div className="flex items-center gap-2 px-3 py-2.5">
          {items.map(({ key, icon: Icon }) => (
            <span key={key} className="rounded-xl bg-stone-100 p-2 text-stone-700">
              <Icon className="h-3.5 w-3.5" />
            </span>
          ))}
          <span className="ml-1 text-[10px] font-bold uppercase tracking-[0.18em] text-stone-500">
            Legend
          </span>
          <ChevronUp className={cn('ml-auto h-4 w-4 text-stone-400 transition-transform', expanded && 'rotate-180')} />
        </div>

        {expanded && (
          <div className="border-t border-stone-200 px-3 py-3 text-left">
            {activeLayers.has('traffic') && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">Traffic</p>
                {TRAFFIC_LEVELS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2.5">
                    <div className="h-1.5 w-9 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-[11px] font-medium text-stone-600">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {activeLayers.has('heatmap') && (
              <div className="mt-3 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-stone-400">
                  {heatmapMode === 'congestion' ? 'Road pressure' : heatmapMode === 'passages' ? 'Flow density' : 'Emission load'}
                </p>
                <div className="h-2 rounded-full bg-[linear-gradient(to_right,rgba(34,197,94,0.12),rgba(250,204,21,0.28),rgba(239,68,68,0.38))]" />
                <div className="flex justify-between text-[9px] text-stone-400">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>
            )}

            {activeLayers.has('incidents') && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span className="text-[11px] font-medium text-stone-600">Incident markers</span>
              </div>
            )}

            {activeLayers.has('boundary') && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-[11px] font-medium text-stone-600">City boundaries and gateways</span>
              </div>
            )}
          </div>
        )}
      </button>
    </div>
  )
}
