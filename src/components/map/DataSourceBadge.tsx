'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Zap } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { hasKey as hereHasKey } from '@/lib/api/here'
import { hasKey as tomtomHasKey } from '@/lib/api/tomtom'
import { cn } from '@/lib/utils/cn'

type Source = {
  provider: 'CrossFlow Intelligence Engine'
  live: boolean
  label: string
  tone: 'live' | 'network' | 'engine'
}

function resolveSource(dataSource: string): Source {
  if (dataSource === 'live' && (hereHasKey() || tomtomHasKey())) {
    return { provider: 'CrossFlow Intelligence Engine', live: true, label: 'Live synchronized data', tone: 'live' }
  }
  if (dataSource === 'osm') {
    return { provider: 'CrossFlow Intelligence Engine', live: false, label: 'Road network synchronized', tone: 'network' }
  }
  return { provider: 'CrossFlow Intelligence Engine', live: false, label: 'Resilient engine fallback', tone: 'engine' }
}

const TONE_STYLES: Record<Source['tone'], { dot: string; text: string; ring: string }> = {
  live: { dot: 'bg-brand', text: 'text-brand', ring: 'ring-brand/20' },
  network: { dot: 'bg-sky-400', text: 'text-sky-400', ring: 'ring-sky-400/20' },
  engine: { dot: 'bg-text-muted', text: 'text-text-muted', ring: 'ring-bg-border' },
}

export function DataSourceBadge() {
  const dataSource = useTrafficStore(s => s.dataSource)
  const snapshot = useTrafficStore(s => s.snapshot)
  const source = resolveSource(dataSource)
  const tone = TONE_STYLES[source.tone]
  const [open, setOpen] = useState(false)

  const [ageText, setAgeText] = useState('—')
  useEffect(() => {
    if (!snapshot?.fetchedAt) {
      setAgeText('—')
      return
    }
    const update = () => {
      const diff = Math.max(0, Math.round((Date.now() - new Date(snapshot.fetchedAt).getTime()) / 1000))
      if (diff < 60) setAgeText(`il y a ${diff}s`)
      else setAgeText(`il y a ${Math.round(diff / 60)} min`)
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
          'glass-card flex items-center gap-2 h-10 px-3.5 rounded-2xl ring-1 transition-all hover:border-text-muted',
          tone.ring,
        )}
        title="CrossFlow synchronization state"
      >
        <span className="relative flex items-center justify-center">
          <span className={cn('w-2 h-2 rounded-full', tone.dot)} />
          {source.live && <span className={cn('absolute w-2 h-2 rounded-full animate-ping', tone.dot)} />}
        </span>
        {source.live
          ? <Wifi className={cn('w-3.5 h-3.5', tone.text)} strokeWidth={2.2} />
          : <WifiOff className={cn('w-3.5 h-3.5', tone.text)} strokeWidth={2.2} />}
        <span className={cn('text-[12px] font-semibold tracking-tight', tone.text)}>CrossFlow</span>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 w-72 glass-card rounded-2xl p-3.5 z-50 animate-scale-in"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-3.5 h-3.5 text-brand" />
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-[0.18em]">Synchronization state</span>
          </div>
          <div className="space-y-1.5 text-[12px]">
            <Row k="Engine" v={source.provider} />
            <Row k="Mode" v={source.label} />
            <Row k="Status" v={source.live ? 'Live synchronized' : 'Validated fallback'} />
            <Row k="Segments" v={segmentCount.toLocaleString('fr-FR')} />
            <Row k="Last sync" v={ageText} />
          </div>
          {!source.live && (
            <p className="mt-2 pt-2 border-t border-bg-border text-[11px] text-text-muted leading-relaxed">
              The platform remains operational with validated network estimates until live synchronization is restored.
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
