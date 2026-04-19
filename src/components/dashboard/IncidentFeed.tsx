'use client'

import { AlertTriangle, ArrowRight, Clock, MapPin, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { useTrafficStore } from '@/store/trafficStore'
import { SeverityPill } from '@/components/ui/SeverityPill'
import { cn } from '@/lib/utils/cn'

// French labels for incident types — covers both lower and uppercase from various sources (#26)
const TYPE_LABELS: Record<string, string> = {
  accident: 'Accident',
  roadwork: 'Travaux',
  ROADWORK: 'Travaux',
  congestion: 'Congestion',
  CONGESTION: 'Congestion',
  anomaly: 'Anomalie IA',
  ANOMALY: 'Anomalie IA',
  event: 'Événement',
  EVENT: 'Événement',
}

interface IncidentFeedProps {
  maxItems?: number
  title?: string
  subtitle?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export function IncidentFeed({
  maxItems = 3,
  title = 'Alertes actives',
  subtitle = 'Triées par sévérité, 3 visibles maximum',
  ctaLabel,
  onCtaClick,
}: IncidentFeedProps) {
  const incidents = useTrafficStore(s => s.incidents)
  const sorted = [...incidents]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return order[a.severity] - order[b.severity]
    })
    .slice(0, maxItems)

  return (
    <div className="card-premium overflow-hidden border border-white/5">
      <div className="px-6 py-5 border-b border-white/5 flex flex-col gap-3 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-[#FF6D00]" />
            <span className="text-[13px] font-bold text-white uppercase tracking-[0.15em]">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-brand-green shadow-glow animate-pulse" />
            <span className="text-[11px] font-bold text-text-muted bg-white/5 px-2.5 py-1 rounded-full border border-white/5">
              {sorted.length}{incidents.length > maxItems ? `/${incidents.length}` : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-text-muted">{subtitle}</p>
          {ctaLabel && onCtaClick && (
            <button
              onClick={onCtaClick}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand hover:bg-brand/15 transition-colors"
            >
              {ctaLabel}
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="px-6 py-10 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-apple bg-brand-green/10 flex items-center justify-center mx-auto mb-4 border border-brand-green/20">
            <Zap className="w-6 h-6 text-brand-green shadow-glow" />
          </div>
          <p className="text-[15px] font-bold text-white">Réseau nominal</p>
          <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-medium">Aucun dysfonctionnement détecté</p>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {sorted.map(inc => (
          <div
            key={inc.id}
            className={cn(
              'px-6 py-5 hover:bg-white/[0.03] transition-all duration-300 cursor-pointer relative group',
              inc.severity === 'critical' && 'bg-red-500/[0.02]',
            )}
          >
            {inc.severity === 'critical' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF1744] shadow-glow" />}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <SeverityPill severity={inc.severity} size="sm" />
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] opacity-70 group-hover:opacity-100 transition-opacity">
                    {TYPE_LABELS[inc.type] ?? inc.type}
                  </span>
                  {inc.severity === 'critical' && (
                    <span className="text-[9px] font-black uppercase tracking-wider text-[#FF1744]">
                      Priorité haute
                    </span>
                  )}
                </div>
                <p className="text-[14px] font-bold text-white truncate group-hover:text-brand-green transition-colors">
                  {inc.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted/70">
                    <MapPin className="w-3.5 h-3.5" />
                    {inc.address.split('—')[1]?.trim() || inc.address}
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-muted/70">
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

      {incidents.length > sorted.length && (
        <div className="px-6 py-3 border-t border-white/5 bg-white/[0.02] flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            + {incidents.length - sorted.length} autres alertes
          </span>
        </div>
      )}
    </div>
  )
}
