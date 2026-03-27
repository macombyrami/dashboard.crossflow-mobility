'use client'
import { useState, useMemo } from 'react'
import { Lightbulb, Info, AlertTriangle, ArrowRight, Zap, Target, Leaf } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

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
  
  const [activeTab, setActiveTab] = useState<'explain' | 'recommend'>('explain')

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
            {/* Root Cause Card */}
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 blur-2xl" />
               <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                 <Zap className="w-3.5 h-3.5 text-brand" />
                 Analyse de Cause Racine
               </h3>
               <p className="text-xs text-text-secondary leading-relaxed">
                 La hausse de congestion indexée à <span className="text-brand font-bold">{Math.round((kpis?.congestionRate ?? 0) * 100)}%</span> est principalement due à la corrélation entre les <span className="font-bold underline decoration-brand/30">travaux sur l'A1</span> et un incident signalé à <span className="italic">Saint-Denis</span>.
               </p>
               <div className="mt-4 pt-4 border-t border-bg-border grid grid-cols-2 gap-3">
                 <div className="bg-bg-elevated/50 rounded-xl p-2 border border-bg-border">
                   <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Impact Météo</p>
                   <p className="text-xs font-bold text-text-primary">Négligeable (Sec)</p>
                 </div>
                 <div className="bg-bg-elevated/50 rounded-xl p-2 border border-bg-border">
                   <p className="text-[9px] font-bold text-text-muted uppercase mb-1">Propagande</p>
                   <p className="text-xs font-bold text-orange-400">Flux Nord-Est</p>
                 </div>
               </div>
            </div>

            {/* Insight Alerts */}
            {incidents.filter(i => i.severity === 'critical' || i.severity === 'major').map(inc => (
              <div key={inc.id} className="flex gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <p className="text-[11px] text-text-secondary leading-snug">
                  <span className="font-bold text-red-500 uppercase">{inc.severity}:</span> {inc.title}. Propagation estimée à +500m/min.
                </p>
              </div>
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
             
             <div className="p-4 rounded-2xl border-2 border-dashed border-bg-border flex flex-col items-center justify-center text-center py-8">
                <div className="w-10 h-10 rounded-full bg-brand-green/5 flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-brand-green/40" />
                </div>
                <p className="text-xs text-text-muted max-w-[180px]">
                  En attente de nouveaux flux pour générer des recommandations supplémentaires.
                </p>
             </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-4 border-t border-bg-border bg-bg-surface/50">
        <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:grayscale-0 transition-all">
           <Zap className="w-3 h-3" />
           <span className="text-[9px] font-black uppercase tracking-widest">CrossFlow Intelligent OS</span>
        </div>
      </div>
    </div>
  )
}
