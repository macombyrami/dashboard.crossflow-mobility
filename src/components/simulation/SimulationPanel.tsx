'use client'
import { useState } from 'react'
import { Play, Ban, TrafficCone, Bike, Gauge, Train, Calendar, Cpu, MapPin, X } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { runSimulation } from '@/lib/engine/simulation.engine'
import { platformConfig } from '@/config/platform.config'
import { cn } from '@/lib/utils/cn'
import { predictiveApi, scenarioToEventType, scenarioRadius } from '@/lib/api/predictive'
import type { ScenarioType, SimulationResult } from '@/types'

import { useTranslation } from '@/lib/hooks/useTranslation'

const ICONS: Record<ScenarioType, typeof Play> = {
  road_closure:     Ban,
  traffic_light:    TrafficCone,
  bike_lane:        Bike,
  speed_limit:      Gauge,
  public_transport: Train,
  event:            Calendar,
}

/** Try to apply the scenario on the predictive backend and return route delta. */
async function runPredictiveStrategy(
  eventCenter: { lat: number; lng: number },
  scenarioType: ScenarioType,
  scenarioName: string,
  magnitude: number,
) {
  const health = await predictiveApi.health()
  if (!health?.online || !health?.graph_loaded) return undefined

  // Reset previous state, then apply scenario at the selected (or city center) location
  await predictiveApi.resetSimulation()
  const eventType = scenarioToEventType(scenarioType)
  const radius    = scenarioRadius(scenarioType, magnitude)
  await predictiveApi.addEvent(eventCenter, eventType, radius, scenarioName)

  // Compare a representative route through the event zone
  const start = { lat: eventCenter.lat - 0.008, lng: eventCenter.lng - 0.008 }
  const end   = { lat: eventCenter.lat + 0.008, lng: eventCenter.lng + 0.008 }
  const cmp   = await predictiveApi.compareRoutes(start, end)

  if (!cmp.delta) return undefined
  return {
    normal:    { total_distance_m: cmp.normal.total_distance_m, total_time_s: cmp.normal.total_time_s },
    simulated: { total_distance_m: cmp.simulated.total_distance_m, total_time_s: cmp.simulated.total_time_s },
    delta:     cmp.delta,
  }
}

export function SimulationPanel() {
  const { t } = useTranslation()
  const city          = useMapStore(s => s.city)
  const store         = useSimulationStore()
  const scenarioTypes = platformConfig.simulation.scenarioTypes
  const cfg           = platformConfig.simulation.scenarioConfig

  const [backendActive, setBackendActive] = useState(false)

  const handleRun = async () => {
    if (store.isRunning) return
    store.setRunning(true)
    store.setProgress(0)
    store.setCurrentResult(null)
    setBackendActive(false)

    try {
      const scenario = store.buildScenario()

      // 1. Try predictive backend — use pinned location or city center as fallback
      let predictive: SimulationResult['predictive'] | undefined
      const eventCenter = store.eventLocation ?? city.center
      try {
        predictive = await runPredictiveStrategy(
          eventCenter,
          store.scenarioType,
          scenario.name,
          store.magnitude,
        )
        if (predictive) setBackendActive(true)
      } catch {
        // Backend unavailable — graceful degradation to synthetic engine
      }

      // 2. Run synthetic engine for KPI metrics (always)
      const result = await runSimulation(city, scenario, (pct) => store.setProgress(pct))

      const finalResult: SimulationResult = predictive ? { ...result, predictive } : result

      store.addResult(finalResult)
      store.setCurrentResult(finalResult)
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

      {/* Localisation de l'événement */}
      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-bg-border flex items-center justify-between">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Localisation</p>
          {store.eventLocation && (
            <button
              onClick={() => store.setEventLocation(null)}
              className="text-[10px] text-[#FF4757] hover:opacity-80 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Réinitialiser
            </button>
          )}
        </div>
        <div className="p-3 space-y-2.5">
          {store.eventLocation ? (
            <div className="flex items-center gap-2 bg-[rgba(255,71,87,0.08)] border border-[rgba(255,71,87,0.2)] rounded-lg px-3 py-2">
              <MapPin className="w-3.5 h-3.5 text-[#FF4757] shrink-0" />
              <span className="text-xs text-[#FF4757] font-mono">
                {store.eventLocation.lat.toFixed(4)}, {store.eventLocation.lng.toFixed(4)}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-text-muted leading-relaxed">
              Zone entière de <strong>{city.name}</strong> — ou placez un point précis sur la carte.
            </p>
          )}
          <button
            onClick={() => store.setLocationPickerActive(!store.locationPickerActive)}
            className={cn(
              'w-full text-xs rounded-lg py-2 font-semibold flex items-center justify-center gap-1.5 transition-all border',
              store.locationPickerActive
                ? 'bg-[rgba(255,71,87,0.15)] text-[#FF4757] border-[rgba(255,71,87,0.4)] animate-pulse'
                : 'bg-bg-elevated text-text-secondary border-bg-border hover:text-text-primary',
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            {store.locationPickerActive ? 'Cliquez sur la carte…' : 'Placer sur la carte'}
          </button>
        </div>
      </div>

      {/* Impact preview — only shown after the simulation has been run at least once,
           or as indicative estimate when user has changed parameters (#21) */}
      {impact && !store.isRunning && store.currentResult === null && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-3 opacity-70">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.estimated_impact')}</p>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-text-muted uppercase tracking-wider">Indicatif</span>
          </div>
          <ImpactRow label={t('dashboard.congestion')}  value={impact.congestion * store.magnitude} unit="pts" />
          <ImpactRow label={t('dashboard.travel_time')} value={impact.travelTime * store.magnitude} unit="%" />
          <ImpactRow label={t('dashboard.pollution')}   value={impact.pollution  * store.magnitude} unit="pts" />
          <p className="text-[10px] text-text-muted">Lancez la simulation pour obtenir des résultats précis.</p>
        </div>
      )}
      {impact && store.currentResult !== null && (
        <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.estimated_impact')}</p>
          <ImpactRow label={t('dashboard.congestion')}  value={impact.congestion * store.magnitude} unit="pts" />
          <ImpactRow label={t('dashboard.travel_time')} value={impact.travelTime * store.magnitude} unit="%" />
          <ImpactRow label={t('dashboard.pollution')}   value={impact.pollution  * store.magnitude} unit="pts" />
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

      {backendActive && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-green/10 border border-brand-green/25 text-brand-green text-[10px] font-semibold">
          <Cpu className="w-3 h-3" />
          Moteur prédictif OSM activé
        </div>
      )}

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
