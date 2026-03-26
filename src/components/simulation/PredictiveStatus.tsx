'use client'
import { useEffect, useState } from 'react'
import { Server, CheckCircle, XCircle, RefreshCw, Map, Activity } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface BackendHealth {
  online: boolean
  version?: string
  graph_loaded?: boolean
  node_count?: number
  edge_count?: number
}

export function PredictiveStatus() {
  const [health,       setHealth]       = useState<BackendHealth | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [graphLoading, setGraphLoading] = useState(false)

  const check = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/predictive/health')
      const data: BackendHealth = await res.json()
      setHealth(data)
      return data
    } catch {
      setHealth({ online: false })
    } finally {
      setLoading(false)
    }
  }

  const loadGraph = async () => {
    setGraphLoading(true)
    try {
      await fetch('/api/predictive/graph/load-gennevilliers', { method: 'POST' })
      setTimeout(check, 3000)
    } catch { /* ignore */ } finally {
      setGraphLoading(false)
    }
  }

  useEffect(() => {
    check().then(data => {
      // Auto-load graph if backend is online but graph not yet loaded
      if (data?.online && !data?.graph_loaded) {
        loadGraph()
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!health && loading) return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-surface border border-bg-border">
      <RefreshCw className="w-3.5 h-3.5 text-text-muted animate-spin" />
      <span className="text-xs text-text-muted">Connexion backend…</span>
    </div>
  )

  if (!health?.online) return (
    <div className="rounded-xl border border-bg-border bg-bg-surface p-3 space-y-2">
      <div className="flex items-center gap-2">
        <XCircle className="w-4 h-4 text-[#FF1744]" />
        <span className="text-xs font-semibold text-[#FF1744]">Backend hors-ligne</span>
      </div>
      <p className="text-[10px] text-text-muted leading-relaxed">
        Le moteur prédictif Python (FastAPI) n'est pas démarré.
      </p>
      <div className="bg-bg-elevated rounded-lg p-2 font-mono text-[10px] text-text-muted">
        <div>cd crossflow-mobility-predictive-main</div>
        <div>uvicorn backend.main:app --port 8000</div>
      </div>
      <button
        onClick={check}
        className="w-full text-xs text-brand border border-brand/20 rounded-lg py-1.5 hover:bg-brand/5 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )

  return (
    <div className="rounded-xl border border-[rgba(0,230,118,0.25)] bg-[rgba(0,230,118,0.06)] p-3 space-y-3">
      {/* Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-brand-green" />
          <span className="text-xs font-semibold text-brand-green">Backend connecté</span>
        </div>
        <button
          onClick={check}
          disabled={loading}
          className="p-1 rounded hover:bg-brand-green/10 transition-colors"
        >
          <RefreshCw className={cn('w-3 h-3 text-text-muted', loading && 'animate-spin')} />
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          icon={<Server className="w-3 h-3" />}
          label="API"
          value={`v${health.version ?? '1.0.0'}`}
          color="text-brand-green"
        />
        <StatTile
          icon={<Map className="w-3 h-3" />}
          label="Graphe"
          value={health.graph_loaded ? 'Chargé' : 'Non chargé'}
          color={health.graph_loaded ? 'text-brand-green' : 'text-[#FFB300]'}
        />
        {health.node_count !== undefined && (
          <StatTile
            icon={<Activity className="w-3 h-3" />}
            label="Nœuds"
            value={health.node_count.toLocaleString('fr-FR')}
            color="text-text-primary"
          />
        )}
        {health.edge_count !== undefined && (
          <StatTile
            icon={<Activity className="w-3 h-3" />}
            label="Segments"
            value={health.edge_count.toLocaleString('fr-FR')}
            color="text-text-primary"
          />
        )}
      </div>

      {/* Load graph button */}
      {!health.graph_loaded && (
        <button
          onClick={loadGraph}
          disabled={graphLoading}
          className="w-full text-xs bg-brand-green/10 text-brand-green border border-brand-green/30 rounded-lg py-2 hover:bg-brand-green/20 transition-colors font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
        >
          {graphLoading
            ? <><RefreshCw className="w-3 h-3 animate-spin" />Chargement du graphe…</>
            : 'Charger le graphe OSM'
          }
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
