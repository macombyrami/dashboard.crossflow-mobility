'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, UserPlus } from 'lucide-react'
import Link from 'next/link'

export function CTAFinal() {
  return (
    <section className="relative w-full max-w-5xl px-4 sm:px-6 py-20 md:py-40 mx-auto text-center">
      
      {/* Prestige Glow Background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-sm aspect-square bg-brand/10 blur-[140px] rounded-full animate-pulse-slow" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div
          className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 md:mb-10 backdrop-blur-xl"
          role="status"
        >
           <Sparkles className="w-4 h-4 text-brand animate-live-dot flex-shrink-0" aria-hidden="true" />
           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/50">Habilitation Opérationnelle Ouverte</span>
        </div>

        {/* Fluid headline — clamp() scales gracefully from 320px to 1280px */}
        <h2 className="text-[clamp(28px,7vw,64px)] font-black tracking-tighter leading-none mb-6 md:mb-8 uppercase italic">
           DÉPLOYEZ LA PROCHAINE<br />
           <span className="text-prestige-gold">GÉNÉRATION URBAINE.</span>
        </h2>

        <p className="text-sm md:text-lg text-text-secondary max-w-2xl leading-relaxed mb-10 md:mb-14 font-medium opacity-80 px-2">
           L&apos;accès au dashboard prédictif est restreint aux municipalités et partenaires certifiés.&nbsp;
           Rejoignez l&apos;élite technologique de la mobilité.
        </p>

        {/* CTAs — stacked full-width on mobile, inline on sm+ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8 w-full sm:w-auto">
           {/* PRIMARY CTA */}
           <Link href="/map" className="group w-full sm:w-auto">
              <button
                className="w-full sm:w-auto btn btn-primary min-h-[52px] px-8 py-4 rounded-2xl text-base font-black uppercase tracking-widest flex items-center justify-center gap-4 transition-all shadow-brand-glow-lg hover:shadow-brand-glow-xlg active:scale-95"
                aria-label="Accéder au tableau de bord en direct"
              >
                 ACCÉDER AU LIVE
                 <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-2 flex-shrink-0" aria-hidden="true" />
              </button>
           </Link>

           {/* SECONDARY CTA — visible border on mobile for clear tap area */}
           <Link
             href="/login"
             className="w-full sm:w-auto min-h-[52px] flex items-center justify-center gap-3 text-sm font-black uppercase tracking-[0.25em] text-text-muted hover:text-white transition-colors group border border-white/10 sm:border-transparent hover:border-white/10 rounded-xl px-6"
             aria-label="Demander un accès VIP"
           >
              <UserPlus className="w-5 h-5 text-brand opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0" aria-hidden="true" />
              DEMANDER UN ACCÈS VIP
           </Link>
        </div>

        {/* Micro-copy */}
        <div className="mt-10 md:mt-12 text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] opacity-40">
           Temps de configuration estimé : &lt; 5 minutes • Support 24/7 Priority
        </div>
      </motion.div>
    </section>
  )
}
