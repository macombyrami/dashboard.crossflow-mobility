'use client'
import React from 'react'
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import { DataCard } from '@/components/ui/DataCard'

export function CityPulseHUD({ className }: { className?: string }) {
  const city = useMapStore(s => s.city)
  const mode = useMapStore(s => s.mode)

  if (mode === 'simulate') return null

  return (
    <div className={cn("w-full max-w-full lg:w-fit pointer-events-auto flex flex-col lg:flex-row items-center gap-3", className)}>
      
      {/* Primary HUD Card */}
      <DataCard
        icon={CheckCircle2}
        value={58}
        scale="/100"
        metric="SANTÉ URBAINE"
        context={city.name}
        badge="✅ BON"
        variant="success"
        primary={true}
        className="w-full lg:w-[240px] lg:h-[240px]"
      />

      {/* Secondary Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
        <DataCard
          icon={AlertTriangle}
          value="32%"
          metric="CONGESTION"
          context="Mode FLUX"
          badge="⚠️ MODÉRÉ"
          variant="warning"
          className="min-w-0"
        />
        <DataCard
          icon={ShieldAlert}
          value={8}
          metric="PERTURBATIONS"
          context="Événements"
          badge="🔴 CRITIQUE"
          variant="danger"
          className="min-w-0"
        />
        {/* Placeholder for scaling to 6 KPIs */}
        <div className="hidden lg:flex items-center justify-center p-4 rounded-3xl border border-dashed border-white/5 bg-white/2">
           <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Capteur AI</span>
        </div>
        <div className="hidden lg:flex items-center justify-center p-4 rounded-3xl border border-dashed border-white/5 bg-white/2">
           <span className="text-[8px] font-black text-text-muted uppercase tracking-widest">Flux V2X</span>
        </div>
      </div>
    </div>
  )
}
