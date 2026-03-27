'use client'
import { useEffect, useState, useCallback } from 'react'
import { Twitter, AlertTriangle, Zap, Info, MapPin, RefreshCw, ExternalLink, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface SocialPost {
  id: string
  type: 'alert' | 'congestion' | 'info'
  text: string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  tags: string[]
  km?: number
}

interface FeedData {
  posts:     SocialPost[]
  fetchedAt: string
  degraded?: boolean
}

const SEVERITY_CONFIG = {
  critical: { color: '#FF1744', bg: 'rgba(255,23,68,0.08)', border: 'rgba(255,23,68,0.25)', label: 'Critique' },
  high:     { color: '#FF6D00', bg: 'rgba(255,109,0,0.08)', border: 'rgba(255,109,0,0.25)',  label: 'Élevé' },
  medium:   { color: '#FFB300', bg: 'rgba(255,179,0,0.08)', border: 'rgba(255,179,0,0.25)', label: 'Modéré' },
  low:      { color: '#00E676', bg: 'rgba(0,230,118,0.06)', border: 'rgba(0,230,118,0.2)',  label: 'Normal' },
}

const TYPE_ICON = {
  alert:      AlertTriangle,
  congestion: TrendingUp,
  info:       Info,
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'à l\'instant'
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  return `il y a ${hrs}h`
}

function PostCard({ post }: { post: SocialPost }) {
  const sev = SEVERITY_CONFIG[post.severity]
  const Icon = TYPE_ICON[post.type]

  return (
    <div
      className="rounded-2xl border p-4 space-y-3 transition-all hover:scale-[1.01]"
      style={{ background: sev.bg, borderColor: sev.border }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: sev.color + '22', border: `1px solid ${sev.color}44` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: sev.color }} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-text-primary">@Sytadin</span>
              <span className="text-[10px] text-text-muted">· DiRIF</span>
            </div>
            <span className="text-[10px] text-text-muted">{timeAgo(post.timestamp)}</span>
          </div>
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
          style={{ color: sev.color, background: sev.color + '22' }}
        >
          {sev.label}
        </span>
      </div>

      {/* Content */}
      <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
        {post.text}
      </p>

      {/* Location + km */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-[10px] text-text-muted">
          <MapPin className="w-3 h-3" />
          <span className="truncate max-w-[140px]">{post.location}</span>
        </div>
        {post.km !== undefined && (
          <div
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: sev.color, background: sev.color + '15' }}
          >
            <Zap className="w-2.5 h-2.5" />
            {post.km} km
          </div>
        )}
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {post.tags.map(tag => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full text-brand"
              style={{ background: 'rgba(41,121,255,0.1)', border: '1px solid rgba(41,121,255,0.2)' }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function SytadinFeed({ onUpdate }: { onUpdate?: (count: number) => void }) {
  const [data, setData]             = useState<FeedData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [staleError, setStaleError] = useState(false)   // error on refresh, but stale data still shown

  const fetchFeed = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/social/sytadin')
      if (!res.ok) throw new Error('fetch error')
      let json: FeedData = await res.json()
      
      // FALLBACK: If Sytadin website is empty but the user sees tweets,
      // we try to pull from our X-Pulse high-density feed.
      if (json.posts.length === 0) {
        const xRes = await fetch('/api/social/x-pulse')
        if (xRes.ok) {
          const xData = await xRes.json()
          if (xData.posts?.length > 0) {
            json = {
              posts: xData.posts.map((p: any) => ({
                ...p,
                id: `hybrid-${p.id}`,
                text: `[X-Pulse] ${p.text}`
              })),
              fetchedAt: new Date().toISOString(),
              degraded: true
            }
          }
        }
      }

      setData(json)
      setStaleError(false)
      onUpdate?.(json.posts.length)

      // Update global intelligence
      if (typeof window !== 'undefined' && 'updateAlerts' in window) {
        (window as any).updateAlerts(json.posts.map(p => ({
          text: p.text,
          source: 'SYTADIN',
          severity: p.severity
        })))
      }
    } catch {
      setStaleError(true)
    } finally {
      setLoading(false)
    }
  }, [onUpdate])


  useEffect(() => {
    fetchFeed()

    const id = setInterval(fetchFeed, 3 * 60 * 1000) // refresh every 3 min
    return () => clearInterval(id)
  }, [fetchFeed])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#1DA1F2] flex items-center justify-center">
            <Twitter className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary">@Sytadin</h2>
            <p className="text-[10px] text-text-muted">Trafic Île-de-France · DiRIF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data?.fetchedAt && (
            <span className="text-[10px] text-text-muted hidden sm:block">
              {timeAgo(data.fetchedAt)}
            </span>
          )}
          <button
            onClick={fetchFeed}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted hover:text-text-primary"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          </button>
          <a
            href="https://x.com/Sytadin"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg hover:bg-bg-elevated transition-colors text-text-muted hover:text-[#1DA1F2]"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Stale-data warning banner */}
      {staleError && data && (
        <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="text-[10px] text-orange-400 font-medium">Données en cache · {timeAgo(data.fetchedAt)}</span>
          </div>
          <button onClick={fetchFeed} className="text-[10px] text-orange-400 hover:underline">Réessayer</button>
        </div>
      )}

      {/* Degraded-mode badge */}
      {data?.degraded && !staleError && (
        <div className="px-4 py-1.5 bg-yellow-500/8 border-b border-yellow-500/15 flex items-center gap-1.5">
          <Info className="w-3 h-3 text-yellow-400 shrink-0" />
          <span className="text-[10px] text-yellow-400 font-medium">Mode dégradé — données estimées (Sytadin.fr inaccessible)</span>
        </div>
      )}

      {/* Severity summary bar */}
      {data && !loading && (
        <div className="px-4 py-2.5 border-b border-bg-border flex items-center gap-3">
          {(['critical', 'high', 'medium', 'low'] as const).map(sev => {
            const count = data.posts.filter(p => p.severity === sev).length
            if (!count) return null
            const cfg = SEVERITY_CONFIG[sev]
            return (
              <div key={sev} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: cfg.color }} />
                <span className="text-[10px] text-text-muted">
                  <span className="font-semibold" style={{ color: cfg.color }}>{count}</span> {cfg.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-bg-border p-4 space-y-2 animate-pulse">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-bg-elevated" />
                  <div className="space-y-1.5">
                    <div className="h-2.5 w-20 bg-bg-elevated rounded" />
                    <div className="h-2 w-12 bg-bg-elevated rounded" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-2 bg-bg-elevated rounded w-full" />
                  <div className="h-2 bg-bg-elevated rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {staleError && !data && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-text-muted" />
            <div>
              <p className="text-sm font-medium text-text-primary">Données indisponibles</p>
              <p className="text-xs text-text-muted mt-1">Impossible de joindre Sytadin.fr</p>
            </div>
            <button
              onClick={fetchFeed}
              className="text-xs text-brand hover:underline"
            >
              Réessayer
            </button>
          </div>
        )}

        {!loading && data?.posts.map(post => (
          <PostCard key={post.id} post={post} />
        ))}

        {!loading && !staleError && data?.posts.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Info className="w-8 h-8 text-text-muted" />
            <p className="text-xs text-text-muted">Aucune alerte trafic pour le moment.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-bg-border flex items-center justify-between">
        <p className="text-[10px] text-text-muted">Source : sytadin.fr (DiRIF)</p>
        <a
          href="https://www.sytadin.fr"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-brand hover:underline"
        >
          Voir le site complet
        </a>
      </div>
    </div>
  )
}
