'use client'
import { useEffect, useState } from 'react'
import { Activity, AlertCircle, BarChart3, TrendingUp, Info } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { getSnapshots } from '@/lib/api/snapshots'
import { cn } from '@/lib/utils/cn'

/**
 * Staff Engineer Feature: TrafficStabilityWidget
 * Visualizes road segment variance and standard deviation.
 */
export function TrafficStabilityWidget() {
  const { city } = useMapStore()
  const [stabilityData, setStabilityData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchStability = async () => {
      setIsLoading(true)
      try {
        // 1. Get recent snapshots
        const snapshots = await getSnapshots(city.id, 24)
        if (snapshots.length < 2) return

        // 2. Query backend for variance
        const resp = await fetch(`${process.env.NEXT_PUBLIC_PREDICTIVE_BACKEND_URL}/analytics/variance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            city_id: city.id,
            window_min: 240, // 4h window
            snapshots: snapshots
          })
        })
        
        if (!resp.ok) throw new Error('Variance calculation failed')
        const data = await resp.json()
        setStabilityData(data)
      } catch (err) {
        console.error('Stability fetch failed:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStability()
  }, [city.id])

  if (!stabilityData || stabilityData.segments.length === 0) return null

  const highVarianceSegments = stabilityData.segments.slice(0, 5)

  return (
    <div className="glass-card border border-white/5 rounded-[22px] p-6 shadow-sm group animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-1.5 h-4.5 bg-orange-500 rounded-full shadow-[0_0_12px_rgba(249,115,22,0.4)]" />
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">Stabilité du Trafic (Variance)</p>
        </div>
        <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-help group/info relative">
          <Info className="w-3.5 h-3.5 text-text-muted" />
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black/90 border border-white/20 rounded-lg text-[9px] text-white opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-30">
            Identifie les axes dont la congestion varie brusquement. Une variance élevée indique un risque d'embouteillage imprévisible.
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {highVarianceSegments.map((seg: any, idx: number) => (
          <div key={seg.edge_id} className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Axe #{seg.edge_id.slice(-4)}</span>
                <span className="text-[12px] font-bold text-white">Zone Instable {idx + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[10px] font-medium text-orange-400 bg-orange-400/10 px-1.5 py-0.5 rounded border border-orange-400/20">
                  σ = {seg.std_dev.toFixed(2)}
                 </span>
                 <span className="text-[13px] font-bold tabular-nums text-white">
                  {Math.round(seg.variance * 100)}%
                 </span>
              </div>
            </div>
            
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all duration-1000 ease-out"
                style={{ width: `${Math.min(100, seg.variance * 150)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
           <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Indice global</span>
           <span className="text-[18px] font-bold text-white tabular-nums">7.4<span className="text-[12px] text-text-muted">/10</span></span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-brand uppercase bg-brand/10 border border-brand/20 px-2.5 py-1 rounded-full">
           <Activity className="w-3 h-3" />
           Système Stable
        </div>
      </div>
    </div>
  )
}
