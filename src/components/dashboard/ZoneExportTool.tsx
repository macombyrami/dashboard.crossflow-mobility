'use client'
import { useState } from 'react'
import { Download, FileJson, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useMapStore } from '@/store/mapStore'
import { cn } from '@/lib/utils/cn'

/**
 * Staff Engineer Feature: ZoneExportTool
 * Exports the active zone (or viewport) to GeoJSON/CSV.
 */
export function ZoneExportTool() {
  const zonePolygon = useMapStore(s => s.zonePolygon)
  const city = useMapStore(s => s.city)
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async (format: 'geojson' | 'csv') => {
    setIsExporting(true)
    try {
      // 1. Get BBOX from zone or city
      let bboxUrl = ''
      if (zonePolygon && zonePolygon.length > 0) {
        const lats = zonePolygon.map(p => p[1])
        const lngs = zonePolygon.map(p => p[0])
        bboxUrl = `${Math.min(...lats)},${Math.min(...lngs)},${Math.max(...lats)},${Math.max(...lngs)}`
      } else {
        // Fallback to city bbox
        bboxUrl = city.bbox.join(',')
      }

      // 2. Fetch from backend (Staff Endpoint)
      const resp = await fetch(`${process.env.NEXT_PUBLIC_PREDICTIVE_BACKEND_URL}/export/zone?bbox=${bboxUrl}`)
      if (!resp.ok) throw new Error('Export failed')
      
      const data = await resp.json()
      
      // 3. Download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `crossflow-export-${city.name.toLowerCase()}-${new Date().getTime()}.${format}`
      a.click()
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-xl p-1 border border-white/10">
      <div className="px-2 py-1">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Export Zone</span>
      </div>
      
      <button
        onClick={() => handleExport('geojson')}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileJson className="w-3 h-3 text-brand" />}
        GeoJSON
      </button>

      <button
        onClick={() => handleExport('csv')}
        disabled={isExporting}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-medium transition-colors disabled:opacity-50"
      >
        {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileSpreadsheet className="w-3 h-3 text-emerald-400" />}
        CSV
      </button>
    </div>
  )
}
