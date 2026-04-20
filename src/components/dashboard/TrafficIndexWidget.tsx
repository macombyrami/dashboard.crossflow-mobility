'use client'
import { useEffect, useState } from 'react'
import { TrendingDown, TrendingUp, Minus, BrainCircuit } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { congestionColor } from '@/lib/utils/congestion'
import { generatePrediction } from '@/lib/engine/traffic.engine'
import { cn } from '@/lib/utils/cn'
import type { Prediction } from '@/types'

export function TrafficIndexWidget() {
  const city    = useMapStore(s => s.city)
  const kpis    = useTrafficStore(s => s.kpis)
  const [pred, setPred] = useState<Prediction | null>(null)

  useEffect(() => {
    if (!kpis) return
    setPred(generatePrediction(city, 30))
  }, [city, kpis])

  if (!kpis) return null

  const score     = Math.round((1 - kpis.congestionRate) * 100)
  const color     = congestionColor(kpis.congestionRate)
  const predScore = pred ? Math.round((1 - pred.globalCongestion) * 100) : null
  const delta     = predScore !== null ? predScore - score : null

  const trend =
    delta === null  ? 'stable' :
    delta >  3      ? 'improving' :
    delta < -3      ? 'worsening' : 'stable'

  const trendCfg = {
    improving: { icon: TrendingDown, label: 'Amélioration',  color: '#22C55E', bg: 'rgba(34,197,94,0.10)'  },
    stable:    { icon: Minus,        label: 'Stable',         color: '#86868B', bg: 'rgba(134,134,139,0.10)' },
    worsening: { icon: TrendingUp,   label: 'Dégradation',   color: '#FF3B30', bg: 'rgba(255,59,48,0.10)'  },
  }[trend]

  const TrendIcon = trendCfg.icon

  return (
    <div className="glass-card rounded-[22px] p-5 sm:p-6 animate-scale-in [animation-delay:300ms]">
      <div className="flex items-center gap-2 mb-5">
        <BrainCircuit className="w-3.5 h-3.5 text-brand" />
        <span className="text-[11px] font-bold text-text-muted uppercase tracking-[0.18em]">
          Indice Global de Trafic
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:gap-6">
        {/* Score principal */}
        <div className="col-span-1 flex flex-col items-center justify-center text-center">
          <span
            className="text-5xl sm:text-6xl font-black tabular-nums leading-none transition-colors duration-500"
            style={{ color }}
          >
            {score}
          </span>
          <span className="text-[11px] font-bold text-text-muted mt-1.5 uppercase tracking-wider">/ 100</span>
          <span className="text-[10px] text-text-muted mt-1">Score actuel</span>
        </div>

        {/* Tendance */}
        <div className="flex flex-col items-center justify-center text-center gap-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: trendCfg.bg, border: `1px solid ${trendCfg.color}30` }}
          >
            <TrendIcon className="w-5 h-5" style={{ color: trendCfg.color }} />
          </div>
          <span className="text-[12px] font-bold" style={{ color: trendCfg.color }}>{trendCfg.label}</span>
          <span className="text-[10px] text-text-muted">Tendance</span>
        </div>

        {/* Projection +30 min */}
        <div className="flex flex-col items-center justify-center text-center">
          {predScore !== null ? (
            <>
              <span
                className="text-3xl sm:text-4xl font-bold tabular-nums leading-none"
                style={{ color: congestionColor(pred!.globalCongestion) }}
              >
                {predScore}
              </span>
              <span className={cn(
                'text-[10px] font-bold mt-1.5',
                delta !== null && delta > 0 ? 'text-[#22C55E]' : delta !== null && delta < 0 ? 'text-[#FF3B30]' : 'text-text-muted',
              )}>
                {delta !== null && delta !== 0 ? (delta > 0 ? `+${delta}` : `${delta}`) : '±0'} pts
              </span>
              <span className="text-[10px] text-text-muted mt-0.5">
                Dans 30 min
                {pred && (
                  <span className="block text-[9px] opacity-60">{Math.round(pred.confidence * 100)}% confiance</span>
                )}
              </span>
            </>
          ) : (
            <span className="text-text-muted text-xs">—</span>
          )}
        </div>
      </div>

      {/* Progress bar du score */}
      <div className="mt-5 h-1.5 rounded-full bg-bg-subtle overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${score}%`,
            background: `linear-gradient(to right, #FF3B30, #FFD600, #22C55E)`,
            backgroundSize: '200px 100%',
            backgroundPosition: `${100 - score}% 0`,
          }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-text-muted mt-1 font-medium uppercase tracking-wide">
        <span>Critique</span>
        <span>Fluide</span>
      </div>
    </div>
  )
}
