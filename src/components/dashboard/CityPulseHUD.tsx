'use client'
import React from 'react'
import { ShieldAlert, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import { DataCard } from '@/components/ui/DataCard'

export function CityPulseHUD() {
  const city = useMapStore(s => s.city)
  const mode = useMapStore(s => s.mode)

  if (mode === 'simulate') return null

  return (
    <div className="w-fit pointer-events-auto">
      <div className={cn(
        "flex flex-col md:flex-row items-stretch gap-2 p-1.5 bg-black/40 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-apple ring-1 ring-white/5 transition-all max-h-[80vh] overflow-y-auto md:overflow-visible",
      )}>
        
        <DataCard
          icon={CheckCircle2}
          value={58}
          scale="/100"
          metric="SANTÉ URBAINE"
          context={city.name}
          badge="✅ BON"
          variant="success"
        />

        <DataCard
          icon={AlertTriangle}
          value="32%"
          metric="CONGESTION"
          context="Mode FLUX"
          badge="⚠️ MODÉRÉ"
          variant="warning"
        />

        <DataCard
          icon={ShieldAlert}
          value={8}
          metric="PERTURBATIONS"
          context="Événements"
          badge="🔴 CRITIQUE"
          variant="danger"
        />
      </div>
    </div>
  )
}
