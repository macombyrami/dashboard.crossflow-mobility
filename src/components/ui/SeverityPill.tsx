'use client'
import { cn } from '@/lib/utils/cn'
import type { IncidentSeverity } from '@/types'

const config: Record<IncidentSeverity, { bg: string; text: string; border: string; label: string }> = {
  low:      { bg: 'bg-[rgba(0,230,118,0.1)]',  text: 'text-[#00E676]', border: 'border-[rgba(0,230,118,0.25)]',  label: 'Faible' },
  medium:   { bg: 'bg-[rgba(255,214,0,0.1)]',  text: 'text-[#FFD600]', border: 'border-[rgba(255,214,0,0.25)]',  label: 'Moyen' },
  high:     { bg: 'bg-[rgba(255,109,0,0.1)]',  text: 'text-[#FF6D00]', border: 'border-[rgba(255,109,0,0.25)]',  label: 'Élevé' },
  critical: { bg: 'bg-[rgba(255,23,68,0.1)]',  text: 'text-[#FF1744]', border: 'border-[rgba(255,23,68,0.25)]',  label: 'Critique' },
}

interface Props {
  severity:  IncidentSeverity
  size?:     'sm' | 'md'
  className?: string
}

export function SeverityPill({ severity, size = 'md', className }: Props) {
  const c = config[severity]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border font-medium',
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      c.bg, c.text, c.border, className,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', c.text.replace('text-', 'bg-').replace('[', 'opacity-100 [').replace(']', ']'))}
        style={{ backgroundColor: 'currentColor' }}
      />
      {c.label}
    </span>
  )
}
