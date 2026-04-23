'use client'
import React, { useState } from 'react'
import { Activity, ShieldCheck, Zap, ArrowRight, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

/**
 * 🛰️ MobileInsightDrawer (Decision Center)
 * 
 * Optimized for thumb-reachability and rapid urban decision-making.
 * 10-minute cache on Sytadin proxy.
 */
export function MobileInsightDrawer({ className }: { className?: string }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={cn(
      "fixed bottom-[72px] inset-x-4 z-[100] transition-all duration-700",
      isExpanded ? "bottom-[120px]" : "bottom-[72px]",
      className
    )}>
      <div className={cn(
        "flex flex-col bg-black/90 backdrop-blur-3xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl",
        "transition-all duration-700 ease-in-out",
        isExpanded ? "h-[320px]" : "h-auto"
      )}>
        {/* Gestural Handle & Quick Summary */}
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-4 flex items-center justify-between group active:bg-white/[0.04]"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-status-critical/10 border border-status-critical/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-status-critical fill-status-critical/20 animate-pulse" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-status-critical">Congestion Critique</span>
              <span className="text-[13px] font-bold text-white tracking-tight">Secteur Sud-Est (+14 min)</span>
            </div>
          </div>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.03]">
            {isExpanded ? <ChevronDown className="w-4 h-4 text-white/40" /> : <ChevronUp className="w-4 h-4 text-white/40 animate-bounce" />}
          </div>
        </button>

        {/* Action Detail (Expanded State) */}
        {isExpanded && (
          <div className="flex-1 p-4 pt-0 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* AI Recommendation Slot */}
            <div className="p-4 rounded-2xl bg-brand/5 border border-brand/20">
               <div className="flex items-center gap-2 mb-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-brand" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Action IA Prédictive</span>
               </div>
               <p className="text-[14px] font-medium text-white/90 leading-tight">
                 Rediriger le flux via A86 <ArrowRight className="inline w-3 h-3 mx-1" /> Ouverture de la voie d'urgence B3.
               </p>
               <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/40 border border-white/5">
                    <TrendingDown className="w-3 h-3 text-brand" />
                    <span className="text-[11px] font-black font-mono text-brand">-22%</span>
                  </div>
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Impact Estimé</span>
               </div>
            </div>

            {/* Quick Actions GRID */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <button className="h-14 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[11px] shadow-glow flex items-center justify-center transition-transform active:scale-95">
                Appliquer
              </button>
              <button className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[11px] flex items-center justify-center transition-transform active:scale-95">
                Simulation
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Decision Context Bar (The 'Why') */}
      <div className="mt-3 flex items-center justify-center gap-2">
         <div className="w-1 h-1 rounded-full bg-white/10" />
         <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Decision Intelligence Engine v4.0</span>
         <div className="w-1 h-1 rounded-full bg-white/10" />
      </div>
    </div>
  )
}
