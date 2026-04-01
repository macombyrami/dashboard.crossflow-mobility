'use client'
import React from 'react'
import { Zap, Info, Lightbulb, ShieldAlert, AlertTriangle, Target, Leaf, ArrowRight, Sparkles } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'
import { DataCard } from '@/components/ui/DataCard'

interface Recommendation {
  id:      string
  title:   string
  impact:  string
  type:    'traffic' | 'transport' | 'emergency'
  action:  string
  benefit: { label: string; val: string; icon: any }[]
}

export function DecisionHub() {
  const kpis      = useTrafficStore(s => s.kpis)
  const incidents = useTrafficStore(s => s.incidents)
  
  const [activeTab, setActiveTab] = React.useState<'explain' | 'recommend'>('explain')

  const recommendations: Recommendation[] = [
    {
      id:      'rec-1',
      title:   'Optimisation des feux — Bvd périphérique',
      impact:  'HAUTE',
      type:    'traffic',
      action:  'Synchroniser les cycles de feux sur l\'entrée A1.',
      benefit: [
        { label: 'Congestion', val: '-12%', icon: Target },
        { label: 'Émissions',  val: '-5%',  icon: Leaf }
      ]
    },
    {
      id:      'rec-2',
      title:   'Renforcement Ligne 13',
      impact:  'MODÉRÉE',
      type:    'transport',
      action:  'Augmenter la fréquence des rames (+2/h) suite à l\'incident A86.',
      benefit: [
        { label: 'Report modal', val: '+8%', icon: Zap }
      ]
    }
  ]

  return (
    <div className="flex flex-col h-full bg-bg-base/30">
      
      {/* Tabs */}
      <div className="flex p-1 bg-bg-elevated/50 border-b border-bg-border">
        <button
          onClick={() => setActiveTab('explain')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold rounded-lg transition-all",
            activeTab === 'explain' ? "bg-bg-surface text-brand shadow-sm" : "text-text-muted hover:text-text-primary"
          )}
        >
          <Info className="w-3.5 h-3.5" />
          EXPLAIN
        </button>
        <button
          onClick={() => setActiveTab('recommend')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold rounded-lg transition-all",
            activeTab === 'recommend' ? "bg-bg-surface text-brand-green shadow-sm" : "text-text-muted hover:text-text-primary"
          )}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          RECOMMEND
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'explain' ? (
          <div className="space-y-4">
            
            {/* Standardized Core Metric */}
            <DataCard
              icon={Zap}
              value={`${Math.round((kpis?.congestionRate ?? 0) * 100)}%`}
              metric="ANALYSE CONGESTION"
              context="Source TomTom"
              badge="⚠️ MODÉRÉ"
              variant="warning"
              className="w-full"
            />

            {/* Root Cause Analysis */}
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
               <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                 <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                 Cause Racine
               </h3>
               <p className="text-xs text-text-secondary leading-relaxed">
                 La hausse est principalement due à la corrélation entre les <span className="font-bold underline decoration-brand/30">travaux sur l'A1</span> et un incident signalé à <span className="italic">Saint-Denis</span>.
               </p>
            </div>

            {/* Insight Alerts mapping to DataCards */}
            {incidents.filter(i => i.severity === 'critical' || (i as any).severity === 'major' || (i as any).severity === 'high').slice(0, 2).map(inc => (
              <DataCard
                key={inc.id}
                icon={AlertTriangle}
                value="🚨"
                metric={inc.title}
                context={`${inc.severity} Severity`}
                badge="CRITIQUE"
                variant="danger"
                className="w-full shadow-glow-red/5"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
             {recommendations.map(rec => (
                <div key={rec.id} className="group bg-bg-surface border border-bg-border rounded-2xl p-4 hover:border-brand-green/30 transition-all shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="text-xs font-bold text-text-primary group-hover:text-brand-green transition-colors">{rec.title}</h4>
                    <span className={cn(
                      "text-[8px] font-black px-1.5 py-0.5 rounded border",
                      rec.impact === 'HAUTE' ? "text-brand-green border-brand-green/30 bg-brand-green/5" : "text-orange-400 border-orange-400/30 bg-orange-400/5"
                    )}>
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mb-4 leading-relaxed line-clamp-2">
                    {rec.action}
                  </p>
                  <div className="flex items-center gap-4 border-t border-bg-border pt-3">
                    {rec.benefit.map((b, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <b.icon className="w-3 h-3 text-text-muted" />
                        <span className="text-[10px] text-text-muted">{b.label}</span>
                        <span className="text-xs font-black text-text-primary">{b.val}</span>
                      </div>
                    ))}
                    <button className="ml-auto w-7 h-7 bg-brand-green/10 text-brand-green rounded-lg flex items-center justify-center hover:bg-brand-green hover:text-white transition-all">
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
             ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-bg-border bg-bg-surface/50">
        <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
           <Zap className="w-3 h-3" />
           <span className="text-[9px] font-black uppercase tracking-widest">CrossFlow Intelligent OS</span>
        </div>
      </div>
    </div>
  )
}
