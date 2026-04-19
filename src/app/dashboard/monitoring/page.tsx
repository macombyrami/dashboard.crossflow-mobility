import React from 'react'
import { createClient } from '@/lib/supabase/server'
import {
  BarChart3,
  ShieldCheck,
  Zap,
  AlertCircle,
  Database,
  RefreshCw,
  Activity,
  Layers,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export const dynamic = 'force-dynamic'

export default async function MonitoringPage() {
  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('api_usage_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const total = logs?.length || 0
  const cacheHits = logs?.filter((l: any) => l.cache_status.startsWith('hit')).length || 0
  const predictiveHits = logs?.filter((l: any) => l.cache_status === 'predictive').length || 0
  const errors = logs?.filter((l: any) => (l.status ?? 200) >= 400).length || 0
  const hitRatio = total ? ((cacheHits + predictiveHits) / total * 100).toFixed(1) : '0'

  const stats = [
    { label: 'Lectures totales', value: total, icon: Activity, color: 'text-brand-green' },
    { label: 'Taux de réutilisation', value: `${hitRatio}%`, icon: ShieldCheck, color: 'text-brand' },
    { label: 'Économies prédictives', value: predictiveHits, icon: Zap, color: 'text-purple-400' },
    { label: 'Points d’attention', value: errors, icon: AlertCircle, color: errors > 0 ? 'text-traffic-critical' : 'text-text-muted' },
  ]

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-text-primary tracking-tighter">Pilotage technique</h1>
          <p className="text-text-muted mt-1 uppercase text-[11px] font-bold tracking-widest italic opacity-70">
            Santé de la plateforme en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 border border-brand/20">
          <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          <span className="text-[10px] font-black text-brand uppercase tracking-tighter">Vue active</span>
        </div>
      </div>

      <div className="kpi-grid mb-4">
        {stats.map((s, i) => (
          <div key={i} className="glass p-6 rounded-3xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <s.icon className={cn("w-5 h-5", s.color)} />
              <Layers className="w-4 h-4 text-white/5" />
            </div>
            <div>
              <p className="text-3xl font-black text-text-primary">{s.value}</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass rounded-3xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-brand" />
              <span className="text-[12px] font-black uppercase tracking-widest">Lecture récente</span>
            </div>
            <RefreshCw className="w-4 h-4 text-text-muted animate-spin-slow" />
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.01] border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Signal</th>
                  <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">État</th>
                  <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Mise en cache</th>
                  <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Latence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs?.map((l) => (
                  <tr key={l.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-text-primary uppercase tracking-tighter">{l.service}</span>
                        <span className="text-[10px] text-text-muted font-medium truncate max-w-[120px]">{l.endpoint}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter",
                        l.status >= 400 ? "bg-traffic-critical/10 text-traffic-critical border-traffic-critical/20" : "bg-brand-green/10 text-brand-green border-brand-green/20"
                      )}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          l.cache_status.startsWith('hit') ? "bg-brand" : l.cache_status === 'predictive' ? "bg-purple-400" : "bg-text-muted"
                        )} />
                        <span className="text-[11px] font-bold text-text-secondary uppercase">{l.cache_status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-medium text-text-muted tabular-nums">
                        {l.response_time ? `${l.response_time}ms` : '--'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass p-6 rounded-3xl border border-white/5">
            <h3 className="text-[12px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-green" />
              Lecture de valeur
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                <span className="text-[11px] font-bold text-text-muted uppercase">Économies estimées</span>
                <span className="text-xl font-black text-brand-green tracking-tighter">
                  ${((total * 0.002) * (parseFloat(hitRatio) / 100)).toFixed(2)}
                </span>
              </div>
              <p className="text-[10px] text-text-muted italic leading-relaxed px-1">
                Calculé à partir du volume de lectures et du taux de réutilisation global.
              </p>
            </div>
          </div>

          <div className="glass p-6 rounded-3xl border border-white/5 border-l-brand/30">
            <h3 className="text-[12px] font-black uppercase tracking-widest">Intégrité de cache</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] font-bold text-text-secondary">
                <span>Densité mémoire</span>
                <span>À optimiser</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-brand w-[35%] shadow-glow" />
              </div>
              <p className="text-[10px] text-text-muted leading-tight mt-2">
                La densité mémoire reste basse. Un meilleur regroupement des lectures améliore la stabilité.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
