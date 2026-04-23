'use client'
import { AlertTriangle, Clock, MapPin, CheckCircle2 } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { SeverityPill } from '@/components/ui/SeverityPill'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'
import type { Incident } from '@/types'

const TYPE_LABELS: Record<Incident['type'], string> = {
  accident:  'Accident',
  roadwork:  'Travaux',
  congestion:'Congestion',
  anomaly:   'Anomalie',
  event:     'Événement',
}

interface IncidentFeedProps {
  maxItems?: number
  title?: string
  subtitle?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export function IncidentFeed({
  maxItems = 5,
  title = 'Incidents Actifs',
  subtitle,
  ctaLabel,
  onCtaClick,
}: IncidentFeedProps) {
  const incidents = useTrafficStore(s => s.incidents)
  const sorted    = [...incidents]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return order[a.severity] - order[b.severity]
    })
    .slice(0, maxItems)

  // Count by type for pills
  const accidentCount  = incidents.filter(i => i.type === 'accident').length
  const roadworkCount  = incidents.filter(i => i.type === 'roadwork').length
  const congestionCount = incidents.filter(i => i.type === 'congestion').length

  return (
    <div className="card-premium overflow-hidden border border-bg-border">
      <div className="px-6 py-5 border-b border-bg-border flex items-center justify-between bg-bg-subtle/40">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#FF9F0A]" />
          <div>
            <span className="text-[13px] font-bold text-text-primary uppercase tracking-[0.15em]">{title}</span>
            {subtitle ? <p className="mt-1 text-[11px] text-text-muted normal-case tracking-normal">{subtitle}</p> : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ctaLabel && onCtaClick ? (
            <button
              type="button"
              onClick={onCtaClick}
              className="text-[10px] font-bold uppercase tracking-wider text-brand hover:text-brand/80 transition-colors"
            >
              {ctaLabel}
            </button>
          ) : null}
          <div className="w-2 h-2 rounded-full bg-brand shadow-glow animate-pulse" />
          <span className="text-[11px] font-bold text-text-muted bg-bg-subtle px-2.5 py-1 rounded-full border border-bg-border">
            {incidents.length}
          </span>
        </div>
      </div>

      {/* Type pills summary */}
      {incidents.length > 0 && (
        <div className="px-6 py-3 flex items-center gap-2 border-b border-bg-border/50 flex-wrap">
          {accidentCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-[#FF3B30] border border-red-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF3B30]" />
              {accidentCount} accident{accidentCount > 1 ? 's' : ''}
            </span>
          )}
          {roadworkCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-500/10 text-[#FF9F0A] border border-orange-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF9F0A]" />
              {roadworkCount} travaux
            </span>
          )}
          {congestionCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-[#FFD600] border border-yellow-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FFD600]" />
              {congestionCount} congestion{congestionCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {sorted.length === 0 && (
        <div className="px-6 py-10 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-apple bg-brand/10 flex items-center justify-center mx-auto mb-4 border border-brand/20">
            <CheckCircle2 className="w-6 h-6 text-brand" />
          </div>
          <p className="text-[15px] font-bold text-text-primary">Aucun incident en cours</p>
          <p className="text-[11px] text-text-muted mt-1.5 font-medium leading-relaxed">
            Circulation stable sur l'ensemble du réseau
          </p>
          <p className="text-[10px] text-text-muted/60 mt-1">
            Le trafic est réparti de manière homogène
          </p>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {sorted.map(inc => (
          <div key={inc.id} className={cn(
            'px-6 py-5 hover:bg-bg-subtle/60 transition-all duration-300 cursor-pointer relative group',
            inc.severity === 'critical' && 'bg-red-500/[0.02]',
          )}>
            {inc.severity === 'critical' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 shadow-glow" />}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <SeverityPill severity={inc.severity} size="sm" />
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] opacity-60 group-hover:opacity-100 transition-opacity">
                    {TYPE_LABELS[inc.type] ?? inc.type}
                  </span>
                </div>
                <p className="text-[14px] font-bold text-text-primary truncate group-hover:text-brand transition-colors">{inc.title}</p>
                <div className="flex items-center gap-4 mt-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted/60">
                    <MapPin className="w-3.5 h-3.5" />
                    {inc.address.split('—')[1]?.trim() || inc.address}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted/60">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDistanceToNow(new Date(inc.startedAt), { locale: fr, addSuffix: true })}
                  </span>
                </div>
              </div>
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 shadow-glow group-hover:scale-125 transition-transform"
                style={{ backgroundColor: inc.iconColor }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
