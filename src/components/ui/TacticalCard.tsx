'use client'
import React from 'react'
import { cn } from '@/lib/utils/cn'
import { LucideIcon } from 'lucide-react'

interface TacticalCardProps {
  icon: LucideIcon
  value: string | number
  label: string
  subValue?: string
  trend?: {
    value: string
    isPositive: boolean
  }
  color?: string
  className?: string
}

/**
 * 🛰️ TacticalCard (Palantir HUD Spec)
 * High-density, horizontal data component with precision typography.
 */
export function TacticalCard({ 
  icon: Icon, 
  value, 
  label, 
  subValue, 
  trend, 
  color = 'text-brand',
  className 
}: TacticalCardProps) {
  return (
    <div className={cn(
      "group relative flex items-center gap-4 px-4 py-3 rounded-xl",
      "bg-bg-surface/40 backdrop-blur-3xl border border-white/5",
      "hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500",
      "shadow-[0_4px_24px_-12px_rgba(0,0,0,0.5)]",
      className
    )}>
      {/* Precision Accent Border */}
      <div className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-6 rounded-full opacity-40 group-hover:opacity-100 transition-opacity",
        color.replace('text-', 'bg-')
      )} />

      {/* Icon Sphere */}
      <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.03] border border-white/5 shrink-0 overflow-hidden">
        <Icon className={cn("w-4.5 h-4.5 z-10", color)} />
        <div className={cn("absolute inset-0 opacity-10 blur-xl", color.replace('text-', 'bg-'))} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted truncate">
            {label}
          </span>
          {trend && (
            <span className={cn(
              "text-[9px] font-black font-mono",
              trend.isPositive ? "text-brand" : "text-status-critical"
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
          )}
        </div>
        
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className="text-xl font-black font-mono tracking-tighter text-text-primary leading-none">
            {value}
          </span>
          {subValue && (
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">
              {subValue}
            </span>
          )}
        </div>
      </div>

      {/* Subtle Data HUD Glow */}
      <div className="absolute top-0 right-4 w-12 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}
