'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Sparkles, X, ChevronRight } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

interface Insight {
  id: string
  type: 'warning' | 'info' | 'success' | 'action'
  text: string
  actionLabel?: string
  actionHref?: string
  priority: number
}

export function AIAssistantOverlay() {
  const snapshotVersion = useTrafficStore(s => s.snapshot?.fetchedAt ?? null)
  const incidents = useTrafficStore(s => s.incidents)
  const kpis = useTrafficStore(s => s.kpis)
  const setMode = useMapStore(s => s.setMode)
  const [activeInsightIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const [isExpanded] = useState(false)

  const insights = useMemo(() => {
    const list: Insight[] = []

    if (kpis) {
      const congestion = kpis.congestionRate || 0
      if (congestion > 0.6) {
        list.push({
          id: 'congestion-alert',
          type: 'warning',
          text: `Congestion critique detectee (${Math.round(congestion * 100)}%). Simulation de delestage recommandee.`,
          actionLabel: 'Lancer Simulation',
          actionHref: '/simulation',
          priority: 9
        })
      }
    }

    if (incidents.length > 0) {
      const critical = incidents.filter(i => i.severity === 'critical' || i.severity === 'high')
      if (critical.length > 0) {
        list.push({
          id: 'incident-alert',
          type: 'action',
          text: `${critical.length} incident(s) majeur(s) impactent la fluidite. Analyser les reports NLP ?`,
          actionLabel: 'Voir Social NLP',
          actionHref: '/social',
          priority: 10
        })
      }
    }

    if (list.length === 0) {
      list.push({
        id: 'status-ok',
        type: 'success',
        text: 'Reseau stable. Toutes les metriques sont dans les seuils nominaux.',
        priority: 1
      })
    }

    return list.sort((a, b) => b.priority - a.priority)
  }, [snapshotVersion, incidents, kpis])

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  const currentInsight = insights[activeInsightIndex] || insights[0]

  const handleAction = (href: string) => {
    if (href === '/simulation') setMode('simulate')
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 pointer-events-none"
        >
          <div className="pointer-events-auto relative group">
            <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className={cn(
              'relative flex items-center gap-4 p-1.5 pl-4 rounded-full border border-white/10 backdrop-blur-xl shadow-2xl transition-all duration-500',
              isExpanded ? 'bg-bg-base/90 rounded-[24px]' : 'bg-white/10'
            )}>
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shadow-brand-glow">
                  <Bot className="w-5.5 h-5.5 text-black" strokeWidth={2.5} />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-brand border-2 border-bg-base rounded-full animate-pulse" />
              </div>

              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black text-brand tracking-widest uppercase italic">CrossFlow AI</span>
                  <div className="h-1 w-1 rounded-full bg-white/20" />
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-tight">Analyse en temps reel</span>
                </div>
                <p className="text-[13px] font-medium text-text-primary leading-tight truncate">
                  {currentInsight.text}
                </p>
              </div>

              {currentInsight.actionLabel && currentInsight.actionHref && (
                <button
                  onClick={() => handleAction(currentInsight.actionHref!)}
                  className="px-4 py-2 bg-brand rounded-full text-[11px] font-black uppercase text-black hover:scale-105 active:scale-95 transition-all shadow-glow-sm flex items-center gap-1.5"
                >
                  {currentInsight.actionLabel}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setIsVisible(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isExpanded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -top-8 left-1/2 -translate-x-1/2 text-[9px] font-black text-brand uppercase tracking-[0.2em] italic flex items-center gap-2"
              >
                <Sparkles className="w-3 h-3 animate-pulse" /> Insight Proactif Disponible
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
