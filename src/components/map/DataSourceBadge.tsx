'use client'
import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Zap } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { hasKey as hereHasKey } from '@/lib/api/here'
import { hasKey as tomtomHasKey } from '@/lib/api/tomtom'
import { cn } from '@/lib/utils/cn'

type Source = {
  provider: 'HERE' | 'TomTom' | 'OpenStreetMap' | 'Démo'
  live:     boolean
  label:    string
  tone:     'live' | 'tiles' | 'osm' | 'demo'
}

function resolveSource(dataSource: string): Source {
  if (dataSource === 'live' && hereHasKey())   return { provider: 'HERE',          live: true,  label: 'Données temps réel',  tone: 'live'  }
  if (dataSource === 'live' && tomtomHasKey()) return { provider: 'TomTom',        live: true,  label: 'Tuiles temps réel',   tone: 'tiles' }
  if (dataSource === 'osm')                    return { provider: 'OpenStreetMap', live: false, label: 'Réseau OSM réel',     tone: 'osm'   }
  return                                               { provider: 'Démo',          live: false, label: 'Données simulées',    tone: 'demo'  }
}

const TONE_STYLES: Record<Source['tone'], { dot: string; text: string; ring: string }> = {
  live:  { dot: 'bg-brand',          text: 'text-brand',        ring: 'ring-brand/20'     },
  tiles: { dot: 'bg-blue-500',       text: 'text-blue-500',     ring: 'ring-blue-500/20'  },
  osm:   { dot: 'bg-purple-500',     text: 'text-purple-500',   ring: 'ring-purple-500/20'},
  demo:  { dot: 'bg-text-muted',     text: 'text-text-muted',   ring: 'ring-bg-border'    },
}

export function DataSourceBadge() {
  const dataSource = useTrafficStore(s => s.dataSource)
  const snapshot   = useTrafficStore(s => s.snapshot)
  const source     = resolveSource(dataSource)
  const tone       = TONE_STYLES[source.tone]
  const [open, setOpen] = useState(false)

  const [ageText, setAgeText] = useState('—')
  useEffect(() => {
    if (!snapshot?.fetchedAt) { setAgeText('—'); return }
    const update = () => {
      const diff = Math.max(0, Math.round((Date.now() - new Date(snapshot.fetchedAt).getTime()) / 1000))
      if (diff < 60) setAgeText(`il y a ${diff}s`)
      else           setAgeText(`il y a ${Math.round(diff / 60)} min`)
    }
    update()
    const id = setInterval(update, 5000)
    return () => clearInterval(id)
  }, [snapshot?.fetchedAt])

  const segmentCount = snapshot?.segments.length ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'glass-card flex items-center gap-2 h-9 px-3 rounded-xl ring-1 transition-all hover:border-text-muted',
          tone.ring,
        )}
        title="Source de données"
      >
        <span className="relative flex items-center justify-center">
          <span className={cn('w-2 h-2 rounded-full', tone.dot)} />
          {source.live && <span className={cn('absolute w-2 h-2 rounded-full animate-ping', tone.dot)} />}
        </span>
        {source.live
          ? <Wifi    className={cn('w-3.5 h-3.5', tone.text)} strokeWidth={2.2} />
          : <WifiOff className={cn('w-3.5 h-3.5', tone.text)} strokeWidth={2.2} />}
        <span className={cn('text-[12px] font-semibold tracking-tight', tone.text)}>{source.provider}</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-64 glass-card rounded-xl p-3 z-50 animate-scale-in"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-brand" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.18em]">Source de données</span>
          </div>
          <div className="space-y-1.5 text-[12px]">
            <Row k="Fournisseur"    v={source.provider} />
            <Row k="Type"           v={source.label} />
            <Row k="Statut"         v={source.live ? 'Temps réel' : 'Statique'} />
            <Row k="Segments"       v={segmentCount.toLocaleString('fr-FR')} />
            <Row k="Dernière maj"   v={ageText} />
          </div>
          {!source.live && (
            <p className="mt-2 pt-2 border-t border-bg-border text-[11px] text-text-muted leading-relaxed">
              Configurez <code className="mono text-text-secondary">NEXT_PUBLIC_HERE_API_KEY</code> ou <code className="mono text-text-secondary">NEXT_PUBLIC_TOMTOM_API_KEY</code> pour activer le temps réel.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-muted">{k}</span>
      <span className="text-text-primary font-medium tabular-nums truncate">{v}</span>
    </div>
  )
}
