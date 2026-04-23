'use client';

import { motion } from 'framer-motion';
import { Landmark, Building2, Map, ShieldCheck, Globe, Zap } from 'lucide-react';

const PARTNERS = [
  { name: 'VILLE DE PARIS', icon: Landmark },
  { name: 'GRAND LYON', icon: Building2 },
  { name: 'BARCELONA SMART CITY', icon: Globe },
  { name: 'COPENHAGEN URBAN FLOW', icon: Map },
  { name: 'GENÈVE MOBILITÉ', icon: ShieldCheck },
  { name: 'AMSTERDAM LAB', icon: Zap },
];

export function LogoMarquee() {
  return (
    <div className="relative w-full py-12 overflow-hidden border-y border-white/[0.03] bg-white/[0.01]">
      <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#030303] to-transparent z-10" />
      <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[#030303] to-transparent z-10" />
      
      <div className="flex whitespace-nowrap">
        <motion.div
          animate={{ x: [0, -1035] }}
          transition={{
            x: {
              repeat: Infinity,
              repeatType: "loop",
              duration: 30,
              ease: "linear",
            },
          }}
          className="flex gap-16 pr-16 items-center"
        >
          {[...PARTNERS, ...PARTNERS].map((partner, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 text-white/30 hover:text-white/60 transition-colors duration-500 cursor-default"
            >
              <partner.icon className="w-5 h-5 grayscale opacity-70" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                {partner.name}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
