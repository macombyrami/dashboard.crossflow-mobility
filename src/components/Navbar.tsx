"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Produit", href: "#solution" },
  { label: "Démo", href: "#demo" },
  { label: "Impact", href: "#impact" },
  { label: "Use Cases", href: "#usecases" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-dark border-b border-white/5" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(34,197,94,0.4)]">
              <img 
                src="/logo.png" 
                alt="CrossFlow Logo" 
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white font-bold text-base tracking-tight lg:block hidden ml-1">
              CrossFlow <span className="text-primary">Mobility</span>
            </span>
            <span className="text-white font-bold text-base tracking-tight lg:hidden block ml-1">
              CrossFlow
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-text-muted hover:text-white transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden sm:flex items-center gap-3 ml-auto">
            <a
              href="#demo"
              className="text-sm text-text-muted hover:text-white transition-colors duration-200 hidden md:block"
            >
              Voir la démo
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-primary text-black text-xs md:text-sm font-semibold hover:bg-primary-dark transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] whitespace-nowrap"
            >
              Demander une démo
            </a>
          </div>

          {/* Mobile toggle */}
          <button
            className="md:hidden p-2 text-text-muted hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-x-0 top-16 z-40 glass-dark border-b border-white/5 md:hidden"
          >
            <div className="px-6 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm text-text-muted hover:text-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={() => setMobileOpen(false)}
                className="inline-flex justify-center items-center px-4 py-2 rounded-lg bg-primary text-black text-sm font-semibold"
              >
                Demander une démo
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
