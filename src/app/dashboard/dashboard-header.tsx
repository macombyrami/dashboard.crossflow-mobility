'use client'

import type { LucideIcon } from 'lucide-react'
import { Activity, AlertTriangle, ChartLine, Clock3, Flame, MapPinned } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { OperatorMode } from './dashboard.types'
import { formatAge } from './dashboard.utils'

type DashboardHeaderProps = {
  operatorMode: OperatorMode
  networkStatus: 'NORMAL' | 'TENSE' | 'CRITICAL'
  incidentCount: number
  avgLoadPct: number
  trend: {
    label: string
    tone: string
  }
  updatedAt: string | null
  onScrollToMap: () => void
  onActivateSimulation: () => void
  onModeChange: (mode: OperatorMode) => void
}

export function DashboardHeader({
  operatorMode,
  networkStatus,
  incidentCount,
  avgLoadPct,
  trend,
  updatedAt,
  onScrollToMap,
  onActivateSimulation,
  onModeChange,
}: DashboardHeaderProps) {
  return (
    <>
      <section className="rounded-3xl border border-stone-200 bg-white px-4 py-3 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={networkStatus} />
            <TopMetric icon={AlertTriangle} label="Active incidents" value={String(incidentCount)} />
            <TopMetric icon={Activity} label="Average load" value={`${avgLoadPct}%`} />
            <TopMetric icon={ChartLine} label="Flow trend" value={trend.label} tone={trend.tone} />
            <TopMetric icon={Clock3} label="Updated" value={updatedAt ? formatAge(updatedAt) : 'syncing'} />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onScrollToMap}
              className="inline-flex h-10 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-700 transition-colors hover:border-stone-300 hover:text-stone-950"
            >
              <MapPinned className="h-4 w-4" />
              View On Map
            </button>
            <button
              onClick={onActivateSimulation}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
            >
              <Flame className="h-4 w-4" />
              Activate Simulation
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-1 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="grid w-full grid-cols-2 gap-1">
          <button
            onClick={() => onModeChange('dashboard')}
            className={cn(
              'h-10 rounded-2xl text-sm font-semibold transition-all',
              operatorMode === 'dashboard' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100',
            )}
          >
            Dashboard Mode
          </button>
          <button
            onClick={() => onModeChange('control')}
            className={cn(
              'h-10 rounded-2xl text-sm font-semibold transition-all',
              operatorMode === 'control' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100',
            )}
          >
            Control Mode
          </button>
        </div>
      </section>
    </>
  )
}

function StatusPill({ status }: { status: 'NORMAL' | 'TENSE' | 'CRITICAL' }) {
  const style =
    status === 'CRITICAL'
      ? 'bg-red-100 text-red-700'
      : status === 'TENSE'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-emerald-100 text-emerald-700'

  return (
    <span className={cn('rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em]', style)}>
      {status}
    </span>
  )
}

function TopMetric({
  icon: Icon,
  label,
  value,
  tone = 'text-stone-900',
}: {
  icon: LucideIcon
  label: string
  value: string
  tone?: string
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1">
      <Icon className="h-3.5 w-3.5 text-stone-500" />
      <span className="text-xs text-stone-500">{label}</span>
      <span className={cn('text-xs font-semibold', tone)}>{value}</span>
    </span>
  )
}
