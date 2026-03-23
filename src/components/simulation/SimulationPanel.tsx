'use client'
import { useState } from 'react'
import { Play, Ban, TrafficCone, Bike, Gauge, Train, Calendar, ChevronDown, CheckCircle2 } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { runSimulation } from '@/lib/engine/simulation.engine'
import { platformConfig } from '@/config/platform.config'
import { cn } from '@/lib/utils/cn'
import type { ScenarioType } from '@/types'

import { useTranslation } from '@/lib/hooks/useTranslation'

const ICONS: Record<ScenarioType, typeof Play> = {
  road_closure:     Ban,
  traffic_light:    TrafficCone,
  bike_lane:        Bike,
  speed_limit:      Gauge,
  public_transport: Train,
  event:            Calendar,
}

export function SimulationPanel() {
  const { t } = useTranslation()
  const city          = useMapStore(s => s.city)
  const store         = useSimulationStore()
  const [expanded, setExpanded] = useState<string | null>(null)

  const scenarioTypes = platformConfig.simulation.scenarioTypes
  const cfg           = platformConfig.simulation.scenarioConfig

  const handleRun = async () => {
    if (store.isRunning) return
    store.setRunning(true)
    store.setProgress(0)
    store.setCurrentResult(null)

    try {
      const scenario = store.buildScenario()
      const result   = await runSimulation(city, scenario, (pct) => store.setProgress(pct))
      store.addResult(result)
      store.setCurrentResult(result)
    } finally {
      store.setRunning(false)
    }
  }

  const impact = cfg[store.scenarioType]?.impact

  return (
    <div className="space-y-4">
      {/* Scenario Type */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.scenario_type')}</p>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2">
          {scenarioTypes.map(type => {
            const Icon    = ICONS[type]
            const active  = store.scenarioType === type
            const scenCfg = cfg[type]
            return (
              <button
                key={type}
                onClick={() => store.setScenarioType(type)}
                className={cn(
                  'flex flex-col items-start gap-1.5 p-3 rounded-xl border text-left transition-all',
                  active
                    ? 'bg-brand-green-dim border-brand-green/40 text-brand-green'
                    : 'border-bg-border text-text-secondary hover:bg-bg-elevated hover:text-text-primary',
                )}
              >
                <Icon className={cn('w-4 h-4', active ? 'text-brand-green' : 'text-text-muted')} />
                <span className="text-xs font-semibold leading-tight">{scenCfg?.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.parameters')}</p>

        <div className="space-y-1.5">
          <div className="flex justify-between">
            <label className="text-xs text-text-secondary">{t('common.name')}</label>
          </div>
          <input
            value={store.scenarioName}
            onChange={e => store.setScenarioName(e.target.value)}
            className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted outline-none focus:border-brand-green/50 transition-colors"
            placeholder={t('simulation.name_placeholder')}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs text-text-secondary">{t('simulation.duration')}</label>
            <span className="text-xs font-semibold text-brand-green">{store.durationHours}h</span>
          </div>
          <input
            type="range"
            min={1}
            max={platformConfig.simulation.maxDurationHours}
            step={1}
            value={store.durationHours}
            onChange={e => store.setDurationHours(+e.target.value)}
            className="w-full accent-[#00E676] cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-text-muted">
            <span>1h</span>
            <span>{platformConfig.simulation.maxDurationHours}h</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="text-xs text-text-secondary">{t('simulation.intensity')}</label>
            <span className="text-xs font-semibold text-brand-green">
              {store.magnitude < 0.7 ? t('simulation.intensity_low') : store.magnitude < 1.3 ? t('simulation.intensity_normal') : t('simulation.intensity_high')}
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={2.0}
            step={0.1}
            value={store.magnitude}
            onChange={e => store.setMagnitude(+e.target.value)}
            className="w-full accent-[#00E676] cursor-pointer"
          />
        </div>

        {/* Plage horaire */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary">{t('simulation.start')}</label>
            <select
              value={store.timeWindowStart}
              onChange={e => store.setTimeWindow(+e.target.value, store.timeWindowEnd)}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-green/50"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-text-secondary">{t('simulation.end')}</label>
            <select
              value={store.timeWindowEnd}
              onChange={e => store.setTimeWindow(store.timeWindowStart, +e.target.value)}
              className="w-full bg-bg-elevated border border-bg-border rounded-lg px-3 py-2 text-sm text-text-primary outline-none focus:border-brand-green/50"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Impact preview */}
      {impact && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.estimated_impact')}</p>
          <ImpactRow label={t('dashboard.congestion')}     value={impact.congestion * store.magnitude} unit="pts" />
          <ImpactRow label={t('dashboard.travel_time')} value={impact.travelTime * store.magnitude} unit="%" />
          <ImpactRow label={t('dashboard.pollution')}       value={impact.pollution  * store.magnitude} unit="pts" />
        </div>
      )}

      {/* Run button */}
      <button
        onClick={handleRun}
        disabled={store.isRunning}
        className={cn(
          'w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-semibold text-sm transition-all',
          store.isRunning
            ? 'bg-bg-elevated text-text-muted cursor-not-allowed'
            : 'bg-brand-green text-bg-base hover:bg-brand-green-hover shadow-glow',
        )}
      >
        {store.isRunning ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
            {t('simulation.running')}... {store.progress}%
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {t('simulation.run')}
          </>
        )}
      </button>

      {store.isRunning && (
        <div className="h-1.5 rounded-full bg-bg-subtle overflow-hidden">
          <div
            className="h-full rounded-full bg-brand-green transition-all duration-300"
            style={{ width: `${store.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

function ImpactRow({ label, value, unit }: { label: string; value: number; unit: string }) {
  const isPositive = value > 0
  const isNeg      = label === 'Congestion' || label === 'Travel Time' || label === 'Pollution' || label === 'Temps de trajet'
  const color      = isPositive ? (isNeg ? '#FF1744' : '#00E676') : (isNeg ? '#00E676' : '#FF1744')
  const sign       = isPositive ? '+' : ''
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className="text-xs font-semibold" style={{ color }}>
        {sign}{Math.round(Math.abs(value) * 100)} {unit}
      </span>
    </div>
  )
}
