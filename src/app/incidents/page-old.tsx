'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, MapPin, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useMapStore } from '@/store/mapStore'
import type { IncidentSeverity } from '@/types'
import type { IncidentIntelligenceRecord } from '@/lib/incidents/intelligence'

const FILTERS: Array<{ id: IncidentSeverity | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'critical', label: 'Critical' },
  { id: 'high', label: 'High' },
  { id: 'medium', label: 'Medium' },
  { id: 'low', label: 'Low' },
]

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  medium: 'bg-amber-400 text-stone-950',
  low: 'bg-yellow-200 text-stone-900',
}

const SEVERITY_BORDER: Record<IncidentSeverity, string> = {
  critical: 'border-red-200',
  high: 'border-orange-200',
  medium: 'border-amber-200',
  low: 'border-yellow-200',
}

export default function IncidentsPage() {
  const city = useMapStore(s => s.city)
  const [filter, setFilter] = useState<IncidentSeverity | 'all'>('all')
  const [incidents, setIncidents] = useState<IncidentIntelligenceRecord[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const bbox = city.bbox.join(',')
      const response = await fetch(`/api/incidents/intelligence?bbox=${bbox}`, { cache: 'no-store' })
      const data = await response.json()
      setIncidents(Array.isArray(data.incidents) ? data.incidents : [])
      setFetchedAt(data.meta?.fetchedAt ?? new Date().toISOString())
    } catch {
      setIncidents([])
      setFetchedAt(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [city.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(
    () => ({
      all: incidents.length,
      critical: incidents.filter(item => item.severity === 'critical').length,
      high: incidents.filter(item => item.severity === 'high').length,
      medium: incidents.filter(item => item.severity === 'medium').length,
      low: incidents.filter(item => item.severity === 'low').length,
    }),
    [incidents],
  )

  const filtered = useMemo(
    () => incidents.filter(item => filter === 'all' || item.severity === filter),
    [filter, incidents],
  )

  return (
    <main className="mx-auto flex min-h-0 max-w-5xl flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-stone-400">
            <AlertTriangle className="h-4 w-4" />
            <span>Incident Intelligence</span>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-stone-950">{city.name}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {fetchedAt ? `Updated ${formatDistanceToNow(new Date(fetchedAt), { addSuffix: true, locale: fr })}` : 'Syncing incident feeds...'}
          </p>
        </div>

        <button
          onClick={refresh}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition-all hover:border-stone-300 hover:text-stone-950"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(item => (
          <button
            key={item.id}
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
              filter === item.id
                ? 'border-stone-950 bg-stone-950 text-white'
                : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-950'
            }`}
          >
            {item.label} ({counts[item.id]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-stone-200 bg-white p-10 text-center shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
          <p className="text-base font-semibold text-stone-900">No active incident in this filter.</p>
          <p className="mt-2 text-sm text-stone-500">Road network monitoring remains active across Sytadin and TomTom.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(incident => (
            <article
              key={incident.id}
              className={`rounded-[28px] border bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] ${SEVERITY_BORDER[incident.severity]}`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-sm font-bold text-stone-900">
                      {incident.road}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${SEVERITY_STYLES[incident.severity]}`}>
                      {incident.severity}
                    </span>
                    <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-500">
                      {incident.sourceLabel}
                    </span>
                    <span className="rounded-full border border-stone-200 px-3 py-1 text-xs font-semibold text-stone-500">
                      {incident.confidence} confidence
                    </span>
                  </div>

                  <p className="mt-3 text-base font-semibold text-stone-950">
                    {incident.description}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {incident.location || incident.direction || 'Location pending'}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {formatDistanceToNow(new Date(incident.timestamp), { addSuffix: true, locale: fr })}
                    </span>
                    <span>{incident.status === 'active' ? 'Active' : 'Finished'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:max-w-[220px] lg:justify-end">
                  {incident.sources.map(source => (
                    <span
                      key={`${incident.id}-${source}`}
                      className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-semibold text-stone-500"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
