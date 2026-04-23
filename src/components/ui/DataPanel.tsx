'use client'

import React, { useState } from 'react'
import { cn } from '@/lib/utils'

interface DataPanelProps {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DataPanel({
  title,
  icon,
  children,
  collapsible = false,
  size = 'md',
  className,
}: DataPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className={cn('data-panel', className)}>
      <div className="data-panel-header">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <h3 className="data-panel-title">{title}</h3>
        </div>
        {collapsible && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-icon"
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <span className={cn('text-lg transition-transform', isCollapsed ? 'rotate-180' : '')}>
              ▼
            </span>
          </button>
        )}
      </div>
      {!isCollapsed && <div className="data-panel-content">{children}</div>}
    </div>
  )
}
