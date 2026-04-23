'use client'

import { X, AlertTriangle, MapPin, Clock } from 'lucide-react'
import { useControlRoomStore, type CriticalEvent } from '@/store/controlRoomStore'
import { useMapStore } from '@/store/mapStore'

export function CriticalEventsPanel() {
  const events = useControlRoomStore((s) => s.criticalEvents)
  const dismissEvent = useControlRoomStore((s) => s.dismissEvent)
  const mapStore = useMapStore()

  const handleEventClick = (event: CriticalEvent) => {
    // TODO: Zoom map to event location
    useMapStore.setState({
      searchFocus: {
        target: 'location',
        location: event.location,
        zoomLevel: 14,
      },
    })
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-bg-border bg-bg-surface/50 p-4 text-center">
        <p className="text-sm text-text-secondary">No critical events</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2">
        Critical Events ({events.length})
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.map((event) => (
          <div
            key={event.id}
            className="rounded-lg border bg-bg-surface p-3 cursor-pointer hover:bg-bg-surface/80 transition-all"
            style={{
              borderColor: event.severity === 'critical' ? 'rgba(255, 59, 48, 0.3)' : 'rgba(255, 214, 0, 0.3)',
              backgroundColor:
                event.severity === 'critical'
                  ? 'rgba(255, 59, 48, 0.05)'
                  : 'rgba(255, 214, 0, 0.05)',
            }}
            onClick={() => handleEventClick(event)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Badge + Label */}
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="px-2 py-1 rounded text-xs font-bold uppercase"
                    style={{
                      backgroundColor:
                        event.severity === 'critical' ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 214, 0, 0.2)',
                      color: event.severity === 'critical' ? '#FF3B30' : '#FFD600',
                    }}
                  >
                    {event.severity === 'critical' ? 'CRITICAL' : 'HIGH'}
                  </div>
                  <span className="text-sm font-semibold text-text-primary truncate">{event.label}</span>
                </div>

                {/* Location + Impact */}
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </div>
                  <div
                    className="px-2 py-0.5 rounded"
                    style={{
                      backgroundColor:
                        event.impact === 'high' ? 'rgba(255, 59, 48, 0.1)' : 'rgba(255, 214, 0, 0.1)',
                      color: event.impact === 'high' ? '#FF3B30' : '#FFD600',
                    }}
                  >
                    {event.impact === 'high' ? 'High impact' : 'Medium impact'}
                  </div>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  dismissEvent(event.id)
                }}
                className="flex-shrink-0 p-1 hover:bg-white/10 rounded transition-colors"
                aria-label="Dismiss event"
              >
                <X className="w-4 h-4 text-text-secondary hover:text-text-primary" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
