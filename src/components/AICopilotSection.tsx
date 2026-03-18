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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  const scroll = () => endRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => { scroll(); }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text, id: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));

    const response = CONVERSATIONS[suggestionIndex % CONVERSATIONS.length].ai;
    setSuggestionIndex((i) => i + 1);
    const aiMsg: Message = { role: "ai", content: response, id: Date.now() + 1 };
    setMessages((m) => [...m, aiMsg]);
    setLoading(false);
  };

  const suggestions = CONVERSATIONS.map((c) => c.user);

  return (
    <section id="copilot" className="py-32 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: content */}
          <div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-purple-500/30 text-xs text-purple-400 uppercase tracking-widest font-medium">
                <BrainCircuit className="w-3 h-3" /> IA Copilot
              </span>
            </motion.div>

            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="text-4xl md:text-5xl font-black tracking-tight mb-6">
              Votre assistant IA
              <br />
              <span className="text-primary">pour chaque décision.</span>
            </motion.h2>

            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="text-text-muted text-lg leading-relaxed mb-10">
              CrossFlow AI comprend vos données, anticipe les perturbations et génère des recommandations actionnables. Posez vos questions en langage naturel.
            </motion.p>

            {/* Suggestions */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex flex-col gap-2">
              <p className="text-xs text-text-muted uppercase tracking-widest mb-2">Questions fréquentes</p>
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="text-left px-4 py-3 rounded-xl border border-white/5 glass text-sm text-text-muted hover:text-white hover:border-primary/20 transition-all duration-200 group"
                >
                  <span className="text-primary mr-2 group-hover:mr-3 transition-all">{"›"}</span>
                  {s}
                </button>
              ))}
            </motion.div>
          </div>

          {/* Right: Chat UI */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Chat header */}
            <div className="px-5 py-4 border-b border-white/5 bg-black/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">CrossFlow AI</div>
                <div className="text-xs text-primary flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  Prototype Démo · Données simulées
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.role === "ai" 
                        ? "bg-purple-500/20 border border-purple-500/30" 
                        : "bg-primary/20 border border-primary/30"
                    }`}>
                      {msg.role === "ai" 
                        ? <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                        : <User className="w-3.5 h-3.5 text-primary" />
                      }
                    </div>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "ai"
                        ? "bg-white/5 border border-white/5 text-white rounded-tl-sm"
                        : "bg-primary/15 border border-primary/20 text-white rounded-tr-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-purple-500/20 border border-purple-500/30">
                    <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 text-text-muted animate-spin" />
                  </div>
                </motion.div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5 bg-black/10">
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-primary/30 transition-colors"
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
                  className="p-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
