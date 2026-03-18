"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingDown, Wind, Clock } from "lucide-react";

const impacts = [
  {
    icon: Clock,
    value: "-15%",
    label: "Temps d'attente moyen",
    desc: "En moins de 6 mois de déploiement",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  {
    icon: TrendingDown,
    value: "+20%",
    label: "Fluidité du trafic",
    desc: "Sur les axes optimisés par CrossFlow",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    icon: Wind,
    value: "-10%",
    label: "Émissions CO₂",
    desc: "Par véhicule grâce à l'optimisation des flux",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
];

function Counter({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  return (
    <span ref={ref} className={`text-5xl md:text-6xl font-black transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {value}
    </span>
  );
}

export default function ImpactSection() {
  return (
    <section id="impact" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface" />
      <div className="absolute inset-0 bg-grid opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-xs text-primary uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Impact mesurable
          </span>
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-center tracking-tight mb-5">
          Des résultats prouvés,
          <br />
          <span className="text-primary">dès le premier mois.</span>
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20">
          Basé sur les données agrégées de nos déploiements en conditions réelles dans 12 métropoles européennes.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-8">
          {impacts.map((impact, i) => (
            <motion.div
              key={impact.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`relative group p-8 rounded-2xl glass border transition-all duration-300 hover-lift text-center ${impact.border}`}
            >
              <div className={`w-12 h-12 rounded-xl ${impact.bg} border ${impact.border} flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform`}>
                <impact.icon className={`w-5 h-5 ${impact.color}`} />
              </div>
              <Counter value={impact.value} />
              <div className={`text-sm font-semibold mt-3 mb-2 ${impact.color}`}>{impact.label}</div>
              <p className="text-text-muted text-xs">{impact.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
