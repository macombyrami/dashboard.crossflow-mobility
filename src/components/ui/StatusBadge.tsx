'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-2 rounded font-semibold tracking-wide border transition-colors duration-200',
  {
    variants: {
      status: {
        critical: 'bg-status-critical-bg text-status-critical border-status-critical/20',
        warning: 'bg-status-warning-bg text-status-warning border-status-warning/20',
        caution: 'bg-status-caution-bg text-status-caution border-status-caution/20',
        normal: 'bg-status-normal-bg text-status-normal border-status-normal/20',
        info: 'bg-status-info-bg text-status-info border-status-info/20',
      },
      size: {
        sm: 'px-2 py-1 text-xs',
        md: 'px-3 py-1.5 text-sm',
        lg: 'px-4 py-2 text-base',
      },
    },
    defaultVariants: {
      status: 'normal',
      size: 'md',
    },
  }
)

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode
  label: string
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, status, size, icon, label, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(badgeVariants({ status, size }), className)}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="font-semibold">{label}</span>
    </span>
  )
)

StatusBadge.displayName = 'StatusBadge'

export { StatusBadge, badgeVariants }
