'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Crosshair, LocateFixed, Navigation, X } from 'lucide-react'
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
    watchMode: true,
    timeout: 10_000,
    maximumAge: 3_000,
  })

  useEffect(() => {
    if (isLocating) {
      setGeoState('locating')
      return
    }
    if (error) {
      if (error.code === 1) setErrorMsg('Permission GPS refusee. Activez la localisation dans vos parametres.')
      else if (error.code === 2) setErrorMsg('Signal GPS indisponible. Verifiez votre connexion.')
      else setErrorMsg('Delai de localisation depasse. Reessayez.')
      setGeoState('error')
      return
    }
    if (position && isTracking) {
      setGeoState('tracking')
      return
    }
    if (position) {
      setGeoState('active')
      return
    }
    setGeoState('idle')
  }, [error, isLocating, isTracking, position])

  useEffect(() => {
    if (position === prevPositionRef.current) return
    prevPositionRef.current = position
    onPositionChange(position)

    if (position && !hasFlown) {
      onFlyTo(position.lat, position.lng)
      setHasFlown(true)
    }
  }, [hasFlown, onFlyTo, onPositionChange, position])

  const handleClick = () => {
    if (geoState === 'idle' || geoState === 'error') {
      setHasFlown(false)
      setErrorMsg(null)
      locate()
      return
    }

    if (position) onFlyTo(position.lat, position.lng)
  }

  const handleStop = (event: React.MouseEvent) => {
    event.stopPropagation()
    stopTracking()
    clearPosition()
    setErrorMsg(null)
    setHasFlown(false)
  }

  const stateConfig = {
    idle: { icon: Crosshair, color: 'text-stone-700', bg: 'bg-white/96', label: 'Me localiser', pulse: false },
    locating: { icon: LocateFixed, color: 'text-brand', bg: 'bg-white/96', label: 'Localisation...', pulse: true },
    active: { icon: LocateFixed, color: 'text-brand', bg: 'bg-white/96', label: 'Centrer', pulse: false },
    tracking: { icon: Navigation, color: 'text-[#00FF9D]', bg: 'bg-[#00FF9D]/15', label: 'Suivi actif', pulse: true },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-white/96', label: 'Reessayer', pulse: false },
  } as const

  const cfg = stateConfig[geoState]
  const Icon = cfg.icon

  return (
    <div className={cn('relative flex flex-col items-end gap-2', className)}>
      <AnimatePresence>
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            className="absolute bottom-[52px] right-0 w-64 rounded-2xl border border-red-200 bg-white/96 p-3 text-xs text-red-500 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl"
          >
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
              <p className="leading-relaxed">{errorMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {position && geoState !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="absolute bottom-[52px] right-0 flex items-center gap-1.5 whitespace-nowrap rounded-full border border-stone-200 bg-white/96 px-2.5 py-1 text-stone-600 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl pointer-events-none"
          >
            <div className={cn('h-1.5 w-1.5 rounded-full', geoState === 'tracking' ? 'bg-[#00FF9D] animate-pulse' : 'bg-brand/60')} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-stone-500">
              {geoState === 'tracking' ? 'Suivi GPS' : 'Localise'} · ±{Math.round(position.accuracy)}m
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <AnimatePresence>
          {(geoState === 'tracking' || geoState === 'active') && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9, x: 8 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: 8 }}
              onClick={handleStop}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-stone-200 bg-white/96 backdrop-blur-xl transition-all group hover:border-red-200 hover:bg-red-50"
              title="Arreter le suivi"
            >
              <X className="h-4 w-4 text-stone-400 transition-colors group-hover:text-red-500" />
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleClick}
          whileTap={{ scale: 0.94 }}
          title={cfg.label}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-2xl border bg-white/96 shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl transition-all duration-300',
            cfg.bg,
            geoState === 'tracking' ? 'border-[#00FF9D]/40 shadow-[0_0_20px_-5px_rgba(0,255,157,0.4)]' :
            geoState === 'active' ? 'border-brand/30' :
            geoState === 'error' ? 'border-red-200' :
            'border-stone-200 hover:border-stone-300',
          )}
        >
          {cfg.pulse && geoState === 'tracking' && (
            <span className="absolute inset-0 rounded-2xl border border-[#00FF9D]/40 animate-ping" />
          )}

          <Icon className={cn('transition-colors', cfg.color, isLocating && 'animate-spin')} style={{ width: 18, height: 18 }} />
        </motion.button>
      </div>
    </div>
  )
}
