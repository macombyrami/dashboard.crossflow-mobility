"use client";

import { motion } from "framer-motion";

export default function AboutSection({ dictionary }: { dictionary: any }) {
  return (
    <section id="about" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <span className="section-label">{dictionary.label}</span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-tight leading-[1.1]">
              {dictionary.title?.split(" ")?.slice(0, -2)?.join(" ")} <span className="gradient-text">{dictionary.title?.split(" ")?.slice(-2)?.join(" ")}</span>
            </h2>
            <p className="text-text-muted text-lg leading-relaxed">
              {dictionary.desc}
            </p>
            <div className="grid grid-cols-2 gap-8 pt-4">
              {dictionary.stats?.map((stat: any, i: number) => (
                <div key={i}>
                  <div className="text-3xl font-black text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-text-dim uppercase tracking-widest font-bold">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-square rounded-3xl overflow-hidden glass border border-white/[0.08] p-2">
              <div className="w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-accent-cyan/20 flex items-center justify-center relative group">
                <img 
                  src="/logo.png" 
                  alt="CrossFlow Platform Preview" 
                  className="w-3/4 h-3/4 object-contain group-hover:scale-110 transition-transform duration-500 opacity-60"
                />
                <div className="absolute inset-0 bg-grid opacity-20" />
              </div>
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent-cyan/20 blur-[60px] rounded-full" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
