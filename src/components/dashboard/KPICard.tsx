'use client'
import { memo } from 'react'
import { cn } from '@/lib/utils/cn'
import { MetricDelta } from '@/components/ui/MetricDelta'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { LucideIcon } from 'lucide-react'

interface Props {
  label:      string
  value:      string | number
  unit?:      string
  delta?:     number
  deltaUnit?: string
  deltaLabel?: string
  inverse?:   boolean  // lower = better
  icon:       LucideIcon
  color?:     string
  warning?:   boolean
  critical?:  boolean
  sub?:       string
  className?: string
  variant?:   'default' | 'mini'
}

function KPICardInner({
  label, value, unit, delta, deltaUnit = '%', inverse = false,
  deltaLabel,
  icon: Icon, color = '#22C55E', warning, critical, sub, className,
  variant = 'default',
}: Props) {
  const { t } = useTranslation()
  const isMini = variant === 'mini'

  return (
    <div className={cn(
      'glass-card space-y-5 hover:shadow-apple relative group overflow-hidden animate-scale-in',
      isMini ? 'p-4 space-y-3 rounded-2xl' : 'p-5 sm:p-6 rounded-3xl',
      className,
    )}>
      {/* Background Glow Overlay (Apple-style subtle vibrancy) */}
      <div
        className="absolute -top-12 -right-12 w-40 h-40 blur-[100px] opacity-10 transition-opacity duration-500 group-hover:opacity-25 pointer-events-none"
        style={{ backgroundColor: color, willChange: 'opacity' }}
      />

      <div className="flex items-center justify-between relative z-10">
        <span className={cn(
          "font-bold text-text-secondary uppercase tracking-[0.12em] block",
          isMini ? "text-[9px]" : "text-[11px]"
        )}>
          {label}
        </span>
        <div
          className={cn(
            "rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 shadow-sm",
            isMini ? "w-8 h-8 rounded-[10px]" : "w-11 h-11"
          )}
          style={{ backgroundColor: `${color}14`, border: `1px solid ${color}25` }}
        >
          <Icon className={isMini ? "w-4 h-4" : "w-5 h-5"} style={{ color }} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "font-black tracking-tighter text-white font-heading",
            isMini ? "text-2xl" : "text-3xl sm:text-4xl",
            critical ? "text-red-500" : warning ? "text-orange-500" : ""
          )}>
            {value}
          </span>
          {unit && <span className={cn("font-bold text-text-muted uppercase tracking-widest", isMini ? "text-[8px]" : "text-xs")}>{unit}</span>}
        </div>
        {sub && !isMini && <p className="text-[12px] font-medium text-text-secondary mt-2 leading-relaxed">{sub}</p>}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-2 pt-5 border-t border-white/5 relative z-10">
          <MetricDelta value={Number(delta)} unit={deltaUnit} inverse={inverse} />
          <span className="text-[11px] font-semibold text-text-muted">{deltaLabel ?? `vs ${t('common.yesterday') || 'hier'}`}</span>
        </div>
      )}
    </div>
  )
}

export const KPICard = memo(KPICardInner)
