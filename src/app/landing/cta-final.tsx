'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, UserPlus } from 'lucide-react'
import Link from 'next/link'

export function CTAFinal() {
  return (
    <section className="relative w-full max-w-5xl px-6 py-40 mx-auto text-center">
      
      {/* 🧩 PRESTIGE GLOW BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-sm aspect-square bg-brand/10 blur-[140px] rounded-full animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-10 backdrop-blur-xl">
           <Sparkles className="w-4 h-4 text-brand animate-live-dot" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Habilitation Opérationnelle Ouverte</span>
        </div>

        <h3 className="text-[32px] md:text-[64px] font-black tracking-tighter leading-none mb-8 uppercase italic italic-bold italic-display">
           DÉPLOYEZ LA PROCHAINE<br />
           <span className="text-prestige-gold">GÉNÉRATION URBAINE.</span>
        </h3>

        <p className="text-base md:text-lg text-text-secondary max-w-2xl leading-relaxed mb-14 font-medium opacity-80">
           L’accès au dashboard prédictif est restreint aux municipalités et partenaires certifiés. 
           Rejoignez l'élite technologique de la mobilité.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-8">
           <Link href="/map" className="group">
              <button className="btn btn-primary px-12 py-6 rounded-2xl text-lg font-black uppercase tracking-widest flex items-center gap-4 transition-all shadow-brand-glow-lg hover:shadow-brand-glow-xlg active:scale-95">
                 ACCÉDER AU LIVE
                 <ArrowRight className="w-6 h-6 transition-transform group-hover:translate-x-2" />
              </button>
           </Link>

           <Link href="/login" className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.25em] text-text-muted hover:text-white transition-colors group">
              <UserPlus className="w-5 h-5 text-brand opacity-60 group-hover:opacity-100 transition-opacity" />
              DEMANDER UN ACCÈS VIP
           </Link>
        </div>

        {/* Micro-copy for friction reduction */}
        <div className="mt-12 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">
           Temps de configuration estimé : &lt; 5 minutes • Support 24/7 Priority
        </div>
      </motion.div>
    </section>
  )
}
