'use client'
import { useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const NAV_ROUTES = [
  '/map',
  '/dashboard',
  '/simulation',
  '/transport',
  '/incidents',
  '/social',
]

const MIN_SWIPE_PX = 80
const MAX_ANGLE_RATIO = 0.38

export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [direction, setDirection] = useState(0)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const isScrolling = useRef(false)

  const currentIndex = NAV_ROUTES.findIndex(r => pathname.startsWith(r))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isScrolling.current = false
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    if (dy > 8 && dy >= dx) {
      isScrolling.current = true
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || isScrolling.current) {
      touchStartX.current = null
      touchStartY.current = null
      return
    }

    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    touchStartX.current = null
    touchStartY.current = null

    if (Math.abs(dx) < MIN_SWIPE_PX || Math.abs(dy) > Math.abs(dx) * MAX_ANGLE_RATIO) return

    if (dx > 0 && currentIndex > 0) {
      setDirection(-1)
      router.push(NAV_ROUTES[currentIndex - 1])
    } else if (dx < 0 && currentIndex < NAV_ROUTES.length - 1) {
      setDirection(1)
      router.push(NAV_ROUTES[currentIndex + 1])
    }
  }

  return (
    <div
      className="flex-1 relative overflow-hidden flex flex-col min-h-0"
      style={{ touchAction: 'pan-y' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="popLayout" initial={false} custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          initial={{ x: direction > 0 ? '28%' : direction < 0 ? '-28%' : 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? '-28%' : direction < 0 ? '28%' : 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.75 }}
          className="flex-1 flex flex-col min-h-0 w-full absolute inset-0 overflow-y-auto overflow-x-hidden"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
