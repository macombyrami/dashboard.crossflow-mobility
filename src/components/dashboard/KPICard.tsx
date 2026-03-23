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
  sub?:       string
  className?: string
}

export function KPICard({
  label, value, unit, delta, deltaUnit = '%', inverse = false,
  icon: Icon, color = '#22C55E', warning, critical, sub, className,
}: Props) {
  const { t } = useTranslation()
  return (
    <div className={cn(
      'card-premium p-6 space-y-4 hover:shadow-apple transition-all duration-300 relative group overflow-hidden',
      className,
    )}>
      {/* Background Glow Overlay */}
      <div 
        className="absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30" 
        style={{ backgroundColor: color }} 
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.15em]">{label}</span>
        <div
          className="w-10 h-10 rounded-apple flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 duration-300"
          style={{ backgroundColor: `${color}10`, border: `1px solid ${color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>

      <div className="relative z-10">
        <div className="flex items-baseline gap-2">
          <span className={cn(
            "text-3xl font-bold tracking-tight text-white",
            critical ? "text-[#FF3B30]" : warning ? "text-[#FF9F0A]" : ""
          )}>
            {value}
          </span>
          {unit && <span className="text-[13px] font-medium text-text-secondary">{unit}</span>}
        </div>
        {sub && <p className="text-[11px] font-medium text-text-muted mt-1.5 leading-relaxed">{sub}</p>}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-2 pt-4 border-t border-white/5 relative z-10">
          <MetricDelta value={delta} unit={deltaUnit} inverse={inverse} />
          <span className="text-[11px] font-medium text-text-secondary/60">vs {t('common.yesterday') || 'hier'}</span>
        </div>
      )}
    </div>
  )
}
