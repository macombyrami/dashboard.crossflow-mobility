'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Activity, ShieldCheck, Zap, Globe, GitBranch, Bot } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const Features = [
  {
    title:       "OPÉRATIONS LIVE",
    description: "Synchronisation milliseconde des flux urbains via TomTom et données citoyennes.",
    icon:        Activity,
    color:       "text-brand",
    bg:          "bg-brand/5",
    grid:        "md:col-span-2"
  },
  {
    title:       "SOUVERAINETÉ EU",
    description: "Hébergement sécurisé conforme RGPD pour une gestion publique indépendante.",
    icon:        ShieldCheck,
    color:       "text-blue-400",
    bg:          "bg-blue-500/5",
    grid:        "md:col-span-1"
  },
  {
    title:       "PRÉDICTION IA",
    description: "Anticipation des congestions avant qu'elles ne surviennent via notre moteur CrossFlow V4.",
    icon:        Bot,
    color:       "text-yellow-400",
    bg:          "bg-yellow-500/5",
    grid:        "md:col-span-1"
  },
  {
    title:       "INTEROPÉRABILITÉ",
    description: "Connexion directe avec les API institutionnelles pour une vision 360° du territoire.",
    icon:        GitBranch,
    color:       "text-purple-400",
    bg:          "bg-purple-500/5",
    grid:        "md:col-span-2"
  }
]

export function FeaturesGrid() {
  return (
    <section className="relative w-full max-w-6xl px-6 py-24 mx-auto">
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-brand mb-4">Système d'exploitation</h2>
        <h3 className="text-3xl md:text-5xl font-black uppercase tracking-tight italic">UNE ARCHITECTURE DE CONTRÔLE SANS ÉGALE.</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: i * 0.1 }}
            className={cn(
               "glass-card p-10 rounded-3xl border border-white/5 transition-all duration-500 hover:border-white/10 group overflow-hidden relative",
               f.grid
            )}
          >
            {/* Visual Depth */}
            <div className={cn("absolute -top-10 -right-10 w-40 h-40 blur-[80px] opacity-20", f.bg.replace('bg-', 'bg-'))} />
            
            <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-10 transition-transform group-hover:scale-110", f.bg)}>
              <f.icon className={cn("w-7 h-7", f.color)} strokeWidth={2.5} />
            </div>

            <h4 className="text-xl font-black uppercase tracking-widest mb-4 italic group-hover:text-brand transition-colors">
              {f.title}
            </h4>
            
            <p className="text-base text-text-muted leading-relaxed font-medium">
              {f.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
