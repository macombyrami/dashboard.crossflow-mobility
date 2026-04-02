'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Crosshair, LocateFixed, AlertCircle, X, Navigation } from 'lucide-react'
import { useGeolocation, type UserPosition } from '@/hooks/useGeolocation'
import { cn } from '@/lib/utils/cn'

interface GeolocationControlProps {
  onPositionChange: (pos: UserPosition | null) => void
  onFlyTo: (lat: number, lng: number) => void
  className?: string
}

type GeoState = 'idle' | 'locating' | 'active' | 'tracking' | 'error'

export function GeolocationControl({ onPositionChange, onFlyTo, className }: GeolocationControlProps) {
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [hasFlown, setHasFlown] = useState(false)
  const prevPositionRef = useRef<UserPosition | null>(null)

  const { position, error, isLocating, isTracking, locate, stopTracking, clearPosition } = useGeolocation({
    enableHighAccuracy: true,
    watchMode: true,         // continuous tracking for real-time updates
    timeout: 10_000,
    maximumAge: 3_000,
  })

  // Sync geo state machine
  useEffect(() => {
    if (isLocating)           { setGeoState('locating'); return }
    if (error) {
      if (error.code === 1)   setErrorMsg('Permission GPS refusée. Activez la localisation dans vos paramètres.')
      else if (error.code === 2) setErrorMsg('Signal GPS indisponible. Vérifiez votre connexion.')
      else                   setErrorMsg('Délai de localisation dépassé. Réessayez.')
      setGeoState('error')
      return
    }
    if (position && isTracking) { setGeoState('tracking'); return }
    if (position)               { setGeoState('active');   return }
    setGeoState('idle')
  }, [isLocating, error, position, isTracking])

  // Notify parent of position changes
  useEffect(() => {
    if (position === prevPositionRef.current) return
    prevPositionRef.current = position
    onPositionChange(position)

    // Auto-fly on first fix
    if (position && !hasFlown) {
      onFlyTo(position.lat, position.lng)
      setHasFlown(true)
    }
  }, [position, hasFlown, onPositionChange, onFlyTo])

  const handleClick = () => {
    if (geoState === 'idle' || geoState === 'error') {
      setHasFlown(false)
      setErrorMsg(null)
      locate()
    } else if (geoState === 'active') {
      // Already have position, fly back to it
      if (position) onFlyTo(position.lat, position.lng)
    } else if (geoState === 'tracking') {
      // Re-center on current position
      if (position) onFlyTo(position.lat, position.lng)
    }
  }

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation()
    stopTracking()
    clearPosition()
    setErrorMsg(null)
    setHasFlown(false)
  }

  const stateConfig = {
    idle:     { icon: Crosshair,   color: 'text-white/60',        bg: 'bg-black/60',        label: 'Me localiser',     pulse: false },
    locating: { icon: LocateFixed,  color: 'text-brand',           bg: 'bg-brand/10',        label: 'Localisation…',    pulse: true  },
    active:   { icon: LocateFixed,  color: 'text-brand',           bg: 'bg-brand/15',        label: 'Centrer',          pulse: false },
    tracking: { icon: Navigation,   color: 'text-[#00FF9D]',      bg: 'bg-[#00FF9D]/15',   label: 'Suivi actif',      pulse: true  },
    error:    { icon: AlertCircle,  color: 'text-red-400',         bg: 'bg-red-500/10',      label: 'Réessayer',        pulse: false },
  } as const

  const cfg = stateConfig[geoState]
  const Icon = cfg.icon

  return (
    <div className={cn('relative flex flex-col items-end gap-2', className)}>
      {/* Error toast */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className="absolute right-[52px] top-0 w-64 glass-card p-3 rounded-xl text-xs text-red-300 shadow-lg"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live accuracy badge */}
      <AnimatePresence>
        {position && geoState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-[52px] top-0 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1 pointer-events-none whitespace-nowrap"
          >
            <div className={cn(
              'w-1.5 h-1.5 rounded-full',
              geoState === 'tracking' ? 'bg-[#00FF9D] animate-pulse' : 'bg-brand/60'
            )} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-white/70">
              {geoState === 'tracking' ? 'Suivi GPS' : 'Localisé'} · ±{Math.round(position.accuracy)}m
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <div className="flex items-center gap-1">
        {/* Stop button (only when tracking) */}
        <AnimatePresence>
          {(geoState === 'tracking' || geoState === 'active') && (
            <motion.button
              initial={{ opacity: 0, scale: 0, x: 10 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0, x: 10 }}
              onClick={handleStop}
              className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-red-500/20 hover:border-red-400/30 transition-all group"
              title="Arrêter le suivi"
            >
              <X className="w-3.5 h-3.5 text-white/40 group-hover:text-red-400 transition-colors" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Geo button */}
        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.92 }}
          title={cfg.label}
          className={cn(
            'relative w-10 h-10 rounded-full backdrop-blur-md border transition-all duration-300 flex items-center justify-center shadow-lg',
            cfg.bg,
            geoState === 'tracking' ? 'border-[#00FF9D]/40 shadow-[0_0_20px_-5px_rgba(0,255,157,0.4)]' :
            geoState === 'active'   ? 'border-brand/30' :
            geoState === 'error'    ? 'border-red-400/20' :
                                       'border-white/10 hover:border-white/20'
          )}
        >
          {/* Pulse ring for tracking */}
          {cfg.pulse && geoState === 'tracking' && (
            <span className="absolute inset-0 rounded-full border border-[#00FF9D]/40 animate-ping" />
          )}
          
          <Icon className={cn('w-4.5 h-4.5 transition-colors', cfg.color, isLocating && 'animate-spin')} style={{ width: 18, height: 18 }} />
        </motion.button>
      </div>
    </div>
  )
}
