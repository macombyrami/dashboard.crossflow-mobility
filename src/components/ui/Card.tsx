'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const cardVariants = cva(
  'rounded-lg border transition-all duration-300',
  {
    variants: {
      variant: {
        default: 'bg-glass-card-bg border-glass-card-border backdrop-blur-xl hover:border-glass-hover-border hover:shadow-card-hover hover:translate-y-[-2px]',
        glass: 'bg-glass bg-glass-border backdrop-blur-2xl border-glass-border hover:border-glass-hover-border',
        elevated: 'bg-bg-elevated border-bg-border hover:border-bg-hover',
        outline: 'bg-transparent border-bg-border hover:bg-bg-elevated',
      },
      padding: {
        none: '',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
        xl: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false,
    },
  }
)

interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  accent?: 'none' | 'green' | 'orange' | 'red' | 'blue'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, interactive, icon, accent = 'none', children, ...props }, ref) => {
    const accentClass = {
      none: '',
      green: 'border-l-4 border-l-status-normal',
      orange: 'border-l-4 border-l-status-warning',
      red: 'border-l-4 border-l-status-critical',
      blue: 'border-l-4 border-l-status-info',
    }[accent]

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, interactive }),
          accentClass,
          className
        )}
        {...props}
      >
        {icon && <div className="mb-3 text-lg opacity-60">{icon}</div>}
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

export { Card, cardVariants }
