'use client'

import { useEffect } from 'react'
import dynamic from 'next/dynamic'

import { useMapStore } from '@/store/mapStore'

const LegacyMapView = dynamic(
  () => import('@/components/map/LegacyMapView').then(m => m.LegacyMapView),
  { ssr: false },
)

export default function MapPage() {
  const city = useMapStore(s => s.city)

  useEffect(() => {
    document.title = `Carte - ${city.name} | CrossFlow`
  }, [city.name])

  return (
    <main id="main-content" aria-label="Carte de mobilite urbaine" className="flex flex-1 h-full overflow-hidden relative bg-[#030303]">
      <div className="flex-1 relative overflow-hidden min-h-0">
        <LegacyMapView />
      </div>
    </main>
  )
}
