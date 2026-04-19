'use client'
import { cn } from '@/lib/utils/cn'

interface Props {
  label?:    string
  color?:    string
  className?: string
}

export function LiveIndicator({ label = 'LIVE', color = '#22C55E', className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full glass-light border border-bg-border', className)}>
      <span className="relative flex h-2 w-2">
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex rounded-full h-2 w-2 shadow-glow"
          style={{ backgroundColor: color }}
        />
      </span>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color }}>
        {label}
      </span>
    </span>
  )
}
