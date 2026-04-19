'use client'
import { AlertTriangle, Clock, MapPin, Zap } from 'lucide-react'
import { useTrafficStore } from '@/store/trafficStore'
import { SeverityPill } from '@/components/ui/SeverityPill'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils/cn'

export function IncidentFeed({ maxItems = 5 }: { maxItems?: number }) {
  const incidents = useTrafficStore(s => s.incidents)
  const sorted    = [...incidents]
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 }
      return order[a.severity] - order[b.severity]
    })
    .slice(0, maxItems)

  return (
    <div className="card-premium overflow-hidden border border-bg-border">
      <div className="px-6 py-5 border-b border-bg-border flex items-center justify-between bg-bg-subtle/40">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#FF9F0A]" />
          <span className="text-[13px] font-bold text-text-primary uppercase tracking-[0.15em]">Incidents Actifs</span>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-brand shadow-glow animate-pulse" />
           <span className="text-[11px] font-bold text-text-muted bg-bg-subtle px-2.5 py-1 rounded-full border border-bg-border">
             {incidents.length}
           </span>
        </div>
      </div>

      {sorted.length === 0 && (
        <div className="px-6 py-10 text-center animate-fade-in">
          <div className="w-12 h-12 rounded-apple bg-brand/10 flex items-center justify-center mx-auto mb-4 border border-brand/20">
            <Zap className="w-6 h-6 text-brand shadow-glow" />
          </div>
          <p className="text-[15px] font-bold text-text-primary">Réseau Nominal</p>
          <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider font-medium">Aucun dysfonctionnement détecté</p>
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
                  <span className="text-[9px] font-bold text-text-muted uppercase tracking-[0.15em] opacity-60 group-hover:opacity-100 transition-opacity">{inc.type}</span>
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
