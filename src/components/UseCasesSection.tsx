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
    bg: "bg-blue-400/8 border-blue-400/15 group-hover:border-blue-400/35 group-hover:shadow-[0_0_18px_rgba(96,165,250,0.18)]",
    border: "border-white/[0.06] hover:border-blue-400/20",
    tagBg: "bg-blue-400/8 text-blue-400 border border-blue-400/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(96,165,250,0.1)]",
    topBar: "from-blue-400/50 via-blue-400/25 to-transparent",
    arrowHover: "group-hover:text-blue-400",
  },
  {
    icon: Cpu,
    title: "Smart Cities",
    tag: "Urbanisme digital",
    desc: "Intégrez CrossFlow dans votre écosystème IoT existant. API REST, webhooks, et connecteurs disponibles pour les principales plateformes de ville intelligente.",
    points: ["Intégration Siemens, Cisco Kinetic", "Open Data compatible", "Jumeau numérique 3D"],
    color: "text-primary",
    bg: "bg-primary/8 border-primary/15 group-hover:border-primary/35 group-hover:shadow-[0_0_18px_rgba(34,197,94,0.18)]",
    border: "border-white/[0.06] hover:border-primary/20",
    tagBg: "bg-primary/8 text-primary border border-primary/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(34,197,94,0.1)]",
    topBar: "from-primary/50 via-primary/25 to-transparent",
    arrowHover: "group-hover:text-primary",
  },
  {
    icon: Truck,
    title: "Logistique & Transport",
    tag: "Mobilité pro",
    desc: "Optimisez vos tournées de livraison, réduisez les coûts opérationnels et garantissez des délais respectés même en situation de crise urbaine.",
    points: ["Optimisation des tournées en temps réel", "ETA précis pour les flottes", "Intégration TMS & WMS"],
    color: "text-amber-400",
    bg: "bg-amber-400/8 border-amber-400/15 group-hover:border-amber-400/35 group-hover:shadow-[0_0_18px_rgba(245,158,11,0.18)]",
    border: "border-white/[0.06] hover:border-amber-400/20",
    tagBg: "bg-amber-400/8 text-amber-400 border border-amber-400/15",
    hoverShadow: "hover:shadow-[0_24px_60px_rgba(245,158,11,0.1)]",
    topBar: "from-amber-400/50 via-amber-400/25 to-transparent",
    arrowHover: "group-hover:text-amber-400",
  },
];

export default function UseCasesSection({ dictionary }: { dictionary: any }) {
  return (
    <section id="usecases" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Label */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex justify-center mb-6"
        >
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.02] text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-semibold">
            {dictionary.label}
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
          {dictionary.title?.split(",")?.slice(0, 1)?.join(",")},
          <br />
          <span className="text-text-muted">{dictionary.title?.split(",")?.slice(1)?.join(",")}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-20 leading-relaxed"
        >
          {dictionary.desc}
        </motion.p>

        <div className="grid md:grid-cols-3 gap-5">
          {dictionary.items?.map((item: any, i: number) => {
            const u = usecases[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.13, duration: 0.65 }}
                className={`group glass rounded-2xl border transition-all duration-300 hover-lift flex flex-col overflow-hidden relative ${u.border} ${u.hoverShadow}`}
              >
                {/* Top gradient accent bar */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${u.topBar}`} />

                <div className="p-7 flex flex-col flex-1">
                  {/* Icon + tag row */}
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center transition-all duration-300 ${u.bg}`}>
                      <u.icon className={`w-5 h-5 ${u.color}`} />
                    </div>
                    <span className={`text-[0.65rem] font-semibold px-2.5 py-1 rounded-full tracking-wide ${u.tagBg}`}>
                      {item.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2.5 tracking-tight">{item.title}</h3>
                  <p className="text-text-muted text-sm leading-relaxed mb-5 flex-1">{item.desc}</p>

                  {/* Points */}
                  <ul className="space-y-2 mb-5">
                    {item.points?.map((p: string) => (
                      <li key={p} className="flex items-center gap-2 text-xs text-text-muted">
                        <span className={`text-sm font-bold ${u.color}`}>→</span>
                        {p}
                      </li>
                    ))}
                  </ul>

                  {/* CTA link with underline animation */}
                  <a
                    href="#contact"
                    className={`link-underline flex items-center gap-2 text-sm font-medium text-text-muted transition-all duration-200 group-hover:gap-3 ${u.arrowHover}`}
                  >
                    {item.cta} <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
