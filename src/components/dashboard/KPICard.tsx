'use client'
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
  inverse?:   boolean  // lower = better
  icon:       LucideIcon
  color?:     string
  warning?:   boolean
  critical?:  boolean
  status?:    'optimal' | 'warning' | 'critical'
  sub?:       string
  variant?:   'default' | 'mini'
  className?: string
}

export function KPICard({
  label, value, unit, delta, deltaUnit = '%', inverse = false,
  icon: Icon, color = '#22C55E', warning, critical, status, sub, variant = 'default', className,
}: Props) {
  const { t } = useTranslation()
  const isWarning = warning ?? status === 'warning'
  const isCritical = critical ?? status === 'critical'
  return (
    <div className={cn(
      'glass-card hover:shadow-apple transition-all duration-500 relative group overflow-hidden animate-scale-in',
      variant === 'mini' ? 'p-4 space-y-4' : 'p-5 sm:p-6 space-y-5',
      className,
    )}>
      {/* Background Glow Overlay (Apple-style subtle vibrancy) */}
      <div 
        className="absolute -top-12 -right-12 w-40 h-40 blur-[100px] opacity-10 transition-opacity group-hover:opacity-25" 
        style={{ backgroundColor: color }} 
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[11px] font-bold text-text-secondary uppercase tracking-[0.12em] block">{label}</span>
        <div
          className="w-11 h-11 rounded-[14px] flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 duration-500 shadow-sm"
          style={{ backgroundColor: `${color}14`, border: `1px solid ${color}25` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            variant === 'mini' ? 'text-2xl sm:text-3xl' : 'text-3xl sm:text-4xl',
            'font-bold tracking-tight text-text-primary',
            isCritical ? 'text-[#FF3B30]' : isWarning ? 'text-[#FF9F0A]' : ''
          )}>
            {value}
          </span>
          {unit && <span className="text-sm font-semibold text-text-secondary">{unit}</span>}
        </div>
        {sub && <p className="text-[11px] font-medium text-text-muted mt-2 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-500">{sub}</p>}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-2 pt-5 border-t border-bg-border relative z-10">
          <MetricDelta value={Number(delta)} unit={deltaUnit} inverse={inverse} />
          <span className="text-[11px] font-semibold text-text-muted">vs {t('common.yesterday') || 'hier'}</span>
        </div>
      )}
    </div>
  )
}
