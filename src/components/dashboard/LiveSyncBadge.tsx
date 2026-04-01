'use client'
import { useEffect, useState } from 'react'
import { Activity, History, ChevronRight } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

/**
 * Staff Engineer Feature: LiveSyncBadge
 * Shows a 10-minute countdown and sync status.
 */
export function LiveSyncBadge() {
  const { lastSync, isSyncing, dataSource } = useTrafficStore()
  const [timeLeft, setTimeLeft] = useState<number>(600) // 10 minutes

  useEffect(() => {
    if (!lastSync) return
    
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const diff = Math.floor((now - lastSync.getTime()) / 1000)
      const remaining = Math.max(0, 600 - (diff % 600))
      setTimeLeft(remaining)
    }, 1000)

    return () => clearInterval(interval)
  }, [lastSync])

  const mins = Math.floor(timeLeft / 60)
  const secs = timeLeft % 60
  const countdownStr = `${mins}:${secs.toString().padStart(2, '0')}`

  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "flex items-center gap-2.5 px-3 py-1.5 rounded-full border transition-all duration-300 shadow-apple animate-in fade-in slide-in-from-top-2",
        dataSource === 'live' 
          ? "bg-brand/10 border-brand/20 text-brand" 
          : "bg-orange-500/10 border-orange-500/20 text-orange-400"
      )}>
        <div className="relative">
          <Activity className={cn("w-3.5 h-3.5", isSyncing && "animate-pulse")} />
          {isSyncing && (
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-current rounded-full animate-ping" />
          )}
        </div>
        
        <div className="flex flex-col leading-none">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">
            {dataSource === 'live' ? 'LIVE • TOMTOM' : 'SYNTHETIC (fallback)'}
          </span>
          <span className="text-[11px] font-bold tabular-nums">
            {isSyncing ? 'Synchronisation...' : `Prochain snapshot : ${countdownStr}`}
          </span>
        </div>

        <button 
          className="ml-1 p-1 hover:bg-white/10 rounded-md transition-colors"
          title="Consulter l'historique"
        >
          <History className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {lastSync && (
        <span className="text-[10px] font-medium text-text-muted hidden sm:inline">
          Dernière sync : {lastSync.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  )
}
