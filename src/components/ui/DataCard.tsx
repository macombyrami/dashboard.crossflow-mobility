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
  mini?:    boolean
  primary?: boolean
  className?: string
}

const VARIANTS = {
  success: {
    color: 'text-status-ok',
    bg:    'bg-status-ok/10',
    border: 'border-status-ok/20',
    glow: 'shadow-glow-green/20'
  },
  warning: {
    color: 'text-status-warn',
    bg:    'bg-status-warn/10',
    border: 'border-status-warn/20',
    glow: 'shadow-glow-yellow/20'
  },
  danger: {
    color: 'text-status-critical',
    bg:    'bg-status-critical/10',
    border: 'border-status-critical/20',
    glow: 'shadow-glow-red/20'
  },
  info: {
    color: 'text-status-info',
    bg:    'bg-status-info/10',
    border: 'border-status-info/20',
    glow: 'shadow-glow-blue/20'
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
  mini = false,
  primary = false,
  className
}: DataCardProps) {
  const v = VARIANTS[variant]

  if (mini) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0A0A0A]/80 backdrop-blur-3xl border border-white/10 shadow-2xl active:scale-95 transition-all w-fit",
        className
      )}>
        <Icon className={cn("w-3.5 h-3.5", v.color)} strokeWidth={2.5} />
        <div className="flex items-baseline gap-0.5">
           <span className="text-sm font-black text-white leading-none tabular-nums tracking-tighter">{value}</span>
           {scale && <span className="text-[8px] font-bold text-white/30 uppercase">{scale}</span>}
        </div>
        <div className="w-px h-3 bg-white/10 mx-0.5" />
        <span className={cn("text-[10px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-white/5", v.color)}>
          {badge.replace(/[✅⚠️🔴✅]/g, '').trim()}
        </span>
      </div>
    )
  }

  if (primary) {
    return (
      <div className={cn(
        "flex flex-col items-center justify-center p-6 rounded-[32px] bg-bg-surface/60 backdrop-blur-3xl border border-white/10 shadow-prestige text-center relative overflow-hidden group",
        className
      )}>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-50" style={{ color: VARIANTS[variant].color }} />
        
        <div className={cn(
          "w-16 h-16 rounded-3xl flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110",
          v.bg, v.color
        )}>
          <Icon className="w-8 h-8" strokeWidth={1.5} />
        </div>

        <div className="flex items-baseline gap-1 justify-center mb-1">
          <span className="text-5xl font-black text-white tracking-tighter font-heading">{value}</span>
          {scale && <span className="text-sm font-bold text-text-muted uppercase tracking-widest">{scale}</span>}
        </div>

        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-3">
          {metric}
        </p>

        <span className={cn(
          "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current bg-white/5",
          v.color
        )}>
          {badge}
        </span>
      </div>
    )
  }

  return (
    <div className={cn(
      "flex items-center gap-4 px-4 py-3 rounded-[24px] bg-bg-surface/40 backdrop-blur-xl border border-white/5 hover:bg-white/10 transition-all cursor-crosshair group relative shadow-xl min-w-[180px]",
      className
    )}>
      {/* Icon Wrapper */}
      <div className={cn(
        "w-10 h-10 rounded-[14px] flex items-center justify-center shrink-0 border border-current shadow-lg transition-transform group-hover:scale-105",
        v.color
      )}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
         <div className="flex items-baseline gap-1">
           <span className="text-xl font-black text-white leading-none tracking-tighter tabular-nums font-heading">{value}</span>
           {scale && <span className="text-[9px] font-bold text-text-muted uppercase">{scale}</span>}
         </div>
         <p className="text-[9px] font-bold text-text-muted uppercase tracking-tighter mt-1 truncate">
           {metric}
         </p>
         
         {/* Badge dot */}
         <div className="flex items-center gap-2 mt-1.5 overflow-hidden">
            <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", v.bg.replace('10', '100'))} />
            <span className={cn("text-[9px] font-black uppercase tracking-widest truncate", v.color)}>
              {badge.replace(/[✅⚠️🔴]/g, '').trim()}
            </span>
         </div>
      </div>
    </div>
  )
}
