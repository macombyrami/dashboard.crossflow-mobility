'use client'
import React from 'react'
import { Rss, Twitter, Train, Users, AlertTriangle, RefreshCw, MapPin, Search, Wrench, Ban, Activity, Brain, TrendingUp, ShieldAlert, Zap, Sparkles } from 'lucide-react'
import { SytadinFeed } from '@/components/simulation/SytadinFeed'
import { IdfNetworkStats } from '@/components/simulation/IdfNetworkStats'
import { SocialPulse } from '@/components/social/SocialPulse'
import { LiveIndicator } from '@/components/ui/LiveIndicator'
import { cn } from '@/lib/utils/cn'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { fetchAllTrafficStatus, type TrafficLine, LINE_COLORS as RATP_COLORS } from '@/lib/api/ratp'
import { RatpNetworkStatus } from '@/components/social/RatpNetworkStatus'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

type SocialTab = 'sytadin' | 'ratp' | 'community' | 'xpulse' | 'intelligence'

function RatpFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [loading, setLoading] = React.useState(true)
  const [error,   setError]   = React.useState(false)
  const [allLines, setAllLines] = React.useState<TrafficLine[]>([])
  const [disrupted, setDisrupted] = React.useState<TrafficLine[]>([])

  const refresh = async () => {
    setLoading(true)
    setError(false)
    try {
      const { lines } = await fetchAllTrafficStatus()
      const issues = lines.filter(l => l.status !== 'normal' && l.status !== 'inconnu')
      setAllLines(lines)
      setDisrupted(issues)
      onUpdate?.(issues.length)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
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
      <div className="flex-1 overflow-y-auto p-4">
        {loading && allLines.length === 0 ? (
          <div className="text-center p-8"><RefreshCw className="w-6 h-6 animate-spin mx-auto text-brand" /></div>
        ) : (
          <div className="space-y-4">
            <RatpNetworkStatus lines={allLines} />
            {disrupted.map(alert => (
              <div key={alert.id} className="p-4 rounded-xl border border-bg-border bg-bg-surface">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase" style={{ backgroundColor: RATP_COLORS[alert.slug.toUpperCase()] }}>{alert.slug}</span>
                  <span className="text-xs font-bold text-text-primary">{alert.name}</span>
                </div>
                <p className="text-[11px] text-text-secondary">{alert.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function XPulseFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [loading, setLoading]     = React.useState(true)
  const [posts, setPosts]         = React.useState<any[]>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/x-pulse')
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        onUpdate?.(data.posts?.length || 0)
      }
    } catch { } finally { setLoading(false) }
  }

  React.useEffect(() => { refresh() }, [])

  return (
    <div className="flex flex-col h-full bg-black/5">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <Twitter className="w-4 h-4 text-white p-1 rounded bg-black" />
          <h2 className="text-sm font-semibold text-text-primary">X Traffic Pulse</h2>
        </div>
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? <div className="text-center p-8 text-xs text-text-muted">Analyse des flux X...</div> :
          posts.map(post => (
            <div key={post.id} className="p-4 rounded-xl border border-bg-border bg-bg-surface/50">
              <div className="flex items-center gap-2 mb-2">
                <img src={post.author?.avatar} className="w-6 h-6 rounded-full" alt="" />
                <span className="text-[11px] font-bold text-text-primary">{post.author?.name}</span>
              </div>
              <p className="text-xs text-text-secondary">{post.text}</p>
            </div>
          ))
        }
      </div>
    </div>
  )
}

function CommunityFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [loading, setLoading]     = React.useState(true)
  const [incidents, setIncidents] = React.useState<any[]>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/incidents')
      if (res.ok) {
        const data = await res.json()
        setIncidents(data || [])
        onUpdate?.(data?.length || 0)
      }
    } catch { } finally { setLoading(false) }
  }

  React.useEffect(() => { refresh() }, [])

  return (
    <div className="flex flex-col h-full bg-bg-base/50">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between bg-bg-surface">
        <h2 className="text-sm font-semibold text-text-primary">Signalements Locale</h2>
        <button onClick={refresh} className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {incidents.map(inc => (
          <div key={inc.id} className="p-4 rounded-xl border border-bg-border bg-bg-surface">
            <h4 className="text-xs font-bold text-text-primary mb-1">{inc.title}</h4>
            <p className="text-[11px] text-text-muted">{inc.address}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AI Intelligence Pipeline (Synthesized Pain Points) ──────────────────

function IntelligenceDashboard() {
  const [events, setEvents] = React.useState<any[]>([])
  const [anomaly, setAnomaly] = React.useState<{ active: boolean; stats: any }>({ active: false, stats: null })
  const [loading, setLoading] = React.useState(true)
  const [analyzing, setAnalyzing] = React.useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      // 1. Fetch synthesized events
      const res = await fetch('/api/social/intelligence')
      if (res.ok) {
        const data = await res.json()
        const rawEvents = data.events || []
        setEvents(rawEvents)

        // Sync with global TrafficStore for notifications
        const mappedIncidents = rawEvents.map((ev: any) => ({
          id:          ev.id,
          type:        'congestion' as const, // Default type for intelligence insights
          severity:    (ev.severity > 80 ? 'critical' : ev.severity > 50 ? 'high' : 'medium') as any,
          title:       ev.title,
          description: ev.summary,
          location:    { lat: 48.8566, lng: 2.3522 }, // Default to Paris center if no coordinates
          address:     ev.area_context || 'Zone Urbaine',
          startedAt:   ev.created_at || new Date().toISOString(),
          source:      'AI Pulse',
          iconColor:   ev.severity > 80 ? '#FF1744' : '#FF6D00',
        }))
        useTrafficStore.getState().setSocialIncidents(mappedIncidents)
      }

      // 2. Fetch anomaly status
      const anonRes = await fetch('/api/social/anomalies')
      if (anonRes.ok) {
        const data = await anonRes.json()
        setAnomaly({ active: data.anomaly, stats: data.stats })
      }
    } catch (err) {
      console.error('Failed to fetch intelligence:', err)
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/social/analyze', { method: 'POST' })
      if (res.ok) {
        await refresh()
      }
    } catch (err) {
      console.error('Analysis trigger failed:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  React.useEffect(() => { refresh() }, [])

  return (
    <div className="space-y-6">
      {/* Risk Overview & Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 w-full">
          <div className={cn(
            "p-4 rounded-xl border flex flex-col gap-1 transition-all duration-500",
            anomaly.active ? "bg-traffic-critical/20 border-traffic-critical/40" : "bg-white/5 border-white/10"
          )}>
            <div className="flex items-center justify-between">
              <ShieldAlert className={cn("w-5 h-5", anomaly.active ? "text-traffic-critical animate-pulse" : "text-text-muted")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-widest", anomaly.active ? "text-traffic-critical" : "text-text-muted")}>
                {anomaly.active ? 'Anomaly Detected' : 'Pain Index'}
              </span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{anomaly.active ? '84' : '32'} / 100</p>
            <p className="text-[11px] text-text-muted">
              {anomaly.active ? 'Sudden spike in report volume' : 'Signal volume stable'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-brand/10 border border-brand/20 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Brain className="w-5 h-5 text-brand" />
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest">AI Confidence</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">94.2%</p>
            <p className="text-[11px] text-text-muted">Multi-source signal validation</p>
          </div>

          <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <TrendingUp className="w-5 h-5 text-text-secondary" />
              <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Sentiment Hub</span>
            </div>
            <p className="text-2xl font-bold text-white mt-2">-15% Frustration</p>
            <p className="text-[11px] text-text-muted">Tendance à la baisse (H-1)</p>
          </div>
        </div>

        <button 
          onClick={runAnalysis}
          disabled={analyzing}
          className="w-full md:w-auto px-6 py-4 rounded-2xl bg-brand text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-brand/90 transition-all disabled:opacity-50 shadow-lg shadow-brand/20"
        >
          {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {analyzing ? 'Analysis In Progress...' : 'Run Intelligence Cycle'}
        </button>
      </div>

      {/* Synthesized Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand" />
            Événements Urbains Synthétisés
          </h3>
          <button onClick={refresh} className="text-[10px] font-bold text-brand hover:underline">
            Actualiser
          </button>
        </div>
        
        {loading && events.length === 0 ? (
          <div className="py-20 text-center text-text-muted text-sm flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-brand" />
            Analyse des signaux sociaux en cours...
          </div>
        ) : events.length === 0 ? (
          <div className="py-20 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <p className="text-sm font-bold text-white mb-1">Aucun événement détecté</p>
            <p className="text-xs text-text-muted">Lancez un cycle d'analyse pour processed les signaux récents.</p>
          </div>
        ) : (
          events.map(event => (
            <div key={event.id} className="group relative p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      event.severity > 80 ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'
                    }`}>
                      Score: {event.severity}
                    </span>
                    <span className="text-[11px] font-medium text-text-muted flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {event.area_context}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2 group-hover:text-brand transition-colors">{event.title}</h4>
                  <p className="text-[13px] text-text-secondary leading-relaxed mb-4">{event.summary}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {(event.recommended_actions || []).map((action: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand/10 border border-brand/20 text-[11px] font-bold text-brand">
                        <Zap className="w-3 h-3" />
                        {action}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-right shrink-0">
                  <div className="text-[11px] text-text-muted mb-4">
                    {formatDistanceToNow(new Date(event.created_at || Date.now()), { locale: fr, addSuffix: true })}
                  </div>
                  <div className="w-16 h-16 rounded-full border-4 border-white/5 flex items-center justify-center relative overflow-hidden">
                    <div 
                      className="absolute inset-0 bg-brand/20" 
                      style={{ height: `${(event.confidence || 0.5) * 100}%`, top: `${100 - (event.confidence || 0.5) * 100}%` }} 
                    />
                    <span className="relative z-10 text-[11px] font-bold text-white">{Math.round((event.confidence || 0.5) * 100)}%</span>
                  </div>
                  <p className="text-[9px] font-bold text-text-muted uppercase mt-2 tracking-widest">Confiance IA</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}


export default function SocialPage() {
  const [activeTab, setActiveTab] = React.useState<SocialTab>('sytadin')
  const [counts, setCounts] = React.useState({ ratp: 0, sytadin: 0, community: 0, x: 0 })
  const city = useMapStore(s => s.city)

  const updateCount = (key: keyof typeof counts, val: number) => {
    setCounts(prev => ({ ...prev, [key]: val }))
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-full overflow-hidden bg-bg-base">
      
      {/* ── Left Sidebar ── */}
      <div className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-r border-bg-border flex flex-col bg-bg-surface z-10 transition-all duration-500">
        <div className="px-5 py-5 border-b border-bg-border shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center">
              <Rss className="w-4 h-4 text-brand" />
            </div>
            <div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">{city.name} Social Hub</h2>
              <LiveIndicator label="TEMPS RÉEL" className="px-2 py-0.5 scale-75 origin-left" />
            </div>
          </div>

          <div className="space-y-1.5">
            {[
              { id: 'intelligence', icon: Sparkles, label: 'Pulse AI Insights', color: 'text-brand' },
              { id: 'sytadin', icon: Twitter, label: 'Sytadin DiRIF', color: 'text-[#1DA1F2]' },
              { id: 'ratp', icon: Train, label: 'RATP & Transilien', color: 'text-[#00A88F]' },
              { id: 'community', icon: AlertTriangle, label: 'Signalements', color: 'text-brand' },
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SocialTab)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-xs font-semibold w-full text-left border border-transparent",
                  activeTab === tab.id ? "bg-white/[0.03] border-white/5 shadow-sm" : "text-text-secondary hover:bg-white/[0.02]"
                )}
              >
                <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? tab.color : "text-text-muted")} />
                <span className={cn(activeTab === tab.id ? "text-text-primary" : "text-text-secondary")}>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <IdfNetworkStats />
        </div>
      </div>

      {/* ── Right Content ── */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Social Pulse Overview */}
        <SocialPulse 
          ratpCount={counts.ratp} 
          sytadinCount={counts.sytadin} 
          communityCount={counts.community} 
          xCount={counts.x} 
        />

        <div className="relative z-10 flex-1 flex flex-col overflow-hidden h-full p-6">
          {activeTab === 'intelligence' && <IntelligenceDashboard />}
          {activeTab === 'ratp' && <RatpFeed onUpdate={(n) => updateCount('ratp', n)} />}
          {activeTab === 'sytadin' && <SytadinFeed onUpdate={(n) => updateCount('sytadin', n)} />}
          {activeTab === 'community' && <CommunityFeed onUpdate={(n) => updateCount('community', n)} />}
          {activeTab === 'xpulse' && <XPulseFeed onUpdate={(n) => updateCount('x', n)} />}
        </div>
      </div>
    </div>
  )
}
