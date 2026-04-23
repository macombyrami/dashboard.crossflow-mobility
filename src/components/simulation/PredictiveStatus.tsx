'use client'
import { useEffect } from 'react'
import { Server, CheckCircle, XCircle, RefreshCw, Map, Activity, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useMapStore } from '@/store/mapStore'
import { useSimulationStore } from '@/store/simulationStore'
import { simulationService } from '@/lib/services/SimulationService'

export function PredictiveStatus() {
  const city = useMapStore((s: any) => s.city)
  const { status, graphLoaded, backendOnline, lastError } = useSimulationStore()

  const loading = status === 'initializing'

  const check = async () => {
    simulationService.initEngine(city)
  }

  useEffect(() => {
    if (city.name === 'Gennevilliers' && (!backendOnline || !graphLoaded)) {
      simulationService.initEngine(city)
    }
  }, [city.name, backendOnline, graphLoaded, city])

  if (status === 'idle' && !backendOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-bg-border">
        <Loader2 className="w-3.5 h-3.5 text-text-muted animate-spin" />
        <span className="text-xs text-text-muted">Connexion au moteur…</span>
      </div>
    )
  }

  if (!backendOnline) {
    return (
      <div className="rounded-xl border border-bg-border bg-bg-surface p-3 space-y-2">
        <div className="flex items-center gap-2">
          <XCircle className="w-4 h-4 text-[#FF1744]" />
          <span className="text-xs font-semibold text-[#FF1744]">Moteur hors-ligne</span>
        </div>
        <p className="text-[10px] text-text-muted leading-relaxed">
          Le moteur d’anticipation n’est pas disponible au démarrage.
        </p>
        <div className="bg-bg-elevated rounded-lg p-2 font-mono text-[10px] text-text-muted">
          <div>cd crossflow-mobility-predictive-main</div>
          <div>uvicorn backend.main:app --port 8000</div>
        </div>
        <button
          onClick={check}
          className="w-full text-xs text-brand border border-brand/20 rounded-lg py-1.5 hover:bg-brand/5 transition-colors cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-xl border p-3 space-y-3 transition-all",
      graphLoaded
        ? "border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.06)]"
        : "border-orange-500/20 bg-orange-500/5"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {graphLoaded ? (
            <CheckCircle className="w-4 h-4 text-brand-green" />
          ) : (
            <Activity className="w-4 h-4 text-orange-400 animate-pulse" />
          )}
          <span className={cn(
            "text-xs font-semibold",
            graphLoaded ? "text-brand-green" : "text-orange-400"
          )}>
            {graphLoaded ? 'Lecture active' : 'Initialisation'}
          </span>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="p-1 rounded hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3 h-3 text-text-muted', loading && 'animate-spin')} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={<Server className="w-3 h-3" />}
          label="État de lecture"
          value={backendOnline ? 'Actif' : 'Inactif'}
          color={backendOnline ? 'text-brand-green' : 'text-red-400'}
        />
        <StatTile
          icon={<Map className="w-3 h-3" />}
          label="Couverture réseau"
          value={graphLoaded ? 'Chargée' : 'En attente'}
          color={graphLoaded ? 'text-brand-green' : 'text-orange-400'}
        />
      </div>

      {lastError && (
        <div className="rounded-lg bg-[rgba(255,23,68,0.08)] border border-[rgba(255,23,68,0.2)] px-3 py-2 text-[10px] text-[#FF1744] leading-relaxed">
          {lastError}
        </div>
      )}

      {!graphLoaded && (
        <button
          onClick={check}
          disabled={loading}
          className="w-full text-xs bg-orange-500/10 text-orange-400 border border-orange-500/30 rounded-lg py-2 hover:bg-orange-500/20 transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              Chargement de la lecture â€” {city.name}â€¦
            </>
          ) : (
            `Lancer la lecture â€” ${city.name}`
          )}
        </button>
      )}
    </div>
  )
}

function StatTile({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div className="bg-bg-surface/60 rounded-lg p-2 space-y-1 border border-bg-border/50">
      <div className="flex items-center gap-1 text-text-muted">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <p className={cn('text-xs font-semibold', color)}>{value}</p>
    </div>
  )
}
