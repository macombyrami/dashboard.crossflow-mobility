'use client'
import React from 'react'
import { Info } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface LegendItem {
  label: string
  color: string
  description?: string
}

interface LegendProps {
  title: string
  items: LegendItem[]
  description?: string
  className?: string
}

export function Legend({ title, items, description, className }: LegendProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 p-4 rounded-2xl bg-black/80 backdrop-blur-3xl border border-white/10 shadow-apple ring-1 ring-white/5 w-64 transition-all hover:bg-black/90",
      className
    )}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{title}</span>
        <div className="group relative">
          <Info className="w-3.5 h-3.5 text-white/20 hover:text-white transition-colors cursor-help" />
          {description && (
            <div className="absolute bottom-full right-0 mb-3 w-48 p-2.5 bg-black/95 border border-white/10 rounded-xl text-[10px] text-white/60 leading-relaxed shadow-2xl opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all pointer-events-none z-30">
              {description}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]" style={{ background: item.color }} />
             <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none">{item.label}</span>
          </div>
        ))}
      </div>

      {description && (
        <p className="text-[9px] font-bold text-white/20 uppercase tracking-tighter italic border-t border-white/5 pt-2 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}
