"use client";

import { motion } from "framer-motion";
import { Zap, FlaskConical, BrainCircuit } from "lucide-react";

const solutions = [
  {
    icon: Zap,
    title: "Analyse Temps Réel",
    desc: "Ingestion de données multi-sources (capteurs IoT, caméras, GPS) avec traitement en moins de 50ms. Dashboard live avec alertes intelligentes.",
    features: ["Capteurs IoT", "Vision par ordinateur", "Alertes instantanées"],
    gradient: "from-primary/20 to-primary/5",
    border: "border-primary/20 hover:border-primary/40",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  {
    icon: FlaskConical,
    title: "Simulation de Scénarios",
    desc: "Testez n'importe quel scénario (accidents, événements, travaux) dans un jumeau numérique avant de déployer en conditions réelles.",
    features: ["Digital Twin", "Monte Carlo", "A/B Testing"],
    gradient: "from-blue-500/20 to-blue-500/5",
    border: "border-blue-500/20 hover:border-blue-500/40",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-400",
  },
  {
    icon: BrainCircuit,
    title: "IA Décisionnelle",
    desc: "Notre modèle de reinforcement learning optimise en continu les feux de signalisation, les itinéraires de bus et la gestion des incidents.",
    features: ["Reinforcement Learning", "Optimisation multi-agents", "Auto-adaptation"],
    gradient: "from-purple-500/20 to-purple-500/5",
    border: "border-purple-500/20 hover:border-purple-500/40",
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-400",
  },
];

export default function SolutionSection() {
  return (
    <section id="solution" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-xs text-primary uppercase tracking-widest font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            La solution
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-5xl font-black text-center tracking-tight mb-5"
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
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20"
        >
          CrossFlow unifie l&apos;analyse, la simulation et la décision autonome en un seul
          système cohérent et interopérable.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {solutions.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className={`group relative glass rounded-2xl p-8 border transition-all duration-300 hover-lift overflow-hidden ${s.border}`}
            >
              {/* Background gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${s.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.iconBg} border border-current/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <s.icon className={`w-6 h-6 ${s.iconColor}`} />
                </div>

                <h3 className="text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-text-muted text-sm leading-relaxed mb-6">{s.desc}</p>

                <ul className="flex flex-col gap-2">
                  {s.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-text-muted">
                      <span className={`w-1 h-1 rounded-full ${s.iconColor} opacity-60`} style={{backgroundColor: "currentColor"}} />
                      {f}
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
