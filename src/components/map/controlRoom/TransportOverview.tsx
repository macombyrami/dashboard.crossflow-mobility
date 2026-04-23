'use client'

import { useState, useMemo } from 'react'
import { useTransportStore, type TransportLineDetail } from '@/store/transportStore'
import { useMapStore } from '@/store/mapStore'
import { Zap, Users, Clock, AlertCircle } from 'lucide-react'

const TRANSPORT_MODES = ['metro', 'rer', 'tram', 'bus'] as const
const MODE_COLORS = {
  metro: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  rer: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  tram: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  bus: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
}

const STATUS_CONFIG = {
  normal: { color: '#22C55E', label: 'Normal' },
  delayed: { color: '#EAB308', label: 'Delayed' },
  disrupted: { color: '#DC2626', label: 'Disrupted' },
}

export function TransportOverview() {
  const [activeTab, setActiveTab] = useState<'metro' | 'rer' | 'tram' | 'bus'>('metro')
  const getTopLines = useTransportStore((s) => s.getTopLines)
  const hoveredLineId = useTransportStore((s) => s.hoveredLineId)
  const setHoveredLine = useTransportStore((s) => s.setHoveredLine)
  const setSelectedLine = useTransportStore((s) => s.setSelectedLine)
  const mapStore = useMapStore()

  // Get top 5 lines for the active tab
  const topLines = useMemo(
    () => getTopLines(activeTab, 5),
    [activeTab, getTopLines]
  )

  const handleLineHover = (lineId: string | null) => {
    setHoveredLine(lineId)
    if (lineId) {
      // Trigger map hover effect
      mapStore.setState({ hoveredFeatureId: lineId })
    }
  }

  const handleLineClick = (line: TransportLineDetail) => {
    setSelectedLine(line.id)

    // Zoom to line bounds on map
    if (line.coordinates.length > 0) {
      const lngs = line.coordinates.map(c => c[0])
      const lats = line.coordinates.map(c => c[1])
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)

      mapStore.setState({
        searchFocus: {
          target: 'bounds',
          bounds: { minLng, maxLng, minLat, maxLat },
          zoomLevel: 13,
        },
      })
    }
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 bg-bg-base/50 rounded-lg p-1">
        {TRANSPORT_MODES.map((mode) => (
          <button
            key={mode}
            onClick={() => setActiveTab(mode)}
            className={`
              flex-1 py-2 px-3 rounded text-xs font-semibold uppercase
              transition-all duration-200
              ${activeTab === mode
                ? `${MODE_COLORS[mode].bg} ${MODE_COLORS[mode].text} border ${MODE_COLORS[mode].border}`
                : 'text-text-secondary hover:text-text-primary'
              }
            `}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Lines list for active tab */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {topLines.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-text-secondary">No {activeTab} lines available</p>
          </div>
        ) : (
          topLines.map((line) => {
            const isHovered = hoveredLineId === line.id
            const statusConfig = STATUS_CONFIG[line.status]

            return (
              <div
                key={line.id}
                onMouseEnter={() => handleLineHover(line.id)}
                onMouseLeave={() => handleLineHover(null)}
                onClick={() => handleLineClick(line)}
                className={`
                  rounded-lg border bg-bg-surface p-3 cursor-pointer
                  transition-all duration-150
                  ${isHovered
                    ? 'border-white/30 bg-bg-surface/80 shadow-lg shadow-white/10'
                    : 'border-bg-border hover:border-white/20 hover:bg-bg-surface/60'
                  }
                `}
              >
                {/* Line number and name */}
                <div className="flex items-start gap-2 mb-2">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: line.color }}
                  >
                    {line.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{line.name}</p>
                  </div>
                </div>

                {/* Load and timing info */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Users className="w-3 h-3" />
                    <span className="font-medium text-text-primary">{line.currentLoad}%</span>
                    <span>load</span>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Clock className="w-3 h-3" />
                    <span className="font-medium text-text-primary">{line.nextTrainMinutes}</span>
                    <span>min</span>
                  </div>
                </div>

                {/* Status badge */}
                <div
                  className="inline-block px-2 py-1 rounded text-xs font-semibold uppercase"
                  style={{
                    backgroundColor: `${statusConfig.color}20`,
                    color: statusConfig.color,
                  }}
                >
                  {statusConfig.label}
                </div>

                {/* Disruption indicator */}
                {line.disruption && (
                  <div className="mt-2 flex items-start gap-2 p-2 rounded bg-bg-base/50 border border-orange-500/20">
                    <AlertCircle className="w-3 h-3 text-orange-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-secondary line-clamp-2">{line.disruption}</p>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Empty state */}
      {topLines.length === 0 && (
        <div className="py-4 text-center text-text-secondary">
          <p className="text-xs">No transport lines available for {activeTab}</p>
        </div>
      )}
    </div>
  )
}
