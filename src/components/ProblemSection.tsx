"use client";

import { motion, Variants } from "framer-motion";
import { AlertTriangle, TrendingDown, Clock, Gauge } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Temps perdu",
    value: "200h/an",
    desc: "Un conducteur perd en moyenne 200 heures par an dans les embouteillages urbains.",
  },
  {
    icon: TrendingDown,
    title: "Inefficacité opérationnelle",
    value: "45%",
    desc: "Des feux de signalisation fonctionnent avec des cycles fixes inadaptés au trafic réel.",
  },
  {
    icon: Gauge,
    title: "Données non exploitées",
    value: "80%",
    desc: "Des données de mobilité collectées ne sont pas analysées ni utilisées pour l'optimisation.",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function ProblemSection() {
  return (
    <section id="problem" className="py-32 relative overflow-hidden">
      {/* Subtle divider glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs text-text-muted uppercase tracking-widest font-medium">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            Le problème
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-center tracking-tight mb-5"
        >
          Les villes manquent de
          <br />
          <span className="text-text-muted">visibilité et de contrôle.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20"
        >
          Dans les métropoles modernes, les flux de mobilité sont devenus incontrôlables.
          Les outils existants sont archaïques, réactifs, et coûteux.
        </motion.p>

        {/* Problem cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group glass rounded-2xl p-8 border border-white/5 hover:border-white/10 transition-all duration-300 hover-lift"
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-400/10 border border-amber-400/20 mb-6 group-hover:border-amber-400/40 transition-colors">
                <p.icon className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400 mb-2">{p.value}</div>
              <div className="text-white font-semibold text-lg mb-3">{p.title}</div>
              <p className="text-text-muted text-sm leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Visual separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.4 }}
          className="mt-24 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />
      </div>
    </section>
  );
}
