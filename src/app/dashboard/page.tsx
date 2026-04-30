'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { DashboardHeader } from './dashboard-header'
import { DashboardMapPanel } from './dashboard-map-panel'
import { DashboardSidebar } from './dashboard-sidebar'
import type {
  DashboardCity,
  IncidentSelection,
  IntelligenceIncident,
  OperatorMode,
  PriorityItem,
  TransitTab,
} from './dashboard.types'
import {
  buildInsight,
  buildPriorityItems,
  congestionPercent,
  lineLoadIndex,
  networkStatusFromMetrics,
  toIncidentFeedItems,
  toIncidentSelection,
  trendLabel,
} from './dashboard.utils'
import { useDashboardRealtime } from './use-dashboard-realtime'

const GlobalTrafficBannerNew = dynamic(
  () => import('@/components/dashboard/GlobalTrafficBannerNew').then(m => ({ default: m.GlobalTrafficBannerNew })),
  { loading: () => <div className="mb-6 h-[140px] animate-pulse rounded-lg bg-stone-100" /> },
)

const KPIGridNew = dynamic(
  () => import('@/components/dashboard/KPIGridNew').then(m => ({ default: m.KPIGridNew })),
  { loading: () => <SkeletonLoader type="card" count={4} /> },
)

const IncidentFeedNew = dynamic(
  () => import('@/components/dashboard/IncidentFeedNew').then(m => ({ default: m.IncidentFeedNew })),
  { loading: () => <SkeletonLoader type="card" count={4} /> },
)

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse bg-stone-100" />
}

export default function DashboardPage() {
  const city = useMapStore(s => s.city) as DashboardCity
  const setLayer = useMapStore(s => s.setLayer)
  const setMode = useMapStore(s => s.setMode)
  const setSearchFocus = useMapStore(s => s.setSearchFocus)
  const selectSegment = useMapStore(s => s.selectSegment)

  const [operatorMode, setOperatorMode] = useState<OperatorMode>('dashboard')
  const [tab, setTab] = useState<TransitTab>('metros')
  const [selectedIncident, setSelectedIncident] = useState<IncidentSelection | null>(null)
  const lastLoadRef = useRef<number | null>(null)
  const mapAreaRef = useRef<HTMLDivElement | null>(null)

  const { snapshot, incidents, lines, updatedAt, loading } = useDashboardRealtime(city)

  useEffect(() => {
    setMode('live')
    setLayer('traffic', true)
    setLayer('incidents', true)
    setLayer('transport', true)
    setLayer('heatmap', false)
    return undefined
  }, [setLayer, setMode])

  useEffect(() => {
    if (operatorMode === 'control') {
      setMode('live')
      setLayer('traffic', true)
      setLayer('incidents', true)
      setLayer('transport', true)
    }
  }, [operatorMode, setLayer, setMode])

  const avgLoadPct = useMemo(() => {
    if (lines.length > 0) {
      const sum = lines.reduce((acc, line) => acc + lineLoadIndex(line), 0)
      return Math.round(sum / Math.max(lines.length, 1))
    }

    return congestionPercent(snapshot?.traffic?.congestion_level)
  }, [lines, snapshot?.traffic?.congestion_level])

  const incidentCount = incidents.filter(item => item.status === 'active').length
  const criticalCount = incidents.filter(item => item.status === 'active' && (item.severity === 'critical' || item.severity === 'high')).length
  const networkStatus = networkStatusFromMetrics(avgLoadPct, criticalCount)
  const trend = trendLabel(avgLoadPct, lastLoadRef.current)

  useEffect(() => {
    lastLoadRef.current = avgLoadPct
  }, [avgLoadPct])

  const priorityItems = useMemo<PriorityItem[]>(() => buildPriorityItems(incidents, lines), [incidents, lines])

  const tabLines = useMemo(() => {
    return lines
      .filter(item => item.type === tab)
      .sort((a, b) => lineLoadIndex(b) - lineLoadIndex(a))
      .slice(0, 5)
  }, [lines, tab])

  const insight = useMemo(() => buildInsight(incidents, networkStatus, avgLoadPct), [avgLoadPct, incidents, networkStatus])

  const goToMapFocus = useCallback((incident: IntelligenceIncident) => {
    setSelectedIncident(toIncidentSelection(incident))
    setSearchFocus({
      id: `incident-${incident.id}`,
      label: incident.description,
      latitude: incident.lat,
      longitude: incident.lng,
      kind: 'incident',
    })
    setLayer('incidents', true)
    setLayer('traffic', true)
  }, [setLayer, setSearchFocus])

  const handleIncidentFeedClick = useCallback((incident: { id: string }) => {
    const matched = incidents.find(item => item.id === incident.id)
    if (!matched) return
    goToMapFocus(matched)
  }, [goToMapFocus, incidents])

  const handlePriorityHover = useCallback((item: PriorityItem | null) => {
    if (!item || item.kind !== 'incident') {
      setSearchFocus(null)
      return
    }

    setSearchFocus({
      id: `hover-${item.id}`,
      label: item.subtitle,
      latitude: item.lat,
      longitude: item.lng,
      kind: 'incident',
    })
  }, [setSearchFocus])

  const handlePrioritySelect = useCallback((item: PriorityItem) => {
    if (item.kind === 'incident') {
      setSearchFocus({
        id: `focus-${item.id}`,
        label: item.subtitle,
        latitude: item.lat,
        longitude: item.lng,
        kind: 'incident',
      })
      setLayer('incidents', true)
      return
    }

    setLayer('transport', true)
  }, [setLayer, setSearchFocus])

  const handleSelectedIncidentFocus = useCallback((incident: IncidentSelection) => {
    setSearchFocus({
      id: `selected-${incident.id}`,
      label: incident.description,
      latitude: incident.lat,
      longitude: incident.lng,
      kind: 'incident',
    })
  }, [setSearchFocus])

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<IncidentSelection>
      if (!custom.detail?.id) return
      setSelectedIncident(custom.detail)
      setLayer('incidents', true)
    }

    window.addEventListener('cf:incident-selected', handler as EventListener)
    return () => window.removeEventListener('cf:incident-selected', handler as EventListener)
  }, [setLayer])

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-bg-base text-text-primary page-scroll">
      <div className="page-container">
        {!loading && (
          <GlobalTrafficBannerNew
            status={networkStatus as 'NORMAL' | 'TENSE' | 'CRITICAL'}
            avgLoadPct={avgLoadPct}
            incidentCount={incidentCount}
            trendLabel={trend.label}
            trendTone={trend.tone}
            cityName={city.name}
          />
        )}

        <div className="mb-6">
          {loading ? (
            <SkeletonLoader type="card" count={4} />
          ) : (
            <KPIGridNew
              avgTravelTime={snapshot?.traffic?.average_speed ? Math.round((snapshot.traffic.average_speed / 50) * 60) : 24}
              congestionRate={congestionPercent(snapshot?.traffic?.congestion_level) / 100}
              activeIncidents={incidentCount}
              networkEfficiency={0.88}
            />
          )}
        </div>

        <div className="mb-6">
          <h2 className="mb-4 text-lg font-semibold text-text-primary">Active Incidents</h2>
          {loading ? (
            <SkeletonLoader type="card" count={4} />
          ) : (
            <IncidentFeedNew
              incidents={toIncidentFeedItems(incidents)}
              onIncidentClick={handleIncidentFeedClick}
              isLoading={loading}
              maxItems={10}
            />
          )}
        </div>

        <DashboardHeader
          operatorMode={operatorMode}
          networkStatus={networkStatus}
          incidentCount={incidentCount}
          avgLoadPct={avgLoadPct}
          trend={trend}
          updatedAt={updatedAt}
          onScrollToMap={() => mapAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
          onActivateSimulation={() => setMode('simulate')}
          onModeChange={setOperatorMode}
        />

        <section className={cn('grid gap-4', operatorMode === 'control' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]')}>
          {operatorMode !== 'control' && (
            <DashboardSidebar
              priorityItems={priorityItems}
              insight={insight}
              tab={tab}
              tabLines={tabLines}
              incidents={incidents}
              onTabChange={setTab}
              onHoverPriority={handlePriorityHover}
              onPrioritySelect={handlePrioritySelect}
              onIncidentSelect={goToMapFocus}
              onLineHover={() => selectSegment(null)}
            />
          )}

          <DashboardMapPanel
            operatorMode={operatorMode}
            loading={loading}
            incidentCount={incidentCount}
            selectedIncident={selectedIncident}
            mapAreaRef={mapAreaRef}
            map={<CrossFlowMap />}
            onCloseIncident={() => setSelectedIncident(null)}
            onFocusSelectedIncident={handleSelectedIncidentFocus}
          />
        </section>
      </div>
    </main>
  )
}
