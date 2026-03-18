"use client";

import { motion } from "framer-motion";
import { Activity, Twitter, Linkedin, Github, ArrowRight } from "lucide-react";

const footerLinks = {
  Produit: ["Analyse temps réel", "Simulation", "IA Copilot", "Intégrations", "Roadmap"],
  Ressources: ["Documentation", "API Reference", "Guides", "Changelog", "Status"],
  Entreprise: ["À propos", "Blog", "Presse", "Partenaires", "Carrières"],
  Légal: ["Confidentialité", "CGU", "Sécurité", "RGPD"],
};

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/5 bg-background">
      {/* CTA section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-xs text-primary uppercase tracking-widest font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Commencer maintenant
            </span>
          </motion.div>

          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-6xl font-black tracking-tight mb-6">
            Prêt à optimiser
            <br />
            <span className="text-primary">votre ville ?</span>
          </motion.h2>

          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-text-muted text-lg max-w-xl mx-auto mb-10">
            Rejoignez les 12 métropoles qui font confiance à CrossFlow pour leur mobilité urbaine.
          </motion.p>

          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:contact@crossflow.io" className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-black font-semibold text-sm transition-all duration-300 hover:bg-primary-dark hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-105">
              Demander une présentation
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </a>
            <a href="#demo" className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-white/10 text-white font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
              Voir la démo d&apos;abord
            </a>
          </motion.div>
        </div>
      </div>

      {/* Links */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Activity className="w-4 h-4 text-black" strokeWidth={2.5} />
                </div>
                <span className="text-white font-semibold text-sm">CrossFlow</span>
              </div>
              <p className="text-text-muted text-xs leading-relaxed mb-5">
                La plateforme d&apos;IA pour la mobilité urbaine intelligente.
              </p>
              <div className="flex items-center gap-3">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-8 h-8 rounded-lg glass border border-white/5 hover:border-primary/30 flex items-center justify-center text-text-muted hover:text-primary transition-all duration-200">
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <div className="text-xs text-text-muted uppercase tracking-widest font-medium mb-4">{section}</div>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-text-muted hover:text-white transition-colors duration-200">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-text-muted">© 2025 CrossFlow Mobility. Tous droits réservés.</p>
          <p className="text-xs text-text-muted">Fait avec ❤️ pour les villes intelligentes.</p>
        </div>
      </div>
    </footer>
  );
}
