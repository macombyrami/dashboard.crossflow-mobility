'use client'
import { useSimulationStore } from '@/store/simulationStore'
import { 
  History, GitBranch, Download, Trash2, Star, 
  Search, Filter, ArrowLeft, FileText, Table, 
  ChevronRight, Calendar, Activity, Gauge
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'
import { toast } from 'sonner'
import { useState } from 'react'

export default function SimulationHistoryPage() {
  const results = useSimulationStore(s => s.results)
  const clearResults = useSimulationStore(s => s.clearResults)
  const [search, setSearch] = useState('')

  const filteredResults = results.filter(r => 
    r.scenarioName.toLowerCase().includes(search.toLowerCase())
  )

  const handleClearHistory = () => {
    if (confirm('Êtes-vous sûr de vouloir effacer tout l\'historique ?')) {
      clearResults()
      toast.success('Historique effacé')
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E] text-white">
      {/* Header Area */}
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-[#111218]/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link 
            href="/simulation"
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight uppercase italic flex items-center gap-2">
              <History className="w-5 h-5 text-brand" />
              Historique des Simulations
            </h1>
            <p className="text-xs text-text-muted mt-0.5 uppercase tracking-widest opacity-60">
              Gérez et analysez vos scénarios passés
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted group-focus-within:text-brand transition-colors" />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-xl text-sm focus:outline-none focus:border-brand/40 focus:bg-white/10 transition-all w-48 lg:w-64"
            />
          </div>
          <button 
            onClick={handleClearHistory}
            className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 transition-all"
            title="Effacer l'historique"
          >
            <Trash2 className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full">
        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map((result) => (
              <SimulationCard key={result.id} result={result} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <History className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-widest italic">Aucun résultat trouvé</h3>
            <p className="text-sm mt-2 max-w-xs mx-auto">
              {search ? "Ajustez vos filtres de recherche" : "Lancez votre première simulation pour voir l'historique apparaître ici"}
            </p>
            <Link 
              href="/simulation"
              className="mt-8 px-6 py-3 bg-brand text-black font-black uppercase tracking-widest text-xs rounded-xl hover:shadow-glow transition-all"
            >
              Nouvelle Simulation
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function SimulationCard({ result }: { result: any }) {
  const { before, after, delta } = result
  
  return (
    <div className="group bg-[#141519] border border-white/5 rounded-2xl p-5 hover:border-brand/30 transition-all hover:translate-y-[-2px] shadow-lg flex flex-col h-full">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-[10px] font-black text-brand uppercase tracking-widest">Complété</span>
          </div>
          <h3 className="text-sm font-bold text-white truncate uppercase italic">{result.scenarioName}</h3>
          <p className="text-[10px] text-text-muted flex items-center gap-1.5 mt-1">
            <Calendar className="w-3 h-3" />
            {result.completedAt ? format(new Date(result.completedAt), 'Pp', { locale: fr }) : 'Date inconnue'}
          </p>
        </div>
        <button className="p-2 rounded-lg hover:bg-white/5 text-text-muted hover:text-yellow-400 transition-all">
          <Star className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-2 gap-3 mb-5">
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
           <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
              <Gauge className="w-3 h-3" />
              Congestion
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-white">{Math.round(after.congestionRate * 100)}%</span>
              <span className={cn(
                "text-[9px] font-bold",
                delta.congestionPct > 0 ? "text-rose-500" : "text-brand"
              )}>
                {delta.congestionPct > 0 ? '+' : ''}{delta.congestionPct}%
              </span>
           </div>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
           <div className="flex items-center gap-1.5 text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">
              <Activity className="w-3 h-3" />
              Pollution
           </div>
           <div className="flex items-baseline gap-2">
              <span className="text-lg font-black text-white">{after.pollutionIndex.toFixed(1)}</span>
              <span className={cn(
                "text-[9px] font-bold",
                delta.pollutionPct > 0 ? "text-rose-500" : "text-brand"
              )}>
                {delta.pollutionPct > 0 ? '+' : ''}{delta.pollutionPct}%
              </span>
           </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-auto">
        <button 
          onClick={() => toast.info('Export en préparation...')}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <FileText className="w-3.5 h-3.5 text-brand" />
          Rapport PDF
        </button>
        <button 
          onClick={() => toast.info('Export CSV démarré')}
          className="flex-1 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
        >
          <Table className="w-3.5 h-3.5 text-brand" />
          Données CSV
        </button>
      </div>
    </div>
  )
}
