'use client'

import { TrendingDown, TrendingUp, AlertCircle } from 'lucide-react'
import { useControlRoomStore } from '@/store/controlRoomStore'
import { cn } from '@/lib/utils'

export function ControlRoomStatus() {
  const networkStatus = useControlRoomStore((s) => s.networkStatus)
  const avgCongestion = useControlRoomStore((s) => s.avgCongestion)
  const activeIncidentCount = useControlRoomStore((s) => s.activeIncidentCount)
  const transportLoadAverage = useControlRoomStore((s) => s.transportLoadAverage)

  // Color mapping based on status
  const statusConfig = {
    NORMAL: {
      color: '#22C55E',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
      label: 'Normal',
      icon: '✓',
    },
    TENSION: {
      color: '#FFD600',
      bgColor: 'rgba(255, 214, 0, 0.1)',
      borderColor: 'rgba(255, 214, 0, 0.3)',
      label: 'Tension',
      icon: '⚠',
    },
    CRITICAL: {
      color: '#FF3B30',
      bgColor: 'rgba(255, 59, 48, 0.1)',
      borderColor: 'rgba(255, 59, 48, 0.3)',
      label: 'Critical',
      icon: '🚨',
    },
  }

  const config = statusConfig[networkStatus]
  const trendIcon = avgCongestion > 45 ? TrendingUp : TrendingDown

  return (
    <div
      className="rounded-lg border backdrop-blur-sm p-4 space-y-4 transition-all"
      style={{
        background: config.bgColor,
        borderColor: config.borderColor,
      }}
    >
      {/* Header: Status + Trend */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: config.color, boxShadow: `0 0 8px ${config.color}` }}
          />
          <span className="text-sm font-bold text-text-primary">{config.label}</span>
        </div>
        {avgCongestion > 45 ? (
          <TrendingUp className="w-4 h-4" style={{ color: config.color }} />
        ) : (
          <TrendingDown className="w-4 h-4" style={{ color: '#22C55E' }} />
        )}
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Congestion */}
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Congestion</p>
          <p className="text-xl font-bold text-text-primary">{Math.round(avgCongestion)}%</p>
        </div>

        {/* Incidents */}
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Incidents</p>
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-bold text-text-primary">{activeIncidentCount}</p>
            {activeIncidentCount > 0 && (
              <AlertCircle className="w-4 h-4" style={{ color: config.color }} />
            )}
          </div>
        </div>

        {/* Transport Load */}
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Transport</p>
          <p className="text-xl font-bold text-text-primary">{Math.round(transportLoadAverage)}%</p>
        </div>

        {/* AI Prediction */}
        <div className="rounded-md bg-black/20 p-3">
          <p className="text-xs text-text-secondary uppercase font-semibold mb-1">Next 45min</p>
          <p className="text-sm text-text-secondary">Stable</p>
        </div>
      </div>

      {/* Status message */}
      <div className="text-xs text-text-secondary leading-relaxed border-t border-white/10 pt-3">
        {networkStatus === 'CRITICAL' &&
          'Activate control mode: congestion spreading. Monitor incidents closely.'}
        {networkStatus === 'TENSION' && 'Moderate traffic: several incidents affect main routes.'}
        {networkStatus === 'NORMAL' && 'All systems operating normally. Network capacity optimal.'}
      </div>
    </div>
  )
}
