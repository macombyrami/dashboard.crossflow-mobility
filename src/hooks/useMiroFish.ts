'use client'
/**
 * useMiroFish — Hook React pour la simulation multi-agents CrossFlow × MiroFish
 *
 * Utilise le mode SSE (text/event-stream) pour recevoir les événements de
 * progression en temps réel : avancement agent par agent, puis rapport final.
 * Rétrocompatible : repasse en mode JSON si SSE non supporté.
 */
import { useState, useCallback } from 'react'
import type { SimSeed, MiroFishResult, AgentInsight } from '@/app/api/simulation/mirofish/route'
import type { City } from '@/types'

export type StatutSimulation = 'repos' | 'en_cours' | 'terminee' | 'echouee'
export type ModeSimulation   = 'rapide' | 'standard' | 'approfondie'

export const CONFIG_MODES: Record<ModeSimulation, { agents: number; label: string; duree: string; cout: string }> = {
  rapide:      { agents: 50,  label: 'Rapide',      duree: '~20s',  cout: 'Minimal'  },
  standard:    { agents: 200, label: 'Standard',    duree: '~45s',  cout: 'Modéré'   },
  approfondie: { agents: 500, label: 'Approfondie', duree: '~90s',  cout: 'Complet'  },
}

interface OptionsSimulation {
  mode?:          ModeSimulation
  meteo?:         { condition: string; tempC: number }
  horizonHeures?: number
}

// SSE event shapes emitted by the server
interface SseEvent {
  type:    string
  simId?:  string
  total?:  number
  done?:   number
  insight?: AgentInsight
  result?: MiroFishResult
  message?: string
}

export function useMiroFish() {
  const [statut,       setStatut]       = useState<StatutSimulation>('repos')
  const [resultat,     setResultat]     = useState<MiroFishResult | null>(null)
  const [erreur,       setErreur]       = useState<string | null>(null)
  const [elapsed,      setElapsed]      = useState(0)
  const [agentsDone,   setAgentsDone]   = useState(0)
  const [agentsTotal,  setAgentsTotal]  = useState(0)
  const [isRapport,    setIsRapport]    = useState(false)   // generating final report

  const lancer = useCallback(async (
    ville:               City,
    scenario:            string,
    descriptionScenario: string,
    congestion:          number,
    vitesseMoyenne:      number,
    incidents:           string[],
    evenements:          string[],
    options:             OptionsSimulation = {},
  ) => {
    setStatut('en_cours')
    setResultat(null)
    setErreur(null)
    setElapsed(0)
    setAgentsDone(0)
    setAgentsTotal(0)
    setIsRapport(false)

    const start  = Date.now()
    const timer  = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1_000)), 500)

    const mode     = options.mode ?? 'standard'
    const nbAgents = CONFIG_MODES[mode].agents

    const seed: SimSeed = {
      ville:               ville.name,
      scenario,
      descriptionScenario,
      traficActuel: { congestion, vitesseMoyenne, incidents, evenements },
      meteo:         options.meteo,
      horaireDebut:  new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      horizonHeures: options.horizonHeures ?? 2,
      nbAgents,
    }

    try {
      const res = await fetch('/api/simulation/mirofish', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'text/event-stream',  // request SSE streaming
        },
        body: JSON.stringify(seed),
      })

      // ── Rate limited ─────────────────────────────────────────────────────
      if (res.status === 429) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? 'Trop de simulations simultanées')
      }

      // ── SSE streaming response ────────────────────────────────────────────
      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader  = res.body?.getReader()
        const decoder = new TextDecoder()
        let   buffer  = ''

        if (!reader) throw new Error('Streaming non supporté par le navigateur')

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''

          for (const block of lines) {
            const line = block.trim()
            if (!line.startsWith('data:')) continue
            try {
              const event: SseEvent = JSON.parse(line.slice(5).trim())
              switch (event.type) {
                case 'agents_start':
                  setAgentsTotal(event.total ?? 0)
                  break
                case 'agent_done':
                  setAgentsDone(event.done ?? 0)
                  setAgentsTotal(event.total ?? 0)
                  break
                case 'report_start':
                  setIsRapport(true)
                  break
                case 'complete':
                  if (event.result) {
                    setResultat(event.result)
                    setStatut('terminee')
                  }
                  break
                case 'error':
                  throw new Error(event.message ?? 'Erreur simulation')
              }
            } catch (parseErr) {
              // ignore malformed SSE lines
            }
          }
        }

        // If we exited the loop without a 'complete' event
        if (statut !== 'terminee') {
          setErreur('La simulation s\'est terminée sans résultat.')
          setStatut('echouee')
        }
        return
      }

      // ── JSON fallback (backward-compat) ───────────────────────────────────
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error ?? `Erreur HTTP ${res.status}`)
      }
      const data: MiroFishResult = await res.json()
      setResultat(data)
      setStatut('terminee')

    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Erreur inconnue')
      setStatut('echouee')
    } finally {
      clearInterval(timer)
    }
  }, [statut])

  const reinitialiser = useCallback(() => {
    setStatut('repos')
    setResultat(null)
    setErreur(null)
    setElapsed(0)
    setAgentsDone(0)
    setAgentsTotal(0)
    setIsRapport(false)
  }, [])

  return {
    statut, resultat, erreur,
    elapsed, agentsDone, agentsTotal, isRapport,
    lancer, reinitialiser,
  }
}
