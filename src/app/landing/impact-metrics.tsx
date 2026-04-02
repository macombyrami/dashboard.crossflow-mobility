'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { TrendingUp, Clock, Cloud } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const Metrics = [
  { 
    label: "HEURES DE CONGESTION ÉCONOMISÉES", 
    value: 4200, 
    suffix: "/jour", 
    icon: Clock, 
    color: "text-brand",
    impact: "Réduction massive du stress urbain et des coûts logistiques."
  },
  { 
    label: "DÉCARBONISATION URBAINE ESTIMÉE", 
    value: 12, 
    suffix: "%", 
    icon: Cloud, 
    color: "text-blue-400",
    impact: "Transition écologique mesurable par segment de route."
  },
  { 
    label: "RÉACTIVITÉ AUX INCIDENTS CRITIQUES", 
    value: 2, 
    suffix: "min", 
    icon: TrendingUp, 
    color: "text-yellow-400",
    impact: "Déploiement immédiat des secours et de la maintenance."
  },
]

function CountUp({ end, duration = 2 }: { end: number, duration?: number }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  useEffect(() => {
    if (isInView) {
      let start = 0
      const increment = end / (duration * 60)
      const timer = setInterval(() => {
        start += increment
        if (start >= end) {
          setCount(end)
          clearInterval(timer)
        } else {
          setCount(Math.floor(start))
        }
      }, 1000 / 60)
      return () => clearInterval(timer)
    }
  }, [end, duration, isInView])

  return <span ref={ref}>{count.toLocaleString()}</span>
}

export function ImpactMetrics() {
  return (
    <section className="relative w-full max-w-6xl px-6 py-32 mx-auto border-t border-white/5">
      <div className="flex flex-col items-center text-center mb-20">
        <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-brand mb-4">Impact Social & Environnemental</h2>
        <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">LA PREUVE PAR L'EFFICIENCE.</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12">
        {Metrics.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className="flex flex-col items-center text-center group"
          >
            <div className={cn("w-14 h-14 md:w-16 md:h-16 rounded-3xl flex items-center justify-center mb-6 md:mb-8 bg-white/5 border border-white/5 group-hover:border-brand/30 transition-all shadow-xl group-hover:shadow-brand-glow-lg")}>
              <m.icon className={cn("w-7 h-7 md:w-8 md:h-8", m.color)} strokeWidth={2.5} aria-hidden="true" />
            </div>

            {/* Fluid number — clamp() prevents overflow on any screen width */}
            <div
              className="text-[clamp(40px,10vw,68px)] font-black tracking-tighter leading-none mb-3 md:mb-4 uppercase text-glow"
              aria-label={`${m.value}${m.suffix}`}
            >
              <CountUp end={m.value} />
              <span className="text-sm ml-2 text-text-secondary lowercase">{m.suffix}</span>
            </div>

            <h4 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-3 md:mb-4 text-brand">
              {m.label}
            </h4>

            <p className="text-sm text-text-muted max-w-[240px] leading-relaxed">
              {m.impact}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
