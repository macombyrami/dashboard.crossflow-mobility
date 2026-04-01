'use client'
import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface DataCardProps {
  icon:     LucideIcon
  value:    string | number
  scale?:   string   // e.g. "/100", "%"
  metric:   string   // e.g. "SANTÉ URBAINE"
  context:  string   // e.g. "Paris"
  badge:    string   // e.g. "✅ BON"
  variant?: 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const VARIANTS = {
  success: {
    color: 'text-brand-green',
    bg:    'bg-brand-green/10',
    border: 'border-brand-green/20'
  },
  warning: {
    color: 'text-brand-orange',
    bg:    'bg-brand-orange/10',
    border: 'border-brand-orange/20'
  },
  danger: {
    color: 'text-red-500',
    bg:    'bg-red-500/10',
    border: 'border-red-500/20'
  },
  info: {
    color: 'text-brand-blue',
    bg:    'bg-brand-blue/10',
    border: 'border-brand-blue/20'
  }
}

export function DataCard({
  icon: Icon,
  value,
  scale,
  metric,
  context,
  badge,
  variant = 'success',
  className
}: DataCardProps) {
  const v = VARIANTS[variant]

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-crosshair group relative min-w-[200px]",
      className
    )}>
      {/* Icon Wrapper */}
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-current shadow-lg transition-transform group-hover:scale-105",
        v.color
      )}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
         <div className="flex items-baseline gap-1">
           <span className="text-2xl font-black text-white leading-none tracking-tighter">{value}</span>
           {scale && <span className="text-[10px] font-bold text-white/30 uppercase">{scale}</span>}
         </div>
         <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mt-1.5 leading-none truncate">
           {metric}
         </p>
         <p className="text-[11px] font-bold text-white/80 leading-none mt-1 truncate">
           {context}
         </p>
         
         {/* Badge */}
         <span className={cn(
           "mt-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-80",
           v.color
         )}>
           {badge}
         </span>
      </div>
    </div>
  )
}
