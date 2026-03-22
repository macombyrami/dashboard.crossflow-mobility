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
      {/* CTA section with distinct premium styling */}
      <div className="relative overflow-hidden border-b border-white/[0.05]">
        <div className="absolute inset-0 bg-grid opacity-[0.15]" />
        {/* Decorative rays */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-full bg-[radial-gradient(circle_at_center,_var(--color-primary-glow)_0%,_transparent_70%)] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 sm:px-10 py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex justify-center mb-8"
          >
            <span className="section-label group cursor-default">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse group-hover:scale-125 transition-transform" />
              Lancer la transformation urbaine
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="font-black tracking-tight mb-8"
            style={{ fontSize: "clamp(2.5rem, 8vw, 5rem)", lineHeight: "0.95", letterSpacing: "-0.05em" }}
          >
            Rejoignez l&apos;ère de la
            <br />
            <span className="gradient-text">mobilité augmentée.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-text-muted text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Déjà +12 métropoles européennes optimisent leur flux quotidien avec notre technologie. Demandez votre accès privilégié aujourd&apos;hui.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a href="mailto:contact@crossflow-mobility.com" className="btn-primary group h-14 min-w-[240px] justify-center text-base">
              Planifier une démonstration
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </a>
            <a href="#solution" className="btn-secondary h-14 min-w-[200px] justify-center text-base">
              Explorer les fonctionnalités
            </a>
          </motion.div>
        </div>
      </div>

      {/* Main Footer Nav */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 pt-20 pb-12">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-x-8 gap-y-16">
          {/* Brand & Newsletter */}
          <div className="col-span-2 lg:col-span-2 space-y-8 pr-0 lg:pr-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl glass border border-white/[0.08] flex items-center justify-center overflow-hidden">
                  <img src="/crossflow-white.png" alt="Logo" className="w-7 h-7 object-contain" />
                </div>
                <span className="text-xl font-bold tracking-tight">CrossFlow</span>
              </div>
              <p className="text-text-muted text-sm leading-relaxed max-w-xs">
                La plateforme d&apos;intelligence urbaine nouvelle génération. Redéfinir la ville par les données.
              </p>
            </div>

            {/* Newsletter simulated */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-text-secondary">Restez informé</h4>
              <div className="relative group">
                <input
                  type="email"
                  placeholder="votre-email@ville.fr"
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
                />
                <button 
                  aria-label="S'inscrire à la newsletter"
                  className="absolute right-1.5 top-1.5 h-9 w-9 bg-surface-2 hover:bg-primary transition-all rounded-lg flex items-center justify-center text-white group-hover:scale-105 active:scale-95"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-text-dim">En vous inscrivant, vous acceptez nos CGU.</p>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-3">
              {[
                { Icon: Twitter, label: "Twitter" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Github, label: "GitHub" }
              ].map(({ Icon, label }, i) => (
                <a
                  key={i}
                  href="#"
                  aria-label={`Suivre CrossFlow sur ${label}`}
                  className="w-10 h-10 rounded-xl glass border border-white/[0.06] flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary/30 transition-all hover:-translate-y-1"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav groups */}
          <div className="col-span-1 lg:col-span-1">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-8">Produit</h4>
            <ul className="space-y-4">
              {["Analyse temps réel", "Simulation", "IA Copilot", "Intégrations", "Roadmap"].map((link) => (
                <li key={link}><a href="#solution" className="text-sm text-text-secondary hover:text-white hover:translate-x-1 inline-flex transition-all">{link}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-1 lg:col-span-1">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-8">Ressources</h4>
            <ul className="space-y-4">
              {["Documentation", "API Reference", "Guides", "Changelog", "Status"].map((link) => (
                <li key={link}><a href="#" className="text-sm text-text-secondary hover:text-white hover:translate-x-1 inline-flex transition-all">{link}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-1 lg:col-span-1">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-8">Entreprise</h4>
            <ul className="space-y-4">
              {["À propos", "Blog", "Presse", "Partenaires", "Carrières"].map((link) => (
                <li key={link}><a href={link === "À propos" ? "#solution" : "#"} className="text-sm text-text-secondary hover:text-white hover:translate-x-1 inline-flex transition-all">{link}</a></li>
              ))}
            </ul>
          </div>
          <div className="col-span-1 lg:col-span-1">
            <h4 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-8">Légal</h4>
            <ul className="space-y-4">
              {["Confidentialité", "CGU", "Sécurité", "RGPD"].map((link) => (
                <li key={link}><a href={`/${link.toLowerCase().replace("é", "e")}`} className="text-sm text-text-secondary hover:text-white hover:translate-x-1 inline-flex transition-all">{link}</a></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-20 pt-8 border-t border-white/[0.05] flex flex-col md:row items-center justify-between gap-8">
          {/* Trust markers */}
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">ISO</div>
              <span className="text-[10px] font-medium tracking-widest uppercase">27001 Certified</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[8px] font-bold">EU</div>
              <span className="text-[10px] font-medium tracking-widest uppercase">GDPR Compliant</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4 text-text-dim text-xs">
            <p suppressHydrationWarning>© 2026 CrossFlow Mobility. Systèmes urbains autonomes.</p>
            <span className="hidden md:inline w-1 h-1 rounded-full bg-white/10" />
            <div className="flex items-center gap-4">
              <button className="hover:text-text-muted transition-colors">Português</button>
              <button className="text-primary font-medium">Français</button>
              <button className="hover:text-text-muted transition-colors">English</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
