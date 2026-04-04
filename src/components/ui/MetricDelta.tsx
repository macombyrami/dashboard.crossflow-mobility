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
  const isGood     = inverse ? value < 0 : value > 0
  const sign       = value > 0 ? '+' : ''
  const isZero     = Math.abs(value) < 0.1
  const color      = isZero ? 'text-text-muted' 
                   : (inverse ? (value < 0 ? 'text-brand' : 'text-red-500') 
                             : (value > 0 ? 'text-brand' : 'text-red-500'))
  const arrow      = isZero ? '' : (value > 0 ? '↑' : '↓')

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-black tracking-wider uppercase', color, className)}>
      <span>{arrow}</span>
      <span>{sign}{Math.abs(value).toFixed(1)}{unit}</span>
    </span>
  )
}
