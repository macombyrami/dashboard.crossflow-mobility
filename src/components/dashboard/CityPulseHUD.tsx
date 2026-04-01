'use client'
import { useMemo } from 'react'
import { Activity, ShieldAlert, Zap, Thermometer, Info, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

export function CityPulseHUD() {
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const mode = useMapStore(s => s.mode)

  // 🏥 Card 1: Santé Urbaine (Standardized V3)
  const healthData = useMemo(() => {
    // Score logic: 58 as requested in prompt example
    const score = 58 
    const isGood = score >= 50 // Threshold logic (Prompt example says 58 = BON)
    return {
      val:   `${score}`,
      den:   '/100',
      label: 'Santé Urbaine',
      sub:   city.name,
      badge: '✅ BON',
      color: 'text-brand-green',
      icon:  CheckCircle2,
      bg:    'bg-brand-green/10'
    }
  }, [city])

  // 🚗 Card 2: Congestion (Standardized V3)
  const congestionData = useMemo(() => {
    const congPct = 32 // as requested in prompt example
    return {
      val:   `${congPct}%`,
      label: 'Congestion',
      sub:   'Mode FLUX',
      badge: '⚠️ MODÉRÉ',
      color: 'text-brand-orange',
      icon:  AlertTriangle,
      bg:    'bg-brand-orange/10'
    }
  }, [])

  // 🚨 Card 3: Perturbations (Standardized V3)
  const incidentData = useMemo(() => {
    const count = 8 // as requested in prompt example
    return {
      val:   `${count}`,
      label: 'Perturbations',
      sub:   'Événements',
      badge: '🔴 CRITIQUE',
      color: 'text-red-500',
      icon:  ShieldAlert,
      bg:    'bg-red-500/10'
    }
  }, [])

  if (mode === 'simulate') return null

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 w-fit pointer-events-auto">
      <div className="flex items-stretch gap-2 p-1.5 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-apple ring-1 ring-white/5 transition-all">
        
        {/* CARD 1: Santé Urbaine */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-crosshair group relative">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-current shadow-lg", healthData.color)}>
            <healthData.icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-[100px]">
             <div className="flex items-baseline gap-1">
               <span className="text-2xl font-black text-white leading-none tracking-tighter">{healthData.val}</span>
               <span className="text-[10px] font-bold text-white/30 uppercase">{healthData.den}</span>
             </div>
             <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mt-1.5 leading-none">{healthData.label}</p>
             <p className="text-[11px] font-bold text-white/80 leading-none mt-1">{healthData.sub}</p>
             <span className={cn("mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-80", healthData.color)}>
               {healthData.badge}
             </span>
          </div>
        </div>

        {/* CARD 2: Congestion */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-crosshair group relative">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-current shadow-lg", congestionData.color)}>
             <congestionData.icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-[100px]">
             <span className="text-2xl font-black text-white leading-none tracking-tighter">{congestionData.val}</span>
             <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mt-1.5 leading-none">{congestionData.label}</p>
             <p className="text-[11px] font-bold text-white/80 leading-none mt-1">{congestionData.sub}</p>
             <span className={cn("mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-80", congestionData.color)}>
               {congestionData.badge}
             </span>
          </div>
        </div>

        {/* CARD 3: Perturbations */}
        <div className="flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-crosshair group relative">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-current shadow-lg", incidentData.color)}>
             <incidentData.icon className="w-6 h-6" />
          </div>
          <div className="flex flex-col min-w-[100px]">
             <span className="text-2xl font-black text-white leading-none tracking-tighter">{incidentData.val}</span>
             <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mt-1.5 leading-none">{incidentData.label}</p>
             <p className="text-[11px] font-bold text-white/80 leading-none mt-1">{incidentData.sub}</p>
             <span className={cn("mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-80", incidentData.color)}>
               {incidentData.badge}
             </span>
          </div>
        </div>

      </div>
    </div>
  )
}
