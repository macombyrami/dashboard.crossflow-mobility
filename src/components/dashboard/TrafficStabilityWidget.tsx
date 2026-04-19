'use client'
import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Info } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { getTrafficVariance } from '@/lib/api/snapshots'
import { cn } from '@/lib/utils/cn'

/**
 * Staff Engineer Feature: TrafficStabilityWidget
 * Visualizes road network temporal stability and variance.
 */
export function TrafficStabilityWidget() {
  const { city } = useMapStore()
  const [stabilityData, setStabilityData] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchStability = async () => {
      setIsLoading(true)
      try {
        const data = await getTrafficVariance(city.id, 24)
        setStabilityData(data)
      } catch (err) {
        console.error('Stability fetch failed:', err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchStability()
  }, [city.id])

  if (isLoading) return <div className="glass-card h-[200px] animate-pulse" />
  if (!stabilityData || stabilityData.length === 0) return null

  // Calculate global stability index from recent variance
  const latestVariance = stabilityData[stabilityData.length - 1]?.variance_score || 0
  const globalStability = Math.max(0, 10 - latestVariance * 25) // Normalize to 0-10
  const isStable = globalStability > 7

  return (
    <div className="glass-card border border-white/5 rounded-[22px] p-6 shadow-sm group animate-scale-in">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-1.5 h-4.5 rounded-full shadow-lg",
            isStable ? "bg-brand shadow-brand/40" : "bg-orange-500 shadow-orange-500/40"
          )} />
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">Stabilité du Trafic (Variance)</p>
        </div>
        <div className="p-1.5 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 cursor-help group/info relative">
          <Info className="w-3.5 h-3.5 text-text-muted" />
          <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-black/90 border border-white/20 rounded-lg text-[9px] text-white opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-30">
            Analyse la volatilité de la congestion. Une variance élevée indique des fluctuations imprévisibles du réseau.
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Volatilité 24h</span>
             <span className="text-[24px] font-bold text-white tabular-nums">
               {(latestVariance * 100).toFixed(1)}%
             </span>
           </div>
           <TrendingUp className={cn(
             "w-8 h-8",
             isStable ? "text-brand/40" : "text-orange-500/40"
           )} />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-[10px] font-bold text-text-muted uppercase">
            <span>Prévisibilité</span>
            <span>{Math.round(globalStability * 10)}%</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full rounded-full transition-all duration-1000 ease-out",
                isStable ? "bg-brand" : "bg-orange-500"
              )}
              style={{ width: `${globalStability * 10}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
           <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Indice global</span>
           <span className="text-[18px] font-bold text-white tabular-nums">
             {globalStability.toFixed(1)}<span className="text-[12px] text-text-muted">/10</span>
           </span>
        </div>
        <div className={cn(
          "flex items-center gap-2 text-[10px] font-bold uppercase border px-2.5 py-1 rounded-full",
          isStable 
            ? "text-brand bg-brand/10 border-brand/20" 
            : "text-orange-500 bg-orange-500/10 border-orange-500/20"
        )}>
           <Activity className={cn("w-3 h-3", isStable && "animate-pulse")} />
           {isStable ? 'Réseau Stable' : 'Flux Volatil'}
        </div>
      </div>
    </div>
  )
}
