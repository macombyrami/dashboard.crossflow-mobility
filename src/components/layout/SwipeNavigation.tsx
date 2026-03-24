'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'

const NAV_ROUTES = [
  '/map',
  '/dashboard',
  '/prediction',
  '/simulation',
  '/transport',
  '/incidents'
]

export function SwipeNavigation({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router   = useRouter()
  const [direction, setDirection] = useState(0)

  // Find current index
  const currentIndex = NAV_ROUTES.findIndex(r => pathname.startsWith(r))
  
  const handleDragEnd = (event: any, info: PanInfo) => {
    const swipeThreshold = 50
    const velocityThreshold = 500

    if (Math.abs(info.offset.x) > swipeThreshold || Math.abs(info.velocity.x) > velocityThreshold) {
      if (info.offset.x > 0) {
        // Swipe Right -> Previous page
        if (currentIndex > 0) {
          setDirection(-1)
          router.push(NAV_ROUTES[currentIndex - 1])
        }
      } else {
        // Swipe Left -> Next page
        if (currentIndex < NAV_ROUTES.length - 1) {
          setDirection(1)
          router.push(NAV_ROUTES[currentIndex + 1])
        }
      }
    }
  }

  // Prevent swipe on map page if dragging map (optional/tricky)
  // For now, we allow it but it might conflict with map panning.
  // Real Apple apps often only allow edge-swipe.
  // We'll target the main container but exclude map interaction specifically if needed.

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 touch-none-horizontal">
      <AnimatePresence mode="wait" initial={false} custom={direction}>
        <motion.div
          key={pathname}
          custom={direction}
          initial={{ x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? '-100%' : direction < 0 ? '100%' : 0, opacity: 0 }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 1
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="flex-1 flex flex-col min-h-0 w-full"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
