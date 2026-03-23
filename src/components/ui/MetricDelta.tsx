'use client'
import { cn } from '@/lib/utils/cn'

interface Props {
  value:       number   // absolute delta
  unit?:       string
  inverse?:    boolean  // if true: negative = good (e.g. travel time)
  className?:  string
}

export function MetricDelta({ value, unit = '%', inverse = false, className }: Props) {
  const isPositive = value > 0
  const isGood     = inverse ? !isPositive : isPositive
  const sign       = isPositive ? '+' : ''
  const color      = Math.abs(value) < 1 ? 'text-text-secondary'
                   : isGood             ? 'text-[#00E676]'
                   :                      'text-[#FF1744]'
  const arrow      = isPositive ? '↑' : '↓'

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-medium', color, className)}>
      <span>{arrow}</span>
      <span>{sign}{Math.abs(value).toFixed(Math.abs(value) < 10 ? 1 : 0)}{unit}</span>
    </span>
  )
}
