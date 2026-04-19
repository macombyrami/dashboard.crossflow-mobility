'use client'
import React from 'react'
import { Layers, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils/cn'

interface FilterFABProps {
  isOpen:   boolean
  onClick:  () => void
  activeCount?: number
}

export function FilterFAB({ isOpen, onClick, activeCount = 0 }: FilterFABProps) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "fixed bottom-[calc(70px+env(safe-area-inset-bottom))] right-4 z-[50] lg:hidden",
        "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
        "bg-[#0A0A0A] border-2 border-white/10 shadow-2xl overflow-hidden",
        isOpen ? "border-brand-green/40 shadow-glow-green/20" : "hover:border-white/20"
      )}
    >
      <div className="absolute inset-0 bg-brand-green/10 opacity-20 pointer-events-none" />
      
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
          >
            <X className="w-6 h-6 text-brand-green" strokeWidth={2.5} />
          </motion.div>
        ) : (
          <motion.div
            key="layers"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            className="relative"
          >
            <Layers className="w-6 h-6 text-brand-green" strokeWidth={2} />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand-green text-black text-[9px] font-black flex items-center justify-center shadow-glow-sm">
                {activeCount}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radiant Glow on Active */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 0.15 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="absolute inset-0 bg-brand-green rounded-full blur-2xl"
          />
        )}
      </AnimatePresence>
    </motion.button>
  )
}
