'use client'

import { useState } from 'react'
import { ChevronUp } from 'lucide-react'
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

  const hasVisualLegend = activeLayers.has('traffic') || activeLayers.has('heatmap') || activeLayers.has('incidents') || activeLayers.has('boundary') || activeLayers.has('transport')

  if (!hasVisualLegend) return null

  return (
    <div className="pointer-events-auto absolute bottom-5 left-4 z-20">
      <button
        onClick={() => setExpanded(value => !value)}
        className={cn(
          'group overflow-hidden rounded-[20px] border border-stone-200 bg-white/96 shadow-[0_16px_38px_rgba(15,23,42,0.10)] backdrop-blur-xl transition-all',
          expanded ? 'w-[230px]' : 'w-auto',
        )}
        aria-label="Toggle map legend"
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">
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
                <div className="flex items-center gap-2.5">
                  <div className="h-1.5 w-9 rounded-full bg-[#D1D5DB]" />
                  <span className="text-[11px] font-medium text-stone-600">Estimated / no live data</span>
                </div>
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

            {activeLayers.has('transport') && (
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-2 w-2 rounded-full bg-sky-500" />
                <span className="text-[11px] font-medium text-stone-600">Animated transit activity</span>
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
