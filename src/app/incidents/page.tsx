'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, RefreshCw, MapPin, Clock } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import type { IncidentSeverity } from '@/types'
import type { IncidentIntelligenceRecord } from '@/lib/incidents/intelligence'
import { cn } from '@/lib/utils'

const SEVERITY_FILTERS = ['all', 'critical', 'high', 'medium', 'low'] as const

export default function IncidentsPageNew() {
  const city = useMapStore(s => s.city)
  const [filter, setFilter] = useState<IncidentSeverity | 'all'>('all')
  const [incidents, setIncidents] = useState<IncidentIntelligenceRecord[]>([])
  const [selectedIncident, setSelectedIncident] = useState<IncidentIntelligenceRecord | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const bbox = city.bbox.join(',')
      const response = await fetch(`/api/incidents/intelligence?bbox=${bbox}`, { cache: 'no-store' })
      const data = await response.json()
      setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
    } catch {
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [city.id])

  const counts = useMemo(
    () => ({
      all: incidents.length,
      critical: incidents.filter(i => i.severity === 'critical').length,
      high: incidents.filter(i => i.severity === 'high').length,
      medium: incidents.filter(i => i.severity === 'medium').length,
      low: incidents.filter(i => i.severity === 'low').length,
    }),
    [incidents],
  )

  const filtered = useMemo(
    () => incidents.filter(i => filter === 'all' || i.severity === filter),
    [filter, incidents],
  )

  const severityColor = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'critical':
        return 'red'
      case 'high':
        return 'orange'
      case 'medium':
        return 'orange'
      default:
        return 'green'
    }
  }

  return (
    <main className="page-scroll">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Active Incidents</h1>
          <p className="text-text-secondary">
            {city.name} • {filtered.length} incident{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {SEVERITY_FILTERS.map(sev => (
            <button
              key={sev}
              onClick={() => setFilter(sev as IncidentSeverity | 'all')}
              className={cn(
                'px-4 py-2 rounded-lg font-semibold text-sm transition-all whitespace-nowrap',
                filter === sev
                  ? 'bg-status-info text-white'
                  : 'bg-bg-elevated text-text-secondary hover:bg-bg-hover'
              )}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
              <span className="ml-2 text-xs opacity-70">({counts[sev as keyof typeof counts]})</span>
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="mb-6">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elevated hover:bg-bg-hover text-text-primary font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Incidents Grid */}
        {loading ? (
          <SkeletonLoader type="card" count={6} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No Incidents"
            description="All systems operating normally in this area"
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map(incident => (
              <Card
                key={incident.id}
                variant="glass"
                padding="md"
                interactive
                accent={severityColor(incident.severity) as any}
                onClick={() => setSelectedIncident(incident)}
                className="cursor-pointer"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-text-primary flex-1">
                      {incident.road}
                    </h3>
                    <StatusBadge
                      status={
                        incident.severity === 'critical'
                          ? 'critical'
                          : incident.severity === 'high'
                          ? 'warning'
                          : incident.severity === 'medium'
                          ? 'caution'
                          : 'normal'
                      }
                      label={incident.severity}
                      size="sm"
                    />
                  </div>

                  <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                    {incident.description}
                  </p>

                  <div className="space-y-2 text-xs text-text-muted">
                    {incident.direction && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{incident.direction}</span>
                      </div>
                    )}
                    {incident.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span>{incident.location}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(incident.timestamp).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Bottom Sheet Detail View (Mobile) */}
        <BottomSheet
          isOpen={!!selectedIncident && window.innerWidth < 1024}
          title={selectedIncident?.road}
          onClose={() => setSelectedIncident(null)}
        >
          {selectedIncident && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-text-primary mb-2">Details</h4>
                <p className="text-text-secondary text-sm">{selectedIncident.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">Type</p>
                  <p className="font-semibold text-text-primary">{selectedIncident.type}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">Severity</p>
                  <StatusBadge
                    status={
                      selectedIncident.severity === 'critical'
                        ? 'critical'
                        : selectedIncident.severity === 'high'
                        ? 'warning'
                        : selectedIncident.severity === 'medium'
                        ? 'caution'
                        : 'normal'
                    }
                    label={selectedIncident.severity}
                  />
                </div>
              </div>

              {selectedIncident.location && (
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">Location</p>
                  <p className="font-semibold text-text-primary">{selectedIncident.location}</p>
                </div>
              )}

              {selectedIncident.direction && (
                <div>
                  <p className="text-xs text-text-muted uppercase mb-1">Direction</p>
                  <p className="font-semibold text-text-primary">{selectedIncident.direction}</p>
                </div>
              )}

              <button
                onClick={() => window.dispatchEvent(
                  new CustomEvent('cf:incident-selected', {
                    detail: {
                      id: selectedIncident.id,
                      title: selectedIncident.road,
                      description: selectedIncident.description,
                      severity: selectedIncident.severity,
                      type: selectedIncident.type,
                      source: selectedIncident.source,
                      address: selectedIncident.location || selectedIncident.direction || '',
                      startedAt: selectedIncident.timestamp,
                      lng: selectedIncident.lng,
                      lat: selectedIncident.lat,
                    },
                  })
                )}
                className="w-full px-4 py-2 bg-status-info text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Show on Map
              </button>
            </div>
          )}
        </BottomSheet>
      </div>
    </main>
  )
}
