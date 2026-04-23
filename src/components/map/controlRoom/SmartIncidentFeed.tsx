'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTrafficStore } from '@/store/trafficStore'
import { useControlRoomStore } from '@/store/controlRoomStore'
import { useMapStore } from '@/store/mapStore'
import { AlertTriangle, MapPin, Clock, X, ChevronRight } from 'lucide-react'
import type { Incident } from '@/types'

type SortMode = 'impact' | 'severity' | 'recency' | 'proximity'

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'impact', label: 'Impact Score' },
  { value: 'severity', label: 'Severity' },
  { value: 'recency', label: 'Recency' },
  { value: 'proximity', label: 'Proximity' },
]

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const SEVERITY_COLORS = {
  critical: { bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626' },
  high: { bg: 'rgba(249, 115, 22, 0.1)', text: '#F97316' },
  medium: { bg: 'rgba(234, 179, 8, 0.1)', text: '#EAB308' },
  low: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22C55E' },
}

function calculateImpactScore(incident: Incident): number {
  const severityScore = 1 - SEVERITY_ORDER[incident.severity] / 3
  const incidentDate = new Date(incident.startedAt)
  const hoursSince = (Date.now() - incidentDate.getTime()) / (1000 * 60 * 60)
  const recencyFactor = Math.max(0, 1 - hoursSince / 24)

  return severityScore * recencyFactor
}

function calculateDistance(from: { lat: number; lng: number }, to: { lat: number; lng: number }): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  return `${Math.floor(seconds / 86400)}d ago`
}

export function SmartIncidentFeed() {
  const [sortMode, setSortMode] = useState<SortMode>('impact')
  const incidents = useTrafficStore((s) => s.incidents)
  const dismissedIncidentIds = useControlRoomStore((s) => s.dismissedIncidentIds)
  const dismissEvent = useControlRoomStore((s) => s.dismissEvent)
  const mapStore = useMapStore()

  // Filter out dismissed incidents
  const activeIncidents = useMemo(
    () => incidents.filter((i) => !dismissedIncidentIds.has(i.id)),
    [incidents, dismissedIncidentIds]
  )

  // Sort incidents based on selected mode
  const sortedIncidents = useMemo(() => {
    const sorted = [...activeIncidents]

    switch (sortMode) {
      case 'impact':
        return sorted.sort((a, b) => calculateImpactScore(b) - calculateImpactScore(a))

      case 'severity':
        return sorted.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

      case 'recency':
        return sorted.sort(
          (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
        )

      case 'proximity': {
        const mapCenter = mapStore.center || { lat: 48.856613, lng: 2.352222 } // Default to Paris
        return sorted.sort(
          (a, b) => calculateDistance(mapCenter, a.location) - calculateDistance(mapCenter, b.location)
        )
      }

      default:
        return sorted
    }
  }, [activeIncidents, sortMode, mapStore.center])

  // Take only top 10
  const displayedIncidents = sortedIncidents.slice(0, 10)

  const handleIncidentHover = (incidentId: string | null) => {
    if (incidentId) {
      mapStore.setState({ hoveredFeatureId: incidentId })
    }
  }

  const handleIncidentClick = useCallback(
    (incident: Incident) => {
      // Zoom to incident location
      mapStore.setState({
        searchFocus: {
          target: 'location',
          location: incident.location,
          zoomLevel: 15,
        },
      })
    },
    [mapStore]
  )

  const handleDismiss = useCallback(
    (incidentId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      dismissEvent(incidentId)
    },
    [dismissEvent]
  )

  return (
    <div className="space-y-3">
      {/* Sort dropdown */}
      <select
        value={sortMode}
        onChange={(e) => setSortMode(e.target.value as SortMode)}
        className="
          w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border
          text-text-secondary text-xs font-medium
          hover:border-white/20 hover:bg-bg-base/80
          focus:outline-none focus:border-white/30
          transition-colors
        "
      >
        {SORT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-bg-base text-text-primary">
            {opt.label}
          </option>
        ))}
      </select>

      {/* Incidents list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayedIncidents.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-text-secondary">No active incidents</p>
          </div>
        ) : (
          displayedIncidents.map((incident) => {
            const severityColor = SEVERITY_COLORS[incident.severity]
            const timeAgo = formatTimeAgo(incident.startedAt)
            const isResolved = !!incident.resolvedAt

            return (
              <div
                key={incident.id}
                onMouseEnter={() => handleIncidentHover(incident.id)}
                onMouseLeave={() => handleIncidentHover(null)}
                onClick={() => handleIncidentClick(incident)}
                className={`
                  rounded-lg border bg-bg-surface p-3 cursor-pointer
                  transition-all duration-150
                  ${isResolved
                    ? 'opacity-60 border-bg-border/50'
                    : 'border-bg-border hover:border-white/20 hover:bg-bg-surface/60 hover:shadow-lg hover:shadow-white/10'
                  }
                `}
              >
                {/* Header: Severity badge + Location */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className="px-2 py-1 rounded text-xs font-bold uppercase flex-shrink-0"
                      style={{
                        backgroundColor: severityColor.bg,
                        color: severityColor.text,
                      }}
                    >
                      {isResolved ? '✓ Resolved' : incident.severity}
                    </div>
                  </div>

                  {/* Dismiss button */}
                  <button
                    onClick={(e) => handleDismiss(incident.id, e)}
                    className="p-1 hover:bg-white/10 rounded transition-colors flex-shrink-0"
                    aria-label="Dismiss incident"
                  >
                    <X className="w-4 h-4 text-text-secondary hover:text-text-primary" />
                  </button>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-2 text-xs text-text-secondary">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <p className="line-clamp-1">{incident.address}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-text-primary line-clamp-2 mb-2">{incident.title}</p>

                {/* Footer: Time + Details arrow */}
                <div className="flex items-center justify-between text-xs text-text-secondary">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{timeAgo}</span>
                  </div>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Show count and note if there are more */}
      {activeIncidents.length > 10 && (
        <p className="text-xs text-text-secondary text-center py-2 border-t border-bg-border">
          Showing {displayedIncidents.length} of {activeIncidents.length} incidents
        </p>
      )}

      {/* All dismissed note */}
      {activeIncidents.length === 0 && incidents.length > 0 && (
        <p className="text-xs text-text-secondary text-center py-4 italic">
          All incidents dismissed. Refresh to see new incidents.
        </p>
      )}
    </div>
  )
}
