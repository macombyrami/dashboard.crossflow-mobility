'use client'
import { memo } from 'react'
import { Activity, ShieldCheck, Map } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface Props {
  healthScore:  number
  cityName:     string
  cityFlag:     string
  statusLabel?: string
  className?:   string
}

/**
 * Premium Hero for Mobile Dashboard (Pilot/Tesla Style)
 * High-density circular status with minimalist typography.
 */
function PilotStatusInner({
  healthScore, cityName, cityFlag, statusLabel = 'Système Optimal', className,
}: Props) {
  // Calculate dash offset for circular progress (approx r=45, circumference ≈ 283)
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (healthScore / 100) * circumference

  const statusColor = healthScore > 75 
    ? 'text-brand' 
    : healthScore > 40 
      ? 'text-orange-500' 
      : 'text-red-500'

  const statusBg = healthScore > 75 
    ? 'bg-brand/10' 
    : healthScore > 40 
      ? 'bg-orange-500/10' 
      : 'bg-red-500/10'

  return (
    <div className={cn(
      "relative w-full overflow-hidden p-6 glass rounded-[32px] border border-white/5 shadow-2xl animate-scale-in",
      className
    )}>
      {/* Background technical grid or pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '24px 24px' 
        }} />
      </div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xl">{cityFlag}</span>
             <h2 className="text-lg font-black text-white tracking-widest uppercase font-heading">{cityName}</h2>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest",
            statusColor.replace('text-', 'border-').replace('text-', 'bg-').concat('/20'),
            statusColor, statusBg
          )}>
            <ShieldCheck className="w-3 h-3" />
            {statusLabel}
          </div>
        </div>
        <div className="flex gap-2">
           <button className="p-2.5 rounded-2xl glass-vibrant border border-white/10 text-white/50 hover:text-white transition-colors">
              <Map className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center relative py-4">
        {/* The "Urban Heartbeat" Circle */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            {/* Background ring */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className="fill-none stroke-white/5"
              strokeWidth="10"
            />
            {/* Active ring */}
            <circle
              cx="50%"
              cy="50%"
              r={radius}
              className={cn("fill-none transition-all duration-1000 ease-out", statusColor.replace('text-', 'stroke-'))}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 8px ${statusColor === 'text-brand' ? '#00FF9D' : statusColor === 'text-orange-500' ? '#FF9F0A' : '#FF3B30'}40)` }}
            />
          </svg>

          {/* Central score display */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-[0.3em] mb-1">Urban Health</span>
            <div className="flex items-baseline">
              <span className="text-5xl font-black text-white font-mono tracking-tighter tabular-nums">{healthScore}</span>
              <span className="text-xs font-bold text-text-muted ml-0.5">/100</span>
            </div>
          </div>

          {/* Pulsing indicator segments */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-glow" />
        </div>

        {/* Tactical Subtext */}
        <div className="mt-8 grid grid-cols-2 gap-8 w-full px-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Efficience Flux</span>
            <div className="flex items-center gap-1.5 text-brand">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[13px] font-black font-mono">92.4%</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.2em] mb-1">Zone Couverte</span>
            <div className="flex items-center gap-1.5 text-white/80">
              <span className="text-[13px] font-black font-mono">142 KM²</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const PilotStatus = memo(PilotStatusInner)
