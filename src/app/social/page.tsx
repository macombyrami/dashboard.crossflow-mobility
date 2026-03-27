'use client'
import React, { useState, useEffect } from 'react'
import { Rss, Twitter, Train, Users, AlertTriangle, RefreshCw, MapPin, Search, Wrench, Ban } from 'lucide-react'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { IdfNetworkStats } from '@/components/simulation/IdfNetworkStats'
import { SocialPulse } from '@/components/social/SocialPulse'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { cn } from '@/lib/utils/cn'



type SocialTab = 'sytadin' | 'ratp' | 'community' | 'xpulse'


// ─── RATP Feed ───────────────────────────────────────────────────────────────
import { fetchAllTrafficStatus, type TrafficLine } from '@/lib/api/ratp'

const RATP_COLORS: Record<string, string> = {
  // Métro
  '1': '#FFCD00', '2': '#003CA6', '3': '#837902', '3b': '#6EC4E8',
  '4': '#CF009E', '5': '#FF7E2E', '6': '#6ECA97', '7': '#FA9ABA',
  '7b': '#6ECA97', '8': '#E19BDF', '9': '#B6BD00', '10': '#C9910A',
  '11': '#704B1C', '12': '#007852', '13': '#6EC4E8', '14': '#62259D',
  // RER
  'A': '#E2231A', 'B': '#47A0D5', 'C': '#FFCD00', 'D': '#00814F', 'E': '#C04191',
  // Tram
  'T1': '#E85D0E', 'T2': '#2E67B1', 'T3a': '#65AE30', 'T3b': '#65AE30',
  'T4': '#E2231A', 'T5': '#694394', 'T6': '#FF7F00', 'T7': '#AA57A7',
  'T8': '#E2231A', 'T9': '#00A1E0', 'T10': '#004B9B', 'T11': '#00A99D',
  'T12': '#E85D0E', 'T13': '#00A1E0',
}

function RatpFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(false)
  const [alerts, setAlerts] = useState<TrafficLine[]>([])

  const refresh = async () => {
    setLoading(true)
    setError(false)
    try {
      const lines = await fetchAllTrafficStatus()
      const disrupted = lines.filter(l => l.status !== 'normal' && l.status !== 'inconnu')
      setAlerts(disrupted)
      onUpdate?.(disrupted.length)
      
      // Update global intelligence
      if (typeof window !== 'undefined' && 'updateAlerts' in window) {
        (window as any).updateAlerts(disrupted.map(l => ({
          text: `${l.name}: ${l.message}`,
          source: 'RATP',
          severity: l.status === 'interrompu' ? 'critical' : 'high'
        })))
      }

    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 60000)
    return () => clearInterval(iv)
  }, [])

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
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted disabled:opacity-50">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && alerts.length === 0 ? (
          <div className="text-center p-8">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-text-muted">Chargement du trafic RATP...</p>
          </div>
        ) : error ? (
          <div className="text-center p-8 rounded-2xl border border-orange-500/20 bg-orange-500/5">
            <p className="text-sm font-bold text-orange-400 mb-1">Service temporairement indisponible</p>
            <p className="text-xs text-text-muted mb-3">L'API RATP ne répond pas. Réessayez dans quelques instants.</p>
            <button onClick={refresh} className="text-xs text-brand font-semibold hover:underline">Réessayer</button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center p-8 bg-brand-green/5 rounded-2xl border border-brand-green/20">
            <p className="text-sm font-bold text-brand-green mb-1">Trafic Normal</p>
            <p className="text-xs text-text-muted">Aucune perturbation majeure signalée sur le réseau.</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="rounded-2xl border border-bg-border bg-bg-surface p-4 flex gap-3 hover:border-text-muted/30 transition-colors">
              <div 
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-bold text-white text-xs"
                style={{ backgroundColor: RATP_COLORS[alert.slug.toUpperCase()] ?? '#555' }}
              >
                {alert.slug.toUpperCase()}
              </div>
              <div className="flex-1 space-y-1 mt-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">{alert.name}</span>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase",
                    alert.status === 'interrompu' ? 'bg-red-500/10 text-red-500' :
                    alert.status === 'travaux' ? 'bg-orange-500/10 text-orange-500' :
                    'bg-yellow-500/10 text-yellow-500'
                  )}>
                    {alert.status}
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">{alert.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Community Feed ────────────────────────────────────────────────────────────
import { useMapStore } from '@/store/mapStore'
import type { Metadata } from 'next'

interface RealIncident {
  id:          string
  title:       string
  type:        'accident' | 'travaux' | 'fermeture' | 'événement' | 'congestion' | 'incident'
  severity:    'low' | 'medium' | 'high' | 'critical'
  address:     string
  district?:   string
  lat:         number
  lng:         number
  startDate?:  string
  endDate?:    string
  source:      'paris-opendata' | 'here' | 'dirif'
  sourceLabel: string
}

const SEVERITY_COLORS: Record<RealIncident['severity'], string> = {
  critical: '#FF1744',
  high:     '#FF6D00',
  medium:   '#FFB300',
  low:      '#00E676',
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  travaux:    Wrench,
  fermeture:  Ban,
  accident:   AlertTriangle,
  incident:   AlertTriangle,
  événement:  MapPin,
  congestion: AlertTriangle,
}

function formatDateRange(start?: string, end?: string): string {
  if (!start) return ''
  const s   = new Date(start)
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  if (!end) return `depuis le ${fmt(s)}`
  const e = new Date(end)
  if (s.toDateString() === e.toDateString()) return `le ${fmt(s)}`
  return `du ${fmt(s)} au ${fmt(e)}`
}

interface SocialPost {
  id: string
  author: {
    avatar: string
    name: string
    handle: string
  }
  timestamp: string
  text: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  location: string
  tags: string[]
}

function XPulseFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [loading, setLoading]     = useState(true)
  const [posts, setPosts]         = useState<SocialPost[]>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/x-pulse')
      if (res.ok) {
        const data = await res.json()
        const items = data.posts ?? []
        setPosts(items)
        onUpdate?.(items.length)

        // Update global intelligence
        if (typeof window !== 'undefined' && 'updateAlerts' in window) {
          (window as any).updateAlerts(items.map((p: any) => ({
            text: p.text,
            source: 'X-PULSE',
            severity: p.severity
          })))
        }

      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 180_000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div className="flex flex-col h-full bg-black/5">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-black flex items-center justify-center">
            <Twitter className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">X Traffic Pulse</h2>
            <p className="text-[10px] text-text-muted">Analyse IA des flux sociaux (RAG)</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && posts.length === 0 ? (
          <div className="text-center p-8">
            <div className="w-8 h-8 border-2 border-text-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-text-muted">Analyse des flux X en cours…</p>
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} className="rounded-2xl border border-bg-border bg-bg-surface/50 backdrop-blur-sm p-4 space-y-3 hover:border-text-muted/30 transition-all hover:translate-x-1">
              <div className="flex items-start gap-3">
                <img src={post.author?.avatar} className="w-9 h-9 rounded-full bg-bg-elevated border border-bg-border shrink-0" alt="" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-bold text-text-primary truncate">{post.author?.name}</span>
                      <span className="text-[10px] text-text-muted truncate">@{post.author?.handle}</span>
                    </div>
                    <span className="text-[10px] text-text-muted shrink-0">{new Date(post.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1">{post.text}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-bg-border/50">
                <span className={cn(
                  "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase",
                  post.severity === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/20' :
                  post.severity === 'high' ? 'text-orange-500 bg-orange-500/10 border-orange-500/20' :
                  'text-blue-500 bg-blue-500/10 border-blue-500/20'
                )}>
                  {post.location}
                </span>
                {post.tags.map(tag => (
                  <span key={tag} className="text-[9px] font-semibold text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function LiveIntelligenceTicker({ alerts }: { alerts: { text: string; source: string; severity: string }[] }) {
  const critical = alerts.filter(a => a.severity === 'critical')
  if (critical.length === 0) return null

  return (
    <div className="bg-red-500/10 border-y border-red-500/20 px-4 py-2 flex items-center gap-3 overflow-hidden">
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Flash Info</span>
      </div>
      <div className="flex-1 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-marquee hover:pause whitespace-nowrap">
          {critical.map((a, i) => (
            <span key={i} className="text-xs text-text-primary font-medium mr-12 inline-flex items-center gap-2">
              <span className="text-[10px] text-text-muted uppercase">[{a.source}]</span>
              {a.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}


function CommunityFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const city = useMapStore(s => s.city)
  const [loading, setLoading]     = useState(true)
  const [incidents, setIncidents] = useState<RealIncident[]>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `/api/social/incidents?lat=${city.center.lat}&lng=${city.center.lng}`,
      )
      if (res.ok) {
        const data = await res.json()
        const items = data ?? []
        setIncidents(items)
        onUpdate?.(items.length)

        // Update global intelligence
        if (typeof window !== 'undefined' && 'updateAlerts' in window) {
          (window as any).updateAlerts(items.map((p: any) => ({
            text: p.title,
            source: 'COMMUNITY',
            severity: p.severity
          })))
        }

      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    refresh()
    const iv = setInterval(refresh, 120_000)
    return () => clearInterval(iv)
  }, [city.id]) // eslint-disable-line

  return (
    <div className="flex flex-col h-full bg-bg-base/50">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Incidents Signalés</h2>
            <p className="text-[10px] text-text-muted">OpenData Paris · HERE Traffic</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && incidents.length === 0 ? (
          <div className="text-center p-8">
            <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-text-muted">Chargement des incidents…</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="text-center p-8 bg-brand-green/5 rounded-2xl border border-brand-green/20">
            <p className="text-sm font-bold text-brand-green mb-1">Aucun incident actif</p>
            <p className="text-xs text-text-muted">Aucun incident signalé sur le secteur.</p>
          </div>
        ) : (
          incidents.map(inc => {
            const Icon    = TYPE_ICONS[inc.type] ?? AlertTriangle
            const color   = SEVERITY_COLORS[inc.severity]
            const dateStr = formatDateRange(inc.startDate, inc.endDate)
            return (
              <div
                key={inc.id}
                className="rounded-2xl border border-bg-border bg-bg-surface p-4 space-y-2.5 hover:border-text-muted/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{ backgroundColor: `${color}18` }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary leading-tight line-clamp-2">
                      {inc.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] text-text-muted">
                        <MapPin className="w-2.5 h-2.5" />
                        {inc.address}{inc.district ? ` — ${inc.district}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color, backgroundColor: `${color}18` }}
                  >
                    {inc.type.charAt(0).toUpperCase() + inc.type.slice(1)}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                      inc.source === 'paris-opendata'
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'
                        : 'text-orange-400 bg-orange-500/10 border-orange-500/20',
                    )}
                  >
                    {inc.sourceLabel}
                  </span>
                  {dateStr && (
                    <span className="text-[10px] text-text-muted">{dateStr}</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── Main Page Option ────────────────────────────────────────────────────────

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<SocialTab>('sytadin')
  
  // Stats tracking for SocialPulse
  const [ratpCount, setRatpCount] = useState(0)
  const [sytadinCount, setSytadinCount] = useState(0)
  const [communityCount, setCommunityCount] = useState(0)
  const [xCount, setXCount] = useState(0)

  // Combined store for intelligence ticker
  const [allAlerts, setAllAlerts] = useState<{ text: string; source: string; severity: string }[]>([])

  const updateAlerts = (newAlerts: { text: string; source: string; severity: string }[]) => {
    setAllAlerts(prev => {
      const filtered = prev.filter(a => a.source !== newAlerts[0]?.source)
      return [...filtered, ...newAlerts].slice(0, 15)
    })
  }



  useEffect(() => {
    (window as any).updateAlerts = updateAlerts
  }, [updateAlerts])

  useEffect(() => { document.title = 'Flux Social — Alertes IDF | CrossFlow' }, [])



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
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary tracking-tight">Social Hub</h2>
                <LiveIndicator label="TEMPS RÉEL" className="px-2 py-0.5 scale-75 origin-left" />
              </div>
              <p className="text-[11px] text-text-muted">Command Center · Île-de-France</p>
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
            <AlertTriangle className="w-4 h-4" />
            <div className="flex-1">
              <span>Incidents Signalés</span>
              {activeTab === 'community' && <p className="text-[9px] font-normal mt-0.5 opacity-80">OpenData + HERE Traffic</p>}
            </div>
          </button>

          <button
            onClick={() => setActiveTab('xpulse')}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold w-full text-left",
              activeTab === 'xpulse' ? "bg-black/10 text-black border border-black/20 dark:bg-white/10 dark:text-white dark:border-white/20" : "text-text-secondary hover:bg-bg-elevated border border-transparent"
            )}
          >
            <Twitter className="w-4 h-4" />
            <div className="flex-1">
              <span>X Traffic Pulse</span>
              {activeTab === 'xpulse' && <p className="text-[9px] font-normal mt-0.5 opacity-80">RAG Twitter Monitoring</p>}
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
          {/* Top Global Stats */}
          <SocialPulse 
            ratpCount={ratpCount} 
            sytadinCount={sytadinCount} 
            communityCount={communityCount} 
            xCount={xCount}
          />
          
          <LiveIntelligenceTicker alerts={allAlerts} />

          
          <div className="flex-1 overflow-hidden relative">
            <div className={cn("absolute inset-0 transition-opacity duration-300", activeTab === 'sytadin' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
              <SytadinFeed onUpdate={setSytadinCount} />
            </div>
            <div className={cn("absolute inset-0 transition-opacity duration-300", activeTab === 'ratp' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
              <RatpFeed onUpdate={setRatpCount} />
            </div>
            <div className={cn("absolute inset-0 transition-opacity duration-300", activeTab === 'community' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
              <CommunityFeed onUpdate={setCommunityCount} />
            </div>
            <div className={cn("absolute inset-0 transition-opacity duration-300", activeTab === 'xpulse' ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none")}>
              <XPulseFeed onUpdate={setXCount} />
            </div>
          </div>


        </div>

      </div>

    </div>
  )
}
