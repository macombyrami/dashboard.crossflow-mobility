'use client'

import React from 'react'
import { AlertTriangle, Zap, TrendingUp } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/utils'

interface GlobalTrafficBannerProps {
  status: 'NORMAL' | 'TENSE' | 'CRITICAL'
  avgLoadPct: number
  incidentCount: number
  trendLabel: string
  trendTone: string
  cityName: string
}

export function GlobalTrafficBannerNew({
  status,
  avgLoadPct,
  incidentCount,
  trendLabel,
  trendTone,
  cityName,
}: GlobalTrafficBannerProps) {
  const statusColorMap = {
    NORMAL: { badge: 'normal', bg: 'bg-status-normal-bg' },
    TENSE: { badge: 'warning', bg: 'bg-status-warning-bg' },
    CRITICAL: { badge: 'critical', bg: 'bg-status-critical-bg' },
  }

  const config = statusColorMap[status]

  return (
    <div
      className={cn(
        'rounded-lg border glass-card backdrop-blur-xl p-6 mb-6',
        'border-glass-card-border bg-glass-card-bg transition-all duration-300'
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Status & Info */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold text-text-primary">
              {cityName} Traffic Status
            </h2>
            <StatusBadge
              status={config.badge as any}
              label={status}
              size="sm"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Congestion Level */}
            <div>
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Network Load
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">
                  {avgLoadPct}%
                </span>
                <span
                  className={cn('text-xs font-semibold flex items-center gap-1', trendTone)}
                >
                  <TrendingUp className="w-3 h-3" />
                  {trendLabel}
                </span>
              </div>
            </div>

            {/* Incident Count */}
            <div>
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Active Incidents
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-text-primary">
                  {incidentCount}
                </span>
                {incidentCount > 0 && (
                  <AlertTriangle className="w-4 h-4 text-status-warning" />
                )}
              </div>
            </div>

            {/* Last Updated */}
            <div>
              <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
                Last Updated
              </div>
              <div className="text-sm text-text-primary">
                Just now
              </div>
              <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                <div className="w-2 h-2 rounded-full bg-status-normal animate-pulse" />
                Live
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recommendation */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-status-info-bg border border-status-info/20">
          <Zap className="w-5 h-5 text-status-info flex-shrink-0" />
          <div className="text-sm text-text-primary font-medium">
            {status === 'CRITICAL'
              ? 'Activate control mode'
              : status === 'TENSE'
              ? 'Monitor closely'
              : 'All systems normal'}
          </div>
        </div>
      </div>
    </div>
  )
}
