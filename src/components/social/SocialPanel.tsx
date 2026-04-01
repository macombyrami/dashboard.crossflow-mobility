'use client'
import { useState, useMemo, useEffect } from 'react'
import { 
  Users, 
  Clock, 
  Filter, 
  AlertTriangle, 
  Activity, 
  Play, 
  MapPin, 
  RefreshCw,
  Search,
  CheckCircle2,
  Share2
} from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { useSocialStore } from '@/store/socialStore'
import { seedSimulationFromSocial, type SocialEvent } from '@/lib/api/social'
import { cn } from '@/lib/utils/cn'

export default function SocialPanel() {
  const city = useMapStore(s => s.city)
  const timeline = useSocialStore(s => s.events)
  const loading = useSocialStore(s => s.loading)
  const timeRange = useSocialStore(s => s.timeRange)
  const setTimeRange = useSocialStore(s => s.setTimeRange)
  const fetchTimeline = useSocialStore(s => s.fetchTimeline)

  const [filterSeverity, setFilterSeverity] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'feed' | 'analytics'>('feed')

  useEffect(() => {
    fetchTimeline(city.id)
  }, [city.id])

  // Filtered Events
  const filteredEvents = useMemo(() => {
    if (!timeline) return []
    return timeline.filter((e: SocialEvent) => {
      if (filterSeverity.length > 0 && !filterSeverity.includes(e.severity)) return false
      // Scrubber filter
      const diffMin = (new Date().getTime() - new Date(e.captured_at).getTime()) / 60000
      if (diffMin > timeRange) return false
      return true
    })
  }, [timeline, filterSeverity, timeRange])

  return (
    <div className="flex flex-col h-full bg-[#0A0B0E]/95 border-l border-white/5 animate-in slide-in-from-right duration-500">
      
      {/* Header */}
      <div className="p-6 border-b border-white/5 space-y-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
               <Users className="w-5 h-5 text-blue-400" />
             </div>
             <h2 className="text-sm font-bold text-white uppercase tracking-widest">Social Engine Live</h2>
           </div>
           <button onClick={() => fetchTimeline(city.id)} className="hover:rotate-180 transition-transform duration-500">
             <RefreshCw className={cn("w-4 h-4 text-text-muted", loading && "animate-spin")} />
           </button>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-white/5 p-1 rounded-xl">
           <TabButton active={activeTab === 'feed'} onClick={() => setActiveTab('feed')} label="Timeline" />
           <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} label="Corrélation" />
        </div>
      </div>

      {activeTab === 'feed' ? (
        <>
          {/* 24h Scrubber */}
          <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Scrubber Historique (24h)
              </span>
              <span className="text-[11px] font-bold text-brand tabular-nums">
                {timeRange < 60 ? `-${timeRange} min` : `-${Math.round(timeRange/60)}h`}
              </span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="1440" 
              step="10"
              value={timeRange} 
              onChange={(e) => setTimeRange(parseInt(e.target.value))}
              className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-brand"
            />
          </div>

          {/* Quick Filters */}
          <div className="p-4 flex gap-2 overflow-x-auto scrollbar-none border-b border-white/5">
             <SeverityFilter label="Critical" active={filterSeverity.includes('critical')} color="bg-red-500" onClick={() => setFilterSeverity(s => s.includes('critical') ? s.filter(x => x!=='critical') : [...s, 'critical'])} />
             <SeverityFilter label="High" active={filterSeverity.includes('high')} color="bg-orange-500" onClick={() => setFilterSeverity(s => s.includes('high') ? s.filter(x => x!=='high') : [...s, 'high'])} />
             <SeverityFilter label="Medium" active={filterSeverity.includes('medium')} color="bg-yellow-500" onClick={() => setFilterSeverity(s => s.includes('medium') ? s.filter(x => x!=='medium') : [...s, 'medium'])} />
          </div>

          {/* Feed List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center opacity-50 space-y-2">
                <Search className="w-8 h-8 mx-auto text-text-muted" />
                <p className="text-xs">Aucun signal détecté sur cette période.</p>
              </div>
            ) : (
              filteredEvents.map((e: SocialEvent) => (
                <SocialCard key={e.id} event={e} onReplay={() => seedSimulationFromSocial(city.id, e.id)} />
              ))
            )}
          </div>
        </>
      ) : (
        /* Analytics View (Simplified) */
        <div className="p-6 space-y-6">
           <div className="glass-card p-4 space-y-2">
              <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Indice de Corrélation</h3>
              <div className="flex items-end gap-3">
                 <span className="text-3xl font-bold text-white tabular-nums">0.82</span>
                 <span className="text-brand text-xs font-bold mb-1 flex items-center gap-1">
                   <Activity className="w-3 h-3" /> Forte
                 </span>
              </div>
              <p className="text-[12px] text-text-muted leading-snug pt-2">
                Le volume social anticipe de <strong>12 minutes</strong> les pics de congestion sur les axes structurants.
              </p>
           </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all",
        active ? "bg-white/10 text-white shadow-lg" : "text-text-muted hover:text-white"
      )}
    >
      {label}
    </button>
  )
}

function SeverityFilter({ label, active, color, onClick }: { label: string, active: boolean, color: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full border border-white/5 whitespace-nowrap transition-all",
        active ? "bg-white/10 border-white/20 scale-105" : "opacity-40 hover:opacity-100"
      )}
    >
      <div className={cn("w-1.5 h-1.5 rounded-full", color)} />
      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{label}</span>
    </button>
  )
}

function SocialCard({ event, onReplay }: { event: SocialEvent, onReplay: () => void }) {
  const [replayed, setReplayed] = useState(false)

  const handleReplay = async () => {
    setReplayed(true)
    onReplay()
    setTimeout(() => setReplayed(false), 5000)
  }

  return (
    <div className="glass-card rounded-[20px] p-4 border border-white/5 hover:border-white/10 transition-all group overflow-hidden relative">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
           <span className={cn(
             "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest",
             event.severity === 'critical' ? 'bg-red-500/10 text-red-500' : 
             event.severity === 'high' ? 'bg-orange-500/10 text-orange-500' : 'bg-brand/10 text-brand'
           )}>
             {event.severity}
           </span>
           <span className="text-[10px] text-text-muted font-medium tabular-nums flex items-center gap-1">
             <Clock className="w-3 h-3" />
             {new Date(event.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
           </span>
        </div>
        <Share2 className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity" />
      </div>

      <p className="text-[13px] text-white/90 leading-relaxed font-medium mb-4">
        {event.text}
      </p>

      {/* Action Bar */}
      <div className="flex items-center justify-between pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-muted">
           <MapPin className="w-3 h-3" />
           {event.entities?.area || 'Zone Urbaine'}
        </div>
        
        <button 
          onClick={handleReplay}
          className={cn(
            "px-3 py-1.5 rounded-xl border border-white/5 flex items-center gap-2 transition-all",
            replayed ? "bg-brand text-black border-brand" : "bg-white/5 text-white hover:bg-white/10"
          )}
        >
          {replayed ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="text-[10px] font-extrabold uppercase">Injecté</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span className="text-[10px] font-extrabold uppercase">Rejouer</span>
            </>
          )}
        </button>
      </div>

      {/* Decorative pulse for high severity */}
      {event.severity === 'critical' && !replayed && (
        <div className="absolute top-0 right-0 p-2">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
        </div>
      )}
    </div>
  )
}
