'use client'
import { X, Gauge, Clock, Car, TrendingDown, TrendingUp, Minus, BrainCircuit, Zap } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { CongestionBadge } from '@/components/ui/CongestionBadge'
import { congestionColor, trendIcon } from '@/lib/utils/congestion'
import { platformConfig } from '@/config/platform.config'
import { cn } from '@/lib/utils/cn'

export function EdgeDetailPanel() {
  const selectedId  = useMapStore(s => s.selectedSegmentId)
  const isPanelOpen = useMapStore(s => s.isPanelOpen)
  const setPanelOpen = useMapStore(s => s.setPanelOpen)
  const selectSegment = useMapStore(s => s.selectSegment)
  const snapshot    = useTrafficStore(s => s.snapshot)

  const segment = snapshot?.segments.find(s => s.id === selectedId)

  const close = () => {
    setPanelOpen(false)
    selectSegment(null)
  }

  if (!isPanelOpen || !segment) return null

  const displaySpeed = getCredibleDisplaySpeed(segment.speedKmh, segment.freeFlowSpeedKmh, segment.congestionScore)
  const travelMin    = Math.round(Math.max(segment.travelTimeSeconds / 60, ((segment.length / 1000) / Math.max(displaySpeed, 8)) * 60) * 10) / 10
  const freeFlowTime = Math.round((segment.length / 1000) / Math.max(segment.freeFlowSpeedKmh, 18) * 60 * 10) / 10
  const delayMin     = Math.max(0, travelMin - freeFlowTime)
  const speedRatio   = displaySpeed / Math.max(segment.freeFlowSpeedKmh, 1)

  // Use enriched trend or fallback to score-based
  const trend = segment.flowTrend || (segment.congestionScore > 0.6 ? 'worsening' : segment.congestionScore > 0.35 ? 'stable' : 'improving')
  const predicted = Math.max(0, Math.min(1, segment.congestionScore + (trend === 'improving' ? -0.12 : trend === 'worsening' ? +0.10 : 0)))

  return (
    <div className="absolute top-16 right-3 w-72 bg-bg-elevated border border-bg-border rounded-2xl shadow-panel z-20 animate-slide-in overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-bg-border flex items-start justify-between gap-2 bg-gradient-to-br from-bg-elevated to-bg-surface">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] text-brand-green font-bold mb-1 uppercase tracking-widest flex items-center gap-1.5">
            {segment.priorityAxis && segment.priorityAxis > 0.7 && <Zap className="w-3 h-3 fill-current" />}
            {segment.arrondissement || 'Secteur Urbain'}
          </p>
          <h3 className="text-sm font-bold text-text-primary leading-tight mb-0.5" title={segment.axisName}>
            {segment.streetName || 'Axe non identifié'}
          </h3>
          <p className="text-[10px] text-text-muted font-mono flex items-center gap-2">
            <span className="bg-bg-subtle px-1.5 py-0.5 rounded border border-bg-border text-text-secondary font-bold">
              {segment.direction || '—'}
            </span>
            <span className="truncate opacity-60 text-[9px]">{segment.id.split('-').pop()}</span>
          </p>
        </div>
        <button onClick={close} className="p-2 rounded-xl hover:bg-bg-surface text-text-muted hover:text-text-primary transition-all flex-shrink-0 -mt-1 -mr-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Congestion bar */}
      <div className="p-4 border-b border-bg-border space-y-3">
        <div className="flex items-center justify-between">
          <CongestionBadge score={segment.congestionScore} />
          <span className="text-xs text-text-muted">{Math.round(segment.congestionScore * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${segment.congestionScore * 100}%`,
              backgroundColor: congestionColor(segment.congestionScore),
            }}
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="p-4 grid grid-cols-2 gap-3 border-b border-bg-border">
        <Metric icon={Gauge} label="Vitesse" value={`${Math.round(displaySpeed)} km/h`}
          sub={`/ ${segment.freeFlowSpeedKmh} km/h`} color={congestionColor(segment.congestionScore)} />
        <Metric icon={Clock} label="Trajet" value={`${travelMin} min`}
          sub={delayMin > 0.5 ? `+${delayMin.toFixed(1)} min retard` : 'Fluide'} />
        <Metric icon={Car} label="Flux" value={`${segment.flowVehiclesPerHour.toLocaleString()}`}
          sub="véh/h" />
        <Metric icon={Clock} label="Distance" value={`${(segment.length / 1000).toFixed(1)} km`}
          sub={`${segment.mode}`} />
      </div>

      {/* Prediction */}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <BrainCircuit className="w-3.5 h-3.5 text-brand" />
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-widest">Prédiction +30 min</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold" style={{ color: congestionColor(predicted) }}>
              {Math.round(predicted * 100)}%
            </p>
            <p className="text-xs text-text-muted">congestion estimée</p>
          </div>
          <div className={cn(
            'flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-lg',
            trend === 'improving' ? 'text-[#00E676] bg-[rgba(0,230,118,0.1)]' :
            trend === 'worsening' ? 'text-[#FF1744] bg-[rgba(255,23,68,0.1)]' :
                                    'text-text-secondary bg-bg-subtle',
          )}>
            {trend === 'improving' ? <TrendingDown className="w-4 h-4" /> :
             trend === 'worsening' ? <TrendingUp   className="w-4 h-4" /> :
                                     <Minus        className="w-4 h-4" />}
            {trendIcon(trend)}
            <span className="text-xs capitalize">{trend === 'improving' ? 'Amélioration' : trend === 'worsening' ? 'Dégradation' : 'Stable'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function getCredibleDisplaySpeed(speedKmh: number, freeFlowSpeedKmh: number, congestionScore: number) {
  const freeFlow = Math.max(18, freeFlowSpeedKmh || 18)
  const floorRatio =
    congestionScore >= 0.8 ? 0.16 :
    congestionScore >= 0.6 ? 0.24 :
    congestionScore >= 0.38 ? 0.4 :
    0.58
  return Math.max(speedKmh || 0, freeFlow * floorRatio, 8)
}

function Metric({ icon: Icon, label, value, sub, color }: {
  icon:    typeof Gauge
  label:   string
  value:   string
  sub?:    string
  color?:  string
}) {
  return (
    <div className="bg-bg-surface rounded-lg p-2.5 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-text-muted" />
        <span className="text-[10px] text-text-muted uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-bold" style={{ color: color || '#F0F0FF' }}>{value}</p>
      {sub && <p className="text-[10px] text-text-muted">{sub}</p>}
    </div>
  )
}
