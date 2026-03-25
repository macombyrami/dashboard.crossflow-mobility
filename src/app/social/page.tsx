'use client'
import { useState, useEffect } from 'react'
import { Rss, Twitter, Train, Users, AlertTriangle, RefreshCw, MapPin, Search } from 'lucide-react'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { IdfNetworkStats } from '@/components/simulation/IdfNetworkStats'
import { cn } from '@/lib/utils/cn'

type SocialTab = 'sytadin' | 'ratp' | 'community'

// ─── Dummy RATP Data ─────────────────────────────────────────────────────────

const RATP_ALERTS = [
  { id: 1, line: 'RER A', type: 'critical', msg: 'Trafic interrompu entre La Défense et Auber. Panne de signalisation. Reprise estimée à 21h30.', time: 'il y a 5 min' },
  { id: 2, line: 'Ligne 4', type: 'high', msg: 'Trafic très perturbé sur l\'ensemble de la ligne suite à un bagage abandonné à Châtelet.', time: 'il y a 12 min' },
  { id: 3, line: 'RER B', type: 'medium', msg: 'Trafic ralenti d\'Aulnay vers Paris. Incident voyageur à La Plaine.', time: 'il y a 25 min' },
  { id: 4, line: 'Ligne 1', type: 'low', msg: 'Trafic régulier sur l\'ensemble de la ligne.', time: 'il y a 1h' }
]

const RATP_COLORS: Record<string, string> = {
  'RER A': '#E32938',
  'RER B': '#4B92DA',
  'Ligne 1': '#FFCC00',
  'Ligne 4': '#B63D8F'
}

function RatpFeed() {
  const [loading, setLoading] = useState(false)
  
  const refresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <div className="flex flex-col h-full bg-bg-base/50">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#00A88F] flex items-center justify-center">
            <Train className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Info Trafic RATP</h2>
            <p className="text-[10px] text-text-muted">Réseau ferré francilien</p>
          </div>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {RATP_ALERTS.map(alert => (
          <div key={alert.id} className="rounded-2xl border border-bg-border bg-bg-surface p-4 flex gap-3 hover:border-text-muted/30 transition-colors">
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-xs"
              style={{ backgroundColor: RATP_COLORS[alert.line] ?? '#555' }}
            >
              {alert.line.replace('Ligne ', '').replace('RER ', '')}
            </div>
            <div className="flex-1 space-y-1 mt-0.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-primary">{alert.line}</span>
                <span className="text-[10px] text-text-muted">{alert.time}</span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{alert.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Dummy Community Data ────────────────────────────────────────────────────

const COMMUNITY_POSTS = [
  { id: 1, user: 'Alex75', avatar: 'https://i.pravatar.cc/100?u=1', type: 'accident', msg: 'Accident moto impliquant un scooter sous le tunnel de La Défense direction Paris. Ça commence à bouchonner sévère !', likes: 12, time: 'il y a 2 min', location: 'N13 - Courbevoie' },
  { id: 2, user: 'Marie_Velo', avatar: 'https://i.pravatar.cc/100?u=2', type: 'info', msg: 'Attention la piste cyclable Sébastopol est bloquée par des travaux non signalés au niveau des Halles.', likes: 34, time: 'il y a 15 min', location: 'Bd de Sébastopol' },
  { id: 3, user: 'UberProIDF', avatar: 'https://i.pravatar.cc/100?u=3', type: 'congestion', msg: 'Boulevard Périphérique extérieur totalement à l\'arrêt depuis la Porte de Montreuil. Évitez le secteur.', likes: 8, time: 'il y a 41 min', location: 'BP Ext - Porte de Vincennes' },
]

function CommunityFeed() {
  return (
    <div className="flex flex-col h-full bg-bg-base/50">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <Users className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Rapports Communautaires</h2>
            <p className="text-[10px] text-text-muted">Alertes en temps réel des usagers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {COMMUNITY_POSTS.map(post => (
          <div key={post.id} className="rounded-2xl border border-bg-border bg-bg-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={post.avatar} alt={post.user} className="w-6 h-6 rounded-full" />
                <span className="text-xs font-semibold text-text-primary">{post.user}</span>
                <span className="text-[10px] text-text-muted">{post.time}</span>
              </div>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{post.msg}</p>
            <div className="flex items-center gap-1 text-[10px] font-medium text-brand bg-brand/10 w-fit px-2 py-0.5 rounded-full">
              <MapPin className="w-3 h-3" /> {post.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page Option ────────────────────────────────────────────────────────

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<SocialTab>('sytadin')

  return (
    <div className="flex flex-col lg:flex-row min-h-full overflow-hidden bg-bg-base">
      
      {/* ── Left Sidebar: Context & Navigation ── */}
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col max-h-[45vh] lg:max-h-full bg-bg-surface z-10">
        
        {/* Header */}
        <div className="px-5 py-5 border-b border-bg-border shrink-0 bg-gradient-to-b from-bg-surface to-bg-base/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Rss className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">Flux Social</h2>
              <p className="text-[11px] text-text-muted">Événements & Alertes IDF</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Rechercher une avenue, un incident..." 
              className="w-full bg-bg-elevated border border-bg-border rounded-xl pl-9 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-brand/50 transition-colors"
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="p-4 border-b border-bg-border shrink-0 flex flex-col gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-2 mb-1">Sources d'information</p>
          
          <button 
            onClick={() => setActiveTab('sytadin')}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold w-full text-left",
              activeTab === 'sytadin' ? "bg-[#1DA1F2]/10 text-[#1DA1F2] border border-[#1DA1F2]/20" : "text-text-secondary hover:bg-bg-elevated border border-transparent"
            )}
          >
            <Twitter className="w-4 h-4" />
            <div className="flex-1">
              <span>Sytadin DiRIF</span>
              {activeTab === 'sytadin' && <p className="text-[9px] font-normal mt-0.5 opacity-80">Réseau routier majeur</p>}
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('ratp')}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold w-full text-left",
              activeTab === 'ratp' ? "bg-[#00A88F]/10 text-[#00A88F] border border-[#00A88F]/20" : "text-text-secondary hover:bg-bg-elevated border border-transparent"
            )}
          >
            <Train className="w-4 h-4" />
            <div className="flex-1">
              <span>RATP & Transilien</span>
              {activeTab === 'ratp' && <p className="text-[9px] font-normal mt-0.5 opacity-80">Transports en commun</p>}
            </div>
          </button>

          <button 
            onClick={() => setActiveTab('community')}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold w-full text-left",
              activeTab === 'community' ? "bg-brand/10 text-brand border border-brand/20" : "text-text-secondary hover:bg-bg-elevated border border-transparent"
            )}
          >
            <Users className="w-4 h-4" />
            <div className="flex-1">
              <span>Communauté Waze</span>
              {activeTab === 'community' && <p className="text-[9px] font-normal mt-0.5 opacity-80">Signalements usagers</p>}
            </div>
          </button>
        </div>

        {/* Network Stats (Bottom of sidebar) */}
        <div className="flex-1 overflow-y-auto p-4">
          <IdfNetworkStats />
        </div>
      </div>

      {/* ── Right Content: Live Feeds ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-b from-bg-surface/50 to-bg-base pointer-events-none z-0" />
        
        <div className="relative z-10 flex-1 flex flex-col overflow-hidden h-full">
          {activeTab === 'sytadin' && <SytadinFeed />}
          {activeTab === 'ratp' && <RatpFeed />}
          {activeTab === 'community' && <CommunityFeed />}
        </div>
      </div>

    </div>
  )
}
