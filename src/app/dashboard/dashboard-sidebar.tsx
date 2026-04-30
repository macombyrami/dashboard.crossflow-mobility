'use client'

import Link from 'next/link'
import { ArrowUpRight, BrainCircuit, Layers, Radar } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { IntelligenceIncident, PriorityItem, TransitLine, TransitTab } from './dashboard.types'
import { asSeverityFromTransitTitle, formatAge, lineLoadIndex, SEVERITY_STYLE, TAB_LABEL } from './dashboard.utils'

type DashboardSidebarProps = {
  priorityItems: PriorityItem[]
  insight: string
  tab: TransitTab
  tabLines: TransitLine[]
  incidents: IntelligenceIncident[]
  onTabChange: (tab: TransitTab) => void
  onHoverPriority: (item: PriorityItem | null) => void
  onPrioritySelect: (item: PriorityItem) => void
  onIncidentSelect: (incident: IntelligenceIncident) => void
  onLineHover: () => void
}

export function DashboardSidebar({
  priorityItems,
  insight,
  tab,
  tabLines,
  incidents,
  onTabChange,
  onHoverPriority,
  onPrioritySelect,
  onIncidentSelect,
  onLineHover,
}: DashboardSidebarProps) {
  return (
    <aside className="flex min-h-[620px] flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
      <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-700">Critical Situation</p>
          <Radar className="h-4 w-4 text-red-500" />
        </div>
        <div className="space-y-2">
          {priorityItems.length === 0 && (
            <p className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-500">
              No critical signal currently active.
            </p>
          )}
          {priorityItems.map(item => (
            <button
              key={item.id}
              onMouseEnter={() => onHoverPriority(item)}
              onMouseLeave={() => onHoverPriority(null)}
              onClick={() => onPrioritySelect(item)}
              className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all hover:border-stone-300 hover:shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2">
                  <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[item.severity].dot)} />
                  <span className="text-sm font-semibold text-stone-900">{item.title}</span>
                </div>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_STYLE[item.severity].badge)}>
                  {SEVERITY_STYLE[item.severity].text}
                </span>
              </div>
              <p className="line-clamp-2 text-sm text-stone-600">{item.subtitle}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
                <span>{item.impact}</span>
                <span>{item.kind === 'incident' ? formatAge(item.timestamp) : 'live'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="mb-3 flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-stone-600" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Smart Insights</p>
        </div>
        <p className="text-sm leading-relaxed text-stone-700">{insight}</p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Network Overview</p>
          <Link href="/map" className="text-xs font-semibold text-stone-500 hover:text-stone-900">
            View Full Network
          </Link>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-1 rounded-xl bg-stone-100 p-1">
          {(['metros', 'rers', 'tramways'] as TransitTab[]).map(item => (
            <button
              key={item}
              onClick={() => onTabChange(item)}
              className={cn(
                'h-9 rounded-lg text-xs font-bold uppercase tracking-[0.08em] transition-colors',
                tab === item ? 'bg-white text-stone-900 shadow-[0_1px_2px_rgba(0,0,0,0.08)]' : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {TAB_LABEL[item]}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {tabLines.length === 0 && (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-500">
              No line telemetry available for this tab.
            </p>
          )}
          {tabLines.map(line => {
            const load = lineLoadIndex(line)
            const severity = asSeverityFromTransitTitle(line.title, line.message)

            return (
              <button
                key={`${line.type}-${line.slug}`}
                onMouseEnter={onLineHover}
                className="w-full rounded-2xl border border-stone-200 bg-white p-3 text-left transition-all hover:border-stone-300"
              >
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2">
                    <span className={cn('h-2.5 w-2.5 rounded-full', SEVERITY_STYLE[severity].dot)} />
                    <span className="text-sm font-bold text-stone-900">{line.slug}</span>
                    <span className="rounded-full border border-stone-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-stone-500">
                      {TAB_LABEL[line.type]}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-stone-800">{load}%</span>
                </div>
                <p className="mt-1 text-sm text-stone-600">{line.title}</p>
                <p className="mt-1 line-clamp-1 text-xs text-stone-500">{line.message || 'No additional disruption details.'}</p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
                  <div
                    className={cn(
                      'h-full rounded-full',
                      severity === 'critical' ? 'bg-red-600' : severity === 'high' ? 'bg-orange-500' : severity === 'medium' ? 'bg-amber-400' : 'bg-emerald-500',
                    )}
                    style={{ width: `${load}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-4">
        <div className="mb-2 flex items-center gap-2">
          <Layers className="h-4 w-4 text-stone-600" />
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-stone-600">Incident Map Fusion</p>
        </div>
        <div className="space-y-2">
          {incidents.slice(0, 5).map(incident => (
            <button
              key={incident.id}
              onClick={() => onIncidentSelect(incident)}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-left transition-colors hover:bg-stone-100"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-stone-900">{incident.road}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', SEVERITY_STYLE[incident.severity].badge)}>
                  {incident.severity}
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-xs text-stone-600">{incident.description}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                <span>{incident.sourceLabel}</span>
                <span>{incident.confidence} confidence</span>
              </div>
            </button>
          ))}
        </div>
        <Link href="/incidents" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-stone-600 hover:text-stone-900">
          Open incident intelligence
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </aside>
  )
}
