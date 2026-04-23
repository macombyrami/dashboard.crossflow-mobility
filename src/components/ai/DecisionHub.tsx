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

  // 🛰️ Staff Engineer: Dynamic Recommendation Engine (Heuristic)
  const getDynamicRecommendations = (): Recommendation[] => {
    const list: Recommendation[] = []
    const highCongestion = (kpis?.congestionRate || 0) > 0.40

    // Rule 1: High Congestion across city
    if (highCongestion) {
      list.push({
        id: 'rec-dyn-1',
        title: 'Action multimodale immédiate',
        impact: 'HAUTE',
        type: 'transport',
        action: 'Renforcer les capacités sur les axes saturés et diffuser une consigne claire aux équipes.',
        benefit: [
          { label: 'Congestion', val: '-15%', icon: Target },
          { label: 'CO2', val: '-8%', icon: Leaf }
        ]
      })
    }

    // Rule 2: Based on specific incidents
    incidents.filter(i => i.severity === 'critical' || i.severity === 'high').forEach((inc, idx) => {
      list.push({
        id: `rec-ext-${inc.id}`,
        title: `Intervention prioritaire : ${inc.title}`,
        impact: 'CRITIQUE',
        type: 'emergency',
        action: `Déployer une équipe sur ${inc.address} et orienter le flux vers les axes de délestage.`,
        benefit: [
          { label: 'Sécurité', val: 'MAX', icon: ShieldAlert },
          { label: 'Temps', val: '-10m', icon: Zap }
        ]
      })
    })

    // Fallback if no issues
    if (list.length === 0) {
      list.push({
        id: 'rec-idle',
        title: 'Maintien préventif',
        impact: 'Basse',
        type: 'traffic',
        action: 'Aucune anomalie critique. Contrôle de stabilité en cours.',
        benefit: [{ label: 'Stabilité', val: '100%', icon: Target }]
      })
    }

    return list.slice(0, 3)
  }

  const recommendations = getDynamicRecommendations()

  // 🧠 Root Cause Analysis logic
  const getRootCause = () => {
    const critical = incidents.filter(i => i.severity === 'critical')
    if (critical.length > 0) {
      return `La saturation actuelle est directement corrélée à **${critical[0].title}** à ${critical[0].address}.`
    }
    if ((kpis?.congestionRate || 0) > 0.35) {
      return "Hausse structurelle du trafic liée à l'heure de pointe ou à la convergence des flux sur les axes principaux."
    }
    return "Trafic fluide. Les légères variations sont liées aux cycles de feux standards."
  }

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
          COMPRENDRE
        </button>
        <button
          onClick={() => setActiveTab('recommend')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 text-[11px] font-bold rounded-lg transition-all",
            activeTab === 'recommend' ? "bg-bg-surface text-brand-green shadow-sm" : "text-text-muted hover:text-text-primary"
          )}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          DÉCIDER
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
              context="Lecture consolidée"
              badge={ (kpis?.congestionRate || 0) > 0.4 ? "⚠️ CRITIQUE" : "✅ STABLE"}
              variant={(kpis?.congestionRate || 0) > 0.4 ? "danger" : "success"}
              className="w-full"
            />

            {/* Root Cause Analysis */}
            <div className="bg-bg-surface border border-bg-border rounded-2xl p-4 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-brand" />
               <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center gap-2">
                 <ShieldAlert className="w-3.5 h-3.5 text-brand" />
                 Cause racine
               </h3>
               <p className="text-xs text-text-secondary leading-relaxed" dangerouslySetInnerHTML={{ __html: getRootCause().replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </div>

            {/* Insight Alerts mapping to DataCards */}
            {incidents.filter(i => i.severity === 'critical' || i.severity === 'high').slice(0, 2).map(inc => (
              <DataCard
                key={inc.id}
                icon={AlertTriangle}
                value="🚨"
                metric={inc.title}
                context={`Niveau ${inc.severity}`}
                badge="ACTIF"
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
                      rec.impact === 'HAUTE' || rec.impact === 'CRITIQUE' ? "text-brand-green border-brand-green/30 bg-brand-green/5" : "text-orange-400 border-orange-400/30 bg-orange-400/5"
                    )}>
                      {rec.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary mb-4 leading-relaxed line-clamp-3">
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
           <span className="text-[9px] font-black uppercase tracking-widest">CrossFlow Intelligence</span>
        </div>
      </div>
    </div>
  )
}
