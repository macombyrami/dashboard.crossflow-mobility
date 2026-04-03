/**
 * SimulationService
 * Orchestrates the lifecycle of the FastAPI predictive engine.
 * Mapping logic between UI scenarios and backend operations.
 */
import { predictiveApi } from '@/lib/api/predictive'
import { useSimulationStore } from '@/store/simulationStore'
import type { City, ScenarioType } from '@/types'
import { scenarioToEventType, scenarioRadius } from '@/lib/api/predictive'

class SimulationService {
  private static instance: SimulationService
  private initPromise: Promise<void> | null = null

  static getInstance() {
    if (!SimulationService.instance) {
      SimulationService.instance = new SimulationService()
    }
    return SimulationService.instance
  }

  /** Initialize the backend graph for any city */
  async initEngine(city: City) {
    const store = useSimulationStore.getState()
    
    // Check if already ready for this city
    if (store.status === 'ready' && store.graphLoaded) return

    store.setEngineStatus('initializing')
    store.setLastError(null)

    try {
      console.log(`[SimulationService] Initializing OSMnx graph for ${city.name} (${city.country || 'France'})...`)
      
      // We normalize the search string for OSMnx
      const locationQuery = city.fullName || `${city.name}, ${city.country || 'France'}`
      const res = await predictiveApi.loadGraph(locationQuery)
      
      if (res.success) {
        store.setEngineStatus('ready')
        store.setGraphLoaded(true)
        store.setBackendOnline(true)
        console.log(`[SimulationService] Engine ready for ${city.name}.`)
      } else {
        throw new Error(res.message || 'Failed to initialize graph')
      }
    } catch (err: any) {
      console.error(`[SimulationService] Init failed for ${city.name}:`, err)
      const msg = err.message?.includes('timeout') 
        ? 'Le chargement de la ville a expiré (Backend débordé).'
        : (err.message || 'Backend inaccessible')
        
      store.setEngineStatus('error')
      store.setLastError(msg)
      store.setGraphLoaded(false)
    }
  }

  /** Proactive check of backend availability */
  async checkHealth() {
    try {
      const status = await predictiveApi.health()
      useSimulationStore.getState().setBackendOnline(status.online)
      return status.online
    } catch {
      useSimulationStore.getState().setBackendOnline(false)
      return false
    }
  }

  /** Run a full simulation cycle on the backend */
  async runPredictiveSimulation(
    city: City,
    center: { lat: number; lng: number },
    type: ScenarioType,
    name: string,
    magnitude: number
  ) {
    const store = useSimulationStore.getState()
    if (store.status !== 'ready') {
      throw new Error('Simulation engine is not initialized.')
    }

    try {
      // 1. Reset backend state to start fresh
      await predictiveApi.resetSimulation()

      // 2. Map scenario to backend event
      const eventType = scenarioToEventType(type)
      const radius    = scenarioRadius(type, magnitude)
      
      console.log(`[SimulationService] Injecting event: ${eventType} @ ${radius}m`)
      await predictiveApi.addEvent(center, eventType, radius, name)

      // 3. Performance impact: Compare routes
      // Use a slightly larger bounding box for route comparison to ensure we hit graph segments
      const offset = 0.015 // ~1.5km
      const start  = { lat: center.lat - offset, lng: center.lng - offset }
      const end    = { lat: center.lat + offset, lng: center.lng + offset }

      console.log(`[SimulationService] Calculating route comparison...`)
      const comparison = await predictiveApi.compareRoutes(start, end)

      // 4. Global analytics sync
      const analytics = await predictiveApi.getAnalytics()

      return {
        comparison,
        analytics,
        center,
        radius
      }
    } catch (err: any) {
      console.error(`[SimulationService] Simulation run failed:`, err)
      throw err
    }
  }

  /** Reset the entire backend state */
  async resetEngine() {
    try {
      await predictiveApi.resetSimulation()
      useSimulationStore.getState().setGraphLoaded(true)
    } catch (err) {
      console.error(`[SimulationService] Reset failed:`, err)
    }
  }

  /** Get GeoJSON of all affected roads (blocked or slow) */
  async getAffectedEdges() {
    return predictiveApi.getAffectedEdges()
  }

  /** Get active simulation events GeoJSON */
  async getEvents() {
    return predictiveApi.getEvents()
  }
}

export const simulationService = SimulationService.getInstance()
