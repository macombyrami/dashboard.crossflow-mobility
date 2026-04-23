'use client'

import React from 'react'
import { Clock, AlertTriangle, TrendingDown, Zap } from 'lucide-react'
import { KPIBlock } from '@/components/ui/KPIBlock'

interface KPIGridNewProps {
  avgTravelTime?: number
  congestionRate?: number
  activeIncidents?: number
  networkEfficiency?: number
  isLoading?: boolean
}

export function KPIGridNew({
  avgTravelTime = 24,
  congestionRate = 0.32,
  activeIncidents = 8,
  networkEfficiency = 0.88,
  isLoading = false,
}: KPIGridNewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton skeleton-card" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
      <KPIBlock
        label="Avg Travel Time"
        value={avgTravelTime}
        unit="min"
        icon={<Clock className="w-5 h-5" />}
        delta={avgTravelTime > 20 ? 5 : -3}
        trend={avgTravelTime > 20 ? 'down' : 'up'}
      />

      <KPIBlock
        label="Congestion Rate"
        value={`${Math.round(congestionRate * 100)}`}
        unit="%"
        delta={congestionRate > 0.3 ? 8 : -2}
        trend={congestionRate > 0.3 ? 'down' : 'up'}
      />

      <KPIBlock
        label="Active Incidents"
        value={activeIncidents}
        icon={<AlertTriangle className="w-5 h-5 text-status-warning" />}
      />

      <KPIBlock
        label="Network Efficiency"
        value={`${Math.round(networkEfficiency * 100)}`}
        unit="%"
        icon={<Zap className="w-5 h-5 text-status-normal" />}
        delta={networkEfficiency > 0.85 ? 2 : -5}
        trend={networkEfficiency > 0.85 ? 'up' : 'down'}
      />
    </div>
  )
}
