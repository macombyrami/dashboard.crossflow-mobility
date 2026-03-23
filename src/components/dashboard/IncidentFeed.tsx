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
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#FF6D00]" />
          <span className="text-sm font-semibold text-text-primary">Incidents actifs</span>
        </div>
        <span className="text-xs font-medium text-text-muted bg-bg-subtle px-2 py-0.5 rounded-full">
          {incidents.length}
        </span>
      </div>

      {sorted.length === 0 && (
        <div className="px-5 py-8 text-center">
          <Zap className="w-6 h-6 text-[#00E676] mx-auto mb-2" />
          <p className="text-sm text-text-secondary">Réseau nominal</p>
          <p className="text-xs text-text-muted">Aucun incident signalé</p>
        </div>
      )}

      <div className="divide-y divide-bg-border">
        {sorted.map(inc => (
          <div key={inc.id} className={cn(
            'px-5 py-3.5 hover:bg-bg-elevated transition-colors cursor-pointer',
            inc.severity === 'critical' && 'border-l-2 border-l-[#FF1744]',
          )}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <SeverityPill severity={inc.severity} size="sm" />
                  <span className="text-[10px] text-text-muted uppercase tracking-wide">{inc.type}</span>
                </div>
                <p className="text-sm font-medium text-text-primary truncate">{inc.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <MapPin className="w-3 h-3" />
                    {inc.address.split('—')[1]?.trim() || inc.address}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(inc.startedAt), { locale: fr, addSuffix: true })}
                  </span>
                </div>
              </div>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: inc.iconColor }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
