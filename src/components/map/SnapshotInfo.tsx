'use client'

import type { CitySnapshot } from '@/lib/aggregation/AggregationEngine'

interface SnapshotInfoProps {
  snapshot: CitySnapshot | null
  loading: boolean
}

export function SnapshotInfo({ snapshot, loading }: SnapshotInfoProps) {
  if (loading) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-md">
        <p className="text-sm text-slate-500">Loading data...</p>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="rounded-lg bg-white p-4 shadow-md">
        <p className="text-sm text-red-500">No data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-md space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-900">{snapshot.city_name}</h3>
        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
          {(snapshot.confidence_score * 100).toFixed(0)}% Confidence
        </span>
      </div>

      <div className="text-xs text-slate-600 space-y-1">
        <p>📡 Sources: {snapshot.sources_used.join(', ')}</p>
        <p>⏱️ Aggregation: {snapshot.aggregation_ms}ms</p>
        <p>🎯 Data Domains: {snapshot.sources_used.length}/8</p>
      </div>

      {snapshot.weather && (
        <div className="text-sm bg-blue-50 p-2 rounded">
          <p>🌡️ {snapshot.weather.current.temperature.toFixed(1)}°C</p>
          <p className="text-xs text-slate-600">Wind: {snapshot.weather.current.wind_speed.toFixed(1)} km/h</p>
        </div>
      )}

      {snapshot.air_quality && (
        <div className="text-sm bg-yellow-50 p-2 rounded">
          <p>💨 AQI: {snapshot.air_quality.aqi} ({snapshot.air_quality.level})</p>
          <p className="text-xs text-slate-600">PM2.5: {snapshot.air_quality.pm25.toFixed(1)} μg/m³</p>
        </div>
      )}

      {snapshot.traffic && (
        <div className="text-sm bg-red-50 p-2 rounded">
          <p>🚗 Avg Speed: {snapshot.traffic.average_speed.toFixed(0)} km/h</p>
          <p className="text-xs text-slate-600">Incidents: {snapshot.traffic.incident_count}</p>
        </div>
      )}
    </div>
  )
}
