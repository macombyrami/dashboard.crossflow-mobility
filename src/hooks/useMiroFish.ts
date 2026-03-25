'use client'
/**
 * useMiroFish — Hook React pour la simulation multi-agents CrossFlow × MiroFish
 * Orchestre : construction de la graine → appel API → affichage du rapport
 */
import { useState, useCallback } from 'react'
import type { SimSeed, MiroFishResult } from '@/app/api/simulation/mirofish/route'
import type { City } from '@/types'

export type StatutSimulation = 'repos' | 'en_cours' | 'terminee' | 'echouee'

export type ModeSimulation = 'rapide' | 'standard' | 'approfondie'

export const CONFIG_MODES: Record<ModeSimulation, { agents: number; label: string; duree: string; cout: string }> = {
  rapide:      { agents: 50,  label: 'Rapide',      duree: '~20s',  cout: 'Minimal'  },
  standard:    { agents: 200, label: 'Standard',    duree: '~45s',  cout: 'Modéré'   },
  approfondie: { agents: 500, label: 'Approfondie', duree: '~90s',  cout: 'Complet'  },
}

interface OptionsSimulation {
  mode?:         ModeSimulation
  meteo?:        { condition: string; tempC: number }
  horizonHeures?: number
}

export function useMiroFish() {
  const [statut,   setStatut]   = useState<StatutSimulation>('repos')
  const [resultat, setResultat] = useState<MiroFishResult | null>(null)
  const [erreur,   setErreur]   = useState<string | null>(null)
  const [elapsed,  setElapsed]  = useState(0)

  const lancer = useCallback(async (
    ville: City,
    scenario: string,
    descriptionScenario: string,
    congestion: number,
    vitesseMoyenne: number,
    incidents: string[],
    evenements: string[],
    options: OptionsSimulation = {},
  ) => {
    setStatut('en_cours')
    setResultat(null)
    setErreur(null)
    setElapsed(0)

    // Chronomètre
    const start   = Date.now()
    const timer   = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 500)

    const mode    = options.mode ?? 'standard'
    const nbAgents = CONFIG_MODES[mode].agents

    const horaireDebut = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

    const seed: SimSeed = {
      ville:               ville.name,
      scenario,
      descriptionScenario,
      traficActuel: {
        congestion,
        vitesseMoyenne,
        incidents,
        evenements,
      },
      meteo:         options.meteo,
      horaireDebut,
      horizonHeures: options.horizonHeures ?? 2,
      nbAgents,
    }

    try {
      const res = await fetch('/api/simulation/mirofish', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(seed),
      })

      if (!res.ok) {
        const err = await res.json()
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
  }, [])

  const reinitialiser = useCallback(() => {
    setStatut('repos')
    setResultat(null)
    setErreur(null)
    setElapsed(0)
  }, [])

  return { statut, resultat, erreur, elapsed, lancer, reinitialiser }
}
