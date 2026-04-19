'use client'
import React from 'react'
import { Activity, ShieldCheck, AlertCircle } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

/**
 * 🏝️ PilotIsland (Mobile Top Pill)
 * 
 * Minimalist status indicator for mobile 'Mission-Ready' HUD.
 * 10-minute cache on Sytadin proxy.
 */
export function PilotIsland({ className }: { className?: string }) {
  const city = useMapStore(s => s.city)
  const healthScore = 58 // Mock for now, sync with real KPI in production
  
  const getStatusColor = (score: number) => {
    if (score > 80) return 'text-brand'
    if (score > 50) return 'text-status-warning'
    return 'text-status-critical'
  }

  return (
    <div className={cn(
      "fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-fit",
      "flex items-center gap-3 px-4 py-2 rounded-full",
      "bg-black/90 backdrop-blur-3xl border border-white/10 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500",
      className
    )}>
      {/* City & Live Status */}
      <div className="flex items-center gap-2 pr-3 border-r border-white/10">
        <Activity className="w-3.5 h-3.5 text-brand" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
          {city.name}
        </span>
      </div>

      {/* Primary Metric Pill */}
      <div className="flex items-center gap-2">
        <span className={cn("text-[11px] font-black font-mono", getStatusColor(healthScore))}>
          {healthScore}
        </span>
        <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">
          Index
        </span>
      </div>

      {/* Sync Heartbeat */}
      <div className="ml-1 w-1.5 h-1.5 rounded-full bg-brand animate-pulse shadow-glow" />
    </div>
  )
}
