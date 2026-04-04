'use client'
import { Cloud, CloudOff, Loader2 } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

/**
 * 🛰️ LiveSyncBadge (User Feedback Layer)
 * 
 * Informs the user of the current telemetry synchronization state.
 * Staff Engineer UX: Data reliability confirmation.
 */
interface LiveSyncBadgeProps {
  className?: string
  refreshing?: boolean
  lastSync?: string
}

export function LiveSyncBadge({ className, refreshing, lastSync: propsLastSync }: LiveSyncBadgeProps) {
  const storeIsSyncing = useTrafficStore(s => s.isSyncing)
  const storeLastSync  = useTrafficStore(s => s.lastSync)
  
  const isSyncing = refreshing ?? storeIsSyncing
  const lastSync  = propsLastSync ?? (storeLastSync ? new Date(storeLastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null)
  
  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-2 rounded-2xl bg-bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-prestige text-left relative group hover:border-brand/30 transition-all duration-500",
      className
    )}>
      {/* Heartbeat Pulse */}
      <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-brand/10 border border-brand/20">
        <div className={cn(
          "w-2 h-2 rounded-full bg-brand shadow-[0_0_10px_#00FF9D]",
          isSyncing ? "animate-spin" : "animate-pulse"
        )} />
        {isSyncing && <div className="absolute inset-0 bg-brand/20 blur-sm rounded-xl animate-ping" />}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-white uppercase tracking-[0.2em] font-heading leading-none">
            {isSyncing ? 'Synchronisation Active' : 'Système Sécurisé'}
          </span>
          {!isSyncing && (
             <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-brand/10 border border-brand/20">
                <div className="w-1 h-1 rounded-full bg-brand" />
                <span className="text-[7px] font-black text-brand uppercase tracking-widest">OK</span>
             </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <Cloud className="w-3 h-3 text-text-muted" />
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter tabular-nums">
              {lastSync ? `Sync ${lastSync}` : 'Cloud Offline'}
            </span>
          </div>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-tighter opacity-60">
            PRO-NODE v2.4
          </span>
        </div>
      </div>

      {/* Decorative side accent */}
      <div className="absolute left-0 top-1/4 bottom-1/4 w-[2px] bg-brand/40 rounded-r shadow-[0_0_8px_#00FF9D]" />
    </div>
  )
}
