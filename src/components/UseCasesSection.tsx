"use client";

import { motion } from "framer-motion";
import { Building2, Cpu, Truck, ArrowRight } from "lucide-react";

const usecases = [
  {
    icon: Building2,
    title: "Mairies & Collectivités",
    tag: "Secteur public",
    desc: "Réduisez la congestion en centre-ville, améliorez la qualité de vie et pilotez vos axes prioritaires depuis un tableau de bord unifié.",
    points: ["Gestion des grands événements", "Zones à faibles émissions", "Reporting citoyen automatisé"],
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20 hover:border-blue-400/40",
    tagBg: "bg-blue-400/10 text-blue-400",
  },
  {
    icon: Cpu,
    title: "Smart Cities",
    tag: "Urbanisme digital",
    desc: "Intégrez CrossFlow dans votre écosystème IoT existant. API REST, webhooks, et connecteurs disponibles pour les principales plateformes de ville intelligente.",
    points: ["Intégration Siemens, Cisco Kinetic", "Open Data compatible", "Jumeau numérique 3D"],
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20 hover:border-primary/40",
    tagBg: "bg-primary/15 text-primary",
  },
  {
    icon: Truck,
    title: "Logistique & Transport",
    tag: "Mobilité professionnelle",
    desc: "Optimisez vos tournées de livraison, réduisez les coûts opérationnels et garantissez des délais respectés même en situation de crise urbaine.",
    points: ["Optimisation des tournées en temps réel", "ETA précis pour les flottes", "Intégration TMS & WMS"],
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20 hover:border-amber-400/40",
    tagBg: "bg-amber-400/10 text-amber-400",
  },
];

export default function UseCasesSection() {
  return (
    <section id="usecases" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 text-xs text-text-muted uppercase tracking-widest font-medium">
            Use Cases
          </span>
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-center tracking-tight mb-5">
          Une solution,
          <br />
          <span className="text-text-muted">plusieurs secteurs.</span>
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20">
          CrossFlow s&apos;adapte à votre contexte et s&apos;intègre à vos systèmes existants sans friction.
        </motion.p>

        <div className="grid md:grid-cols-3 gap-6">
          {usecases.map((u, i) => (
            <motion.div
              key={u.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className={`group glass rounded-2xl p-8 border transition-all duration-300 hover-lift flex flex-col ${u.border}`}
            >
              <div className="flex items-center justify-between mb-6">
                <div className={`w-11 h-11 rounded-xl ${u.bg} border border-current/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <u.icon className={`w-5 h-5 ${u.color}`} />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${u.tagBg}`}>{u.tag}</span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3">{u.title}</h3>
              <p className="text-text-muted text-sm leading-relaxed mb-6 flex-1">{u.desc}</p>

              <ul className="space-y-2 mb-6">
                {u.points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-xs text-text-muted">
                    <span className={`text-xs ${u.color}`}>→</span>
                    {p}
                  </li>
                ))}
              </ul>

              <a href="#contact" className={`flex items-center gap-2 text-sm font-medium ${u.color} group-hover:gap-3 transition-all duration-200`}>
                En savoir plus <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
