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
      "flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all duration-500",
      isSyncing 
        ? "bg-brand/10 border-brand/30 shadow-[0_0_15px_rgba(34,197,94,0.15)]" 
        : "bg-bg-surface/80 border-bg-border backdrop-blur-md",
      className
    )}>
      <div className="relative">
        {isSyncing ? (
          <Loader2 className="w-3.5 h-3.5 text-brand animate-spin" />
        ) : lastSync ? (
          <Cloud className="w-3.5 h-3.5 text-brand opacity-80" />
        ) : (
          <CloudOff className="w-3.5 h-3.5 text-text-muted" />
        )}
        {isSyncing && (
          <div className="absolute inset-0 bg-brand/40 blur-sm rounded-full animate-ping" />
        )}
      </div>
      
      <div className="flex flex-col -space-y-0.5 text-left">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest",
          isSyncing ? "text-brand" : "text-text-secondary"
        )}>
          {isSyncing ? 'Synchronisation Cloud' : 'CrossFlow Cloud Sync'}
        </span>
        {lastSync && !isSyncing && (
          <span className="text-[8px] font-bold text-text-muted opacity-60 uppercase tracking-tighter">
            Dernier push: {lastSync}
          </span>
        )}
      </div>
    </div>
  )
}
