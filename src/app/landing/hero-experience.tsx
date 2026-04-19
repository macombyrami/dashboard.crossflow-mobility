'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, ShieldCheck, BarChart3, Zap, MousePointer2 } from 'lucide-react'

/**
 * 🛰️ Redesigned Hero Section (Power & Authority Focus)
 * ✅ Responsive: Mobile-first CTA sizing (min 48px touch targets)
 * ✅ Accessibility: aria-labels on all interactive elements
 * ✅ WCAG: Sufficient contrast, semantic heading hierarchy
 */
export function HeroSection() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <section
      className="relative min-h-[100svh] w-full flex flex-col items-center justify-center overflow-hidden pt-24 pb-16 px-4"
      aria-labelledby="hero-headline"
    >
      
      {/* Background Atmosphere */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-5xl aspect-square border border-brand/5 rounded-full radar-sweep opacity-10" />
        <div 
          className="absolute inset-0" 
          style={{ 
            backgroundImage: `radial-gradient(circle at center, rgba(0,255,157,0.03) 0%, transparent 70%)`
          }} 
        />
      </div>

      <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">
        
        {/* Authority Tag */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-6 md:mb-8 backdrop-blur-md flex items-center gap-3"
          role="status"
          aria-label="Statut : Centre de contrôle IDF, 8 places restantes"
        >
          <div className="w-2 h-2 rounded-full bg-brand animate-live-dot flex-shrink-0" aria-hidden="true" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/50">
            Centre de contrôle IDF · 8 Places Restantes
          </span>
        </motion.div>

        {/* Headline — responsive fluid type */}
        <motion.h1
          id="hero-headline"
          initial={{ opacity: 0, filter: 'blur(10px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-[clamp(32px,8vw,84px)] font-black tracking-tighter leading-[0.92] text-center mb-6 md:mb-10 uppercase"
        >
          PILOTEZ L&apos;INTELLIGENCE<br />
          <span className="text-prestige">URBAINE EN TEMPS RÉEL.</span>
        </motion.h1>

        {/* Sub-headline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="text-[clamp(14px,2vw,20px)] text-text-secondary max-w-2xl text-center leading-relaxed mb-10 md:mb-14 font-medium opacity-70 px-2"
        >
          De la congestion à la fluidité souveraine. CrossFlow transforme des milliards de points
          de données en décisions stratégiques pour les métropoles du futur.
        </motion.p>

        {/* ─── CTA Section — Mobile-first touch targets (min 48px) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          {/* PRIMARY CTA — full width on mobile, auto on larger screens */}
          <Link href="/map" className="group relative w-full sm:w-auto">
            <div className="absolute inset-0 bg-brand blur-[60px] opacity-10 group-hover:opacity-25 transition-opacity rounded-2xl" aria-hidden="true" />
            <button
              className="relative w-full sm:w-auto btn btn-primary min-h-[52px] px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 transition-all shadow-brand-glow-lg"
              aria-label="Déployer le live — accéder à la carte temps réel"
            >
              DÉPLOYER LE LIVE
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1 flex-shrink-0" aria-hidden="true" />
            </button>
          </Link>
          
          {/* SECONDARY CTA — clear border on mobile for tap area */}
          <Link
            href="/login"
            className="w-full sm:w-auto min-h-[52px] flex items-center justify-center text-[11px] font-black uppercase tracking-[0.3em] text-text-muted hover:text-white transition-all py-4 px-6 border border-white/10 rounded-xl hover:border-white/20 hover:bg-white/5"
            aria-label="Demander une démonstration privée"
          >
            DÉMONSTRATION PRIVÉE
          </Link>
        </motion.div>

        {/* ─── Trust Authority Wall ─── */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1, delay: 0.8 }}
           className="mt-16 md:mt-24 pt-8 md:pt-10 border-t border-white/5 w-full"
           aria-label="Certifications et statistiques"
        >
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 opacity-40 hover:opacity-70 transition-opacity duration-700">
            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
              <ShieldCheck className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" /> Certifié Smart City EU
            </span>
            <div className="w-px h-4 bg-white/10 hidden sm:block" aria-hidden="true" />
            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
              <BarChart3 className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" /> 1.2M Trajets Analysés
            </span>
            <div className="w-px h-4 bg-white/10 hidden sm:block" aria-hidden="true" />
            <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em]">
              <Zap className="w-4 h-4 text-brand flex-shrink-0" aria-hidden="true" /> Latence &lt; 200ms
            </span>
          </div>
        </motion.div>
      </div>

      {/* Scroll hint — desktop only */}
      <div
        className="hidden lg:flex absolute bottom-8 left-8 items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-text-muted opacity-40"
        aria-hidden="true"
      >
        <MousePointer2 className="w-3 h-3 text-brand" />
        Scrollez pour explorer l&apos;écosystème
      </div>
    </section>
  )
}
