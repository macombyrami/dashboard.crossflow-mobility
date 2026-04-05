'use client'
import React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LegendItem {
  label: string
  color: string
}

interface LegendProps {
  title: string
  items: LegendItem[]
  description?: string
  className?: string
}

export function Legend({ title, items, className, description }: LegendProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2.5 p-3 rounded-xl bg-bg-surface/80 backdrop-blur-3xl border border-white/5 shadow-2xl",
      className
    )}>
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted">{title}</span>
        {description && (
          <div className="group relative">
            <Info className="w-3 h-3 text-text-muted hover:text-white transition-colors cursor-help" />
            <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-bg-elevated border border-white/10 rounded-lg text-[9px] text-text-secondary leading-tight shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-30">
              {description}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5 px-1 pb-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: item.color }} />
                <span className="text-[9px] font-bold text-text-secondary uppercase tracking-[0.1em]">{item.label}</span>
             </div>
             <div className="h-[1px] flex-1 bg-white/[0.03]" />
             <div className="w-1.5 h-1.5 border-r border-b border-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
