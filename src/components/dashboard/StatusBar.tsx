'use client'

import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { AlertTriangle, Clock3, CloudSun, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

type StatusLevel = 'optimal' | 'warning' | 'critical'
type WeatherImpact = 'none' | 'low' | 'high'

interface StatusBarProps {
  status: StatusLevel
  efficiency: number
  weatherImpact: WeatherImpact
  refreshedAt?: Date | null
  className?: string
  live?: boolean
}

const STATUS_CONFIG: Record<StatusLevel, {
  label: string
  dot: string
  border: string
  text: string
  icon: typeof ShieldCheck
}> = {
  optimal: {
    label: 'Optimal',
    dot: 'bg-[#00E676]',
    border: 'border-[#00E676]/20',
    text: 'text-[#00E676]',
    icon: ShieldCheck,
  },
  warning: {
    label: 'Warning',
    dot: 'bg-[#FF6D00]',
    border: 'border-[#FF6D00]/20',
    text: 'text-[#FF6D00]',
    icon: AlertTriangle,
  },
  critical: {
    label: 'Critique',
    dot: 'bg-[#FF1744]',
    border: 'border-[#FF1744]/20',
    text: 'text-[#FF1744]',
    icon: AlertTriangle,
  },
}

const WEATHER_LABELS: Record<WeatherImpact, string> = {
  none: 'Aucun impact météo',
  low: 'Impact météo faible',
  high: 'Impact météo fort',
}

export function StatusBar({
  status,
  efficiency,
  weatherImpact,
  refreshedAt,
  className,
  live = false,
}: StatusBarProps) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  const updatedLabel = refreshedAt
    ? `Mis à jour il y a ${formatDistanceToNow(refreshedAt, { locale: fr, addSuffix: false })}`
    : 'Mise à jour en temps réel'

  return (
    <section className={cn(
      'rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-xl px-4 py-4 sm:px-5 sm:py-4 shadow-apple',
      className,
    )}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center border',
            cfg.border,
            status === 'critical' ? 'bg-[#FF1744]/10' : status === 'warning' ? 'bg-[#FF6D00]/10' : 'bg-[#00E676]/10',
          )}>
            <div className={cn('w-2.5 h-2.5 rounded-full shadow-glow', cfg.dot)} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">État du réseau</span>
              {live && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand">
                  Live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Icon className={cn('w-4 h-4', cfg.text)} />
              <span className={cn('text-[15px] font-black uppercase tracking-tight', cfg.text)}>
                {cfg.label}
              </span>
              <span className="text-[11px] font-medium text-text-muted truncate">{WEATHER_LABELS[weatherImpact]}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex items-end gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">Efficacité</span>
            <span className="text-xl sm:text-2xl font-black tracking-tighter text-white">{efficiency}%</span>
          </div>
          <div className="h-8 w-px bg-white/5 hidden sm:block" />
          <div className="flex items-end gap-2">
            <Clock3 className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">{updatedLabel}</span>
          </div>
          <div className="h-8 w-px bg-white/5 hidden sm:block" />
          <div className="flex items-end gap-2">
            <CloudSun className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted">
              {weatherImpact === 'none' ? 'Météo neutre' : weatherImpact === 'low' ? 'Météo sensible' : 'Météo perturbante'}
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
