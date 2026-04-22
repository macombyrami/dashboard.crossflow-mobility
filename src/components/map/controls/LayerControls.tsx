'use client'

import { useState } from 'react'
import { AlertTriangle, Car, ChevronDown, Flame, Layers, MapPinned, PenLine, TrainFront, Users, Wind } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import type { HeatmapMode, MapLayerId } from '@/types'

type LayerDef = {
  id: MapLayerId
  label: string
  icon: typeof Car
  hint: string
  color: string
}

const LAYERS: LayerDef[] = [
  { id: 'traffic', label: 'Traffic', icon: Car, hint: 'Road traffic overlay', color: '#16A34A' },
  { id: 'heatmap', label: 'Heatmap', icon: Flame, hint: 'Background pressure map', color: '#F59E0B' },
  { id: 'transport', label: 'Transport', icon: TrainFront, hint: 'Animated transit activity', color: '#0EA5E9' },
  { id: 'incidents', label: 'Incidents', icon: AlertTriangle, hint: 'Incidents and roadworks', color: '#DC2626' },
  { id: 'boundary', label: 'Boundaries', icon: MapPinned, hint: 'City boundaries and entry points', color: '#22C55E' },
]

export function LayerControls() {
  const [collapsed, setCollapsed] = useState(true)
  const city = useMapStore(s => s.city)
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
  const isParis = city.id === 'paris' || city.name.toLowerCase() === 'paris'
  const isCompactCity = !isParis && city.population > 0 && city.population < 300000

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="flex h-11 items-center gap-2 rounded-2xl border border-stone-200 bg-white/95 px-3 shadow-[0_8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md transition-all hover:border-stone-300"
        title="Open layers"
      >
        <Layers className="h-4 w-4 text-stone-700" />
        <span className="text-[13px] font-semibold text-stone-900">Layers</span>
        <span className="ml-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-stone-100 px-1.5 text-[11px] font-bold tabular-nums text-stone-700">
          {activeCount}
        </span>
      </button>
    )
  }

  return (
    <div className="w-[calc(100vw-48px)] max-w-[260px] overflow-hidden rounded-[24px] border border-stone-200 bg-white/96 shadow-[0_18px_48px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:w-[260px]">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Layers className="h-3.5 w-3.5 flex-shrink-0 text-stone-700" />
          <span className="truncate text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Map Layers</span>
          <span className="flex h-4 min-w-[18px] flex-shrink-0 items-center justify-center rounded-full bg-stone-100 px-1 text-[10px] font-bold tabular-nums text-stone-700">
            {activeCount}
          </span>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          className="-mr-1 flex-shrink-0 rounded-md p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close layers"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="border-b border-stone-200 px-4 py-3">
        <p className="text-[11px] leading-5 text-stone-500">
          Advanced controls only. The smart modes decide the main view; heavy overlays stay mutually exclusive to keep the map readable.
        </p>
        <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">
          {isParis ? 'Paris mode: arrondissements + dense network' : isCompactCity ? 'Compact city mode: boundary flows first' : 'Standard city mode'}
        </p>
      </div>

      <div className="space-y-1 p-2">
        {LAYERS.map(({ id, label, icon: Icon, hint, color }) => {
          const active = activeLayers.has(id)

          return (
            <button
              key={id}
              onClick={() => toggleLayer(id)}
              title={hint}
              className={cn(
                'group flex min-h-[42px] w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-left transition-all duration-150',
                active ? 'bg-stone-100' : 'hover:bg-stone-50',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border transition-all',
                  active ? 'border-transparent' : 'border-stone-200 group-hover:border-stone-400',
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
                className={cn('h-4 w-4 flex-shrink-0 transition-colors', active ? '' : 'text-stone-400 group-hover:text-stone-600')}
                style={active ? { color } : undefined}
                strokeWidth={2}
              />
              <span className={cn('flex-1 truncate text-[13px] font-medium tracking-tight', active ? 'text-stone-950' : 'text-stone-600 group-hover:text-stone-900')}>
                {label}
              </span>
            </button>
          )
        })}
      </div>

      {activeLayers.has('heatmap') && (
        <div className="border-t border-stone-200 px-3 pb-3 pt-2">
          <p className="mb-1.5 mt-2 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-stone-400">Heatmap mode</p>
          <div className="grid grid-cols-3 gap-1">
            {([
              { id: 'congestion' as HeatmapMode, label: 'Congestion', icon: Flame },
              { id: 'passages' as HeatmapMode, label: 'Flow', icon: Users },
              { id: 'co2' as HeatmapMode, label: 'CO2', icon: Wind },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setHeatmapMode(id)}
                className={cn(
                  'flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-xl border py-2 text-[10px] font-semibold transition-all',
                  heatmapMode === id
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="leading-none">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border-t border-stone-200 p-2">
        <button
          onClick={() => {
            if (zoneActive) clearZone()
            else {
              clearZone()
              setZoneActive(true)
            }
          }}
          className={cn(
            'flex min-h-[40px] w-full items-center gap-2.5 rounded-2xl px-3 py-2 text-[13px] font-medium transition-all',
            zoneActive
              ? 'border border-amber-200 bg-amber-50 text-amber-700'
              : 'border border-transparent text-stone-600 hover:bg-stone-50 hover:text-stone-900',
          )}
        >
          <PenLine className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate text-left">
            {zoneActive ? 'Click the map to draw a zone' : 'Define analysis zone'}
          </span>
        </button>

        {zoneActive && zoneDraft.length >= 3 && (
          <button
            onClick={() => finalizeZone()}
            className="mt-1 flex min-h-[36px] w-full items-center justify-center gap-2 rounded-2xl bg-amber-100 px-3 py-2 text-[12px] font-semibold text-amber-700 transition-all hover:bg-amber-200"
          >
            Confirm ({zoneDraft.length} pts)
          </button>
        )}

        {(zoneActive || zonePolygon) && (
          <button
            onClick={() => clearZone()}
            className="mt-1 flex w-full items-center justify-center rounded-lg px-3 py-1.5 text-[11px] text-stone-400 transition-all hover:text-stone-700"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  )
}
