'use client'

import { useEffect, useState, useMemo } from 'react'
import { Train, RefreshCw, Clock, Users, AlertTriangle } from 'lucide-react'
import { fetchAllTrafficStatus } from '@/lib/api/ratp'
import { useMapStore } from '@/store/mapStore'
import type { TrafficLine } from '@/lib/api/ratp'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { SkeletonLoader } from '@/components/ui/SkeletonLoader'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/utils/cn'

type TransitType = 'metros' | 'rers' | 'tramways' | 'buses'

const TRANSIT_TABS: Record<TransitType, { label: string; icon: React.ReactNode }> = {
  metros: { label: 'Metro', icon: '🚆' },
  rers: { label: 'RER', icon: '🚄' },
  tramways: { label: 'Tram', icon: '🚊' },
  buses: { label: 'Bus', icon: '🚌' },
}

function getSeverityFromStatus(message: string): 'critical' | 'warning' | 'caution' | 'normal' {
  const msg = message.toLowerCase()
  if (msg.includes('interrompu') || msg.includes('suspendu')) return 'critical'
  if (msg.includes('perturb') || msg.includes('problème')) return 'warning'
  if (msg.includes('ralenti') || msg.includes('incident') || msg.includes('travaux')) return 'caution'
  return 'normal'
}

function getLoadPercentage(status: string): number {
  const severity = getSeverityFromStatus(status)
  switch (severity) {
    case 'critical':
      return 95
    case 'warning':
      return 75
    case 'caution':
      return 50
    default:
      return 30
  }
}

export default function TransportPageNew() {
  const city = useMapStore(s => s.city)
  const [activeTab, setActiveTab] = useState<TransitType>('metros')
  const [lines, setLines] = useState<TrafficLine[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const data = await fetchAllTrafficStatus()
      setLines(Array.isArray(data?.lines) ? data.lines : [])
    } catch {
      setLines([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const filteredLines = useMemo(
    () => lines.filter(line => line.type === activeTab).sort((a, b) => {
      const aLoad = getLoadPercentage(a.message)
      const bLoad = getLoadPercentage(b.message)
      return bLoad - aLoad
    }),
    [lines, activeTab],
  )

  return (
    <main className="page-scroll">
      <div className="page-container">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">Public Transit</h1>
          <p className="text-text-secondary">
            Real-time status for {city.name} transportation network
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 border-b border-bg-border">
          {(Object.entries(TRANSIT_TABS) as [TransitType, any][]).map(([type, config]) => (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={cn(
                'px-4 py-3 font-semibold text-sm transition-all whitespace-nowrap border-b-2 -mb-[2px]',
                activeTab === type
                  ? 'text-text-primary border-status-info'
                  : 'text-text-secondary border-transparent hover:text-text-primary'
              )}
            >
              <span className="mr-2">{config.icon}</span>
              {config.label}
              <span className="ml-2 text-xs opacity-70">
                ({lines.filter(l => l.type === type).length})
              </span>
            </button>
          ))}
        </div>

        {/* Refresh button */}
        <div className="mb-6">
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-bg-elevated hover:bg-bg-hover text-text-primary font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Transit Lines Grid */}
        {loading ? (
          <SkeletonLoader type="card" count={6} />
        ) : filteredLines.length === 0 ? (
          <EmptyState
            icon="✓"
            title="All Systems Normal"
            description={`All ${TRANSIT_TABS[activeTab].label} lines operating normally`}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {filteredLines.map(line => {
              const severity = getSeverityFromStatus(line.message)
              const load = getLoadPercentage(line.message)

              return (
                <Card
                  key={`${line.type}-${line.slug}`}
                  variant="glass"
                  padding="md"
                  accent={
                    severity === 'critical'
                      ? 'red'
                      : severity === 'warning'
                      ? 'orange'
                      : severity === 'caution'
                      ? 'orange'
                      : 'green'
                  }
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h3 className="font-bold text-text-primary text-lg">
                          Line {line.slug}
                        </h3>
                        <p className="text-xs text-text-muted mt-1">
                          {TRANSIT_TABS[line.type as TransitType].label}
                        </p>
                      </div>
                      <StatusBadge
                        status={severity}
                        label={
                          severity === 'critical'
                            ? 'Critical'
                            : severity === 'warning'
                            ? 'Warning'
                            : severity === 'caution'
                            ? 'Caution'
                            : 'Normal'
                        }
                        size="sm"
                      />
                    </div>

                    {line.message && (
                      <p className="text-sm text-text-secondary mb-4 line-clamp-2">
                        {line.message}
                      </p>
                    )}

                    {/* Load Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-text-muted">Network Load</span>
                        <span className="text-sm font-semibold text-text-primary">{load}%</span>
                      </div>
                      <div className="h-2 bg-bg-hover rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            load > 80
                              ? 'bg-status-critical'
                              : load > 60
                              ? 'bg-status-warning'
                              : load > 40
                              ? 'bg-status-caution'
                              : 'bg-status-normal'
                          )}
                          style={{ width: `${load}%` }}
                        />
                      </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Clock className="w-3 h-3" />
                        <span>Updating...</span>
                      </div>
                      <div className="flex items-center gap-2 text-text-secondary">
                        <Users className="w-3 h-3" />
                        <span>Live</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
