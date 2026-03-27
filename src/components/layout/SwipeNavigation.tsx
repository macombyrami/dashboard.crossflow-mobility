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
  '/social',
]

// Minimum horizontal distance to trigger a swipe (px)
const MIN_SWIPE_PX = 80
// Maximum vertical/horizontal ratio allowed (stricter = harder to accidentally swipe)
const MAX_ANGLE_RATIO = 0.38

export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname   = usePathname()
  const router     = useRouter()
  const [direction, setDirection] = useState(0)

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  // Set to true as soon as the user commits to a vertical scroll
  const isScrolling = useRef(false)

  const currentIndex = NAV_ROUTES.findIndex(r => pathname.startsWith(r))

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
    isScrolling.current = false
  }

  // Detect vertical scroll intent early — cancel swipe as soon as dy > dx
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current)
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current)
    // If vertical movement wins in the first 15px, this is a scroll
    if (dy > 8 && dy >= dx) {
      isScrolling.current = true
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Cancel if no start recorded or user was scrolling vertically
    if (touchStartX.current === null || touchStartY.current === null || isScrolling.current) {
      touchStartX.current = null
      touchStartY.current = null
      return
    }

    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current

    touchStartX.current = null
    touchStartY.current = null

    // Reject: too short, or too diagonal
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
      // pan-y: browser owns vertical scroll, we own horizontal swipe — no conflict
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
