'use client'
import { useMemo } from 'react'
import { Activity, ShieldAlert, Sparkles, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

export function CityPulseHUD() {
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const mode = useMapStore(s => s.mode)

  // Derived Intelligence
  const cityHealth = useMemo(() => {
    if (!kpis) return 100
    // Simple inverse of congestion + incidents impact
    const base = 100 - (kpis.congestionRate * 80)
    const incidentPenalty = Math.min(kpis.activeIncidents * 2, 20)
    return Math.max(Math.round(base - incidentPenalty), 0)
  }, [kpis])

  const riskTrend = useMemo(() => {
    // Mock risk prediction logic
    if (cityHealth < 60) return { label: 'CRITIQUE', color: 'text-red-500', icon: TrendingUp, val: '+12%' }
    if (cityHealth < 85) return { label: 'STABLE', color: 'text-orange-500', icon: Clock, val: '0%' }
    return { label: 'OPTIMAL', color: 'text-green-500', icon: TrendingDown, val: '-5%' }
  }, [cityHealth])

  if (mode === 'simulate') return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-fit max-w-[95vw] pointer-events-auto">
      <div className="flex items-stretch gap-1 p-1 bg-bg-surface/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/20">
        
        {/* Section 1: City Health Circular Gauge Style */}
        <div className="px-5 py-2.5 flex items-center gap-4 bg-white/5 rounded-xl border border-white/5 shadow-inner group transition-all hover:bg-white/10">
          <div className="relative w-12 h-12 flex items-center justify-center">
            {/* SVG Progress Ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className="text-white/5"
              />
              <circle
                cx="24" cy="24" r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeDasharray={125.6}
                strokeDashoffset={125.6 * (1 - cityHealth / 100)}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-1000",
                  cityHealth > 80 ? "text-green-400" : cityHealth > 50 ? "text-orange-400" : "text-red-500"
                )}
              />
            </svg>
            <span className={cn(
              "text-sm font-black tracking-tighter",
              cityHealth > 80 ? "text-green-400" : cityHealth > 50 ? "text-orange-400" : "text-red-500"
            )}>
              {cityHealth}
            </span>
          </div>
          <div>
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1">City Health</p>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-white/60" />
              <h2 className="text-sm font-bold text-white leading-none whitespace-nowrap">{city.name}</h2>
            </div>
          </div>
        </div>

        {/* Section 2: AI Risk Prediction */}
        <div className="px-5 py-2.5 flex flex-col justify-center gap-1 border-x border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-default hidden sm:flex">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3 h-3 text-brand-blue" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none">AI RISK +60M</p>
          </div>
          <div className="flex items-center gap-3">
             <span className={cn("text-xs font-black tracking-wider", riskTrend.color)}>
               {riskTrend.label}
             </span>
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">
                <riskTrend.icon className={cn("w-3 h-3", riskTrend.color)} />
                <span className="text-[10px] font-bold text-white/80">{riskTrend.val}</span>
             </div>
          </div>
        </div>

        {/* Section 3: Active Crisis Indicator */}
        <div className="px-5 py-2.5 flex items-center gap-4 hover:bg-white/10 transition-all cursor-pointer">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg",
            kpis?.activeIncidents && kpis.activeIncidents > 5 ? "bg-red-500 shadow-red-500/20" : "bg-white/5 border border-white/10"
          )}>
            <ShieldAlert className={cn("w-5 h-5", kpis?.activeIncidents && kpis.activeIncidents > 5 ? "text-white animate-pulse" : "text-white/40")} />
          </div>
          <div className="hidden lg:block">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Alerts</p>
            <p className="text-sm font-black text-white leading-none">
              {kpis?.activeIncidents ?? 0} <span className="text-white/40 font-bold ml-1">Incidents</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
