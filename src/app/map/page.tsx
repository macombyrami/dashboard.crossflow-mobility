'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { ChevronUp, SlidersHorizontal } from 'lucide-react'
import { MapSearchControl } from '@/components/map/controls/MapSearchControl'
import { MapLegend } from '@/components/map/MapLegend'
import { useMapStore } from '@/store/mapStore'
import { useTranslation } from '@/lib/hooks/useTranslation'
import type { MapLayerId } from '@/types'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const setMode = useMapStore(s => s.setMode)
  const setLayer = useMapStore(s => s.setLayer)
  const activeLayers = useMapStore(s => s.activeLayers)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)
  const [layersOpen, setLayersOpen] = useState(false)

  useEffect(() => {
    setMode('live')
    setLayer('traffic', true)
    setLayer('transport', false)
    setLayer('incidents', false)
    setLayer('heatmap', false)
    setLayer('boundary', false)
    setAIPanelOpen(false)
  }, [setAIPanelOpen, setLayer, setMode])

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-[#F3F4EF]">
      <div className="relative flex-1 overflow-hidden">
        <CrossFlowMap />

        <div className="pointer-events-none absolute inset-x-0 top-3 z-30 flex justify-center px-3 sm:top-4 sm:px-4">
          <div className="pointer-events-auto w-[min(560px,calc(100vw-32px))] sm:w-[min(560px,calc(100vw-220px))]">
            <MapSearchControl />
          </div>
        </div>

        <MapLegend />

        <div className="pointer-events-auto absolute bottom-5 right-3 z-30 sm:right-4">
          <button
            onClick={() => setLayersOpen(value => !value)}
            className="flex h-11 items-center gap-2 rounded-full border border-stone-200 bg-white/96 px-4 shadow-[0_14px_34px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-all hover:border-stone-300"
            aria-label="Toggle map layers"
          >
            <SlidersHorizontal className="h-4 w-4 text-stone-700" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-600">Layers</span>
          </button>

          {layersOpen && (
            <div className="absolute bottom-14 right-0 w-[190px] overflow-hidden rounded-[22px] border border-stone-200 bg-white/98 shadow-[0_18px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-stone-500">Layers</span>
                <ChevronUp className={`h-4 w-4 text-stone-400 transition-transform ${layersOpen ? '' : 'rotate-180'}`} />
              </div>
              <div className="space-y-1 p-2">
                <LayerToggle
                  label="Traffic"
                  checked={activeLayers.has('traffic')}
                  onChange={(checked) => setLayer('traffic', checked)}
                />
                <LayerToggle
                  label="Transport"
                  checked={activeLayers.has('transport')}
                  onChange={(checked) => setLayer('transport', checked)}
                />
                <LayerToggle
                  label="Incidents"
                  checked={activeLayers.has('incidents')}
                  onChange={(checked) => setLayer('incidents', checked)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LayerToggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-all ${
        checked ? 'bg-stone-100' : 'hover:bg-stone-50'
      }`}
    >
      <span className="text-[13px] font-medium text-stone-800">{label}</span>
      <span
        className={`relative flex h-6 w-10 items-center rounded-full transition-colors ${
          checked ? 'bg-stone-900' : 'bg-stone-200'
        }`}
      >
        <span
          className={`absolute h-4 w-4 rounded-full bg-white transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-1'
          }`}
        />
      </span>
    </button>
  )
}

function MapSkeleton() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full items-center justify-center bg-[#F4F4F0]">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.08)]">
          <span className="animate-pulse text-2xl">+</span>
        </div>
        <p className="text-sm text-stone-500">{t('common.calculating')}</p>
      </div>
    </div>
  )
}
