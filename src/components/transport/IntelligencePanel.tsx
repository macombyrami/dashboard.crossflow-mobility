'use client'

import React from 'react'
import { 
  TrendingUp, TrendingDown, AlertTriangle, Lightbulb, 
  Activity, Zap, BarChart3, Clock, ArrowRight, CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { TransportIntelligenceSnapshot } from '@/lib/engine/TransportIntelligence'
import { cn } from '@/lib/utils/cn'

interface IntelligencePanelProps {
  snapshot: TransportIntelligenceSnapshot
  loading?: boolean
}

export function IntelligencePanel({ snapshot, loading }: IntelligencePanelProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-[140px] rounded-2xl bg-bg-surface/50 border border-bg-border animate-pulse" />
        ))}
      </div>
    )
  }

  const { globalScore, trend, insights, prediction30m, topLines, flopLines, recommendations } = snapshot

  return (
    <div className="space-y-4 mb-8">
      {/* ─── Top Row: Core Metrics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. GLOBAL SCORE */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-green" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Score réseau global</span>
            </div>
            {trend === 'improving' ? <TrendingDown className="w-4 h-4 text-brand-green" /> : <TrendingUp className="w-4 h-4 text-traffic-critical" />}
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-text-primary">{globalScore}</span>
              <span className="text-sm font-bold text-text-muted">/ 100</span>
            </div>
            <p className={cn(
              "text-[11px] font-bold mt-1 uppercase tracking-tighter",
              trend === 'improving' ? "text-brand-green" : "text-traffic-critical"
            )}>
              Tendance : {trend === 'improving' ? 'Amélioration' : trend === 'degrading' ? 'Dégradation' : 'Stable'}
            </p>
          </div>
        </div>

        {/* 2. PREDICTION 30M */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[140px]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Prévision 30 minutes</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black text-text-primary">{prediction30m.loadPct}%</span>
              {prediction30m.trend === 'up' ? <TrendingUp className="w-5 h-5 text-traffic-critical" /> : <TrendingDown className="w-5 h-5 text-brand-green" />}
            </div>
            <p className="text-[11px] font-bold text-text-muted mt-1 uppercase tracking-tighter italic">
              {prediction30m.label}
            </p>
          </div>
        </div>

        {/* 3. SMART ALERTS */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[140px] lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-traffic-critical" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Alertes réseau</span>
          </div>
          <div className="space-y-2">
            {insights.length > 0 ? insights.map((ins, idx) => (
              <div key={idx} className="flex items-start gap-2 bg-white/[0.03] p-2 rounded-lg border border-white/5">
                <AlertCircle className={cn(
                  "w-3.5 h-3.5 mt-0.5 shrink-0",
                  ins.type === 'error' ? "text-traffic-critical" : "text-traffic-warning"
                )} />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-text-primary leading-tight truncate">{ins.message}</p>
                  <p className="text-[9px] text-text-muted font-medium uppercase tracking-tighter mt-0.5">→ {ins.action}</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center gap-2 py-2">
                <CheckCircle2 className="w-4 h-4 text-brand-green" />
                <span className="text-[11px] font-medium text-text-secondary">Aucune anomalie critique détectée</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom Row: Detailed Analysis ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* 4. PERFORMANCE RANKING (TOP/FLOP) */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col min-h-[180px]">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Performance Lignes</span>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="space-y-2">
              <p className="text-[9px] font-black text-traffic-critical uppercase tracking-tighter">🔥 Surcharge</p>
              {flopLines.map(l => (
                <div key={l.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: l.color }}>
                    {l.slug.slice(0, 2)}
                  </div>
                  <span className="text-[11px] font-bold text-text-primary">{l.loadPct}%</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 border-l border-white/5 pl-4">
              <p className="text-[9px] font-black text-brand-green uppercase tracking-tighter">🟢 Fluide</p>
              {topLines.map(l => (
                <div key={l.id} className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: l.color }}>
                    {l.slug.slice(0, 2)}
                  </div>
                  <span className="text-[11px] font-bold text-text-primary">{l.loadPct}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5. GLOBAL INSIGHT (THE 🚨 BOX) */}
        <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col justify-between min-h-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">🚨 Insight Temps Réel</span>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <p className="text-[15px] font-bold text-text-primary leading-tight">
              {prediction30m.trend === 'up' 
                ? "Aggravation progressive des temps d'attente prévue sur les axes structurants Est-Ouest."
                : "La fluidité globale est garantie sur les 20 prochaines minutes malgré 1 point de congestion."}
            </p>
            <p className="text-[11px] text-text-muted mt-2 italic font-medium leading-relaxed">
              Basé sur la corrélation entre les flux {snapshot.prediction30m.loadPct > 60 ? 'Critiques' : 'Optimaux'} et les incidents actifs.
            </p>
          </div>
        </div>

        {/* 6. AI RECOMMENDATIONS */}
        <div className="glass p-5 rounded-2xl border border-white/5 border-l-brand/30 flex flex-col min-h-[180px]">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">💡 Recommandations IA</span>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-baseline gap-2 group">
                <ArrowRight className="w-2.5 h-2.5 text-brand shrink-0 group-hover:translate-x-0.5 transition-transform" />
                <span className="text-[11px] font-bold text-text-secondary leading-normal">{rec}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
            <span className="text-[9px] font-bold text-brand uppercase">Moteur IDFM Predict</span>
            <div className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse shadow-glow" />
          </div>
        </div>
      </div>
    </div>
  )
}
