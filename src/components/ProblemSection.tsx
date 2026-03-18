"use client";

import { motion, Variants } from "framer-motion";
import { AlertTriangle, TrendingDown, Clock, Gauge } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Temps perdu",
    value: "200h/an",
    desc: "Un conducteur perd en moyenne 200 heures par an dans les embouteillages urbains.",
    barWidth: "72%",
  },
  {
    icon: TrendingDown,
    title: "Inefficacité opérationnelle",
    value: "45%",
    desc: "Des feux de signalisation fonctionnent avec des cycles fixes inadaptés au trafic réel.",
    barWidth: "45%",
  },
  {
    icon: Gauge,
    title: "Données non exploitées",
    value: "80%",
    desc: "Des données de mobilité collectées ne sont pas analysées ni utilisées pour l'optimisation.",
    barWidth: "80%",
  },
];

const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 32 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

export default function ProblemSection() {
  return (
    <section id="problem" className="py-32 relative overflow-hidden">
      {/* Divider glow dot */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-white/8 to-transparent" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/5 text-[0.65rem] text-amber-400 uppercase tracking-[0.12em] font-semibold">
            <AlertTriangle className="w-3 h-3" />
            Le problème
          </span>
        </motion.div>

        {/* Title */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="h2-responsive font-black text-center tracking-tight mb-5"
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
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20 leading-relaxed"
        >
          Dans les métropoles modernes, les flux de mobilité sont devenus incontrôlables.
          Les outils existants sont archaïques, réactifs, et coûteux.
        </motion.p>

        {/* Problem cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {problems.map((p, i) => (
            <motion.div
              key={p.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group glass rounded-2xl p-7 border border-white/[0.06] hover:border-amber-400/20 transition-all duration-300 hover-lift hover:shadow-[0_20px_60px_rgba(245,158,11,0.1)] relative overflow-hidden"
            >
              {/* Left amber accent bar */}
              <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-transparent via-amber-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Icon */}
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-400/8 border border-amber-400/15 mb-5 group-hover:border-amber-400/35 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] transition-all duration-300">
                <p.icon className="w-4.5 h-4.5 text-amber-400" />
              </div>

              {/* Value — monospace for data feel */}
              <div className="font-mono-nums text-3xl font-black text-amber-400 mb-1.5 tracking-tight">
                {p.value}
              </div>

              {/* Progress bar */}
              <div className="kpi-bar mb-4 w-16" style={{ background: "rgba(245,158,11,0.12)" }}>
                <div
                  className="kpi-bar-fill"
                  style={{ background: "rgba(245,158,11,0.55)", "--bar-width": p.barWidth } as React.CSSProperties}
                />
              </div>

              <div className="text-white font-semibold text-base mb-2.5">{p.title}</div>
              <p className="text-text-muted text-sm leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Section separator */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: 0.4, ease: "easeOut" }}
          className="mt-24 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
        />
      </div>
    </section>
  );
}
