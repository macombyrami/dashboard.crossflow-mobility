'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { MapSearchControl } from '@/components/map/controls/MapSearchControl'
import { MapLegend } from '@/components/map/MapLegend'
import { useMapStore } from '@/store/mapStore'
import { useTranslation } from '@/lib/hooks/useTranslation'

const CrossFlowMap = dynamic(
  () => import('@/components/map/CrossFlowMap').then(m => ({ default: m.CrossFlowMap })),
  { ssr: false, loading: () => <MapSkeleton /> },
)

export default function MapPage() {
  const setMode = useMapStore(s => s.setMode)
  const setLayer = useMapStore(s => s.setLayer)
  const setAIPanelOpen = useMapStore(s => s.setAIPanelOpen)

  useEffect(() => {
    setMode('live')
    setLayer('traffic', true)
    setLayer('transport', true)
    setLayer('incidents', true)
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
      </div>
    </div>
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
