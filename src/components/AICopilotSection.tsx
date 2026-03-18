"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, BrainCircuit, User, Loader2 } from "lucide-react";

const CONVERSATIONS = [
  {
    user: "Simule un pic de trafic à 18h",
    ai: "Simulation lancée pour 18h00. J'analyse les flux actuels et projette une augmentation de +67% du volume sur les axes principaux.\n\n→ 3 carrefours critiques identifiés : Gare Nord, Centre-Ville, Périphérique Sud.\n\n→ Recommandation : activer le plan «Heure de Pointe» sur 8 intersections, préparer les itinéraires alternatifs B3 et C7.",
  },
  {
    user: "Quelle est la meilleure stratégie pour l'axe Nord-Sud ?",
    ai: "Après analyse des données historiques (30 jours) et des prévisions météo :\n\n→ Allongement des cycles verts de 15s sur l'axe Nord-Sud de 17h30 à 19h.\n→ Activation des voies réversibles sur Boulevard Haussmann.\n→ Détournement préventif de 18% du flux vers l'A86.\n\nGain estimé : -22% temps d'attente, +340 véhicules/h supplémentaires.",
  },
  {
    user: "Génère un rapport d'optimisation pour la semaine",
    ai: "Rapport hebdomadaire généré ✓\n\n→ Réduction congestion globale : -18.3%\n→ Économies carbone : 4.2 tonnes CO₂\n→ Incidents traités automatiquement : 14/14\n→ Satisfaction usagers : +12 points NPS\n\nRapport PDF disponible. Voulez-vous l'envoyer aux parties prenantes ?",
  },
];

interface Message {
  role: "user" | "ai";
  content: string;
  id: number;
}

export default function AICopilotSection() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "Bonjour ! Je suis CrossFlow AI. Je peux analyser vos données de trafic, simuler des scénarios et vous recommander des actions optimales en temps réel.", id: 0 },
  ]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [suggIdx, setSuggIdx]     = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const scroll = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => { scroll(); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: text, id: Date.now() }]);
    setInput("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 700));
    const response = CONVERSATIONS[suggIdx % CONVERSATIONS.length].ai;
    setSuggIdx((i) => i + 1);
    setMessages((m) => [...m, { role: "ai", content: response, id: Date.now() + 1 }]);
    setLoading(false);
  };

  const suggestions = CONVERSATIONS.map((c) => c.user);

  return (
    <section id="copilot" className="py-32 relative overflow-hidden">
      {/* Ambient purple bloom */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-purple-600/[0.04] blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          {/* Left: content */}
          <div>
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-500/25 bg-purple-500/5 text-[0.65rem] text-purple-400 uppercase tracking-[0.12em] font-semibold">
                <BrainCircuit className="w-3 h-3" /> IA Copilot
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="font-black tracking-tight mb-5"
              style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)", lineHeight: "1.08", letterSpacing: "-0.03em" }}
            >
              Votre assistant IA
              <br />
              <span className="text-primary">pour chaque décision.</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-text-muted text-lg leading-relaxed mb-9"
            >
              CrossFlow AI comprend vos données, anticipe les perturbations et génère des recommandations actionnables. Posez vos questions en langage naturel.
            </motion.p>

            {/* Suggestion buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col gap-2"
            >
              <p className="text-[0.65rem] text-text-muted uppercase tracking-[0.12em] font-semibold mb-1.5">Questions fréquentes</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="group text-left px-4 py-3 rounded-xl border border-white/[0.06] glass text-sm text-text-muted hover:text-white hover:border-purple-500/25 hover:bg-purple-500/5 transition-all duration-200"
                >
                  <span className="text-primary mr-2 inline-block group-hover:translate-x-0.5 transition-transform duration-200">›</span>
                  {s}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Right: Chat UI */}
          <motion.div
            initial={{ opacity: 0, x: 32 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.65 }}
            className="glass rounded-2xl border border-purple-500/15 overflow-hidden flex flex-col h-[500px] shadow-[0_0_80px_rgba(168,85,247,0.06)]"
          >
            {/* Chat header */}
            <div className="px-5 py-3.5 border-b border-white/[0.05] flex items-center gap-3"
              style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.08) 0%, rgba(0,0,0,0.3) 100%)" }}
            >
              <div className="w-8 h-8 rounded-lg bg-purple-500/12 border border-purple-500/25 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white tracking-tight">CrossFlow AI</div>
                <div className="text-[0.65rem] text-primary flex items-center gap-1.5 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Prototype Démo · Données simulées
                </div>
              </div>
              {/* Traffic lights */}
              <div className="ml-auto flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22 }}
                    className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.role === "ai"
                        ? "bg-purple-500/12 border border-purple-500/25"
                        : "bg-primary/12 border border-primary/25"
                    }`}>
                      {msg.role === "ai"
                        ? <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                        : <User className="w-3.5 h-3.5 text-primary" />
                      }
                    </div>
                    <div className={`max-w-[76%] rounded-2xl px-3.5 py-2.5 text-[0.8rem] leading-relaxed whitespace-pre-line ${
                      msg.role === "ai"
                        ? "bg-white/[0.04] border border-white/[0.06] text-white/90 rounded-tl-sm"
                        : "bg-primary/10 border border-primary/20 text-white rounded-tr-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-purple-500/12 border border-purple-500/25">
                    <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5">
                    {[0,1,2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-text-muted animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-3.5 border-t border-white/[0.05] bg-black/10">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-primary/25 focus-within:shadow-[0_0_0_2px_rgba(34,197,94,0.12)] transition-all duration-200"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Posez une question à CrossFlow AI..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-text-muted outline-none"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-1.5 rounded-lg bg-primary/8 border border-primary/20 text-primary hover:bg-primary/18 hover:border-primary/35 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
