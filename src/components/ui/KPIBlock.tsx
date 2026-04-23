'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const kpiVariants = cva(
  'rounded-lg border bg-glass-card-bg border-glass-card-border backdrop-blur-xl transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'p-4',
        horizontal: 'p-4 flex items-center justify-between gap-4',
        vertical: 'p-6 flex flex-col gap-3',
        compact: 'p-3 flex items-center justify-between gap-2',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

interface KPIBlockProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof kpiVariants> {
  label: string
  value: string | number
  unit?: string
  delta?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: React.ReactNode
  status?: 'normal' | 'warning' | 'critical'
}

const KPIBlock = React.forwardRef<HTMLDivElement, KPIBlockProps>(
  ({
    className,
    variant = 'default',
    label,
    value,
    unit,
    delta,
    trend = 'neutral',
    icon,
    status = 'normal',
    ...props
  }, ref) => {
    const deltaClass = {
      'up': trend === 'up' && delta ? 'text-status-normal' : '',
      'down': trend === 'down' && delta ? 'text-status-critical' : '',
      'neutral': 'text-text-secondary',
    }[trend] || ''

    return (
      <div
        ref={ref}
        className={cn(kpiVariants({ variant }), className)}
        {...props}
      >
        <div className="flex-1">
          <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            {label}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-text-primary font-variant-numeric-tabular">
              {value}
            </span>
            {unit && <span className="text-sm text-text-secondary">{unit}</span>}
          </div>
          {delta !== undefined && (
            <div className={cn('text-xs font-semibold mt-2 px-2 py-1 rounded w-fit', deltaClass)}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {Math.abs(delta)}%
            </div>
          )}
        </div>
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
      </div>
    )
  }
)

KPIBlock.displayName = 'KPIBlock'

export { KPIBlock, kpiVariants }
