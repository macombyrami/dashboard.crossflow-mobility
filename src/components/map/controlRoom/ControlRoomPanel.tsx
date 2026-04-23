'use client'

import { useState } from 'react'
import { X, ChevronUp } from 'lucide-react'
import { ControlRoomStatus } from './ControlRoomStatus'
import { CriticalEventsPanel } from './CriticalEventsPanel'
import { TransportOverview } from './TransportOverview'
import { SmartIncidentFeed } from './SmartIncidentFeed'
import { SimulationControlPanel } from './SimulationControlPanel'

type TabType = 'transport' | 'incidents' | 'simulation'

interface ControlRoomPanelProps {
  isMobile?: boolean
  isOpen?: boolean
  onClose?: () => void
}

export function ControlRoomPanel({ isMobile = false, isOpen = true, onClose }: ControlRoomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('transport')
  const [isExpanded, setIsExpanded] = useState(!isMobile)

  if (isMobile && !isOpen) return null

  return (
    <>
      {/* Mobile backdrop */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Control Room Panel */}
      <div
        className={`
          ${isMobile
            ? `fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl transition-all duration-300 ${
                isExpanded ? 'h-[75vh]' : 'h-auto'
              }`
            : 'flex flex-col h-full'
          }
          bg-bg-surface border-t lg:border-r lg:border-t-0 border-bg-border
          overflow-hidden lg:overflow-visible
        `}
      >
        {/* Mobile handle */}
        {isMobile && (
          <div className="flex-shrink-0 px-4 py-3 flex items-center justify-between lg:hidden">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex-1 flex items-center justify-center py-2"
            >
              <div className="w-12 h-1 rounded-full bg-white/20" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        )}

        {/* Desktop header / Mobile header */}
        <div
          className={`
            flex-shrink-0 border-b border-bg-border
            ${isMobile && !isExpanded ? 'hidden' : ''}
          `}
        >
          <div className="p-4 space-y-3 hidden lg:block">
            <h2 className="text-lg font-semibold text-text-primary">Control Room</h2>
            <ControlRoomStatus />
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-2">
                Critical Events
              </h3>
              <CriticalEventsPanel />
            </div>
          </div>

          {/* Mobile title */}
          <div className="p-4 lg:hidden">
            <h2 className="text-lg font-semibold text-text-primary mb-2">Control Panel</h2>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 px-4 lg:px-0">
            {(['transport', 'incidents', 'simulation'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  flex-1 py-3 px-2 text-xs font-semibold uppercase tracking-wider
                  border-b-2 transition-colors relative
                  ${activeTab === tab
                    ? 'border-white/40 text-text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content area */}
        <div
          className={`
            flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4
            ${isMobile && !isExpanded ? 'hidden' : ''}
          `}
        >
          {/* Transport Tab */}
          {activeTab === 'transport' && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-3 lg:hidden">
                Busiest Transit Lines
              </h3>
              <TransportOverview />
            </div>
          )}

          {/* Incidents Tab */}
          {activeTab === 'incidents' && (
            <div>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-3 lg:hidden">
                Active Incidents
              </h3>
              <SmartIncidentFeed />
            </div>
          )}

          {/* Simulation Tab */}
          {activeTab === 'simulation' && (
            <div>
              <SimulationControlPanel />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
