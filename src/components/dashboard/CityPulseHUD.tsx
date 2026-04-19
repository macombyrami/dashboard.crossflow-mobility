'use client'
import React from 'react'
import { ShieldAlert, CheckCircle2, AlertTriangle, Activity, Zap, BarChart3 } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import { TacticalCard } from '@/components/ui/TacticalCard'

export function CityPulseHUD({ className }: { className?: string }) {
  const city = useMapStore(s => s.city)
  const mode = useMapStore(s => s.mode)

  if (mode === 'simulate') return null

  return (
    <div className={cn("pointer-events-auto flex flex-col gap-2 w-80", className)}>
      <div className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl flex items-center justify-between mb-1 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-brand" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white italic">
            Ville suivie : {city.name.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand/10 border border-brand/20">
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shadow-glow" />
          <span className="text-[8px] font-bold text-brand uppercase tracking-tighter">Temps réel</span>
        </div>
      </div>

      <TacticalCard
        icon={CheckCircle2}
        label="Santé du réseau"
        value={58}
        subValue="/100"
        trend={{ value: "-4%", isPositive: false }}
        color="text-brand"
      />

      <TacticalCard
        icon={AlertTriangle}
        label="Pression trafic"
        value="32%"
        subValue="Lecture active"
        trend={{ value: "NORMAL", isPositive: true }}
        color="text-status-warning"
      />

      <TacticalCard
        icon={ShieldAlert}
        label="Points d’attention"
        value={8}
        subValue="À surveiller"
        trend={{ value: "+2", isPositive: false }}
        color="text-status-critical"
      />

      <div className="grid grid-cols-2 gap-2 mt-1">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors group">
          <Zap className="w-3 h-3 text-brand/40 group-hover:text-brand" />
          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase text-text-muted tracking-widest">Temps de lecture</span>
            <span className="text-[11px] font-black font-mono text-text-primary">12ms</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-colors group">
          <BarChart3 className="w-3 h-3 text-brand/40 group-hover:text-brand" />
          <div className="flex flex-col">
            <span className="text-[7px] font-black uppercase text-text-muted tracking-widest">Fiabilité</span>
            <span className="text-[11px] font-black font-mono text-text-primary">98.4%</span>
          </div>
        </div>
      </div>

      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mt-2" />
    </div>
  )
}
