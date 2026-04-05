'use client'
import { memo } from 'react'
import { PilotStatus } from './PilotStatus'
import { AIAssistantCard } from './AIAssistantCard'
import { KPICard } from '@/components/dashboard/KPICard'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { IncidentFeed } from '@/components/dashboard/IncidentFeed'
import { Activity, Clock, Wind, AlertTriangle, CloudSun } from 'lucide-react'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { pollutionLabel } from '@/lib/utils/congestion'

interface Props {
  kpis:      any
  city:      any
  incidents: any[]
}

/**
 * Premium Mobile Dashboard View (Decision Center)
 * Implements the radical hierarchy: Status -> Recommendation -> Compact KPIs -> Feed
 */
function MobileDashboardViewInner({ kpis, city, incidents }: Props) {
  const { t } = useTranslation()
  const healthScore = Math.round(kpis.networkEfficiency * 100)
  const pollColor  = pollutionLabel(kpis.pollutionIndex).color
  const pollWarn   = kpis.pollutionIndex >= 7

  return (
    <main className="min-h-full p-4 space-y-6 pb-24 animate-slide-up">
      {/* Level 0: The Pilot Eye (Urban Health) */}
      <PilotStatus 
        healthScore={healthScore} 
        cityName={city.name} 
        cityFlag={city.flag} 
        statusLabel={healthScore > 80 ? 'Système Optimal' : 'Flux Sous Tension'}
      />

      {/* Level 1: The Brain (AI Intelligence) */}
      <AIAssistantCard className="-mt-2" />

      {/* Level 2: Tactical KPI Grid (2x2 Compact) */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          label="Trafic"
          value={Math.round(kpis.congestionRate * 100)}
          unit="%"
          icon={Activity}
          color={kpis.congestionRate > 0.6 ? '#FF3B30' : '#00FF9D'}
          variant="mini"
        />
        <KPICard
          label="Retard"
          value={Math.round(kpis.avgTravelMin)}
          unit="min"
          icon={Clock}
          color="#2979FF"
          variant="mini"
        />
        <KPICard
          label="Qualité Air"
          value={kpis.pollutionIndex.toFixed(1)}
          icon={Wind}
          color={pollColor}
          variant="mini"
        />
        <KPICard
          label="Météo"
          value="18°C"
          icon={CloudSun}
          color="#FFD60A"
          variant="mini"
        />
      </div>

      {/* Level 3: Supporting Context (Incidents & Events) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h3 className="text-[11px] font-black text-text-muted uppercase tracking-[0.2em]">Événements Critiques</h3>
           <span className="text-[10px] font-bold text-brand">{incidents.length} actifs</span>
        </div>
        <EventsWidget lat={city.center.lat} lng={city.center.lng} radiusKm={10} maxItems={3} />
        <IncidentFeed maxItems={3} />
      </div>

      {/* Level 4: Secondary Actions (Utilities) */}
      <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-4 opacity-40">
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">CrossFlow OS v4.2</span>
        <div className="w-1 h-1 rounded-full bg-text-muted" />
        <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">IA Active</span>
      </div>
    </main>
  )
}

export const MobileDashboardView = memo(MobileDashboardViewInner)
