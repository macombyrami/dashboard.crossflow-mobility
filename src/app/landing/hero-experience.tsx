'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, ArrowRight, ShieldCheck, BarChart3, Activity, Globe, MousePointer2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import appData from '@/lib/data/app.json'

const Metrics = [
  { label: 'Temps perdu évité', value: '4.2k', unit: 'h/jour', icon: Activity, color: 'text-brand' },
  { label: 'Réduction CO2', value: '12%', unit: 'est.', icon: Globe, color: 'text-blue-400' },
  { label: 'Réactivité incidents', value: '<2', unit: 'min', icon: Zap, color: 'text-yellow-400' },
]

export function HeroExperience() {
  const [mounted, setMounted] = useState(false)
  const [hoveredMetric, setHoveredMetric] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="relative min-h-screen w-full bg-[#070809] text-white flex flex-col items-center justify-center overflow-hidden selection:bg-brand/30">
      
      {/* ─── Elite Radar Background ────────────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl max-h-4xl aspect-square border border-brand/5 rounded-full radar-sweep opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-2xl max-h-2xl aspect-square border border-brand/10 rounded-full radar-sweep opacity-10" style={{ animationDelay: '1s' }} />
        
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand/5 blur-[120px] rounded-full animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        {/* Animated Grid Lines (Digital City feel) */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15]" />
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse at center, black, transparent 90%)'
          }} 
        />
      </div>

      <main className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center text-center">
        
        {/* Tagline — The Tension */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shadow-glow" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted italic">Centre Opérationnel Live — Paris IDF</span>
          <div className="w-px h-3 bg-white/10 mx-1" />
          <span className="text-[9px] font-bold text-brand uppercase tracking-tighter">Bêta Fermée : 8 places restantes</span>
        </motion.div>

        {/* H1 — Sovereign Focus */}
        <motion.h1
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-4xl md:text-7xl font-black tracking-tighter leading-[0.95] mb-8 uppercase"
        >
          LE SYSTÈME D’EXPLOITATION<br />
          <span className="text-prestige">DES MÉTROPOLES SOUVERAINES.</span>
        </motion.h1>

        {/* Description — CRO Authority */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="text-base md:text-lg text-text-secondary max-w-3xl leading-relaxed mb-12 font-medium opacity-80"
        >
          CrossFlow synchronise les flux de millions de citoyens en temps réel pour anticiper l'imprévisible. 
          L'intelligence prédictive au service de la sécurité et de l'efficacité urbaine.
        </motion.p>

        {/* CTA — CRO Optimized Pathways */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <Link href="/map" className="group relative">
            <div className="absolute inset-0 bg-brand blur-3xl opacity-10 group-hover:opacity-30 transition-opacity" />
            <div className="relative btn btn-primary px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-transform shadow-brand-glow-lg">
              <span className="relative z-10">DÉPLOYER LE LIVE</span>
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 relative z-10" />
            </div>
          </Link>
          
          <Link href="/login" className="relative group px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-colors">
            REJOINDRE LA WAITLIST v4.2
            <div className="absolute bottom-3 left-8 right-8 h-px bg-white/10 group-hover:bg-brand/50 transition-colors" />
          </Link>
        </motion.div>

        {/* Impact Metrics — Psychological Authority */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.8 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full"
        >
          {Metrics.map((m, i) => (
            <div 
              key={i}
              onMouseEnter={() => setHoveredMetric(i)}
              onMouseLeave={() => setHoveredMetric(null)}
              className={cn(
                "glass-card p-6 rounded-3xl border border-white/5 transition-all duration-500 hover:border-white/10 group cursor-default",
                hoveredMetric !== null && hoveredMetric !== i && "opacity-40 blur-[2px]"
              )}
            >
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 group-hover:rotate-3", m.color.replace('text', 'bg').replace('brand', 'brand/10'))}>
                <m.icon className={cn("w-6 h-6", m.color)} strokeWidth={2.5} />
              </div>
              <div className="text-4xl font-black tracking-tighter mb-1 uppercase bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
                {m.value}<span className="text-sm ml-1 text-text-muted lowercase">{m.unit}</span>
              </div>
              <div className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] italic">{m.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Footer Trust Signals */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 1.2 }}
           className="mt-32 flex flex-wrap justify-center items-center gap-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-700"
        >
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4" /> Certifié Smart City EU
          </span>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em]">
            <BarChart3 className="w-4 h-4" /> 1.2M de trajets analysés / jour
          </span>
          <div className="w-1 h-1 rounded-full bg-white/10" />
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em]">
            <Zap className="w-4 h-4" /> Latence &lt; 200ms
          </span>
        </motion.div>
      </main>

      {/* Interactive Cursor Sub-hint */}
      <div className="hidden lg:flex fixed bottom-8 left-8 items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-muted animate-fade-in pointer-events-none">
        <MousePointer2 className="w-3 h-3 text-brand" />
        Explorer pour activer les insights
      </div>
    </div>
  )
}
