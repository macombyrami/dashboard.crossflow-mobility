'use client'
import { Wind } from 'lucide-react'
import type { AirQuality } from '@/lib/api/openmeteo'

export function AirQualityCard({ aq }: { aq: AirQuality }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wind className="w-4 h-4 text-text-muted" />
          <p className="text-sm font-semibold text-text-primary">Qualité de l&apos;air</p>
        </div>
        <span
          className="text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ backgroundColor: `${aq.color}22`, color: aq.color }}
        >
          {aq.level.toUpperCase()}
        </span>
      </div>

      {/* AQI gauge */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-text-muted">IQA Européen <span className="text-[9px] opacity-60">(échelle EEA — 0 bon, 100+ extrême)</span></span>
          <span className="font-bold" style={{ color: aq.color }}>{aq.aqiEuropean} / 100</span>
        </div>
        <div className="h-2 rounded-full bg-bg-subtle overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, aq.aqiEuropean)}%`, backgroundColor: aq.color }}
          />
        </div>
      </div>

      {/* Pollutant grid */}
      <div className="grid grid-cols-3 gap-2">
        <PollutantItem label="PM2.5"  value={aq.pm25}  unit="µg/m³" warn={aq.pm25 > 25}  />
        <PollutantItem label="PM10"   value={aq.pm10}  unit="µg/m³" warn={aq.pm10 > 50}  />
        <PollutantItem label="NO₂"    value={aq.no2}   unit="µg/m³" warn={aq.no2 > 40}   />
        <PollutantItem label="O₃"     value={aq.o3}    unit="µg/m³" warn={aq.o3 > 120}   />
        <PollutantItem label="CO"     value={aq.co}    unit="µg/m³" warn={aq.co > 10000} />
        <PollutantItem label="SO₂"    value={aq.so2}   unit="µg/m³" warn={aq.so2 > 20}   />
      </div>

      {/* Traffic impact */}
      {aq.trafficImpact > 0 && (
        <div className="flex items-center justify-between bg-bg-subtle rounded-xl px-3 py-2">
          <span className="text-xs text-text-muted">Impact trafic (pollution)</span>
          <span className="text-xs font-semibold text-[#FF6D00]">+{Math.round(aq.trafficImpact * 100)}% congestion</span>
        </div>
      )}

      {/* Hourly AQI forecast */}
      {aq.hourlyForecast.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2">IQA prévu (8h)</p>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {aq.hourlyForecast.slice(0, 8).map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5 min-w-[38px] bg-bg-subtle rounded-lg px-1.5 py-2">
                <span className="text-[9px] text-text-muted">{h.time}</span>
                <span className="text-[11px] font-bold" style={{ color: h.color }}>{h.aqi}</span>
                <span className="text-[8px]" style={{ color: h.color }}>{h.level.slice(0, 4)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function PollutantItem({
  label, value, unit, warn,
}: { label: string; value: number; unit: string; warn: boolean }) {
  return (
    <div className="bg-bg-subtle rounded-lg p-2 text-center">
      <p className="text-[9px] text-text-muted uppercase tracking-wider">{label}</p>
      <p className={`text-xs font-bold mt-0.5 ${warn ? 'text-[#FF6D00]' : 'text-text-primary'}`}>
        {value}
      </p>
      <p className="text-[8px] text-text-muted">{unit}</p>
    </div>
  )
}
