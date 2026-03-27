'use client'
import React, { useMemo } from 'react'
import { Activity, AlertCircle, ShieldCheck, Zap, TrendingUp, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SocialPulseProps {
  ratpCount: number
  sytadinCount: number
  communityCount: number
}

export function SocialPulse({ ratpCount, sytadinCount, communityCount }: SocialPulseProps) {
  const totalAlerts = ratpCount + sytadinCount + communityCount
  
  // Calculate a "Mobility Health Score" (higher is better)
  const healthScore = useMemo(() => {
    let score = 100
    score -= (ratpCount * 12)
    score -= (sytadinCount * 8)
    score -= (communityCount * 5)
    return Math.max(0, score)
  }, [ratpCount, sytadinCount, communityCount])

  const getStatusColor = (score: number) => {
    if (score > 80) return 'text-brand-green'
    if (score > 50) return 'text-orange-500'
    return 'text-red-500'
  }

  const getStatusLabel = (score: number) => {
    if (score > 80) return 'Fluide'
    if (score > 50) return 'Perturbé'
    return 'Critique'
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-gradient-to-br from-bg-surface/80 to-bg-base border-b border-bg-border shadow-sm">
      
      {/* 1. Health Score */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-bg-elevated/40 border border-bg-border relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <Activity className="w-12 h-12" />
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <ShieldCheck className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Mobility Health</span>
        </div>
        <div className="flex items-end gap-2">
          <span className={cn("text-3xl font-bold tracking-tight", getStatusColor(healthScore))}>
            {healthScore}%
          </span>
          <span className="text-xs font-semibold text-text-muted mb-1.5 uppercase">
            {getStatusLabel(healthScore)}
          </span>
        </div>
        <div className="w-full h-1.5 bg-bg-border rounded-full overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-1000", 
              healthScore > 80 ? "bg-brand-green" : healthScore > 50 ? "bg-orange-500" : "bg-red-500"
            )}
            style={{ width: `${healthScore}%` }}
          />
        </div>
      </div>

      {/* 2. Total Alerts */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-bg-elevated/40 border border-bg-border relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <AlertCircle className="w-12 h-12" />
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <Zap className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Active Alerts</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-text-primary tracking-tight">
            {totalAlerts}
          </span>
          <span className="text-xs font-semibold text-text-muted uppercase">
            Incidents
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Badge count={ratpCount} label="RATP" color="bg-[#00A88F]" />
          <Badge count={sytadinCount} label="ROUTIER" color="bg-[#1DA1F2]" />
          <Badge count={communityCount} label="CITOYEN" color="bg-brand" />
        </div>
      </div>

      {/* 3. Social Pulse / Trend */}
      <div className="flex flex-col gap-3 p-4 rounded-2xl bg-bg-elevated/40 border border-bg-border relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
          <Users className="w-12 h-12" />
        </div>
        <div className="flex items-center gap-2 text-text-muted">
          <TrendingUp className="w-4 h-4" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Social Velocity</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-brand tracking-tight">
            +{(communityCount * 2.4).toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-text-muted uppercase">
            reports / hr
          </span>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          Taux d'engagement citoyen en hausse de 12% ce matin.
        </p>
      </div>

    </div>
  )
}

function Badge({ count, label, color }: { count: number; label: string; color: string }) {
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn("w-2 h-2 rounded-full", color)} />
      <span className="text-[9px] font-bold text-text-secondary uppercase">{label}: <span className="text-text-primary">{count}</span></span>
    </div>
  )
}
