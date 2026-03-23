'use client'
import { Thermometer, Wind, Droplets, Eye } from 'lucide-react'
import type { OpenMeteoWeather } from '@/lib/api/openmeteo'

const IMPACT_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  none:     { label: 'Aucun impact trafic', color: '#00E676', bg: 'rgba(0,230,118,0.08)' },
  minor:    { label: 'Impact léger',        color: '#FFD600', bg: 'rgba(255,214,0,0.08)' },
  moderate: { label: 'Impact modéré',       color: '#FF6D00', bg: 'rgba(255,109,0,0.08)' },
  severe:   { label: 'Impact sévère',       color: '#FF1744', bg: 'rgba(255,23,68,0.08)'  },
}

export function WeatherCard({ weather }: { weather: OpenMeteoWeather }) {
  const impact = IMPACT_STYLE[weather.trafficImpact] ?? IMPACT_STYLE.none

  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Météo actuelle</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-3xl">{weather.weatherEmoji}</span>
            <div>
              <p className="text-2xl font-bold text-text-primary leading-none">{weather.temp}°C</p>
              <p className="text-xs text-text-secondary mt-0.5">Ressenti {weather.feelsLike}°C</p>
            </div>
          </div>
          <p className="text-sm text-text-secondary mt-1">{weather.weatherLabel}</p>
        </div>
        <div
          className="px-3 py-1.5 rounded-xl text-xs font-semibold"
          style={{ backgroundColor: impact.bg, color: impact.color }}
        >
          {impact.label}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <MetricItem icon={Wind}        label="Vent"         value={`${weather.windSpeedKmh} km/h`} />
        <MetricItem icon={Droplets}    label="Humidité"     value={`${weather.humidity}%`} />
        <MetricItem icon={Eye}         label="Visibilité"   value={`${(weather.visibilityM / 1000).toFixed(1)} km`} />
        <MetricItem icon={Thermometer} label="UV"           value={`${weather.uvIndex}`} />
      </div>

      {/* Hourly forecast */}
      {weather.hourlyForecast.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">Prévisions (8h)</p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {weather.hourlyForecast.slice(0, 8).map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[38px] bg-bg-subtle rounded-lg p-1.5">
                <span className="text-[9px] text-text-muted">{h.time}</span>
                <span className="text-sm">{h.weatherEmoji}</span>
                <span className="text-[10px] font-semibold text-text-primary">{h.temp}°</span>
                {h.precipProb > 0 && (
                  <span className="text-[9px] text-[#2979FF]">{h.precipProb}%</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricItem({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 bg-bg-subtle rounded-lg px-3 py-2">
      <Icon className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9px] text-text-muted uppercase tracking-wider">{label}</p>
        <p className="text-xs font-semibold text-text-primary">{value}</p>
      </div>
    </div>
  )
}
