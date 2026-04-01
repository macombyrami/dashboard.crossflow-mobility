'use client'
import React, { useEffect, useRef } from 'react'
import { motion, useAnimation, PanInfo, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  snapPoints?: number[] // Percentage of screen height, e.g. [0.2, 0.5, 0.9]
  initialSnap?: number
  className?: string
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.2, 0.5, 0.9],
  initialSnap = 0.5,
  className
}: BottomSheetProps) {
  const controls = useAnimation()
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 800
  
  // Convert percentages to pixel offsets from the top
  const getSnapY = (snap: number) => screenHeight * (1 - snap)
  
  useEffect(() => {
    if (isOpen) {
      controls.start({ y: getSnapY(initialSnap), transition: { type: 'spring', damping: 25, stiffness: 200 } })
    } else {
      controls.start({ y: screenHeight, transition: { type: 'spring', damping: 30, stiffness: 300 } })
    }
  }, [isOpen, initialSnap, controls, screenHeight])

  const handleDragEnd = (_: any, info: PanInfo) => {
    const currentY = info.point.y
    const velocity = info.velocity.y

    // Calculate nearest snap point
    const snapYs = snapPoints.map(getSnapY)
    
    // Add close state if velocity is high downwards or if dragged below lowest snap
    if (velocity > 500 || currentY > snapYs[0] + 50) {
      onClose()
      return
    }

    const nearestSnap = snapYs.reduce((prev, curr) => 
      Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
    )

    controls.start({ y: nearestSnap, transition: { type: 'spring', damping: 25, stiffness: 200 } })
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (Only for full expansion or as a dim layer) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[60] lg:hidden"
          />

          {/* Draggable Sheet */}
          <motion.div
            drag="y"
            dragConstraints={{ top: getSnapY(snapPoints[snapPoints.length - 1]), bottom: screenHeight }}
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            animate={controls}
            initial={{ y: screenHeight }}
            exit={{ y: screenHeight }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-[70] bg-[#0A0A0A] border-t border-white/10 rounded-t-[24px] shadow-apple-lg lg:hidden flex flex-col",
              "backdrop-blur-2xl ring-1 ring-white/5 pb-safe",
              className
            )}
            style={{ height: '100vh', touchAction: 'none' }}
          >
            {/* Handle / Grabber */}
            <div className="w-full flex justify-center py-3 shrink-0">
               <div className="w-10 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="px-5 pb-2 shrink-0">
                 <h3 className="text-sm font-black text-white/90 uppercase tracking-[0.1em]">{title}</h3>
              </div>
            )}

            {/* Content Container (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 pb-12 pointer-events-auto" style={{ touchAction: 'pan-y' }}>
               {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
