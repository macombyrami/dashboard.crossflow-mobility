"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Play, ChevronDown } from "lucide-react";

// Fake map nodes
const NODES = [
  { id: 1, x: 15, y: 35, label: "Centre-Ville", congested: false },
  { id: 2, x: 35, y: 20, label: "Aéroport", congested: false },
  { id: 3, x: 55, y: 40, label: "Gare Nord", congested: true },
  { id: 4, x: 75, y: 25, label: "Zone Industrielle", congested: false },
  { id: 5, x: 25, y: 60, label: "Université", congested: false },
  { id: 6, x: 60, y: 65, label: "Port-Sud", congested: false },
  { id: 7, x: 45, y: 75, label: "Périphérique", congested: true },
  { id: 8, x: 82, y: 55, label: "Smart Hub", congested: false },
];

const EDGES = [
  { from: 1, to: 3 }, { from: 2, to: 3 }, { from: 3, to: 4 },
  { from: 1, to: 5 }, { from: 5, to: 7 }, { from: 3, to: 7 },
  { from: 7, to: 6 }, { from: 4, to: 8 }, { from: 6, to: 8 },
  { from: 2, to: 4 }, { from: 5, to: 6 },
];

function FlowLine({ from, to, animated = true, color = "#22C55E", delay = 0 }: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  animated?: boolean;
  color?: string;
  delay?: number;
}) {
  const length = Math.hypot(to.x - from.x, to.y - from.y) * 10;
  return (
    <motion.line
      x1={`${from.x}%`} y1={`${from.y}%`}
      x2={`${to.x}%`} y2={`${to.y}%`}
      stroke={color}
      strokeWidth="0.6"
      strokeOpacity="0.5"
      strokeDasharray={animated ? `${length * 0.3} ${length}` : undefined}
      initial={{ strokeDashoffset: length }}
      animate={animated ? { strokeDashoffset: [length, -length] } : {}}
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
      {/* Grid background */}
      <div className="absolute inset-0 bg-grid opacity-100" />

      {/* Radial glow */}
      <div className="absolute inset-0 radial-green pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      {/* Map visualization */}
      <div className="absolute inset-0 opacity-60">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          {/* Base static edges */}
          {EDGES.map((e, i) => {
            const from = getNode(e.from);
            const to = getNode(e.to);
            return (
              <line
                key={`static-${i}`}
                x1={`${from.x}%`} y1={`${from.y}%`}
                x2={`${to.x}%`} y2={`${to.y}%`}
                stroke="#1F2937"
                strokeWidth="0.4"
              />
            );
          })}

          {/* Animated flow lines */}
          {mounted && EDGES.map((e, i) => {
            const from = getNode(e.from);
            const to = getNode(e.to);
            const isCongested = from.congested || to.congested;
            return (
              <FlowLine
                key={`flow-${i}`}
                from={from} to={to}
                color={isCongested ? "#F59E0B" : "#22C55E"}
                delay={i * 0.4}
              />
            );
          })}

          {/* Nodes */}
          {NODES.map((node) => (
            <g key={node.id}>
              {/* Pulse ring */}
              {mounted && (
                <motion.circle
                  cx={`${node.x}%`} cy={`${node.y}%`}
                  r={node.congested ? "1.8" : "1.2"}
                  fill={node.congested ? "rgba(245, 158, 11, 0.1)" : "rgba(34, 197, 94, 0.1)"}
                  stroke={node.congested ? "#F59E0B" : "#22C55E"}
                  strokeWidth="0.3"
                  animate={{ r: node.congested ? ["1.8", "3", "1.8"] : ["1.2", "2.2", "1.2"], opacity: [0.8, 0.2, 0.8] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: node.id * 0.3 }}
                />
              )}
              {/* Core dot */}
              <circle
                cx={`${node.x}%`} cy={`${node.y}%`}
                r="0.6"
                fill={node.congested ? "#F59E0B" : "#22C55E"}
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-primary/20 mb-8"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-primary font-medium tracking-wide uppercase">IA Urbaine • Temps Réel</span>
        </motion.div>

        {/* Main title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-6xl md:text-8xl font-black tracking-tight leading-[0.95] mb-6"
        >
          Control{" "}
          <span className="gradient-text">Urban</span>
          <br />
          Flow.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Analysez, simulez et optimisez le trafic en temps réel grâce à l&apos;IA.
          La plateforme dédiée aux villes intelligentes de demain.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <a
            href="#demo"
            className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-primary text-black font-semibold text-sm transition-all duration-300 hover:bg-primary-dark hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] hover:scale-105"
          >
            <Play className="w-4 h-4 fill-black" />
            Voir la démo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <a
            href="#contact"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl border border-white/10 text-white font-medium text-sm hover:border-primary/40 hover:bg-primary/5 transition-all duration-300"
          >
            Demander une présentation
          </a>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-center"
        >
          {[
            { value: "12+", label: "Villes partenaires" },
            { value: "99.9%", label: "Disponibilité SLA" },
            { value: "<50ms", label: "Latence temps réel" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-1">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className="text-xs text-text-muted uppercase tracking-wider">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-5 h-5 text-text-muted" />
      </motion.div>
    </section>
  );
}
