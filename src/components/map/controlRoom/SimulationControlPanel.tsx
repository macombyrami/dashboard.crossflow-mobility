'use client'

import { useState } from 'react'
import { useControlRoomStore } from '@/store/controlRoomStore'
import { useSimulationStore } from '@/store/simulationStore'
import { useMapStore } from '@/store/mapStore'
import { Play, StopCircle, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { platformConfig } from '@/config/platform.config'
import type { ScenarioType } from '@/types'

const SCENARIO_LABELS: Record<ScenarioType, string> = {
  road_closure: 'Road Closure',
  traffic_light: 'Traffic Light',
  bike_lane: 'Bike Lane',
  speed_limit: 'Speed Limit',
  public_transport: 'Public Transport',
  event: 'Event',
}

export function SimulationControlPanel() {
  const [isExpanded, setIsExpanded] = useState(false)

  // Control room state
  const simulationScenario = useControlRoomStore((s) => s.simulationScenario)
  const isSimulating = useControlRoomStore((s) => s.isSimulating)
  const simulationResults = useControlRoomStore((s) => s.simulationResults)
  const setSimulationScenario = useControlRoomStore((s) => s.setSimulationScenario)
  const setIsSimulating = useControlRoomStore((s) => s.setIsSimulating)
  const setSimulationResults = useControlRoomStore((s) => s.setSimulationResults)

  // Simulation engine state
  const simStore = useSimulationStore()
  const mapStore = useMapStore()

  const scenarioOptions = [
    { value: 'road_closure', label: SCENARIO_LABELS.road_closure },
    { value: 'traffic_light', label: SCENARIO_LABELS.traffic_light },
    { value: 'bike_lane', label: SCENARIO_LABELS.bike_lane },
    { value: 'speed_limit', label: SCENARIO_LABELS.speed_limit },
    { value: 'public_transport', label: SCENARIO_LABELS.public_transport },
    { value: 'event', label: SCENARIO_LABELS.event },
  ] as const

  const handleScenarioChange = (scenario: ScenarioType) => {
    setSimulationScenario(scenario)
    simStore.setScenarioType(scenario)
  }

  const handleRunSimulation = async () => {
    if (isSimulating || !simulationScenario) return

    setIsSimulating(true)

    try {
      // Simulate a delay (in real scenario, this would call the simulation engine)
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Generate mock results
      setSimulationResults({
        affectedZones: [
          '1st Arrondissement',
          '2nd Arrondissement',
          '3rd Arrondissement',
        ],
        estimatedDelay: Math.floor(Math.random() * 15) + 5,
      })
    } finally {
      setIsSimulating(false)
    }
  }

  const handleStopSimulation = () => {
    setIsSimulating(false)
    setSimulationResults(null)
    setSimulationScenario(null)
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-full flex items-center justify-between px-3 py-3 rounded-lg
          border border-bg-border bg-bg-base/50
          hover:bg-bg-base/80 transition-colors
        `}
      >
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-semibold text-text-primary">
            {isSimulating ? 'Simulation Running' : 'Simulation'}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-text-secondary" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-secondary" />
        )}
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="space-y-3 pl-3 pr-3 pb-3 border-l-2 border-orange-500/30">
          {/* Scenario selector */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-2">
              Scenario Type
            </label>
            <select
              value={simulationScenario || ''}
              onChange={(e) =>
                handleScenarioChange(e.target.value as ScenarioType)
              }
              disabled={isSimulating}
              className="
                w-full px-3 py-2 rounded-lg bg-bg-base border border-bg-border
                text-text-primary text-sm
                hover:border-white/20 focus:outline-none focus:border-white/30
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <option value="">Select a scenario...</option>
              {scenarioOptions.map(({ value, label }) => (
                <option key={value} value={value} className="bg-bg-base">
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Simulation controls */}
          <div className="space-y-2">
            {!isSimulating ? (
              <button
                onClick={handleRunSimulation}
                disabled={!simulationScenario}
                className={`
                  w-full py-2 rounded-lg text-sm font-semibold
                  flex items-center justify-center gap-2
                  transition-all
                  ${simulationScenario
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/30'
                    : 'bg-bg-base text-text-secondary border border-bg-border opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <Play className="w-4 h-4" />
                Run Simulation
              </button>
            ) : (
              <button
                onClick={handleStopSimulation}
                className="
                  w-full py-2 rounded-lg text-sm font-semibold
                  flex items-center justify-center gap-2
                  bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30
                  transition-all
                "
              >
                <StopCircle className="w-4 h-4" />
                Stop Simulation
              </button>
            )}

            {/* Loading indicator */}
            {isSimulating && (
              <div className="flex items-center justify-center gap-2 py-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-xs text-text-secondary">Computing...</span>
              </div>
            )}
          </div>

          {/* Results display */}
          {simulationResults && !isSimulating && (
            <div className="space-y-2 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary mb-2">Simulation Results</p>

                  <div className="space-y-1 text-xs text-text-secondary">
                    <p>
                      <span className="font-medium">Affected Zones:</span>
                      <br />
                      {simulationResults.affectedZones.join(', ')}
                    </p>
                    <p>
                      <span className="font-medium">Est. Additional Delay:</span>
                      <br />
                      <span className="text-orange-400 font-semibold">
                        +{simulationResults.estimatedDelay} minutes
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      {isSimulating && (
        <div className="px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse"></div>
          <span className="text-xs text-orange-400 font-medium">Simulation in progress...</span>
        </div>
      )}
    </div>
  )
}
