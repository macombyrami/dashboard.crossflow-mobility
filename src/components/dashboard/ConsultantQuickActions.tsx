'use client'
import { Search, Activity, TrendingUp, Zap, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const QUICK_ACTIONS = [
  { id: 'analyze', icon: Search, label: 'Analyser ma zone', prompt: 'Analyse ma zone actuelle. Quels sont les points critiques ?', color: 'text-brand bg-brand/5 border-brand/20' },
  { id: 'congestion', icon: Activity, label: 'Comprendre la pression', prompt: 'Pourquoi la pression est-elle élevée ici ? Quels facteurs dominent ?', color: 'text-orange-400 bg-orange-400/5 border-orange-400/20' },
  { id: 'forecast', icon: TrendingUp, label: 'Anticiper l’évolution', prompt: 'Que va-t-il se passer dans 30 min ? Quelle est la tendance ?', color: 'text-blue-400 bg-blue-400/5 border-blue-400/20' },
  { id: 'optimize', icon: Zap, label: 'Fluidifier la zone', prompt: 'Propose-moi 3 actions pour fluidifier cet axe immédiatement.', color: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' },
  { id: 'incident', icon: AlertTriangle, label: 'Impact d’une fermeture', prompt: 'Simule l’impact de la fermeture de cet axe majeur sur le reste du réseau.', color: 'text-rose-400 bg-rose-400/5 border-rose-400/20' },
]

interface Props {
  onAction: (prompt: string) => void
  disabled?: boolean
}

export function ConsultantQuickActions({ onAction, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          disabled={disabled}
          onClick={() => onAction(action.prompt)}
          className={cn(
            "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border text-[11px] font-bold uppercase tracking-tight transition-all",
            "hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none hover:shadow-glow-sm text-left group",
            action.color
          )}
        >
          <div className="flex items-center gap-3">
             <action.icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
             <span className="leading-tight">{action.label}</span>
          </div>
          <Zap className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      ))}
    </div>
  )
}
