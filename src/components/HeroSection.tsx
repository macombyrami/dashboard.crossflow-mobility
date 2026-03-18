"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";

// Map graph nodes & edges
const NODES = [
  { id: 1, x: 15, y: 35, label: "Centre-Ville",    congested: false },
  { id: 2, x: 35, y: 20, label: "Aéroport",        congested: false },
  { id: 3, x: 55, y: 40, label: "Gare Nord",        congested: true  },
  { id: 4, x: 75, y: 25, label: "Zone Industrielle",congested: false },
  { id: 5, x: 25, y: 60, label: "Université",       congested: false },
  { id: 6, x: 60, y: 65, label: "Port-Sud",         congested: false },
  { id: 7, x: 45, y: 75, label: "Périphérique",     congested: true  },
  { id: 8, x: 82, y: 55, label: "Smart Hub",        congested: false },
];

const EDGES = [
  { from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 4 },
  { from: 1, to: 5 }, { from: 5, to: 7 }, { from: 3, to: 7 },
  { from: 7, to: 6 }, { from: 4, to: 8 }, { from: 6, to: 8 },
  { from: 2, to: 4 }, { from: 5, to: 6 },
];

const STATS = [
  { value: "12+",    label: "Villes actives" },
  { value: "99.9%",  label: "SLA garanti" },
  { value: "<50ms",  label: "Latence IA" },
];

function FlowLine({ from, to, color = "#22C55E", delay = 0 }: {
  from: { x: number; y: number };
  to:   { x: number; y: number };
  color?: string;
  delay?: number;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) * 10;
  return (
    <motion.line
      x1={`${from.x}%`} y1={`${from.y}%`}
      x2={`${to.x}%`}   y2={`${to.y}%`}
      stroke={color}
      strokeWidth="0.55"
      strokeOpacity="0.55"
      strokeDasharray={`${length * 0.28} ${length}`}
      initial={{ strokeDashoffset: length }}
      animate={{ strokeDashoffset: [length, -length] }}
      transition={{ duration: 3 + delay, repeat: Infinity, ease: "linear", delay }}
    />
  );
}

export default function HeroSection() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const getNode = (id: number) => NODES.find((n) => n.id === id)!;

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-background">
      {/* Grid */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Ambient radial glow */}
      <div className="absolute inset-0 radial-green pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/[0.04] blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-[30%] w-[400px] h-[400px] rounded-full bg-accent-cyan/[0.03] blur-[120px] pointer-events-none" />

      {/* Map visualization */}
      <div className="absolute inset-0 opacity-65">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {/* Static base edges */}
          {EDGES.map((e, i) => {
            const from = getNode(e.from);
            const to   = getNode(e.to);
            return (
              <line
                key={`static-${i}`}
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`}   y2={`${to.y}%`}
                stroke="#1C2028"
                strokeWidth="0.35"
              />
            );
          })}

          {/* Animated flow lines */}
          {mounted && EDGES.map((e, i) => {
            const from = getNode(e.from);
            const to   = getNode(e.to);
            const isCongested = from.congested || to.congested;
            return (
              <FlowLine
                key={`flow-${i}`}
                from={from} to={to}
                color={isCongested ? "#F59E0B" : "#22C55E"}
                delay={i * 0.35}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => (
            <g key={node.id}>
              {mounted && (
                <motion.circle
                  cx={`${node.x}%`} cy={`${node.y}%`}
                  r={node.congested ? "1.8" : "1.2"}
                  fill={node.congested ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)"}
                  stroke={node.congested ? "#F59E0B" : "#22C55E"}
                  strokeWidth="0.25"
                  animate={{
                    r:       node.congested ? ["1.8", "3.2", "1.8"] : ["1.2", "2.4", "1.2"],
                    opacity: [0.7, 0.15, 0.7],
                  }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: node.id * 0.25 }}
                />
              )}
              <circle
                cx={`${node.x}%`} cy={`${node.y}%`}
                r="0.55"
                fill={node.congested ? "#F59E0B" : "#22C55E"}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-8"
          style={{
            background: "rgba(34,197,94,0.06)",
            border: "1px solid rgba(34,197,94,0.2)",
            boxShadow: "inset 0 0 12px rgba(34,197,94,0.08)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span suppressHydrationWarning className="text-[0.65rem] text-primary font-semibold tracking-[0.14em] uppercase">
            IA Urbaine · Temps Réel
          </span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.1, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
          className="font-black tracking-[-0.04em] leading-[0.92] mb-6"
          style={{ fontSize: "clamp(3.25rem, 9vw, 7.5rem)" }}
        >
          Contrôlez le{" "}
          <span className="gradient-text">flux</span>
          <br />
          urbain.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.22 }}
          className="text-white/55 max-w-xl mx-auto leading-relaxed mb-10"
          style={{ fontSize: "clamp(1rem, 1.8vw, 1.2rem)" }}
        >
          Analysez, simulez et optimisez le trafic en temps réel grâce à l&apos;IA.
          La plateforme dédiée aux villes intelligentes de demain.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5"
        >
          <a href="#demo" className="btn-primary group">
            <Play className="w-4 h-4 fill-black shrink-0" />
            Voir la démo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
          </a>
          <a href="#contact" className="btn-secondary">
            Demander une présentation
          </a>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.65 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-0 sm:gap-0 text-center divide-y sm:divide-y-0 sm:divide-x divide-white/[0.08]"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1 px-8 py-4 sm:py-0">
              <span className="font-mono-nums text-2xl font-black text-white tracking-tight">
                {stat.value}
              </span>
              <span className="text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-medium">
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-7 left-1/2 -translate-x-1/2 opacity-35"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.35, y: [0, 7, 0] }}
        transition={{ opacity: { delay: 2, duration: 0.6 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
      >
        <ChevronDown className="w-5 h-5 text-text-muted" />
      </motion.div>
    </section>
  );
}
