'use client'

import { memo } from 'react'
import { Activity, Clock, Wind, AlertTriangle } from 'lucide-react'
import { KPICard } from '@/components/dashboard/KPICard'
import { StatusBar } from '@/components/dashboard/StatusBar'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { AIAssistantCard } from './AIAssistantCard'
import { pollutionLabel } from '@/lib/utils/congestion'

interface Props {
  kpis: any
  city: any
  incidents: any[]
  status: 'optimal' | 'warning' | 'critical'
  weatherImpact: 'none' | 'low' | 'high'
  refreshedAt?: Date | null
}

function MobileDashboardViewInner({ kpis, city, incidents, status, weatherImpact, refreshedAt }: Props) {
  const healthScore = Math.round(kpis.networkEfficiency * 100)
  const pollColor = pollutionLabel(kpis.pollutionIndex).color
  const pollWarn = kpis.pollutionIndex >= 7
  const congWarn = kpis.congestionRate >= 0.6
  const congCrit = kpis.congestionRate >= 0.85

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
          sub={`NO2 · ${pollutionLabel(kpis.pollutionIndex).label}`}
          variant="mini"
        />
        <KPICard
          label="Incidents"
          value={incidents.length}
          icon={AlertTriangle}
          color={incidents.length > 5 ? '#FF6D00' : '#FFD600'}
          sub="Signalements actifs"
          variant="mini"
        />
      </div>

      <div className="space-y-3">
        <h2 className="px-1 text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Décision rapide</h2>
        <div className="grid grid-cols-1 gap-3">
          <IncidentFeed
            maxItems={3}
            title="Alertes actives"
            subtitle="À traiter en priorité sur la carte"
            ctaLabel="Voir la carte"
            onCtaClick={() => { window.location.href = '/map' }}
          />
          <AIAssistantCard />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="px-1 text-[10px] font-black uppercase tracking-[0.25em] text-text-muted">Contexte</h2>
        <EventsWidget lat={city.center.lat} lng={city.center.lng} radiusKm={10} maxItems={3} />
      </div>
    </main>
  )
}

export const MobileDashboardView = memo(MobileDashboardViewInner)
