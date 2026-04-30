'use client'

import Link from 'next/link'
import { ArrowUpRight, MapPinned, Sparkles, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { IncidentSelection, OperatorMode } from './dashboard.types'
import { formatAge, SEVERITY_STYLE } from './dashboard.utils'

type DashboardMapPanelProps = {
  operatorMode: OperatorMode
  loading: boolean
  incidentCount: number
  selectedIncident: IncidentSelection | null
  mapAreaRef: React.RefObject<HTMLDivElement | null>
  map: React.ReactNode
  onCloseIncident: () => void
  onFocusSelectedIncident: (incident: IncidentSelection) => void
}

export function DashboardMapPanel({
  operatorMode,
  loading,
  incidentCount,
  selectedIncident,
  mapAreaRef,
  map,
  onCloseIncident,
  onFocusSelectedIncident,
}: DashboardMapPanelProps) {
  return (
    <div
      ref={mapAreaRef}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-[0_18px_44px_rgba(15,23,42,0.08)]',
        operatorMode === 'control' ? 'h-[calc(100vh-220px)]' : 'h-[780px]',
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <div className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-stone-700" />
            <p className="text-sm font-semibold text-stone-900">Real-Time Urban Map</p>
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-stone-500">
            <Sparkles className="h-3.5 w-3.5" />
            {loading ? 'Syncing live layers...' : `${incidentCount} incidents live`}
          </div>
        </div>
        <div className="min-h-0 flex-1">{map}</div>
      </div>

      {selectedIncident && (
        <div className="pointer-events-none absolute bottom-4 right-4 z-20 w-[min(400px,calc(100%-2rem))]">
          <div className="pointer-events-auto rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_42px_rgba(15,23,42,0.14)]">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[selectedIncident.severity].dot)} />
                  <p className="text-sm font-bold text-stone-900">{selectedIncident.title}</p>
                </div>
                <p className="mt-1 text-xs text-stone-500">{selectedIncident.type} • {selectedIncident.source}</p>
              </div>
              <button
                onClick={onCloseIncident}
                className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:text-stone-900"
                aria-label="Close incident details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-sm text-stone-700">{selectedIncident.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
              {selectedIncident.address && <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{selectedIncident.address}</span>}
              <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{SEVERITY_STYLE[selectedIncident.severity].text}</span>
              <span className="rounded-full border border-stone-200 bg-stone-50 px-2 py-0.5">{formatAge(selectedIncident.startedAt)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => onFocusSelectedIncident(selectedIncident)}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-100"
              >
                <MapPinned className="h-3.5 w-3.5" />
                Focus On Map
              </button>
              <Link href="/incidents" className="inline-flex h-9 items-center gap-1 rounded-xl border border-stone-200 px-3 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                Open Incident Page
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
