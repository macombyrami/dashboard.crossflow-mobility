'use client'
import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ROUTES = [
  '/map',
  '/dashboard',
  '/prediction',
  '/simulation',
  '/transport',
  '/incidents',
]

export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname()
  const router       = useRouter()
  const [direction, setDirection] = useState(0)
  const touchStartX  = useRef<number | null>(null)
  const touchStartY  = useRef<number | null>(null)

  const currentIndex = NAV_ROUTES.findIndex(r => pathname.startsWith(r))

  // Native touch handlers — don't intercept pointer events (click still fires)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    // Only trigger if: horizontal dominant, > 60px, not a tap
    if (Math.abs(dx) < 60 || Math.abs(dy) > Math.abs(dx) * 0.6) {
      touchStartX.current = null
      return
    }

    if (dx > 0 && currentIndex > 0) {
      setDirection(-1)
      router.push(NAV_ROUTES[currentIndex - 1])
    } else if (dx < 0 && currentIndex < NAV_ROUTES.length - 1) {
      setDirection(1)
      router.push(NAV_ROUTES[currentIndex + 1])
    }
    touchStartX.current = null
  }

  return (
    <div
      className="flex-1 relative overflow-hidden flex flex-col min-h-0"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          initial={{ x: direction > 0 ? '40%' : direction < 0 ? '-40%' : 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? '-40%' : direction < 0 ? '40%' : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
          className="flex-1 flex flex-col min-h-0 w-full absolute inset-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
