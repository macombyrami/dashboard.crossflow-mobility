"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Produit",    href: "#solution" },
  { label: "Démo",      href: "#demo" },
  { label: "Impact",    href: "#impact" },
  { label: "Use Cases", href: "#usecases" },
];

export default function Navbar() {
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "glass-dark border-b border-white/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[72px] flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="#" className="flex items-center group shrink-0">
            <div className="w-24 h-24 overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:scale-105">
              <img src="/crossflow-white.png" alt="CrossFlow Logo" className="w-full h-full object-contain" />
            </div>
          </a>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative px-3 py-1.5 text-sm text-text-muted hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.04] group"
              >
                {link.label}
                {/* Underline indicator */}
                <span className="absolute bottom-0.5 left-3 right-3 h-px bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden sm:flex items-center gap-3">
            <a
              href="#demo"
              className="text-sm text-text-muted hover:text-white transition-colors duration-200 hidden md:block"
            >
              Voir la démo
            </a>
            <a
              href="#contact"
              className="btn-primary !py-2 !px-4 !text-xs !gap-1.5"
            >
              Demander une démo
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-all"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed inset-x-0 top-[60px] z-40 bg-[#08090B]/98 backdrop-blur-2xl border-b border-white/[0.06] lg:hidden"
          >
            <div className="px-6 py-5 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="py-1.5 text-sm text-text-muted hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-white/5 pt-3 mt-1">
                <a
                  href="#contact"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full justify-center"
                >
                  Demander une démo
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
