"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { TrendingDown, Wind, Clock } from "lucide-react";

const impacts = [
  {
    icon: Clock,
    value: "-15%",
    label: "Temps d'attente",
    desc: "En moins de 6 mois de déploiement",
    color: "text-primary",
    bg: "bg-primary/8 border-primary/15",
    barColor: "#22C55E",
    barWidth: "15%",
    hoverGlow: "hover:shadow-[0_24px_60px_rgba(34,197,94,0.12)]",
    borderHover: "hover:border-primary/30",
    topBar: "from-primary/50 via-primary/25 to-transparent",
  },
  {
    icon: TrendingDown,
    value: "+20%",
    label: "Fluidité du trafic",
    desc: "Sur les axes optimisés par CrossFlow",
    color: "text-blue-400",
    bg: "bg-blue-400/8 border-blue-400/15",
    barColor: "#60A5FA",
    barWidth: "20%",
    hoverGlow: "hover:shadow-[0_24px_60px_rgba(96,165,250,0.12)]",
    borderHover: "hover:border-blue-400/30",
    topBar: "from-blue-400/50 via-blue-400/25 to-transparent",
  },
  {
    icon: Wind,
    value: "-10%",
    label: "Émissions CO₂",
    desc: "Par véhicule grâce à l'optimisation des flux",
    color: "text-emerald-400",
    bg: "bg-emerald-400/8 border-emerald-400/15",
    barColor: "#34D399",
    barWidth: "10%",
    hoverGlow: "hover:shadow-[0_24px_60px_rgba(52,211,153,0.12)]",
    borderHover: "hover:border-emerald-400/30",
    topBar: "from-emerald-400/50 via-emerald-400/25 to-transparent",
  },
];

function KpiCard({ impact, index, mounted }: { impact: typeof impacts[0]; index: number; mounted: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const show = mounted && isInView;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.13, duration: 0.65 }}
      className={`group relative glass rounded-2xl border border-white/[0.06] transition-all duration-300 hover-lift text-center overflow-hidden ${impact.hoverGlow} ${impact.borderHover}`}
    >
      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${impact.topBar}`} />

      <div className="p-8">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center mb-5 mx-auto group-hover:scale-110 transition-transform duration-300 ${impact.bg}`}>
          <impact.icon className={`w-5 h-5 ${impact.color}`} />
        </div>

        {/* KPI value */}
        <div
          className={`font-mono-nums text-5xl md:text-6xl font-black mb-2 transition-all duration-700 ${impact.color} ${
            show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          {impact.value}
        </div>

        {/* Progress bar */}
        <div className="kpi-bar w-16 mx-auto mb-4">
          <div
            className={`kpi-bar-fill transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"}`}
            style={{
              background: impact.barColor,
              "--bar-width": impact.barWidth,
            } as React.CSSProperties}
          />
        </div>

        <div className={`text-sm font-semibold mb-1.5 ${impact.color}`}>{impact.label}</div>
        <p className="text-text-muted text-xs leading-relaxed">{impact.desc}</p>
      </div>
    </motion.div>
  );
}

export default function ImpactSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <section id="impact" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface" />
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="section-label">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Impact mesurable
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-black text-center tracking-tight mb-5"
          style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", lineHeight: "1.08", letterSpacing: "-0.03em" }}
        >
          Des résultats prouvés,
          <br />
          <span className="text-primary">dès le premier mois.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20 leading-relaxed"
        >
          Basé sur les données agrégées de nos déploiements en conditions réelles dans 12 métropoles européennes.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {impacts.map((impact, i) => (
            <KpiCard key={impact.label} impact={impact} index={i} mounted={mounted} />
          ))}
        </div>
      </div>
    </section>
  );
}
