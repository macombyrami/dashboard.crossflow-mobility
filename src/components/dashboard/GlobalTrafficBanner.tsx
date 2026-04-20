'use client'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

interface Props {
  className?: string
}

export function GlobalTrafficBanner({ className }: Props) {
  const city = useMapStore(s => s.city)
  const kpis = useTrafficStore(s => s.kpis)
  const dataSource = useTrafficStore(s => s.dataSource)

  if (!kpis) {
    return (
      <div className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-2xl border',
        'bg-bg-subtle/60 border-bg-border backdrop-blur-sm',
        'animate-pulse',
        className,
      )}>
        <div className="w-2.5 h-2.5 rounded-full bg-text-muted/40 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-text-muted">
          📡 Données en cours de synchronisation…
        </span>
      </div>
    )
  }

  const rate = kpis.congestionRate

  const state =
    rate < 0.30  ? { emoji: '🟢', color: '#22C55E', bg: 'rgba(34,197,94,0.10)',  border: 'rgba(34,197,94,0.25)',  label: `Trafic fluide sur ${city.name}` } :
    rate < 0.65  ? { emoji: '🟡', color: '#FFD600', bg: 'rgba(255,214,0,0.10)',  border: 'rgba(255,214,0,0.25)',  label: 'Trafic modéré – ralentissements localisés' } :
                   { emoji: '🔴', color: '#FF3B30', bg: 'rgba(255,59,48,0.10)',   border: 'rgba(255,59,48,0.25)',  label: 'Forte congestion détectée sur plusieurs axes' }

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-2xl border backdrop-blur-sm transition-all duration-300',
        className,
      )}
      style={{ background: state.bg, borderColor: state.border }}
    >
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0 animate-pulse"
        style={{ backgroundColor: state.color, boxShadow: `0 0 8px ${state.color}` }}
      />
      <span className="text-[13px] font-bold text-text-primary leading-none">
        {state.label}
      </span>
      {dataSource === 'live' && (
        <span
          className="ml-auto text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border flex-shrink-0"
          style={{ color: state.color, borderColor: state.border, background: state.bg }}
        >
          Live
        </span>
      )}
    </div>
  )
}
