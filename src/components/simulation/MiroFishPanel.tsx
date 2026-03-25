'use client'
/**
 * MiroFishPanel — Panneau de simulation multi-agents (interface française)
 * Intègre : sélecteur de mode, lancement, progression, rapport narratif, agents
 */
import { useState } from 'react'
import { Brain, Zap, Users, TrendingUp, AlertTriangle, CheckCircle, RotateCcw, ChevronDown, ChevronUp, Cpu, Shield } from 'lucide-react'
import { useMiroFish, CONFIG_MODES, type ModeSimulation } from '@/hooks/useMiroFish'
import { useMapStore } from '@/store/mapStore'
import { useTrafficStore } from '@/store/trafficStore'
import { useSimulationStore } from '@/store/simulationStore'
import { cn } from '@/lib/utils/cn'
import type { MiroFishResult } from '@/app/api/simulation/mirofish/route'

// ─── Libellés scénarios en français ──────────────────────────────────────────

const LIBELLES_SCENARIOS: Record<string, { label: string; description: string; emoji: string }> = {
  road_closure:       { label: 'Fermeture de voie',    emoji: '🚧', description: 'Fermeture totale ou partielle d\'un axe routier majeur' },
  traffic_light:      { label: 'Feux de circulation',  emoji: '🚦', description: 'Optimisation ou panne du système de signalisation' },
  bike_lane:          { label: 'Piste cyclable',        emoji: '🚲', description: 'Création ou suppression d\'une piste cyclable dédiée' },
  speed_limit:        { label: 'Limitation de vitesse', emoji: '🔵', description: 'Modification temporaire de la vitesse autorisée' },
  public_transport:   { label: 'Transport en commun',  emoji: '🚌', description: 'Perturbation ou nouveau service de transport public' },
  event:              { label: 'Événement urbain',      emoji: '🎪', description: 'Grand événement impactant la circulation locale' },
}

// ─── Score couleur ────────────────────────────────────────────────────────────

function couleurScore(score: number) {
  if (score >= 75) return { text: '#FF3B30', bg: 'rgba(255,59,48,0.1)',  border: 'rgba(255,59,48,0.25)' }
  if (score >= 50) return { text: '#FF9F0A', bg: 'rgba(255,159,10,0.1)', border: 'rgba(255,159,10,0.25)' }
  if (score >= 25) return { text: '#FFD60A', bg: 'rgba(255,214,10,0.08)',border: 'rgba(255,214,10,0.2)' }
  return              { text: '#22C55E', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.2)' }
}

function couleurTendance(tendance: string) {
  if (tendance === 'hausse')  return '#FF3B30'
  if (tendance === 'baisse')  return '#22C55E'
  return '#FFD60A'
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function MiroFishPanel() {
  const city         = useMapStore(s => s.city)
  const kpis         = useTrafficStore(s => s.kpis)
  const scenarioType = useSimulationStore(s => s.scenarioType)
  const incidents    = useTrafficStore(s => s.incidents)

  const { statut, resultat, erreur, elapsed, lancer, reinitialiser } = useMiroFish()

  const [mode, setMode] = useState<ModeSimulation>('standard')
  const [horizon, setHorizon] = useState(2)
  const [agentsExpanded, setAgentsExpanded] = useState(false)

  const scenarioInfo = LIBELLES_SCENARIOS[scenarioType] ?? LIBELLES_SCENARIOS.road_closure

  const lancerSimulation = () => {
    const congestion        = kpis?.congestionRate ?? 0.55
    const vitesseMoyenne    = kpis ? Math.round((1 - congestion) * 80) : 35
    const incidentsTitres   = incidents.slice(0, 3).map(i => i.title)
    const evenements: string[] = []

    lancer(
      city,
      scenarioType,
      `${scenarioInfo.description} à ${city.name}`,
      congestion,
      vitesseMoyenne,
      incidentsTitres,
      evenements,
      { mode, horizonHeures: horizon },
    )
  }

  // ── Repos ──────────────────────────────────────────────────────────────────
  if (statut === 'repos') {
    return (
      <PanneauConfig
        mode={mode}
        setMode={setMode}
        horizon={horizon}
        setHorizon={setHorizon}
        scenarioInfo={scenarioInfo}
        cityName={city.name}
        onLancer={lancerSimulation}
      />
    )
  }

  // ── En cours ───────────────────────────────────────────────────────────────
  if (statut === 'en_cours') {
    return <PanneauChargement elapsed={elapsed} mode={mode} />
  }

  // ── Erreur ─────────────────────────────────────────────────────────────────
  if (statut === 'echouee') {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-400 mb-1">Simulation échouée</p>
            <p className="text-xs text-red-400/70">{erreur}</p>
          </div>
        </div>
        <button
          onClick={reinitialiser}
          className="w-full btn btn-secondary py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm"
        >
          <RotateCcw className="w-4 h-4" /> Réessayer
        </button>
      </div>
    )
  }

  // ── Résultat ───────────────────────────────────────────────────────────────
  if (statut === 'terminee' && resultat) {
    return (
      <PanneauResultat
        resultat={resultat}
        agentsExpanded={agentsExpanded}
        setAgentsExpanded={setAgentsExpanded}
        onReinit={reinitialiser}
      />
    )
  }

  return null
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function PanneauConfig({
  mode, setMode, horizon, setHorizon,
  scenarioInfo, cityName, onLancer,
}: {
  mode: ModeSimulation
  setMode: (m: ModeSimulation) => void
  horizon: number
  setHorizon: (h: number) => void
  scenarioInfo: { label: string; emoji: string; description: string }
  cityName: string
  onLancer: () => void
}) {
  return (
    <div className="space-y-4">

      {/* En-tête MiroFish */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20">
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
          <Brain className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Simulation IA Multi-Agents</p>
          <p className="text-[10px] text-purple-300/70">MiroFish × CrossFlow · OpenAI GPT-OSS 120B (Free)</p>
        </div>
      </div>

      {/* Scénario actif */}
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/8">
        <p className="text-[10px] text-text-muted mb-1.5 uppercase tracking-wider font-semibold">Scénario sélectionné</p>
        <div className="flex items-center gap-2">
          <span className="text-xl">{scenarioInfo.emoji}</span>
          <div>
            <p className="text-sm font-bold text-white">{scenarioInfo.label}</p>
            <p className="text-[10px] text-text-secondary">{cityName}</p>
          </div>
        </div>
      </div>

      {/* Sélecteur mode */}
      <div>
        <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold">Mode de simulation</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(Object.entries(CONFIG_MODES) as [ModeSimulation, typeof CONFIG_MODES[ModeSimulation]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className={cn(
                'flex flex-col items-center gap-1 p-2.5 rounded-xl border text-center transition-all',
                mode === key
                  ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                  : 'bg-white/[0.03] border-white/8 text-text-muted hover:border-white/15',
              )}
            >
              <span className="text-[11px] font-bold">{cfg.label}</span>
              <span className="text-[9px] opacity-70">{cfg.agents} agents</span>
              <span className="text-[9px] opacity-50">{cfg.duree}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Horizon temporel */}
      <div>
        <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold">
          Horizon de prédiction : <span className="text-white">{horizon}h</span>
        </p>
        <input
          type="range" min={1} max={8} step={1}
          value={horizon}
          onChange={e => setHorizon(Number(e.target.value))}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-[9px] text-text-muted mt-1">
          <span>1h</span><span>4h</span><span>8h</span>
        </div>
      </div>

      {/* Agents */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8">
        <Users className="w-3.5 h-3.5 text-text-muted" />
        <p className="text-[11px] text-text-secondary">
          <span className="font-bold text-white">{CONFIG_MODES[mode].agents} agents IA</span> — automobilistes, livreurs, usagers TC, cyclistes, piétons
        </p>
      </div>

      {/* Bouton lancer */}
      <button
        onClick={onLancer}
        className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/20 active:scale-[0.98]"
      >
        <Zap className="w-4 h-4" />
        Lancer la simulation
      </button>

      {/* Note */}
      <p className="text-[9px] text-text-muted text-center">
        Alimenté par OpenAI GPT-OSS 120B · Mémoire Zep Cloud
      </p>
    </div>
  )
}

function PanneauChargement({ elapsed, mode }: { elapsed: number; mode: ModeSimulation }) {
  const etapes = [
    { label: 'Initialisation des agents...',     pct: 10 },
    { label: 'Injection de la graine trafic...', pct: 25 },
    { label: 'Simulation comportements...',      pct: 50 },
    { label: 'Analyse des interactions...',      pct: 75 },
    { label: 'Génération du rapport IA...',      pct: 90 },
  ]

  const dureeEstimee = mode === 'rapide' ? 20 : mode === 'standard' ? 45 : 90
  const progression  = Math.min(95, Math.round((elapsed / dureeEstimee) * 100))
  const etapeActuelle = etapes.find(e => progression < e.pct) ?? etapes[etapes.length - 1]

  return (
    <div className="space-y-5 py-2">
      {/* Animation */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Cpu className="w-7 h-7 text-purple-400 animate-pulse" />
          </div>
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-brand animate-ping" />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-white">Simulation en cours...</p>
          <p className="text-[11px] text-purple-300/70 mt-0.5">{etapeActuelle.label}</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div>
        <div className="flex justify-between text-[10px] text-text-muted mb-1.5">
          <span>Progression</span>
          <span>{progression}%</span>
        </div>
        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width:      `${progression}%`,
              background: 'linear-gradient(90deg, #9333ea, #3b82f6)',
            }}
          />
        </div>
      </div>

      {/* Agents actifs */}
      <div className="grid grid-cols-5 gap-1">
        {['🚗', '📦', '🚇', '🚲', '🚶'].map((e, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/5"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <span className="text-lg">{e}</span>
            <div className="w-full h-0.5 rounded bg-purple-500/30">
              <div className="h-full bg-purple-400 rounded animate-pulse" style={{ width: `${40 + i * 12}%` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-text-muted">
        Durée estimée : {CONFIG_MODES[mode].duree} · Écoulé : {elapsed}s
      </p>
    </div>
  )
}

function PanneauResultat({
  resultat, agentsExpanded, setAgentsExpanded, onReinit,
}: {
  resultat: MiroFishResult
  agentsExpanded: boolean
  setAgentsExpanded: (v: boolean) => void
  onReinit: () => void
}) {
  const sc = couleurScore(resultat.scoreImpact)

  return (
    <div className="space-y-4">

      {/* Header résultat */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <p className="text-sm font-bold text-white">Simulation terminée</p>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg border"
          style={{ color: sc.text, background: sc.bg, borderColor: sc.border }}
        >
          Impact {resultat.scoreImpact}/100
        </span>
      </div>

      {/* Rapport narratif */}
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/8">
        <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <Brain className="w-3 h-3" /> Analyse IA
        </p>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          {resultat.rapportNarratif}
        </p>
      </div>

      {/* Prédictions axes */}
      {resultat.predictions.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" /> Prédictions par axe
          </p>
          <div className="space-y-2">
            {resultat.predictions.map((pred, i) => {
              const couleur = couleurTendance(pred.tendance)
              return (
                <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/6">
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-white truncate">{pred.axe}</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-1.5">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width:      `${Math.round(pred.congestionEstimee * 100)}%`,
                          background: couleur,
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: couleur }}>
                      {Math.round(pred.congestionEstimee * 100)}%
                    </p>
                    <p className="text-[9px] text-text-muted capitalize">{pred.tendance}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recommandations */}
      {resultat.recommandations.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Recommandations
          </p>
          <div className="space-y-1.5">
            {resultat.recommandations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-brand/5 border border-brand/15">
                <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                <p className="text-[11px] text-text-secondary leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Événements émergents */}
      {resultat.evenementsEmergents.length > 0 && (
        <div>
          <p className="text-[10px] text-text-muted mb-2 uppercase tracking-wider font-semibold flex items-center gap-1.5">
            <AlertTriangle className="w-3 h-3 text-yellow-400" /> Phénomènes émergents prévus
          </p>
          {resultat.evenementsEmergents.map((ev, i) => (
            <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/15 mb-1.5">
              <span className="text-yellow-400 text-[10px] shrink-0 mt-0.5">⚡</span>
              <p className="text-[11px] text-yellow-200/80">{ev}</p>
            </div>
          ))}
        </div>
      )}

      {/* Insights agents (accordéon) */}
      <div>
        <button
          onClick={() => setAgentsExpanded(!agentsExpanded)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all"
        >
          <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Comportements agents ({resultat.insightsAgents.length})
          </span>
          {agentsExpanded ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
        </button>

        {agentsExpanded && (
          <div className="mt-2 space-y-2">
            {resultat.insightsAgents.map((agent, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/[0.03] border border-white/6 space-y-1">
                <p className="text-[11px] font-bold text-white">{agent.role}</p>
                <p className="text-[10px] text-text-muted">🎯 {agent.decisionPrise}</p>
                <p className="text-[10px] text-text-muted">📊 {agent.impactEstime}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton nouvelle simulation */}
      <button
        onClick={onReinit}
        className="w-full py-2.5 rounded-xl border border-purple-500/30 text-purple-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-purple-500/10 transition-all"
      >
        <RotateCcw className="w-4 h-4" /> Nouvelle simulation
      </button>

      {/* Footer */}
      <p className="text-center text-[9px] text-text-muted">
        ID: {resultat.simulationId} · Zep Cloud · GPT-OSS 120B
      </p>
    </div>
  )
}
