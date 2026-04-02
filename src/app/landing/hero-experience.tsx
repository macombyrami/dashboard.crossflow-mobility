'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, BarChart3, Zap, MousePointer2 } from 'lucide-react'

/**
 * 🛰️ Redesigned Hero Section (Power & Authority Focus)
 * 
 * Logic:
 * 1. Immediate clarity on "What it is" (Sovereign OS).
 * 2. Visual hooks (Radar sweeps) for "Live Pulse" feeling.
 * 3. High-authority CTA ("Deploy Control Center").
 */
export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section className="relative min-h-[90vh] w-full flex flex-col items-center justify-center overflow-hidden pt-20">
      
      {/* 🧩 PRESTIGE BACKGROUND LAYER */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl aspect-square border border-brand/5 rounded-full radar-sweep opacity-10" />
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `radial-gradient(circle at center, rgba(34,197,94,0.03) 0%, transparent 70%)`
          }} 
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl px-6 flex flex-col items-center">
        
        {/* Authority Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md flex items-center gap-3"
        >
          <div className="w-2 h-2 rounded-full bg-brand animate-live-dot" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">Centre de contrôle IDF • 8 Places Restantes</span>
        </motion.div>

        {/* Headline (The Impact) */}
        <motion.h1
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[40px] md:text-[84px] font-black tracking-tighter leading-[0.9] text-center mb-10 uppercase"
        >
          PILOTEZ L'INTELLIGENCE<br />
          <span className="text-prestige">URBAINE EN TEMPS RÉEL.</span>
        </motion.h1>

        {/* Sub-headline (The Solution) */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-base md:text-xl text-text-secondary max-w-3xl text-center leading-relaxed mb-14 font-medium opacity-70"
        >
          De la congestion à la fluidité souveraine. CrossFlow transforme des milliards de points de données en décisions stratégiques pour les métropoles du futur.
        </motion.p>

        {/* CTA Section (The Conversion) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          <Link href="/map" className="group relative">
            <div className="absolute inset-0 bg-brand blur-[60px] opacity-10 group-hover:opacity-25 transition-opacity" />
            <button className="relative btn btn-primary px-10 py-5 rounded-2xl text-base font-black uppercase tracking-widest flex items-center gap-3 active:scale-95 transition-all shadow-brand-glow-lg hover:shadow-brand-glow-xlg">
               DÉPLOYER LE LIVE
               <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>
          </Link>
          
          <Link href="/login" className="text-[11px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all py-4 px-6 border border-transparent hover:border-white/10 rounded-xl">
             DÉMONSTRATION PRIVÉE
          </Link>
        </motion.div>

        {/* Trust Logos (Authority Wall) */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 0.8 }}
           className="mt-24 pt-10 border-t border-white/5 w-full flex flex-wrap justify-center items-center gap-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-700"
        >
          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
            <ShieldCheck className="w-4 h-4 text-brand" /> Certifié Smart City EU
          </span>
          <div className="w-px h-4 bg-white/10" />
          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
            <BarChart3 className="w-4 h-4 text-brand" /> 1.2M Trajets Analysés
          </span>
          <div className="w-px h-4 bg-white/10" />
          <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
            <Zap className="w-4 h-4 text-brand" /> Latence &lt; 200ms
          </span>
        </motion.div>
      </div>

       {/* Floating Hints */}
       <div className="hidden lg:flex absolute bottom-12 left-12 items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40">
        <MousePointer2 className="w-3 h-3 text-brand" />
        Scrollez pour explorer l'écosystème
      </div>
    </section>
  )
}
