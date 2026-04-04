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
    <div className={cn("w-full max-w-full md:w-fit pointer-events-auto", className)}>
      <div className={cn(
        "flex flex-row md:flex-row items-center justify-center gap-2 p-2 p-1 md:p-1.5 transition-all w-full md:w-auto",
        "bg-transparent md:bg-black/40 md:backdrop-blur-3xl md:border md:border-white/10 md:rounded-2xl md:shadow-apple md:ring-1 md:ring-white/5",
        "overflow-x-auto no-scrollbar pb-2 md:pb-0"
      )}>
        
        <DataCard
          icon={CheckCircle2}
          value={58}
          scale="/100"
          metric="SANTÉ URBAINE"
          context={city.name}
          badge="✅ BON"
          variant="success"
          mini={true}
          className="md:hidden"
        />
        <DataCard
          icon={CheckCircle2}
          value={58}
          scale="/100"
          metric="SANTÉ URBAINE"
          context={city.name}
          badge="✅ BON"
          variant="success"
          className="hidden md:flex"
        />

        <DataCard
          icon={AlertTriangle}
          value="32%"
          metric="CONGESTION"
          context="Mode FLUX"
          badge="⚠️ MODÉRÉ"
          variant="warning"
          mini={true}
          className="md:hidden"
        />
        <DataCard
          icon={AlertTriangle}
          value="32%"
          metric="CONGESTION"
          context="Mode FLUX"
          badge="⚠️ MODÉRÉ"
          variant="warning"
          className="hidden md:flex"
        />

        <DataCard
          icon={ShieldAlert}
          value={8}
          metric="PERTURBATIONS"
          context="Événements"
          badge="🔴 CRITIQUE"
          variant="danger"
          mini={true}
          className="md:hidden"
        />
        <DataCard
          icon={ShieldAlert}
          value={8}
          metric="PERTURBATIONS"
          context="Événements"
          badge="🔴 CRITIQUE"
          variant="danger"
          className="hidden md:flex"
        />
      </div>
    </div>
  )
}
