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
  className?: string
}

const VARIANTS = {
  success: {
    color: 'text-brand-green',
    bg:    'bg-brand-green/10',
    border: 'border-brand-green/20',
    glow: 'shadow-glow-green/20'
  },
  warning: {
    color: 'text-[#FACD15]',
    bg:    'bg-[#FACD15]/10',
    border: 'border-[#FACD15]/20',
    glow: 'shadow-glow-yellow/20'
  },
  danger: {
    color: 'text-[#EF4444]',
    bg:    'bg-[#EF4444]/10',
    border: 'border-[#EF4444]/20',
    glow: 'shadow-glow-red/20'
  },
  info: {
    color: 'text-brand-blue',
    bg:    'bg-brand-blue/10',
    border: 'border-brand-blue/20',
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

  return (
    <div className={cn(
      "flex items-center gap-4 px-5 py-4 rounded-[20px] bg-[#0A0A0A]/40 backdrop-blur-2xl border border-white/10 hover:bg-white/5 transition-all cursor-crosshair group relative min-w-[200px] shadow-2xl",
      className
    )}>
      {/* Icon Wrapper */}
      <div className={cn(
        "w-12 h-12 rounded-[16px] flex items-center justify-center shrink-0 border border-current shadow-lg transition-transform group-hover:scale-105",
        v.color
      )}>
        <Icon className="w-6 h-6" />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0">
         <div className="flex items-baseline gap-1">
           <span className="text-2xl font-black text-white leading-none tracking-tighter tabular-nums">{value}</span>
           {scale && <span className="text-[10px] font-bold text-white/30 uppercase">{scale}</span>}
         </div>
         <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] mt-2 leading-none truncate">
           {metric}
         </p>
         <p className="text-[11px] font-bold text-white/80 leading-none mt-1.5 truncate">
           {context}
         </p>
         
         {/* Badge */}
         <span className={cn(
           "mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit border border-current opacity-80",
           v.color
         )}>
           {badge}
         </span>
      </div>
    </div>
  )
}
