"use client";

import { motion } from "framer-motion";
import { Zap, FlaskConical, BrainCircuit } from "lucide-react";

const solutions = [
  {
    icon: Zap,
    title: "Analyse Temps Réel",
    desc: "Ingestion de données multi-sources (capteurs IoT, caméras, GPS) avec traitement en moins de 50ms. Dashboard live avec alertes intelligentes.",
    features: ["Capteurs IoT", "Vision par ordinateur", "Alertes instantanées"],
    topBar: "from-primary/60 via-primary/30 to-transparent",
    gradient: "from-primary/10 to-transparent",
    border: "border-primary/12 hover:border-primary/30",
    iconBg: "bg-primary/8 border-primary/15 group-hover:border-primary/35 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]",
    iconColor: "text-primary",
    tagColor: "bg-primary/8 text-primary border-primary/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(34,197,94,0.1)]",
  },
  {
    icon: FlaskConical,
    title: "Simulation de Scénarios",
    desc: "Testez n'importe quel scénario (accidents, événements, travaux) dans un jumeau numérique avant de déployer en conditions réelles.",
    features: ["Digital Twin", "Monte Carlo", "A/B Testing"],
    topBar: "from-blue-500/60 via-blue-500/30 to-transparent",
    gradient: "from-blue-500/10 to-transparent",
    border: "border-blue-500/12 hover:border-blue-500/30",
    iconBg: "bg-blue-500/8 border-blue-500/15 group-hover:border-blue-500/35 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]",
    iconColor: "text-blue-400",
    tagColor: "bg-blue-500/8 text-blue-400 border-blue-500/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(59,130,246,0.1)]",
  },
  {
    icon: BrainCircuit,
    title: "IA Décisionnelle",
    desc: "Notre modèle de reinforcement learning optimise en continu les feux de signalisation, les itinéraires de bus et la gestion des incidents.",
    features: ["Reinforcement Learning", "Multi-agents", "Auto-adaptation"],
    topBar: "from-purple-500/60 via-purple-500/30 to-transparent",
    gradient: "from-purple-500/10 to-transparent",
    border: "border-purple-500/12 hover:border-purple-500/30",
    iconBg: "bg-purple-500/8 border-purple-500/15 group-hover:border-purple-500/35 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)]",
    iconColor: "text-purple-400",
    tagColor: "bg-purple-500/8 text-purple-400 border-purple-500/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(168,85,247,0.1)]",
  },
];

export default function SolutionSection() {
  return (
    <section id="solution" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="section-label">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            La solution
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
          Une plateforme pensée pour
          <br />
          <span className="text-primary">l&apos;intelligence urbaine.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20 leading-relaxed"
        >
          CrossFlow unifie l&apos;analyse, la simulation et la décision autonome en un seul
          système cohérent et interopérable.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-5">
          {solutions.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.65, delay: i * 0.13 }}
              className={`group relative glass rounded-2xl border transition-all duration-300 hover-lift overflow-hidden ${s.border} ${s.hoverShadow}`}
            >
              {/* Gradient top accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${s.topBar}`} />

              {/* Hover background bloom */}
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />

              <div className="relative z-10 p-7">
                {/* Icon */}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border mb-5 group-hover:scale-110 transition-all duration-300 ${s.iconBg}`}>
                  <s.icon className={`w-5 h-5 ${s.iconColor}`} />
                </div>

                <h3 className="text-xl font-bold text-white mb-2.5 tracking-tight">{s.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-5">{s.desc}</p>

                {/* Feature chips */}
                <ul className="flex flex-col gap-1.5">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md border ${s.tagColor}`}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
