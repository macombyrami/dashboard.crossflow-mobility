"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Zap, Activity, TrendingDown, Clock, Wind, RefreshCw } from "lucide-react";

// Map nodes and edges for the demo
const DEMO_NODES = [
  { id: "A", x: 12, y: 30, label: "Centre" },
  { id: "B", x: 30, y: 15, label: "Nord" },
  { id: "C", x: 52, y: 28, label: "Croisement Principal" },
  { id: "D", x: 72, y: 18, label: "Est" },
  { id: "E", x: 20, y: 55, label: "Ouest" },
  { id: "F", x: 48, y: 62, label: "Sud" },
  { id: "G", x: 75, y: 52, label: "Hub" },
  { id: "H", x: 37, y: 40, label: "Jonction" },
];

const DEMO_EDGES = [
  { from: "A", to: "H" }, { from: "B", to: "C" }, { from: "H", to: "C" },
  { from: "C", to: "D" }, { from: "A", to: "E" }, { from: "E", to: "F" },
  { from: "F", to: "G" }, { from: "C", to: "G" }, { from: "H", to: "F" },
  { from: "B", to: "H" }, { from: "D", to: "G" },
];

type TrafficState = "normal" | "accident" | "optimized";

interface KPI {
  avgTime: number;
  congestion: number;
  flux: number;
}

const STATE_KPIS: Record<TrafficState, KPI> = {
  normal:    { avgTime: 14.2, congestion: 42, flux: 1840 },
  accident:  { avgTime: 28.7, congestion: 87, flux: 920  },
  optimized: { avgTime: 10.1, congestion: 18, flux: 2410 },
};

const CONGESTED_NODES: Record<TrafficState, string[]> = {
  normal:    [],
  accident:  ["C", "H", "B"],
  optimized: [],
};

export default function DemoSection() {
  const [state, setState] = useState<TrafficState>("normal");
  const [kpi, setKpi] = useState<KPI>(STATE_KPIS.normal);
  const [log, setLog] = useState<string[]>([
    "Système opérationnel — Surveillance active",
    "Connexion à 247 capteurs confirmée",
    "Latence réseau : 23ms",
  ]);
  const [tick, setTick] = useState(0);

  const getNode = (id: string) => DEMO_NODES.find((n) => n.id === id)!;

  // Live KPI fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      const target = STATE_KPIS[state];
      setKpi({
        avgTime: parseFloat((target.avgTime + (Math.random() - 0.5) * 1.5).toFixed(1)),
        congestion: Math.round(target.congestion + (Math.random() - 0.5) * 5),
        flux: Math.round(target.flux + (Math.random() - 0.5) * 80),
      });
      setTick((t) => t + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, [state]);

  const simulateAccident = useCallback(() => {
    setState("accident");
    setLog((prev) => [
      `Incident détecté — Nœud C bloqué`,
      `Recalcul des routes en cours...`,
      `Alerte envoyée aux équipes terrain`,
      ...prev.slice(0, 5),
    ]);
  }, []);

  const optimizeLights = useCallback(() => {
    setState("optimized");
    setLog((prev) => [
      `IA activée — Optimisation des feux`,
      `Cycles adaptés sur 12 carrefours`,
      `Flux augmenté de +31%`,
      ...prev.slice(0, 5),
    ]);
  }, []);

  const resetState = useCallback(() => {
    setState("normal");
    setLog((prev) => [
      `Réseau normalisé`,
      `Mode surveillance standard actif`,
      ...prev.slice(0, 5),
    ]);
  }, []);

  const congested = CONGESTED_NODES[state];
  const congestedEdges = DEMO_EDGES.filter((e) => congested.includes(e.from) || congested.includes(e.to));

  const kpiColor =
    state === "accident" ? "text-red-400" :
    state === "optimized" ? "text-primary" :
    "text-white";

  return (
    <section id="demo" className="py-32 relative overflow-hidden">
      <div className="absolute inset-0 radial-green opacity-30" />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 text-xs text-primary uppercase tracking-widest font-medium">
            <Activity className="w-3 h-3" /> Interface produit live
          </span>
        </motion.div>

        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black text-center tracking-tight mb-5">
          Prenez le contrôle du trafic.
          <br />
          <span className="text-primary">En direct.</span>
        </motion.h2>

        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-center text-text-muted text-lg max-w-2xl mx-auto mb-4">
          Interagissez avec une simulation réelle de notre interface de gestion urbaine.
        </motion.p>
        <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="text-center text-text-secondary text-xs italic mb-12">
          Note : Les données présentées sont simulées à des fins de démonstration.
        </motion.p>

        {/* Main Demo UI */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl border border-white/10 overflow-hidden"
        >
          {/* Title bar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-black/30">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              CrossFlow Dashboard · Métropole Alpha
            </div>
            <div className="text-xs text-text-muted font-mono">v2.4.1</div>
          </div>

          <div className="flex flex-col lg:flex-row min-h-[500px]">
            {/* Map area */}
            <div className="flex-1 relative bg-[#080B10] overflow-hidden">
              {/* Grid */}
              <div className="absolute inset-0 bg-grid opacity-60" />

              {/* SVG Map */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 80" preserveAspectRatio="xMidYMid meet">
                {/* Static roads */}
                {DEMO_EDGES.map((e, i) => {
                  const from = getNode(e.from);
                  const to = getNode(e.to);
                  const isCongested = congestedEdges.includes(e);
                  return (
                    <line
                      key={`static-${i}`}
                      x1={`${from.x}%`} y1={`${from.y}%`}
                      x2={`${to.x}%`} y2={`${to.y}%`}
                      stroke={isCongested ? "#EF4444" : "#1F2937"}
                      strokeWidth={isCongested ? "1" : "0.5"}
                    />
                  );
                })}

                {/* Animated flows */}
                {DEMO_EDGES.map((e, i) => {
                  const from = getNode(e.from);
                  const to = getNode(e.to);
                  const isCongested = congestedEdges.includes(e);
                  if (isCongested && state === "accident") return null;
                  const color = state === "optimized" ? "#22C55E" : "#22C55E";
                  const len = Math.hypot(to.x - from.x, to.y - from.y) * 8;
                  return (
                    <motion.line
                      key={`flow-${i}-${state}`}
                      x1={`${from.x}%`} y1={`${from.y}%`}
                      x2={`${to.x}%`} y2={`${to.y}%`}
                      stroke={color}
                      strokeWidth="0.8"
                      strokeOpacity="0.6"
                      strokeDasharray={`${len * 0.15} ${len}`}
                      animate={{ strokeDashoffset: [len, -len] }}
                      transition={{ duration: state === "optimized" ? 1.5 : 3, repeat: Infinity, ease: "linear", delay: i * 0.3 }}
                    />
                  );
                })}

                {/* Nodes */}
                {DEMO_NODES.map((node) => {
                  const isCongestedNode = congested.includes(node.id);
                  return (
                    <g key={node.id}>
                      <motion.circle
                        cx={`${node.x}%`} cy={`${node.y}%`}
                        r={isCongestedNode ? "2.5" : "1.5"}
                        fill={isCongestedNode ? "rgba(239,68,68,0.15)" : state === "optimized" ? "rgba(34,197,94,0.15)" : "rgba(34,197,94,0.1)"}
                        stroke={isCongestedNode ? "#EF4444" : "#22C55E"}
                        strokeWidth="0.3"
                        animate={{ r: [isCongestedNode ? "2.5" : "1.5", isCongestedNode ? "4" : "3", isCongestedNode ? "2.5" : "1.5"], opacity: [1, 0.3, 1] }}
                        transition={{ duration: isCongestedNode ? 1 : 2.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <circle cx={`${node.x}%`} cy={`${node.y}%`} r="0.7"
                        fill={isCongestedNode ? "#EF4444" : "#22C55E"} />
                    </g>
                  );
                })}

                {/* Accident icon */}
                <AnimatePresence>
                  {state === "accident" && (
                    <motion.text
                      x="52%" y="26%" textAnchor="middle"
                      fontSize="4" fill="#EF4444"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      ⚠
                    </motion.text>
                  )}
                </AnimatePresence>
              </svg>

              {/* State badge */}
              <div className="absolute top-4 left-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={state}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs font-mono border ${
                      state === "accident" ? "border-red-500/30 text-red-400" :
                      state === "optimized" ? "border-primary/30 text-primary" :
                      "border-white/10 text-text-muted"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      state === "accident" ? "bg-red-400 animate-ping-slow" :
                      state === "optimized" ? "bg-primary animate-pulse" :
                      "bg-text-muted"
                    }`} />
                    {state === "accident" ? "INCIDENT DÉTECTÉ" : state === "optimized" ? "OPTIMISATION ACTIVE" : "SURVEILLANCE ACTIVE"}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Controls */}
              <div className="absolute bottom-4 left-4 right-4 flex gap-2 flex-wrap">
                <button
                  onClick={simulateAccident}
                  disabled={state === "accident"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <AlertCircle className="w-3.5 h-3.5" /> Simuler un accident
                </button>
                <button
                  onClick={optimizeLights}
                  disabled={state === "optimized"}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Zap className="w-3.5 h-3.5" /> Optimiser les feux
                </button>
                <button
                  onClick={resetState}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-text-muted text-xs font-medium hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col bg-black/20">
              {/* KPIs */}
              <div className="p-5 border-b border-white/5">
                <div className="text-xs text-text-muted uppercase tracking-widest mb-4 font-medium">KPIs — Live</div>
                <div className="space-y-4">
                  <KPIItem
                    icon={Clock}
                    label="Temps moyen de trajet"
                    value={`${kpi.avgTime} min`}
                    color={state === "accident" ? "text-red-400" : state === "optimized" ? "text-primary" : "text-white"}
                    trend={state === "accident" ? "up" : state === "optimized" ? "down" : "neutral"}
                  />
                  <KPIItem
                    icon={TrendingDown}
                    label="Taux de congestion"
                    value={`${kpi.congestion}%`}
                    color={kpi.congestion > 60 ? "text-red-400" : kpi.congestion < 30 ? "text-primary" : "text-amber-400"}
                    progress={kpi.congestion}
                    trend={state === "accident" ? "up" : state === "optimized" ? "down" : "neutral"}
                  />
                  <KPIItem
                    icon={Activity}
                    label="Flux véhicules/heure"
                    value={kpi.flux.toLocaleString()}
                    color={state === "accident" ? "text-red-400" : state === "optimized" ? "text-primary" : "text-white"}
                    trend={state === "accident" ? "down" : state === "optimized" ? "up" : "neutral"}
                  />
                </div>
              </div>

              {/* Event log */}
              <div className="flex-1 p-5 overflow-hidden">
                <div className="text-xs text-text-muted uppercase tracking-widest mb-4 font-medium">Journal événements</div>
                <div className="space-y-2.5 custom-scrollbar overflow-y-auto max-h-48">
                  <AnimatePresence>
                    {log.map((entry, i) => (
                      <motion.div
                        key={`${entry}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-start gap-2.5 text-xs"
                      >
                        <span className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <span className={i === 0 ? "text-white" : "text-text-muted"}>{entry}</span>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Tick indicator */}
              <div className="px-5 pb-4 pt-1 flex items-center justify-between text-xs text-text-muted font-mono border-t border-white/5">
                <span>Tick #{tick}</span>
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  Live
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function KPIItem({ icon: Icon, label, value, color, progress, trend }: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  progress?: number;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-xs text-text-muted">{label}</span>
        </div>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`text-sm font-bold font-mono ${color}`}
        >
          {value}
        </motion.span>
      </div>
      {progress !== undefined && (
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              progress > 60 ? "bg-red-400" : progress < 30 ? "bg-primary" : "bg-amber-400"
            }`}
          />
        </div>
      )}
    </div>
  );
}
