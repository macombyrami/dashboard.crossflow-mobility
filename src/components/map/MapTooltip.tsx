'use client'

import React from 'react'
import { cn } from '@/lib/utils/cn'

interface MapTooltipProps {
  title: string
  type?: string
  severity?: 'critical' | 'warning' | 'caution' | 'normal'
  roadInfo?: {
    name?: string
    direction?: string
    distance?: string
  }
  timing?: {
    createdAt?: string
    duration?: string
  }
  className?: string
  x?: number
  y?: number
}

const severityColors = {
  critical: 'text-status-critical bg-status-critical-bg border-status-critical/30',
  warning: 'text-status-warning bg-status-warning-bg border-status-warning/30',
  caution: 'text-status-caution bg-status-caution-bg border-status-caution/30',
  normal: 'text-status-normal bg-status-normal-bg border-status-normal/30',
}

export function MapTooltip({
  title,
  type,
  severity = 'normal',
  roadInfo,
  timing,
  className,
}: MapTooltipProps) {
  return (
    <div
      className={cn(
        'bg-popup-bg border border-bg-border rounded-lg shadow-popover p-3 text-sm text-popup-text z-50',
        className
      )}
    >
      <div className="font-semibold mb-2 text-text-primary">{title}</div>

      {type && severity && (
        <div className={cn(
          'inline-block px-2 py-1 rounded text-xs font-semibold mb-2 border',
          severityColors[severity]
        )}>
          {type}
        </div>
      )}

      {roadInfo && (
        <div className="space-y-1 text-xs text-popup-secondary mb-2">
          {roadInfo.name && (
            <div>
              <span className="opacity-60">Road: </span>
              {roadInfo.name}
            </div>
          )}
          {roadInfo.direction && (
            <div>
              <span className="opacity-60">Direction: </span>
              {roadInfo.direction}
            </div>
          )}
          {roadInfo.distance && (
            <div>
              <span className="opacity-60">Distance: </span>
              {roadInfo.distance}
            </div>
          )}
        </div>
      )}

      {timing && (
        <div className="space-y-1 text-xs text-popup-secondary border-t border-popup-surface pt-2">
          {timing.createdAt && (
            <div>
              <span className="opacity-60">Time: </span>
              {new Date(timing.createdAt).toLocaleTimeString()}
            </div>
          )}
          {timing.duration && (
            <div>
              <span className="opacity-60">Duration: </span>
              {timing.duration}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
