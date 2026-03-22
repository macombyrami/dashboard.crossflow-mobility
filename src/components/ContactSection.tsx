"use client";

import { motion } from "framer-motion";
import { Send, MapPin, Mail, Phone } from "lucide-react";

export default function ContactSection({ dictionary }: { dictionary: any }) {
  return (
    <section id="contact" className="py-24 relative overflow-hidden bg-surface-3">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Info Side */}
          <div className="space-y-12">
            <div>
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-[0.65rem] text-primary uppercase tracking-[0.12em] font-semibold mb-6"
              >
                <div className="w-1 h-1 rounded-full bg-primary animate-ping" />
                {dictionary.label}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl font-black tracking-tight mb-6"
              >
                {dictionary.title?.split(" ")?.slice(0, -3)?.join(" ")} <span className="gradient-text">{dictionary.title?.split(" ")?.slice(-3)?.join(" ")}</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="text-text-muted text-lg leading-relaxed max-w-md"
              >
                {dictionary.desc}
              </motion.p>
            </div>

            <div className="space-y-6">
              {[
                { icon: MapPin, text: "Station F, 5 Parvis Alan Turing, 75013 Paris" },
                { icon: Mail, text: "contact@crossflow-mobility.com" },
                { icon: Phone, text: "+33 (0)1 82 83 90 00" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center group-hover:border-primary/30 group-hover:bg-primary/5 transition-all">
                    <item.icon className="w-4.5 h-4.5 text-text-muted group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-sm text-text-muted group-hover:text-white transition-colors">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Form Side */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="glass rounded-3xl p-8 sm:p-10 border border-white/[0.08] relative"
          >
            <div className="absolute -top-12 -right-12 w-64 h-64 bg-primary/5 blur-[80px] pointer-events-none" />
            
            <form className="space-y-6 relative" onSubmit={(e) => e.preventDefault()}>
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary ml-1">{dictionary.form?.name}</label>
                  <input 
                    type="text" 
                    placeholder={dictionary.form?.name}
                    className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-text-secondary ml-1">{dictionary.form?.org}</label>
                  <input 
                    type="text" 
                    placeholder={dictionary.form?.org}
                    className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-text-secondary ml-1">{dictionary.form?.email}</label>
                <input 
                  type="email" 
                  placeholder={dictionary.form?.email}
                  className="w-full h-12 bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-text-secondary ml-1">{dictionary.form?.message}</label>
                <textarea 
                  rows={4}
                  placeholder={dictionary.form?.message}
                  className="w-full bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-sm focus:outline-none focus:border-primary/40 focus:bg-white/[0.05] transition-all resize-none"
                />
              </div>
              <button className="btn-primary w-full h-14 justify-center text-base">
                {dictionary.form?.submit}
                <Send className="w-4 h-4 ml-2" />
              </button>
              <p className="text-[10px] text-center text-text-dim px-4">
                {dictionary.form?.privacy}
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
