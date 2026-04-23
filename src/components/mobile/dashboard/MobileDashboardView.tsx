'use client'

import { memo } from 'react'
import { Activity, Clock, Wind, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { StatusBar } from '@/components/dashboard/StatusBar'
import { PredictionTabs } from '@/components/dashboard/PredictionTabs'
import { pollutionLabel } from '@/lib/utils/congestion'

interface Props {
  kpis: any
  city: any
  incidents: any[]
  status: 'optimal' | 'warning' | 'critical'
  weatherImpact: 'none' | 'low' | 'high'
  refreshedAt?: Date | null
}

function MobileDashboardViewInner({ kpis, incidents, status, weatherImpact, refreshedAt }: Props) {
  const healthScore = Math.round(kpis.networkEfficiency * 100)
  const pollColor = pollutionLabel(kpis.pollutionIndex).color
  const pollWarn = kpis.pollutionIndex >= 7
  const congWarn = kpis.congestionRate >= 0.6
  const congCrit = kpis.congestionRate >= 0.85
  const delayStatus: 'optimal' | 'warning' | 'critical' =
    kpis.avgTravelMin >= 30 ? 'critical' : kpis.avgTravelMin >= 20 ? 'warning' : 'optimal'
  const incidentStatus: 'optimal' | 'warning' | 'critical' = incidents.length >= 8 ? 'critical' : incidents.length >= 4 ? 'warning' : 'optimal'

  return (
    <main className="min-h-full p-4 space-y-4 pb-24 animate-slide-up">
      <StatusBar
        status={status}
        efficiency={healthScore}
        weatherImpact={weatherImpact}
        refreshedAt={refreshedAt}
        live
      />

      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Congestion"
          value={Math.round(kpis.congestionRate * 100)}
          unit="%"
          deltaUnit="%"
          inverse
          icon={Activity}
          color={congCrit ? '#FF1744' : congWarn ? '#FF6D00' : '#00E676'}
          warning={congWarn}
          critical={congCrit}
          status={congCrit ? 'critical' : congWarn ? 'warning' : 'optimal'}
          sub="État du réseau"
          variant="mini"
        />
        <KPICard
          label="Retard moyen"
          value={Math.round(kpis.avgTravelMin)}
          unit="min"
          inverse
          icon={Clock}
          color="#2979FF"
          status={delayStatus}
          sub="Productivité"
          variant="mini"
        />
        <KPICard
          label="Air"
          value={kpis.pollutionIndex.toFixed(1)}
          unit="/ 10"
          icon={Wind}
          color={pollColor}
          warning={pollWarn}
          status={pollWarn ? 'warning' : 'optimal'}
          sub={`NO2 · ${pollutionLabel(kpis.pollutionIndex).label}`}
          variant="mini"
        />
        <KPICard
          label="Incidents"
          value={incidents.length}
          icon={AlertTriangle}
          color={incidents.length > 5 ? '#FF6D00' : '#FFD600'}
          status={incidentStatus}
          sub="Signalements actifs"
          variant="mini"
        />
      </div>

      <PredictionTabs />
    </main>
  )
}

export const MobileDashboardView = memo(MobileDashboardViewInner)
