'use client'
import React from 'react'
import { cn } from '@/lib/utils/cn'
import { AlertCircle, CheckCircle2, Construction, Info } from 'lucide-react'

import { type TrafficLine } from '@/lib/api/ratp'

interface Props {
  lines: TrafficLine[]
}


const TYPE_LABELS = {
  metros: 'Métro',
  rers: 'RER',
  tramways: 'Tram'
}

export function RatpNetworkStatus({ lines }: Props) {
  const categories = ['rers', 'metros', 'tramways'] as const

  return (
    <div className="space-y-6">
      {categories.map(cat => {
        const catLines = lines.filter(l => l.type === cat)
        if (catLines.length === 0) return null

        const issues = catLines.filter(l => l.status !== 'normal' && l.status !== 'inconnu').length
        
        return (
          <div key={cat} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {TYPE_LABELS[cat]}
              </h3>
              <span className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded-full border",
                issues === 0 ? "text-brand-green border-brand-green/20 bg-brand-green/5" : "text-orange-500 border-orange-500/20 bg-orange-500/5"
              )}>
                {issues === 0 ? 'Trafic Normal' : `${issues} Perturbation${issues > 1 ? 's' : ''}`}
              </span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {catLines.sort((a,b) => a.slug.localeCompare(b.slug, undefined, {numeric: true})).map(line => (
                <LineBubble key={line.id} line={line} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function LineBubble({ line }: { line: TrafficLine }) {
  const isHealthy = line.status === 'normal' || line.status === 'inconnu'
  
  return (
    <div className="flex flex-col items-center gap-1 group cursor-help relative">
      <div 
        className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-[11px] shadow-sm transition-all group-hover:scale-110",
          !isHealthy && "ring-2 ring-offset-2 ring-offset-bg-base",
          line.status === 'interrompu' ? "ring-red-500" : line.status === 'perturbé' ? "ring-orange-500" : line.status === 'travaux' ? "ring-blue-500" : ""
        )}
        style={{ backgroundColor: line.color }}
      >
        {line.slug}
      </div>
      
      {/* Small status dot */}
      {!isHealthy && (
        <div className={cn(
          "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-bg-base ring-1 ring-bg-base",
          line.status === 'interrompu' ? "bg-red-500" : line.status === 'perturbé' ? "bg-orange-500" : "bg-blue-400"
        )} />
      )}
      
      {/* Tooltip on hover (simulated for density) */}
      <div className="absolute bottom-full mb-2 hidden group-hover:block z-50 w-32 p-2 bg-bg-surface border border-bg-border rounded-lg shadow-xl pointer-events-none">
        <p className="text-[10px] font-bold text-text-primary mb-0.5">{line.name}</p>
        <p className={cn(
          "text-[9px] font-medium capitalize",
          line.status === 'normal' ? "text-brand-green" : "text-orange-500"
        )}>
          {line.status}
        </p>
      </div>
    </div>
  )
}
