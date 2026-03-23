'use client'
import { cn } from '@/lib/utils/cn'
import { scoreToCongestionLevel, congestionLabel, formatCongestionPct } from '@/lib/utils/congestion'
import { platformConfig } from '@/config/platform.config'
import type { CongestionLevel } from '@/types'

const variants: Record<CongestionLevel, string> = {
  free:      'bg-[rgba(0,230,118,0.12)]  text-[#00E676]  border-[rgba(0,230,118,0.3)]',
  slow:      'bg-[rgba(255,214,0,0.12)]  text-[#FFD600]  border-[rgba(255,214,0,0.3)]',
  congested: 'bg-[rgba(255,109,0,0.12)]  text-[#FF6D00]  border-[rgba(255,109,0,0.3)]',
  critical:  'bg-[rgba(255,23,68,0.12)]   text-[#FF1744]  border-[rgba(255,23,68,0.3)]',
}

interface Props {
  score:     number
  showPct?:  boolean
  showDot?:  boolean
  size?:     'sm' | 'md'
  className?: string
}

export function CongestionBadge({ score, showPct = true, showDot = true, size = 'md', className }: Props) {
  const level = scoreToCongestionLevel(score)
  const color = platformConfig.traffic.colors[level]

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      variants[level],
      className,
    )}>
      {showDot && (
        <span
          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {congestionLabel(score)}
      {showPct && <span className="opacity-70">{formatCongestionPct(score)}</span>}
    </span>
  )
}
