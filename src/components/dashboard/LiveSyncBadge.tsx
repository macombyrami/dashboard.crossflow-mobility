'use client'
import { Cloud, CloudOff, Loader2, Link2 } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

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
      "flex items-center gap-3 px-3 py-1.5 rounded-xl bg-bg-surface/60 backdrop-blur-3xl border border-white/5 text-left relative overflow-hidden group hover:border-brand/30 transition-all duration-500 shadow-prestige",
      className
    )}>
      {/* Dynamic Status Engine */}
      <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-white/[0.03] border border-white/5 shrink-0">
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          isSyncing ? "bg-brand animate-spin" : "bg-brand group-hover:animate-pulse shadow-glow"
        )} />
        {isSyncing && <div className="absolute inset-0 bg-brand/10 blur-md rounded-lg animate-pulse" />}
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-black text-text-primary uppercase tracking-[0.2em] leading-none">
            {isSyncing ? 'Flux: Sync' : 'Flux: Stable'}
          </span>
          <Link2 className={cn("w-2.5 h-2.5", isSyncing ? "text-brand animate-pulse" : "text-brand/40")} />
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black font-mono text-text-muted uppercase tracking-tighter tabular-nums">
              {lastSync ? `LAST_SYNC ${lastSync}` : 'NO_DATA'}
            </span>
          </div>
          <div className="w-[1px] h-2 bg-white/10" />
          <span className="text-[9px] font-black font-mono text-text-muted uppercase tracking-tighter opacity-40">
            Node-v2.4
          </span>
        </div>
      </div>

      {/* Decorative vertical accent */}
      <div className="absolute right-0 top-1/4 bottom-1/4 w-[1px] bg-brand/20" />
    </div>
  )
}
