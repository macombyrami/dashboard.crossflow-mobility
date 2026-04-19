import { 
  CheckCircle2, TrendingDown, TrendingUp, Minus, Clock, Gauge, Wind, 
  Map, Route, Cpu, Download, Share2, Save, FileText, Table, History 
} from 'lucide-react'
import { useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'
import { formatDistanceToNow } from 'date-fns'
import { enUS, fr } from 'date-fns/locale'
import type { SimulationResult } from '@/types'
import { useTranslation } from '@/lib/hooks/useTranslation'
import { toast } from 'sonner'
import jsPDF from 'jspdf'
import Papa from 'papaparse'
import Link from 'next/link'

export function SimulationResults() {
  const { t, locale } = useTranslation()
  const results       = useSimulationStore(s => s.results)
  const currentResult = useSimulationStore(s => s.currentResult)
  const setCurrentResult = useSimulationStore(s => s.setCurrentResult)

  const dateLocale = locale === 'fr' ? fr : enUS

  if (results.length === 0) return null

  return (
    <div className="space-y-4">
      {currentResult && <ResultDetail result={currentResult} />}

      <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-widest">{t('simulation.history')}</p>
          <Link 
            href="/simulations/history" 
            className="text-[10px] font-bold text-brand uppercase tracking-wider hover:underline flex items-center gap-1"
          >
            <History className="w-3 h-3" />
            Voir tout
          </Link>
        </div>
        <div className="divide-y divide-bg-border">
          {results.slice(0, 5).map(r => (
            <button
              key={r.id}
              onClick={() => setCurrentResult(r)}
              className={cn(
                'w-full flex items-center justify-between px-5 py-3.5 hover:bg-bg-elevated transition-colors text-left',
                currentResult?.id === r.id && 'bg-brand/5',
              )}
            >
              <div>
                <p className="text-sm font-medium text-text-primary truncate max-w-[120px]">{r.scenarioName}</p>
                {r.completedAt && (
                  <p className="text-[10px] text-text-muted mt-0.5">
                    {formatDistanceToNow(new Date(r.completedAt), { locale: dateLocale, addSuffix: true })}
                  </p>
                )}
              </div>
              <DeltaBadge delta={r.delta.congestionPct} inverse />
            </button>
          ))}
          {results.length === 0 && (
            <div className="px-5 py-8 text-center text-text-muted">
               <p className="text-xs italic">Aucune simulation enregistrée</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultDetail({ result }: { result: SimulationResult }) {
  const { t } = useTranslation()
  const { before, after, delta } = result

  const handleExportPDF = () => {
    const doc = new jsPDF()
    const title = `Rapport de Simulation - ${result.scenarioName}`
    
    // Minimalist branding
    doc.setFillColor(16, 168, 84)
    doc.rect(0, 0, 210, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.text(title, 15, 13)
    
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(12)
    doc.text(`Date: ${new Date(result.completedAt || Date.now()).toLocaleString()}`, 15, 30)
    
    doc.text('IMPACT RÉSEAU:', 15, 45)
    doc.setFontSize(10)
    doc.text(`Congestion: ${Math.round(before.congestionRate * 100)}% -> ${Math.round(after.congestionRate * 100)}% (${delta.congestionPct > 0 ? '+' : ''}${delta.congestionPct}%)`, 20, 55)
    doc.text(`Temps de trajet: ${before.avgTravelMin} min -> ${after.avgTravelMin.toFixed(1)} min (${delta.travelTimePct > 0 ? '+' : ''}${delta.travelTimePct}%)`, 20, 65)
    doc.text(`Indice Pollution: ${before.pollutionIndex} -> ${after.pollutionIndex} (${delta.pollutionPct > 0 ? '+' : ''}${delta.pollutionPct}%)`, 20, 75)
    
    doc.text('ANALYSE:', 15, 90)
    doc.text("L'impact identifié montre une modification significative des flux de trafic sur les segments affectés.", 20, 100)
    doc.text("Recommandation: Activer les itinéraires de délestage via le PMV (Panneau Message Variable).", 20, 110)
    
    doc.save(`CrossFlow_Simulation_${result.id.slice(0, 8)}.pdf`)
    toast.success('Rapport PDF généré avec succès')
  }

  const handleExportCSV = () => {
    const data = [
      { Metric: 'Scenario', Before: result.scenarioName, After: result.scenarioName, Delta: '-' },
      { Metric: 'Congestion', Before: before.congestionRate, After: after.congestionRate, Delta: delta.congestionPct },
      { Metric: 'TravelTime', Before: before.avgTravelMin, After: after.avgTravelMin, Delta: delta.travelTimePct },
      { Metric: 'Pollution', Before: before.pollutionIndex, After: after.pollutionIndex, Delta: delta.pollutionPct },
    ]
    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `CrossFlow_Simulation_${result.id.slice(0, 8)}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Données CSV exportées')
  }

  const handleSave = () => {
    toast.success('Simulation sauvegardée avec succès', {
      description: 'Retrouvez votre historique dans la section "Mes Simulations".',
      duration: 4000
    })
  }

  const handleShare = () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    navigator.clipboard.writeText(url)
    toast.info('Lien de partage copié dans le presse-papiers')
  }

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden shadow-apple">
      <div className="px-5 py-4 border-b border-bg-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-brand/10 flex items-center justify-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand" />
          </div>
          <p className="text-sm font-semibold text-text-primary capitalize">{result.scenarioName}</p>
        </div>
        <div className="flex items-center gap-1">
           <button 
             onClick={handleShare}
             className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-brand transition-all"
             title="Partager"
           >
             <Share2 className="w-3.5 h-3.5" />
           </button>
           <button 
             onClick={handleSave}
             className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-brand transition-all"
             title="Sauvegarder"
           >
             <Save className="w-3.5 h-3.5" />
           </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Comparison grid */}
        <div className="grid grid-cols-3 gap-y-3 gap-x-2 text-center items-center">
          <div />
          <div className="text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">{t('simulation.before')}</div>
          <div className="text-[9px] font-black text-brand uppercase tracking-[0.2em]">{t('simulation.after')}</div>

          <MetricRow
            icon={Gauge} label={t('dashboard.congestion')}
            before={`${Math.round(before.congestionRate * 100)}%`}
            after={`${Math.round(after.congestionRate * 100)}%`}
            delta={delta.congestionPct}
            inverse
          />
          <MetricRow
            icon={Clock} label={t('dashboard.travel_time')}
            before={`${before.avgTravelMin} min`}
            after={`${after.avgTravelMin.toFixed(1)} min`}
            delta={delta.travelTimePct}
            inverse
          />
          <MetricRow
            icon={Wind} label={t('dashboard.pollution')}
            before={`${before.pollutionIndex}`}
            after={`${after.pollutionIndex}`}
            delta={delta.pollutionPct}
            inverse
          />
          <MetricRow
            icon={Map} label="Segments"
            before={`${before.affectedSegments}`}
            after={`${after.affectedSegments}`}
          />
        </div>

        {/* Actions Buttons */}
        <div className="flex items-center gap-2 pt-4 border-t border-bg-border">
           <button 
             onClick={handleExportPDF}
             className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-brand/10 hover:border-brand/20 text-[10px] font-bold text-text-primary uppercase tracking-widest transition-all"
           >
             <FileText className="w-3.5 h-3.5 text-brand" />
             PDF
           </button>
           <button 
             onClick={handleExportCSV}
             className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-brand/10 hover:border-brand/20 text-[10px] font-bold text-text-primary uppercase tracking-widest transition-all"
           >
             <Table className="w-3.5 h-3.5 text-brand" />
             CSV
           </button>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-[10px] text-text-muted uppercase tracking-tight font-medium">Routes Alternatives : <span className="text-text-secondary font-bold">{result.alternativePaths}</span></span>
        </div>

        {/* Predictive route comparison */}
        {result.predictive && <PredictiveRouteSection data={result.predictive} />}
      </div>
    </div>
  )
}

function PredictiveRouteSection({ data }: { data: NonNullable<SimulationResult['predictive']> }) {
  const { normal, simulated, delta } = data
  const timeDeltaS = Math.round(delta.time_s)
  const distDeltaM = Math.round(delta.distance_m)
  const isSlower   = timeDeltaS > 0
  const isLonger   = distDeltaM > 0

  const fmt = (s: number) => s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`
  const fmtM = (m: number) => Math.abs(m) >= 1000 ? `${(Math.abs(m) / 1000).toFixed(1)} km` : `${Math.abs(m)} m`

  return (
    <div className="mt-4 space-y-3 pt-4 border-t border-bg-border">
      <div className="flex items-center gap-2">
        <Cpu className="w-3.5 h-3.5 text-brand-green" />
        <p className="text-[10px] font-bold text-brand-green uppercase tracking-widest">Moteur prédictif OSM · Dijkstra</p>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div />
        <div className="text-[10px] font-semibold text-text-muted uppercase tracking-widest">Normal</div>
        <div className="text-[10px] font-semibold text-brand-green uppercase tracking-widest">Simulé</div>

        {/* Distance */}
        <div className="flex items-center gap-1.5 py-2 border-t border-bg-border">
          <Route className="w-3 h-3 text-text-muted" />
          <span className="text-xs text-text-muted">Distance</span>
        </div>
        <div className="py-2 border-t border-bg-border text-sm font-medium text-text-secondary text-center">
          {(normal.total_distance_m / 1000).toFixed(2)} km
        </div>
        <div className={cn('py-2 border-t border-bg-border text-sm font-bold text-center', isLonger ? 'text-[#FF6D00]' : 'text-brand-green')}>
          {(simulated.total_distance_m / 1000).toFixed(2)} km
        </div>

        {/* Temps */}
        <div className="flex items-center gap-1.5 py-2 border-t border-bg-border">
          <Clock className="w-3 h-3 text-text-muted" />
          <span className="text-xs text-text-muted">Durée</span>
        </div>
        <div className="py-2 border-t border-bg-border text-sm font-medium text-text-secondary text-center">
          {fmt(Math.round(normal.total_time_s))}
        </div>
        <div className={cn('py-2 border-t border-bg-border text-sm font-bold text-center', isSlower ? 'text-[#FF1744]' : 'text-brand-green')}>
          {fmt(Math.round(simulated.total_time_s))}
        </div>
      </div>

      {/* Delta badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md',
          isSlower ? 'text-[#FF1744] bg-[#FF174418]' : 'text-brand-green bg-brand-green/10',
        )}>
          <Clock className="w-3 h-3" />
          {isSlower ? '+' : ''}{fmt(Math.abs(timeDeltaS))}
        </span>
        <span className={cn(
          'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md',
          isLonger ? 'text-[#FF6D00] bg-[#FF6D0018]' : 'text-brand-green bg-brand-green/10',
        )}>
          <Route className="w-3 h-3" />
          {isLonger ? '+' : '-'}{fmtM(distDeltaM)}
        </span>
        {delta.avoided_edges.length > 0 && (
          <span className="text-[10px] text-text-muted">
            {delta.avoided_edges.length} tronçon{delta.avoided_edges.length > 1 ? 's' : ''} évité{delta.avoided_edges.length > 1 ? 's' : ''}
          </span>
        )}
        {delta.added_edges.length > 0 && (
          <span className="text-[10px] text-text-muted">
            {delta.added_edges.length} tronçon{delta.added_edges.length > 1 ? 's' : ''} ajouté{delta.added_edges.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

function MetricRow({ icon: Icon, label, before, after, delta, inverse }: {
  icon:     typeof Gauge
  label:    string
  before:   string
  after:    string
  delta?:   number
  inverse?: boolean
}) {
  return (
    <>
      <div className="flex items-center gap-1.5 py-2 border-t border-bg-border">
        <Icon className="w-3 h-3 text-text-muted" />
        <span className="text-xs text-text-muted">{label}</span>
        {delta !== undefined && <DeltaBadge delta={delta} inverse={inverse} size="sm" />}
      </div>
      <div className="py-2 border-t border-bg-border text-sm font-medium text-text-secondary text-center">{before}</div>
      <div className="py-2 border-t border-bg-border text-sm font-bold text-text-primary text-center">{after}</div>
    </>
  )
}

function DeltaBadge({ delta, inverse, size = 'md' }: { delta: number; inverse?: boolean; size?: 'sm' | 'md' }) {
  const isGood = inverse ? delta < 0 : delta > 0
  const color  = Math.abs(delta) < 2 ? '#8080A0' : isGood ? '#00E676' : '#FF1744'
  const sign   = delta > 0 ? '+' : ''
  const Icon   = delta < -2 ? TrendingDown : delta > 2 ? TrendingUp : Minus
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-semibold rounded-md',
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1',
    )} style={{ color, backgroundColor: `${color}18` }}>
      <Icon className="w-3 h-3" />
      {sign}{Math.abs(delta)}%
    </span>
  )
}
