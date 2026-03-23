'use client'
import { CheckCircle2, TrendingDown, TrendingUp, Minus, Clock, Gauge, Wind, Map } from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import type { SimulationResult } from '@/types'
import { useTranslation } from '@/lib/hooks/useTranslation'

export function SimulationResults() {
  const { t, locale } = useTranslation()
  const results       = useSimulationStore(s => s.results)
  const currentResult = useSimulationStore(s => s.currentResult)
  const setCurrentResult = useSimulationStore(s => s.setCurrentResult)

  const dateLocale = locale === 'fr' ? fr : enUS

  if (results.length === 0) return null

  return (
    <div className="space-y-4">
      {currentResult && <ResultDetail result={currentResult} />}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.history')}</p>
        </div>
        <div className="divide-y divide-bg-border">
          {results.map(r => (
            <button
              key={r.id}
              onClick={() => setCurrentResult(r)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors text-left',
                currentResult?.id === r.id && 'bg-brand-green-dim',
              )}
            >
              <div>
                <p className="text-sm font-medium text-text-primary">{r.scenarioName}</p>
                {r.completedAt && (
                  <p className="text-xs text-text-muted">
                    {formatDistanceToNow(new Date(r.completedAt), { locale: dateLocale, addSuffix: true })}
                  </p>
                )}
              </div>
              <DeltaBadge delta={r.delta.congestionPct} inverse />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function ResultDetail({ result }: { result: SimulationResult }) {
  const { t } = useTranslation()
  const { before, after, delta } = result
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-brand-green" />
        <p className="text-sm font-semibold text-text-primary">{result.scenarioName}</p>
      </div>

      <div className="p-5 space-y-4">
        {/* Before/After grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div />
          <div className="text-xs font-semibold text-text-muted uppercase tracking-widest">{t('simulation.before')}</div>
          <div className="text-xs font-semibold text-brand-green uppercase tracking-widest">{t('simulation.after')}</div>

          <MetricRow
            icon={Gauge} label={t('dashboard.congestion')}
            before={`${Math.round(before.congestionRate * 100)}%`}
            after={`${Math.round(after.congestionRate * 100)}%`}
            delta={delta.congestionPct}
            inverse
          />
          <MetricRow
            icon={Clock} label={t('dashboard.travel_time')}
            before={`${before.avgTravelMin} min`}
            after={`${after.avgTravelMin.toFixed(1)} min`}
            delta={delta.travelTimePct}
            inverse
          />
          <MetricRow
            icon={Wind} label={t('dashboard.pollution')}
            before={`${before.pollutionIndex}`}
            after={`${after.pollutionIndex}`}
            delta={delta.pollutionPct}
            inverse
          />
          <MetricRow
            icon={Map} label="Segments"
            before={`${before.affectedSegments}`}
            after={`${after.affectedSegments}`}
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-bg-border">
          <span className="text-xs text-text-muted">{t('simulation.alt_roads')} : <span className="text-text-secondary font-medium">{result.alternativePaths}</span></span>
        </div>
      </div>
    </div>
  )
}

function MetricRow({ icon: Icon, label, before, after, delta, inverse }: {
  icon:     typeof Gauge
  label:    string
  before:   string
  after:    string
  delta?:   number
  inverse?: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 py-2 border-t border-bg-border">
        <Icon className="w-3 h-3 text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
        {delta !== undefined && <DeltaBadge delta={delta} inverse={inverse} size="sm" />}
      </div>
      <div className="py-2 border-t border-bg-border text-sm font-medium text-text-secondary text-center">{before}</div>
      <div className="py-2 border-t border-bg-border text-sm font-bold text-text-primary text-center">{after}</div>
    </>
  )
}

function DeltaBadge({ delta, inverse, size = 'md' }: { delta: number; inverse?: boolean; size?: 'sm' | 'md' }) {
  const isGood = inverse ? delta < 0 : delta > 0
  const color  = Math.abs(delta) < 2 ? '#8080A0' : isGood ? '#00E676' : '#FF1744'
  const sign   = delta > 0 ? '+' : ''
  const Icon   = delta < -2 ? TrendingDown : delta > 2 ? TrendingUp : Minus
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-semibold rounded-md',
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
    )} style={{ color, backgroundColor: `${color}18` }}>
      <Icon className="w-3 h-3" />
      {sign}{Math.abs(delta)}%
    </span>
  )
}
