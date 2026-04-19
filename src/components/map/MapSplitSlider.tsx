'use client'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

/**
 * Staff Engineer Feature: MapSplitSlider
 * A draggable vertical line to compare Live vs Simulation.
 */
export function MapSplitSlider() {
  const { splitRatio, setSplitRatio, mode } = useMapStore()

  if (mode !== 'predict') return null

  return (
    <div 
      className="absolute inset-y-0 z-10 pointer-events-none"
      style={{ left: `${splitRatio}%` }}
    >
      {/* The Line */}
      <div className="absolute inset-y-0 -ml-px w-0.5 bg-brand shadow-glow animate-in fade-in duration-500" />
      
      {/* The Handle */}
      <div className="absolute top-1/2 -mt-6 -ml-6 w-12 h-12 flex items-center justify-center pointer-events-auto cursor-ew-resize group">
        <input
          type="range"
          min="0"
          max="100"
          value={splitRatio}
          onChange={(e) => setSplitRatio(parseFloat(e.target.value))}
          className="absolute inset-0 opacity-0 cursor-ew-resize"
        />
        <div className="w-8 h-8 rounded-full bg-brand/10 border-2 border-white/5 flex items-center justify-center transition-transform group-hover:scale-110 active:scale-95 invisible">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-3 bg-white/40 rounded-full" />
            <div className="w-0.5 h-3 bg-white/40 rounded-full" />
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-4 -ml-20 w-40 flex justify-between pointer-events-none px-4">
        <span className="text-[10px] font-bold text-brand uppercase tracking-tighter bg-brand/10 border border-brand/20 px-1.5 py-0.5 rounded backdrop-blur-md">
          LIVE
        </span>
        <div className="w-10" />
        <span className="text-[10px] font-bold text-white uppercase tracking-tighter bg-white/10 border border-white/20 px-1.5 py-0.5 rounded backdrop-blur-md">
          SIM
        </span>
      </div>
    </div>
  )
}
