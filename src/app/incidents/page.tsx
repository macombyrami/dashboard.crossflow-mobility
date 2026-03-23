'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, RefreshCw, MapPin, Clock, Zap } from 'lucide-react'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { SeverityPill } from '@/components/ui/SeverityPill'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { generateIncidents, generateCityKPIs } from '@/lib/engine/traffic.engine'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { IncidentSeverity, IncidentType } from '@/types'

const SEVERITY_ORDER: Record<IncidentSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 }
const TYPE_LABELS: Record<IncidentType, string> = {
  accident:   'Accident',
  roadwork:   'Travaux',
  congestion: 'Congestion',
  anomaly:    'Anomalie IA',
  event:      'Événement',
}

export default function IncidentsPage() {
  const city       = useMapStore(s => s.city)
  const incidents  = useTrafficStore(s => s.incidents)
  const setIncidents = useTrafficStore(s => s.setIncidents)
  const setKPIs    = useTrafficStore(s => s.setKPIs)
  const [filter, setFilter] = useState<IncidentSeverity | 'all'>('all')
  const [lastRefresh, setLastRefresh] = useState(new Date())

  const refresh = () => {
    setIncidents(generateIncidents(city))
    setKPIs(generateCityKPIs(city))
    setLastRefresh(new Date())
  }

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000)
    return () => clearInterval(interval)
  }, [city]) // eslint-disable-line

  const filtered = [...incidents]
    .filter(i => filter === 'all' || i.severity === filter)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])

  const counts = {
    all:      incidents.length,
    critical: incidents.filter(i => i.severity === 'critical').length,
    high:     incidents.filter(i => i.severity === 'high').length,
    medium:   incidents.filter(i => i.severity === 'medium').length,
    low:      incidents.filter(i => i.severity === 'low').length,
  }

  const FILTERS: { id: IncidentSeverity | 'all'; label: string }[] = [
    { id: 'all',      label: `Tous (${counts.all})` },
    { id: 'critical', label: `Critique (${counts.critical})` },
    { id: 'high',     label: `Élevé (${counts.high})` },
    { id: 'medium',   label: `Moyen (${counts.medium})` },
    { id: 'low',      label: `Faible (${counts.low})` },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#FF6D00]" />
                Incidents — {city.flag} {city.name}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Actualisé {formatDistanceToNow(lastRefresh, { locale: fr, addSuffix: true })}
              </p>
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-elevated border border-bg-border hover:border-text-muted transition-colors text-sm text-text-secondary hover:text-text-primary"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Actualiser
            </button>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  filter === f.id
                    ? 'bg-brand-green-dim text-brand-green border-brand-green/40'
                    : 'bg-bg-surface text-text-secondary border-bg-border hover:border-text-muted',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Incident list */}
          {filtered.length === 0 ? (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-12 text-center">
              <Zap className="w-8 h-8 text-brand-green mx-auto mb-3" />
              <p className="text-text-secondary">Aucun incident dans cette catégorie</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(inc => (
                <div
                  key={inc.id}
                  className={cn(
                    'bg-bg-surface border rounded-2xl p-5 space-y-3 hover:bg-bg-elevated transition-colors',
                    inc.severity === 'critical' ? 'border-[rgba(255,23,68,0.4)]' :
                    inc.severity === 'high'     ? 'border-[rgba(255,109,0,0.3)]' :
                                                  'border-bg-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: inc.iconColor }} />
                      <h3 className="text-sm font-semibold text-text-primary">{inc.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <SeverityPill severity={inc.severity} size="sm" />
                      <span className="text-xs text-text-muted bg-bg-subtle px-2 py-0.5 rounded-full">
                        {TYPE_LABELS[inc.type]}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-text-secondary">{inc.description}</p>

                  <div className="flex items-center gap-4 pt-1 border-t border-bg-border">
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <MapPin className="w-3 h-3" />
                      {inc.address}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(new Date(inc.startedAt), { locale: fr, addSuffix: true })}
                    </span>
                    <span className="text-xs text-text-muted ml-auto">Source: {inc.source}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
