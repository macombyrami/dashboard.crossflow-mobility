'use client'
import { useMemo } from 'react'
import { Activity, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

export function CityPulseHUD() {
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const dataSource = useTrafficStore(s => s.dataSource)
  const mode = useMapStore(s => s.mode)

  // Derived Intelligence
  const cityHealth = useMemo(() => {
    if (!kpis) return 100
    // Simple inverse of congestion + incidents impact
    const base = 100 - (kpis.congestionRate * 80)
    const incidentPenalty = Math.min(kpis.activeIncidents * 2, 20)
    return Math.max(Math.round(base - incidentPenalty), 0)
  }, [kpis])

  // Tendance basée sur l'heure + les données réelles (plus de mock)
  const congestionTrend = useMemo(() => {
    const congPct = kpis ? Math.round(kpis.congestionRate * 100) : 0
    const h = new Date().getHours()
    // Rush hours réels (7h-9h matin, 17h-19h soir)
    const isRushHour = (h >= 7 && h < 9) || (h >= 17 && h < 19)
    const isShoulder  = (h >= 9 && h < 11) || (h >= 19 && h < 21)

    if (cityHealth < 55) return {
      label: 'SATURÉ',
      color: 'text-red-500',
      icon: TrendingUp,
      val: `${congPct}%`,
    }
    if (cityHealth < 80 || isRushHour) return {
      label: isRushHour ? 'HEURE DE POINTE' : 'DENSE',
      color: 'text-orange-500',
      icon: TrendingUp,
      val: `${congPct}%`,
    }
    if (isShoulder) return {
      label: 'EN BAISSE',
      color: 'text-yellow-400',
      icon: TrendingDown,
      val: `${congPct}%`,
    }
    return {
      label: 'FLUIDE',
      color: 'text-green-500',
      icon: TrendingDown,
      val: `${congPct}%`,
    }
  }, [cityHealth, kpis])

  if (mode === 'simulate') return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-fit max-w-[98vw] pointer-events-auto">
      <div className="flex items-stretch gap-1 p-1 bg-bg-surface/75 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-black/20">
        
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
          <div className="flex flex-col justify-center">
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1 hidden xs:block">City Health</p>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-white/60 shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold text-white leading-none whitespace-nowrap">{city.name}</h2>
            </div>
          </div>
        </div>

        {/* Section 2: Congestion actuelle (remplacement de la fausse prédiction AI) */}
        <div className="px-5 py-2.5 flex flex-col justify-center gap-1 border-x border-white/5 bg-white/5 hover:bg-white/10 transition-all cursor-default hidden sm:flex">
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-brand" />
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none">
              CONGESTION
              {dataSource === 'live' && <span className="ml-1 text-brand">· LIVE</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
             <span className={cn("text-xs font-black tracking-wider", congestionTrend.color)}>
               {congestionTrend.label}
             </span>
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5">
                <congestionTrend.icon className={cn("w-3 h-3", congestionTrend.color)} />
                <span className="text-[10px] font-bold text-white/80">{congestionTrend.val}</span>
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
          <div className="hidden sm:block">
            <p className="text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Alerts</p>
            <p className="text-xs sm:text-sm font-black text-white leading-none">
              {kpis?.activeIncidents ?? 0} <span className="text-white/40 font-bold ml-0.5 hidden xs:inline">Incidents</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
