'use client'
import { memo, useState } from 'react'
import { Zap, ArrowRight, CheckCircle2, AlertTriangle, Timer, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { runSimulation } from '@/lib/engine/simulation.engine'
import { simulationService } from '@/lib/services/SimulationService'

interface Recommendation {
  id:           string
  type:         'optimization' | 'incident' | 'predictive'
  title:        string
  description:  string
  impact:       string
  timeToFix:    string
  status:       'new' | 'pending' | 'resolved'
}

interface Props {
  recommendation?: Recommendation
  className?:      string
}

/**
 * AI-First Decision Card for Mobile (Stripe/Tesla Style)
 * Focuses on 'Observation -> Action -> Result' logic.
 */
function AIAssistantCardInner({
  recommendation = {
    id: 'rec_01',
    type: 'optimization',
    title: 'Saturation Périphérique Est',
    description: 'Activer la régulation dynamique sur l\'A4 entre Joinville et Bercy.',
    impact: '-12 min / trajet',
    timeToFix: '15 min est.',
    status: 'new'
  },
  className,
}: Props) {
  const { city } = useMapStore()
  const store = useSimulationStore()
  const [isApplying, setIsApplying] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleApply = async () => {
    if (isApplying || isSuccess) return
    setIsApplying(true)
    
    try {
      // 1. Setup scenario in store
      store.setScenarioType('road_closure') // Simplified for now
      store.setScenarioName(`Action IA: ${recommendation.title}`)
      store.setRunning(true)
      store.setProgress(20)

      // 2. Trigger Simulation Logic (Predictive if possible, else local)
      const scenario = store.buildScenario()
      
      // Attempt predictive if ready
      if (store.status === 'ready') {
        try {
          const res = await simulationService.runPredictiveSimulation(
            city,
            city.center,
            'road_closure',
            scenario.name,
            1.2 // High magnitude for AI action
          )
          store.setProgress(60)
        } catch (e) {
          console.warn('AI Action: Predictive backend fallback.')
        }
      }

      // Local engine for visualization
      const result = await runSimulation(city, scenario, (pct) => {
        store.setProgress(Math.round(60 + (pct * 0.4)))
      })

      store.addResult(result)
      store.setCurrentResult(result)
      store.setProgress(100)
      
      setIsSuccess(true)
      setTimeout(() => {
        setIsApplying(false)
        store.setRunning(false)
      }, 1000)
    } catch (err) {
      console.error('AI Action Failed:', err)
      setIsApplying(false)
      store.setRunning(false)
    }
  }
  return (
    <div className={cn(
      "relative p-5 glass-card rounded-[28px] border border-brand/20 shadow-brand-glow animate-slide-up group overflow-hidden",
      className
    )}>
      {/* Background signal glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 blur-3xl -mr-16 -mt-16 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
            <Zap className="w-4 h-4 text-brand animate-pulse" />
          </div>
          <span className="text-[10px] font-black text-brand uppercase tracking-[0.25em]">Assistant Décisionnel IA</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand/10 rounded-full border border-brand/20">
           <div className="w-1.5 h-1.5 rounded-full bg-brand animate-live-dot" />
           <span className="text-[9px] font-bold text-brand uppercase tracking-tighter">Live</span>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div>
          <h3 className="text-lg font-black text-white tracking-tight mb-2 leading-tight">{recommendation.title}</h3>
          <p className="text-[13px] font-medium text-text-secondary leading-relaxed">{recommendation.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Impact Estimé</span>
             <div className="flex items-center gap-1.5 text-brand">
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="text-[14px] font-black font-heading">{recommendation.impact}</span>
             </div>
          </div>
          <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-1">
             <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest">Résolution</span>
             <div className="flex items-center gap-1.5 text-white/70">
                <Timer className="w-3.5 h-3.5" />
                <span className="text-[14px] font-black font-heading">{recommendation.timeToFix}</span>
             </div>
          </div>
        </div>

        <button 
           className={cn(
             "w-full mt-4 py-4 rounded-2xl font-black uppercase text-[12px] tracking-[0.15em] flex items-center justify-center gap-2 transition-all shadow-lg",
             isSuccess ? "bg-brand-green text-black shadow-brand-green/20" : 
             isApplying ? "bg-white/10 text-white/40 cursor-not-allowed" :
             "bg-brand text-black shadow-brand/20 hover:scale-[0.98] active:scale-[0.95]"
           )}
           onClick={handleApply}
           disabled={isApplying || isSuccess}
        >
          {isApplying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Calcul de l'Impact...
            </>
          ) : isSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Solution Appliquée
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Appliquer la Solution
            </>
          )}
        </button>
      </div>

      {/* Decorative tactical noise or lines */}
      <div className="absolute left-0 bottom-0 top-0 w-1 bg-gradient-to-b from-brand/50 to-transparent opacity-50" />
    </div>
  )
}

export const AIAssistantCard = memo(AIAssistantCardInner)
