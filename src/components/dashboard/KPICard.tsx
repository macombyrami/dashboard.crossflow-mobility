'use client'
import { cn } from '@/lib/utils/cn'
import { MetricDelta } from '@/components/ui/MetricDelta'
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
  icon: Icon, color = '#00E676', warning, critical, sub, className,
}: Props) {
  return (
    <div className={cn(
      'bg-bg-surface border rounded-2xl p-5 space-y-3 transition-all',
      critical ? 'border-[rgba(255,23,68,0.4)] shadow-critical' :
      warning  ? 'border-[rgba(255,109,0,0.3)]' : 'border-bg-border',
      className,
    )}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>

      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-text-primary" style={{ color: critical ? '#FF1744' : warning ? '#FF6D00' : undefined }}>
            {value}
          </span>
          {unit && <span className="text-sm text-text-muted">{unit}</span>}
        </div>
        {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
      </div>

      {delta !== undefined && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-bg-border">
          <MetricDelta value={delta} unit={deltaUnit} inverse={inverse} />
          <span className="text-xs text-text-muted">vs hier</span>
        </div>
      )}
    </div>
  )
}
