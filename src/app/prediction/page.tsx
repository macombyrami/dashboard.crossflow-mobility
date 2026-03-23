'use client'
import { useEffect, useState } from 'react'
import { TrendingUp, Calendar, Cloud, Zap, Users, AlertCircle, RefreshCw, Sun, Train, ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react'
import { EventsWidget } from '@/components/dashboard/EventsWidget'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { buildPredictiveContext, projectContextToHorizon } from '@/lib/predictive/context'
import type { PredictiveContext } from '@/lib/predictive/context'
import { cn } from '@/lib/utils/cn'

import { useTranslation } from '@/lib/hooks/useTranslation'

export default function PredictionPage() {
  const { t } = useTranslation()
  const city             = useMapStore(s => s.city)
  const weather          = useTrafficStore(s => s.openMeteoWeather)
  const airQuality       = useTrafficStore(s => s.airQuality)
  const [ctx, setCtx]    = useState<PredictiveContext | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null)

  const load = async () => {
    setLoading(true)
    const congestion = useTrafficStore.getState().kpis?.congestionRate || 0.3
    const result = await buildPredictiveContext(city, weather, airQuality, congestion)
    setCtx(result)
    setLoading(false)
  }

  useEffect(() => { load() }, [city.id, weather?.temp]) // eslint-disable-line

  const factorColor = (f: number) =>
    f <= 0.7 ? '#00E676' :
    f <= 0.95 ? '#00BCD4' :
    f <= 1.1  ? '#FFD600' :
    f <= 1.4  ? '#FF6D00' : '#FF1744'

  const factorLabel = (f: number) =>
    f <= 0.7  ? 'Very Low Traffic' :
    f <= 0.95 ? 'Light Traffic' :
    f <= 1.1  ? 'Normal Traffic' :
    f <= 1.4  ? 'Heavy Traffic' : 'Major Congestion'

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-green" />
                {t('prediction.title')} — {city.flag} {city.name}
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                {t('prediction.subtitle')}
              </p>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className={cn(
                'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border transition-all',
                loading
                  ? 'bg-bg-elevated border-bg-border text-text-muted'
                  : 'bg-brand-green-dim border-brand-green/30 text-brand-green hover:bg-brand-green/20',
              )}
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
              {loading ? t('common.calculating') : t('common.recalculate')}
            </button>
          </div>

          {loading && !ctx && (
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-8 sm:p-12 text-center">
              <RefreshCw className="w-8 h-8 text-brand-green animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-secondary">{t('common.calculating')}...</p>
              <p className="text-xs text-text-muted mt-1">Calendar · Events · Weather · Sun</p>
            </div>
          )}

          {ctx && (
            <>
              {/* Main factor gauge */}
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-text-primary">{t('prediction.factor')}</p>
                  <span className="text-xs text-text-muted">
                    {t('prediction.confidence')}: {Math.round(ctx.confidence * 100)}%
                  </span>
                </div>
                <p className="text-xs text-text-muted mb-4">
                  Multiplied congestion factor based on context.
                  <span className="hidden sm:inline text-text-secondary"> ×1,00 = normal · &lt;1,00 = lighter · &gt;1,00 = heavier</span>
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                  <div className="text-4xl sm:text-5xl font-bold" style={{ color: factorColor(ctx.totalFactor) }}>
                    ×{ctx.totalFactor.toFixed(2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-lg font-semibold" style={{ color: factorColor(ctx.totalFactor) }}>
                      {factorLabel(ctx.totalFactor)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-text-muted">
                        Result of {ctx.signals.length} {t('prediction.signals').toLowerCase()}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-bg-border" />
                      <div className={cn(
                        "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        ctx.pressureLevel === 'HIGH' ? "bg-red-500/10 text-red-500 border border-red-500/20" :
                        ctx.pressureLevel === 'MEDIUM' ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" :
                        "bg-brand-green/10 text-brand-green border border-brand-green/20"
                      )}>
                        {ctx.pressureLevel} RISK (Scoring: {ctx.pressureScore.toFixed(2)})
                      </div>
                    </div>
                  </div>
                </div>
                {/* Factor breakdown bar */}
                <div className="mt-6 space-y-2">
                  <FactorBar label="Calendar"     value={ctx.calendarFactor} icon={Calendar} />
                  <FactorBar label="Events"       value={ctx.eventFactor}    icon={Users}    />
                  <FactorBar label="Transport"    value={ctx.transportFactor} icon={Train}    />
                  <FactorBar label="Weather"      value={ctx.weatherFactor}  icon={Cloud}    />
                  <FactorBar label="Air Quality"  value={ctx.aqFactor}       icon={Zap}      />
                  <FactorBar label="Seasonality"  value={ctx.seasonFactor}   icon={Sun}      />
                </div>
              </div>

              {/* Feedback UI */}
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand-green/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-brand-green" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">Cette prédiction vous semble-t-elle correcte ?</p>
                    <p className="text-[10px] text-text-muted">Vos retours aident à calibrer le modèle CrossFlow.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {feedback ? (
                    <div className="flex items-center gap-2 text-brand-green text-xs font-medium px-3 py-1.5 bg-brand-green/10 rounded-xl animate-in fade-in zoom-in duration-300">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Merci pour votre retour !
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => setFeedback('positive')}
                        className="p-2 hover:bg-bg-elevated rounded-xl border border-bg-border text-text-secondary hover:text-brand-green transition-colors"
                      >
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => setFeedback('negative')}
                        className="p-2 hover:bg-bg-elevated rounded-xl border border-bg-border text-text-secondary hover:text-red-500 transition-colors"
                      >
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Signals */}
              <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-brand-green" />
                  <p className="text-sm font-semibold text-text-primary">{t('prediction.signals')} ({ctx.signals.length})</p>
                </div>
                <div className="divide-y divide-bg-border">
                  {ctx.signals.map((s, i) => (
                    <div key={i} className="px-5 py-3 flex items-start gap-3 text-xs sm:text-sm">
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        s.impact === 'positive' ? 'bg-[#00E676]' :
                        s.impact === 'negative' ? 'bg-[#FF6D00]' : 'bg-[#454560]',
                      )} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-text-primary">{s.name}</span>
                          <span className="text-[10px] text-text-muted">×{s.factor.toFixed(2)}</span>
                        </div>
                        <p className="text-[11px] text-text-secondary mt-0.5">{s.value}</p>
                        <p className="text-[10px] text-text-muted mt-0.5">Source: {s.source}</p>
                      </div>
                      <span className={cn(
                        'text-[10px] font-semibold px-2 py-0.5 rounded-lg flex-shrink-0',
                        s.impact === 'positive'
                          ? 'bg-[rgba(0,230,118,0.08)] text-[#00E676]'
                          : s.impact === 'negative'
                          ? 'bg-[rgba(255,109,0,0.08)] text-[#FF6D00]'
                          : 'bg-bg-subtle text-text-muted',
                      )}>
                        {s.impact === 'positive' ? '▼ reduced' : s.impact === 'negative' ? '▲ increased' : '→ neutral'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Horizon predictions */}
              <div className="bg-bg-surface border border-bg-border rounded-2xl p-5">
                <p className="text-sm font-semibold text-text-primary mb-4">{t('prediction.projections')}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[15, 30, 60, 120].map(min => {
                    const projected = projectContextToHorizon(ctx, min)
                    return (
                      <div key={min} className="bg-bg-elevated rounded-xl p-3 text-center transition-transform hover:scale-[1.02]">
                        <p className="text-[10px] text-text-muted mb-1">+{min} min</p>
                        <p className="text-base sm:text-lg font-bold" style={{ color: factorColor(projected) }}>
                          ×{projected.toFixed(2)}
                        </p>
                        <p className="text-[9px] mt-0.5" style={{ color: factorColor(projected) }}>
                          {factorLabel(projected)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Events feed */}
              <EventsWidget lat={city.center.lat} lng={city.center.lng} radiusKm={20} maxItems={8} />

              <p className="text-[10px] text-text-muted text-right italic">
                Computed at {new Date(ctx.computedAt).toLocaleTimeString()}
              </p>
            </>
          )}
    </main>
  )
}

function FactorBar({
  label, value, icon: Icon,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }> }) {
  const pct   = Math.min(100, Math.max(0, ((value - 0.3) / (2.0 - 0.3)) * 100))
  const color = value <= 0.95 ? '#00E676' : value <= 1.1 ? '#FFD600' : value <= 1.4 ? '#FF6D00' : '#FF1744'

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 w-36 flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-text-muted" />
        <span className="text-xs text-text-secondary">{label}</span>
      </div>
      <div className="flex-1 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono w-10 text-right" style={{ color }}>×{value.toFixed(2)}</span>
    </div>
  )
}
