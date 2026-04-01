'use client'
import { useMemo } from 'react'
import { Activity, ShieldAlert, TrendingUp, TrendingDown, Info } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

export function CityPulseHUD() {
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const dataSource = useTrafficStore(s => s.dataSource)
  const mode = useMapStore(s => s.mode)

  // 🛠 Derived Intelligence: Health Score Contextualisation
  const { cityHealth, healthStatus, healthColor } = useMemo(() => {
    if (!kpis) return { cityHealth: 100, healthStatus: 'Optimal', healthColor: 'text-green-400' }
    
    const base = 100 - (kpis.congestionRate * 80)
    const incidentPenalty = Math.min(kpis.activeIncidents * 2, 20)
    const score = Math.max(Math.round(base - incidentPenalty), 0)
    
    let status = 'Sain'
    let color = 'text-green-400'
    if (score < 50) {
      status = 'Critique'
      color = 'text-red-500'
    } else if (score < 80) {
      status = 'Dégradé'
      color = 'text-orange-400'
    }
    
    return { cityHealth: score, healthStatus: status, healthColor: color }
  }, [kpis])

  // 🛠 Simplified Congestion Logic
  const congestionData = useMemo(() => {
    const congPct = kpis ? Math.round(kpis.congestionRate * 100) : 0
    const h = new Date().getHours()
    const isRushHour = (h >= 7 && h < 9) || (h >= 17 && h < 19)

    return {
      val:   `${congPct}%`,
      label: isRushHour ? 'POINTE' : 'FLUX',
      status: congPct > 60 ? 'Saturé' : congPct > 30 ? 'Dense' : 'Fluide',
      color:  congPct > 60 ? 'text-red-500' : congPct > 30 ? 'text-orange-400' : 'text-green-400',
      icon:   congPct > 30 ? TrendingUp : TrendingDown
    }
  }, [kpis])

  if (mode === 'simulate') return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-fit max-w-[98vw] pointer-events-auto group">
      <div className="flex items-stretch gap-1 p-1 bg-bg-surface/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ring-1 ring-white/5 transition-all hover:bg-bg-surface/90">
        
        {/* Section 1: City Health with Denominator (/100) */}
        <div className="px-5 py-2.5 flex items-center gap-4 bg-white/5 rounded-xl border border-white/5 shadow-inner transition-all hover:bg-white/10">
          <div className="relative w-12 h-12 flex items-center justify-center scale-110">
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
              <circle
                cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 * (1 - cityHealth / 100)}
                strokeLinecap="round"
                className={cn("transition-all duration-1000", healthColor.replace('text-', 'stroke-'))}
              />
            </svg>
            <div className="flex flex-col items-center leading-none mt-1">
              <span className={cn("text-sm font-black tracking-tighter", healthColor)}>{cityHealth}</span>
              <span className="text-[7px] font-bold text-white/30 uppercase">/100</span>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-0.5">
               <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Santé Urbaine</p>
               <span className={cn("px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border border-current opacity-70", healthColor)}>
                 {healthStatus}
               </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-white/60 shrink-0" />
              <h2 className="text-sm font-black text-white leading-none whitespace-nowrap tracking-tight">{city.name}</h2>
            </div>
          </div>
        </div>

        {/* Section 2: Fixed Congestion Metric - No redundancy */}
        <div className="px-5 py-2.5 flex flex-col justify-center gap-1 border-x border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-default hidden sm:flex">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-brand-green" />
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">
              Congestion
              {dataSource === 'live' && <span className="ml-2 text-brand-green opacity-80 decoration-brand-green/30 decoration-double underline">LIVE</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <div className="flex flex-col">
               <span className={cn("text-xs font-black tracking-widest uppercase", congestionData.color)}>
                 {congestionData.status}
               </span>
               <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest mt-0.5">Mode {congestionData.label}</span>
             </div>
             <div className="h-8 w-px bg-white/5 mx-1" />
             <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/30 border border-white/5 shadow-apple">
                <congestionData.icon className={cn("w-3.5 h-3.5", congestionData.color)} />
                <span className="text-sm font-black text-white tracking-tighter">{congestionData.val}</span>
             </div>
          </div>
        </div>

        {/* Section 3: Active Crisis with Tooltip-like Info */}
        <div className="px-5 py-2.5 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer relative group/alert">
          <div className={cn(
            "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg border-2 transition-all group-hover/alert:scale-110",
            kpis?.activeIncidents && kpis.activeIncidents > 5 ? "bg-red-500/20 border-red-500 shadow-red-500/10" : "bg-white/5 border-white/10"
          )}>
            <ShieldAlert className={cn("w-5 h-5", kpis?.activeIncidents && kpis.activeIncidents > 5 ? "text-red-500 animate-pulse" : "text-white/40")} />
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Perturbations</p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white leading-none">
                {kpis?.activeIncidents ?? 0}
              </p>
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Événements</span>
            </div>
          </div>
          {/* Audit: Micro-copy tooltip helper */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 bg-black/90 border border-white/10 rounded-xl text-[10px] text-white/70 whitespace-nowrap opacity-0 group-hover/alert:opacity-100 transition-all pointer-events-none translate-y-2 group-hover/alert:translate-y-0">
            Cliquez pour voir les détails sur la carte
          </div>
        </div>

      </div>
    </div>
  )
}
