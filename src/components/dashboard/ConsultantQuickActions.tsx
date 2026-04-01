'use client'
import { Search, Activity, TrendingUp, Zap, AlertTriangle, GitBranch } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const QUICK_ACTIONS = [
  { id: 'analyze', icon: Search, label: 'Analyser ma zone', prompt: 'Analyse ma zone actuelle. Quels sont les points critiques ?', color: 'text-brand bg-brand/5 border-brand/20' },
  { id: 'congestion', icon: Activity, label: 'Comprendre la congestion', prompt: 'Pourquoi y a-t-il de la congestion ici ? Est-ce lié aux travaux ou aux événements ?', color: 'text-orange-400 bg-orange-400/5 border-orange-400/20' },
  { id: 'forecast', icon: TrendingUp, label: 'Prévoir le trafic', prompt: 'Que va-t-il se passer dans 30 min ? Quelle est la tendance ?', color: 'text-blue-400 bg-blue-400/5 border-blue-400/20' },
  { id: 'optimize', icon: Zap, label: 'Optimiser la circulation', prompt: 'Propose-moi 3 actions pour fluidifier cet axe immédiatement.', color: 'text-emerald-400 bg-emerald-400/5 border-emerald-400/20' },
  { id: 'incident', icon: AlertTriangle, label: 'Impact incident', prompt: 'Simule l’impact de la fermeture de cet axe majeur sur le reste du réseau.', color: 'text-rose-400 bg-rose-400/5 border-rose-400/20' },
]

interface Props {
  onAction: (prompt: string) => void
  disabled?: boolean
}

export function ConsultantQuickActions({ onAction, disabled }: Props) {
  return (
    <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {QUICK_ACTIONS.map((action) => (
        <button
          key={action.id}
          disabled={disabled}
          onClick={() => onAction(action.prompt)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl border text-[11px] font-bold uppercase tracking-tight transition-all",
            "hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none hover:shadow-glow-sm",
            action.color
          )}
        >
          <action.icon className="w-3.5 h-3.5" />
          {action.label}
        </button>
      ))}
    </div>
  )
}
