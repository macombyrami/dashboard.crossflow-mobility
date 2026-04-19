'use client'
import { useMemo } from 'react'
import { Bot, Sparkles, ShieldCheck, Database, Globe, ArrowUpRight } from 'lucide-react'
import { ConsultantChat } from '@/components/dashboard/ConsultantChat'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { cn } from '@/lib/utils/cn'

export default function ConsultantAIPage() {
  const city      = useMapStore(s => s.city)
  const snapshot  = useTrafficStore(s => s.snapshot)
  const incidents = useTrafficStore(s => s.incidents)
  const weather   = useTrafficStore(s => s.openMeteoWeather)
  const kpis      = useTrafficStore(s => s.kpis)

  // Aggregate real-time context for the AI Advisor
  const memoizedContext = useMemo(() => {
    return {
      city:           city.name,
      traffic:        kpis?.congestionRate && kpis.congestionRate > 0.4 ? 'high' : 'moderate',
      congestionRate: kpis?.congestionRate || 0,
      weather:        weather ? `${weather.temp}°C, ${weather.weatherLabel}` : 'Non disponible',
      incidents:      incidents.slice(0, 5).map(inc => inc.title),
      events:         ['Marathon de Paris 2026 (Passé)', 'PSG vs Rennes (Match de ce soir)'], // Static fallback for demo or fetch from engine
      social:         ['Signaux de ralentissement sur le Périphérique', 'Plusieurs tweets mentionnent des perturbations sur la Ligne 13'],
      transportLoad:  'Élevée (Heure de pointe)'
    }
  }, [city, kpis, weather, incidents])

  return (
    <main className="min-h-full p-4 sm:p-6 lg:p-8 flex flex-col gap-6 lg:gap-8 animate-in fade-in duration-1000 pb-safe">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
      <div className="space-y-4">
        <div className="flex items-start sm:items-center gap-4">
           <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand to-brand-green flex items-center justify-center shadow-glow-sm shrink-0 rotation-animation">
             <Bot className="w-7 h-7 text-black" />
           </div>
           <div>
             <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex flex-wrap items-center gap-3">
               Consultant IA
               <div className="px-2 py-0.5 rounded-md bg-brand/10 border border-brand/20 text-brand text-[10px] font-bold uppercase tracking-widest">
                  Expert Beta
               </div>
             </h1>
             <p className="text-sm text-text-secondary mt-1.5 font-medium leading-relaxed max-w-2xl">
               Votre copilote intelligent pour comprendre et optimiser la mobilité urbaine à <span className="text-white font-bold">{city.name}</span>.
             </p>
           </div>
        </div>
      </div>

      {/* Live Intelligence Badges */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
         <StatusBadge 
           icon={<ShieldCheck className="w-3.5 h-3.5" />} 
           label="Mode Décisionnel" 
           color="text-emerald-400 bg-emerald-400/5 border-emerald-400/10" 
         />
         <StatusBadge 
           icon={<Database className="w-3.5 h-3.5" />} 
           label="Live Data" 
           color="text-brand bg-brand/5 border-brand/10" 
         />
         <StatusBadge 
           icon={<Globe className="w-3.5 h-3.5" />} 
           label="Multi-Sources" 
           color="text-blue-400 bg-blue-400/5 border-blue-400/10" 
         />
      </div>
    </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 flex-1">
        
        {/* Chat Area (Left/Center) */}
        <div className="xl:col-span-3 h-full flex flex-col">
           <ConsultantChat initialContext={memoizedContext} />
        </div>

        {/* Sidebar Insights (Right) */}
        <div className="hidden xl:flex flex-col gap-6">
           <div className="glass-card p-6 rounded-[24px] border border-white/5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-brand" />
                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Contextual Feed</h3>
              </div>
              <FeedItem label="Zone Active" value={city.name} />
              <FeedItem label="Indice de Vérité" value="94.2%" color="text-brand" />
              <FeedItem label="Alertes Sociale" value={memoizedContext.social.length.toString()} />
              
              <div className="pt-4 border-t border-white/5 mt-4">
                <p className="text-[12px] text-text-muted leading-relaxed">
                  L'intelligence artificielle analyse actuellement <strong>1,240 points de données</strong> par seconde pour générer vos diagnostics.
                </p>
              </div>
           </div>

           <div className="p-1 rounded-[24px] bg-gradient-to-br from-brand/20 to-transparent">
             <div className="glass-card p-6 rounded-[23px] bg-[#0A0B0E]/90">
                <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em] mb-4">Fonctionnalité Premium</h3>
                <p className="text-[13px] text-white/90 leading-snug font-medium mb-6">
                  Besoin d'un rapport détaillé pour une commission de transport ?
                </p>
                <button className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[12px] font-bold text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  Générer Rapport Décisionnel
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
             </div>
           </div>
        </div>
      </div>
    </main>
  )
}

function StatusBadge({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <div className={cn("flex items-center gap-2 px-3 h-8 rounded-lg border font-bold text-[10px] uppercase tracking-wider shrink-0 transition-all", color)}>
      {icon}
      <span>{label}</span>
    </div>
  )
}

function FeedItem({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="flex justify-between items-center group">
      <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest group-hover:text-text-secondary transition-colors">{label}</span>
      <span className={cn("text-[13px] font-bold tabular-nums", color)}>{value}</span>
    </div>
  )
}
