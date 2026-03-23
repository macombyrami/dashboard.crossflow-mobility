'use client'
import { cn } from '@/lib/utils/cn'

interface Props {
  label?:    string
  color?:    string
  className?: string
}

export function LiveIndicator({ label = 'LIVE', color = '#00E676', className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span className="relative inline-flex h-2 w-2">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2"
          style={{ backgroundColor: color }}
        />
      </span>
      <span className="text-xs font-semibold tracking-widest" style={{ color }}>
        {label}
      </span>
    </span>
  )
}
