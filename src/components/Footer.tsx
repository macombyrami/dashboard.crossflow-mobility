"use client";

import { motion } from "framer-motion";
import { Twitter, Linkedin, Github, ArrowRight } from "lucide-react";

const footerLinks = {
  Produit:    ["Analyse temps réel", "Simulation", "IA Copilot", "Intégrations", "Roadmap"],
  Ressources: ["Documentation", "API Reference", "Guides", "Changelog", "Status"],
  Entreprise: ["À propos", "Blog", "Presse", "Partenaires", "Carrières"],
  Légal:      ["Confidentialité", "CGU", "Sécurité", "RGPD"],
};

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-white/[0.05] bg-background">
      {/* CTA section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-25" />
        {/* Ambient green glow blobs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-primary/[0.04] blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent-cyan/[0.025] blur-[100px] pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-28 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-6"
          >
            <span className="section-label">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Commencer maintenant
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="font-black tracking-tight mb-6"
            style={{ fontSize: "clamp(2.5rem, 7vw, 4.5rem)", lineHeight: "1.06", letterSpacing: "-0.04em" }}
          >
            Prêt à optimiser
            <br />
            <span className="gradient-text">votre ville ?</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-text-muted text-lg max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Rejoignez les 12 métropoles qui font confiance à CrossFlow pour leur mobilité urbaine.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <a
              href="mailto:contact@crossflow.io"
              className="btn-primary group"
            >
              Demander une présentation
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </a>
            <a href="#demo" className="btn-secondary">
              Voir la démo d&apos;abord
            </a>
          </motion.div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="border-t border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center border border-white/[0.06]">
                  <img src="/crossflow-white.png" alt="CrossFlow Logo" className="w-full h-full object-contain" />
                </div>
                <span className="text-white font-bold text-sm tracking-tight">CrossFlow</span>
              </div>
              <p className="text-text-muted text-xs leading-relaxed mb-5">
                La plateforme d&apos;IA pour la mobilité urbaine intelligente.
              </p>
              <div className="flex items-center gap-2">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-8 h-8 rounded-lg glass border border-white/[0.06] hover:border-primary/30 hover:shadow-[0_0_14px_rgba(34,197,94,0.2)] flex items-center justify-center text-text-muted hover:text-primary transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {Object.entries(footerLinks).map(([section, links]) => (
              <div key={section}>
                <div className="text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-semibold mb-4">
                  {section}
                </div>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link}>
                      <a
                        href="#contact"
                        title="Bientôt disponible"
                        className="text-sm text-text-secondary hover:text-white transition-colors duration-200"
                      >
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
      <div className="border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-text-dim">© 2025 CrossFlow Mobility. Tous droits réservés.</p>
          <p className="text-xs text-text-dim">Fait avec ❤️ pour les villes intelligentes.</p>
        </div>
      </div>
    </footer>
  );
}
