"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Bus, Bike, Activity } from "lucide-react";

interface StatItem {
  id: string;
  label: string;
  icon: any;
  value: number;
  initialValue: number;
  color: string;
}

export default function LiveStatsWidget({ dictionary }: { dictionary: any }) {
  const INITIAL_STATS: StatItem[] = [
    { id: "cars", label: dictionary.items?.cars, icon: Car, value: 1248, initialValue: 1248, color: "text-white" },
    { id: "buses", label: dictionary.items?.buses, icon: Bus, value: 42, initialValue: 42, color: "text-primary" },
    { id: "bikes", label: dictionary.items?.bikes, icon: Bike, value: 312, initialValue: 312, color: "text-accent-cyan" },
  ];

  const [stats, setStats] = useState(INITIAL_STATS);
  const [total, setTotal] = useState(1602);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats((prev) =>
        prev.map((s) => {
          const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
          const newValue = Math.max(s.initialValue - 20, Math.min(s.initialValue + 300, s.value + change));
          return { ...s, value: newValue };
        })
      );
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const sum = stats.reduce((acc, s) => acc + s.value, 0);
    setTotal(sum);
  }, [stats]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, x: 20 }}
      animate={{ opacity: 1, scale: 1, x: 0 }}
      transition={{ duration: 0.8, delay: 1, ease: [0.16, 1, 0.3, 1] }}
      className="hidden md:flex flex-col gap-3 glass-dark p-4 rounded-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] min-w-[200px]"
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[0.6rem] font-bold uppercase tracking-[0.15em] text-text-muted">{dictionary.monitor}</span>
        </div>
        <span className="text-[0.6rem] font-mono text-text-secondary">v1.0.4</span>
      </div>

      {/* Total Display */}
      <div className="mb-2">
        <div className="text-[0.6rem] text-text-muted uppercase tracking-wider mb-0.5">{dictionary.totalLabel}</div>
        <div className="text-2xl font-black font-mono-nums tracking-tighter flex items-baseline gap-1.5" suppressHydrationWarning>
          {total.toLocaleString()}
          <Activity className="w-3.5 h-3.5 text-primary opacity-50" />
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 pt-2 border-t border-white/[0.04]">
        {stats.map((stat) => (
          <div key={stat.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-1.5 rounded-lg bg-white/[0.03] border border-white/[0.05] ${stat.color}`}>
                <stat.icon size={14} />
              </div>
              <span className="text-[0.7rem] text-text-muted font-medium">{stat.label}</span>
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key={stat.value}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="text-[0.75rem] font-bold font-mono-nums"
              >
                {stat.value}
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-2 pt-2 border-t border-white/[0.04] flex items-center justify-between text-[0.55rem]">
        <span className="text-text-secondary italic">{dictionary.updated}</span>
        <div className="flex items-center gap-1 text-primary/70">
          <span className="w-1 h-1 rounded-full bg-current" />
          <span className="font-semibold uppercase tracking-wider">{dictionary.metro}</span>
        </div>
      </div>

      {/* Glow corner */}
      <div className="absolute -top-10 -right-10 w-20 h-20 bg-primary/5 blur-2xl rounded-full" />
    </motion.div>
  );
}
