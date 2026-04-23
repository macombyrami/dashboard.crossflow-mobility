'use client'

import React from 'react'
import { AlertTriangle, MapPin, Clock, TrendingUp } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils/cn'

interface Incident {
  id: string
  road: string
  direction: string
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  timestamp: string
  location: string
}

interface IncidentFeedNewProps {
  incidents: Incident[]
  onIncidentClick?: (incident: Incident) => void
  isLoading?: boolean
  maxItems?: number
}

const severityConfig = {
  critical: { status: 'critical', icon: AlertTriangle },
  high: { status: 'warning', icon: AlertTriangle },
  medium: { status: 'caution', icon: AlertTriangle },
  low: { status: 'normal', icon: AlertTriangle },
}

function formatTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  return `${h}h ago`
}

export function IncidentFeedNew({
  incidents,
  onIncidentClick,
  isLoading = false,
  maxItems = 10,
}: IncidentFeedNewProps) {
  const displayIncidents = incidents.slice(0, maxItems)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-lg" />
        ))}
      </div>
    )
  }

  if (displayIncidents.length === 0) {
    return (
      <EmptyState
        icon="🟢"
        title="No Active Incidents"
        description="All systems operating normally"
      />
    )
  }

  return (
    <div className="space-y-2">
      {displayIncidents.map((incident) => {
        const config = severityConfig[incident.severity as keyof typeof severityConfig]

        return (
          <Card
            key={incident.id}
            variant="glass"
            padding="md"
            interactive={true}
            accent={
              incident.severity === 'critical'
                ? 'red'
                : incident.severity === 'high'
                ? 'orange'
                : incident.severity === 'medium'
                ? 'orange'
                : 'green'
            }
            onClick={() => onIncidentClick?.(incident)}
            className="cursor-pointer hover:bg-glass-hover-border/5 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-semibold text-text-primary truncate">
                    {incident.road}
                  </h4>
                  <StatusBadge
                    status={config.status as any}
                    label={incident.severity.charAt(0).toUpperCase() + incident.severity.slice(1)}
                    size="sm"
                  />
                </div>

                <p className="text-sm text-text-secondary line-clamp-1 mb-2">
                  {incident.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-text-muted">
                  {incident.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {incident.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(incident.timestamp)}
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-text-secondary" />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
