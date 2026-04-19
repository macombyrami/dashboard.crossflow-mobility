'use client'
import { memo } from 'react'
import { MapPin, Activity, Zap, CheckCircle2, AlertTriangle, Info, Clock, BarChart3, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export const ConsultantMessage = memo(({ role, content, timestamp = new Date() }: MessageProps) => {
  if (role === 'user') {
    return (
      <div className="flex flex-col items-end gap-2 mb-8 animate-in slide-in-from-right-4 fade-in duration-500">
        <div className="max-w-[85%] px-5 py-3.5 rounded-[22px] bg-brand text-black font-semibold text-[14px] shadow-glow-sm">
          {content}
        </div>
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mr-2 opacity-50">
          Vous · {timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    )
  }

  // Parses the structured consultant response
  const lines = content.split('\n')
  const zone = lines.find(l => l.includes('📍 Zone :'))?.split('📍 Zone :')[1]?.trim()
  const confidence = lines.find(l => l.includes('🧠 Niveau de confiance :'))?.split('🧠 Niveau de confiance :')[1]?.trim()
  
  const isHighConf   = confidence?.toLowerCase().includes('élevé')
  const isMediumConf = confidence?.toLowerCase().includes('moyen')

  return (
    <div className="flex flex-col gap-4 mb-10 animate-in slide-in-from-left-4 fade-in duration-700">
      <div className="max-w-[95%] glass-card border border-white/5 bg-[#0A0B0E]/80 backdrop-blur-xl rounded-[28px] overflow-hidden shadow-apple transition-all hover:border-white/10">
        
        {/* Header: Identity & Status */}
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/30 flex items-center justify-center">
               <Zap className="w-4 h-4 text-brand" />
             </div>
             <div>
               <div className="text-[12px] font-bold text-white tracking-tight uppercase">CrossFlow AI Consultant</div>
               <div className="text-[9px] font-bold text-text-muted uppercase tracking-widest leading-none mt-0.5">Mobility Insight Engine</div>
             </div>
           </div>
           
           {/* Confidence Badge */}
           {confidence && (
             <div className={cn(
               "px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5",
               isHighConf ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400" :
               isMediumConf ? "bg-amber-400/10 border-amber-400/20 text-amber-400" :
                             "bg-rose-400/10 border-rose-400/20 text-rose-400"
             )}>
               <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isHighConf ? "bg-emerald-400" : isMediumConf ? "bg-amber-400" : "bg-rose-400")} />
               Confiance {confidence.split(' ')[0]}
             </div>
           )}
        </div>

        {/* Content Area */}
        <div className="p-6 space-y-6">
           {/* Zone Info */}
           {zone && (
             <div className="flex items-center gap-2 text-brand font-bold text-[13px] tracking-tight mb-2">
               <MapPin className="w-4 h-4" />
               <span className="uppercase tracking-widest">{zone}</span>
             </div>
           )}

           <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-text-secondary prose-strong:text-white">
             {/* We manually map the markdown structure to styled components for that Palantir Look */}
             {content.split('\n\n').map((block, i) => {
                if (block.includes('🚦 Situation')) {
                  return (
                    <div key={i} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2 text-white font-bold text-[11px] uppercase tracking-widest">
                        <Activity className="w-3.5 h-3.5 text-brand" /> Situation Actuelle
                      </div>
                      <div className="text-[13px] text-text-secondary leading-relaxed">{block.replace('🚦 Situation actuelle :', '').trim()}</div>
                    </div>
                  )
                }
                if (block.includes('⚡ Recommandations')) {
                  return (
                    <div key={i} className="mb-4">
                      <div className="flex items-center gap-2 mb-3 text-white font-bold text-[11px] uppercase tracking-widest">
                        <Zap className="w-3.5 h-3.5 text-brand" /> Recommandations Opérationnelles
                      </div>
                      <div className="space-y-2">
                         {block.replace('⚡ Recommandations :', '').split('\n').filter(l => l.trim()).map((rec, ri) => (
                           <div key={ri} className="flex items-start gap-3 p-3 rounded-xl bg-brand/5 border border-brand/10 transition-colors hover:border-brand/20">
                             <CheckCircle2 className="w-4 h-4 text-brand shrink-0 mt-0.5" />
                             <span className="text-[13px] text-white/90 leading-snug">{rec.replace('-', '').trim()}</span>
                           </div>
                         ))}
                      </div>
                    </div>
                  )
                }
                if (block.includes('🔍 Analyse')) {
                  return (
                    <div key={i} className="mb-4">
                       <div className="flex items-center gap-2 mb-2 text-white font-bold text-[11px] uppercase tracking-widest">
                         <BarChart3 className="w-3.5 h-3.5 text-text-muted" /> Analyse des Données
                       </div>
                       <p className="text-[13px] text-text-secondary leading-relaxed border-l-2 border-brand/30 pl-4 py-1 italic">
                         {block.replace('🔍 Analyse :', '').trim()}
                       </p>
                    </div>
                  )
                }
                // Default block rendering
                return <div key={i} className="text-[14px] text-text-muted mb-4">{block}</div>
             })}
           </div>
        </div>
        
        {/* Footer: Timeline & Source Badges */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-2">
           <SourceTag icon={<TrendingUp className="w-3 h-3" />} label="Trafic Live" active />
           <SourceTag icon={<Info className="w-3 h-3" />} label="Events" active />
           <SourceTag icon={<Activity className="w-3 h-3" />} label="Social NLP" active />
           <div className="ml-auto text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-2">
             <Clock className="w-3 h-3" /> {timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
           </div>
        </div>
      </div>
    </div>
  )
})

function SourceTag({ icon, label, active }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider transition-colors",
      active ? "bg-white/10 border-white/20 text-white" : "bg-white/5 border-white/10 text-text-muted opacity-40"
    )}>
      {icon}
      {label}
    </div>
  )
}
