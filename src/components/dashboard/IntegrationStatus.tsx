'use client'
import { CheckCircle2, XCircle, Wifi, AlertCircle } from 'lucide-react'
import { hasKey as hasTomTom } from '@/lib/api/tomtom'
import { hasKey as hasHERE } from '@/lib/api/here'
import { hasKey as hasNavitia } from '@/lib/api/navitia'
import { cn } from '@/lib/utils/cn'

export function IntegrationStatus() {
  const integrations = [
    { label: 'TomTom (Traffic Index)', status: hasTomTom() ? 'live' : 'demo', provider: 'TomTom' },
    { label: 'HERE (Flow Data)',      status: hasHERE()   ? 'live' : 'demo', provider: 'HERE Technologies' },
    { label: 'Navitia (Disruptions)', status: hasNavitia() ? 'live' : 'demo', provider: 'Kisio Digital' },
    { label: 'RATP (Real-time)',      status: 'live', provider: 'Pierre-Grimaud RATP API' }, // Community API
    { label: 'OpenMeteo (Weather)',   status: 'live', provider: 'Open-Meteo' }, // No key required
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] mb-4">
        Connectivité API
      </h3>
      <div className="space-y-2">
        {integrations.map((integ) => (
          <div 
            key={integ.label}
            className="flex items-center justify-between p-3 rounded-xl bg-bg-subtle border border-bg-border hover:bg-bg-hover transition-colors group"
          >
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">
                {integ.label}
              </span>
              <span className="text-[10px] text-text-muted">
                {integ.provider}
              </span>
            </div>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
              integ.status === 'live' 
                ? "bg-brand/10 text-brand border-brand/20"
                : "bg-orange-500/10 text-orange-500 border-orange-500/20"
            )}>
              {integ.status === 'live' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {integ.status.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed mt-4 italic font-medium">
        * Le mode DEMO utilise des modèles probabilistes pour simuler les flux en l'absence de clé API.
      </p>
    </div>
  )
}
