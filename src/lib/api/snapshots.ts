import { compressJSON } from '@/lib/utils/compression'

export interface SnapshotSaveData {
  city_id:      string
  provider:     string
  fetched_at:   string
  stats: {
    avg_congestion:  number
    incident_count:  number
    active_segments: number
  }
  segments_gz?:  string
  bbox?:         number[]
  raw_segments?: any // Temporary for compression
}

export async function saveSnapshot(data: SnapshotSaveData): Promise<boolean> {
  try {
    const payload = { ...data }
    
    // 🛰️ Staff Engineer Compression Pipeline
    if (data.raw_segments && !data.segments_gz) {
      payload.segments_gz = await compressJSON(data.raw_segments)
      delete payload.raw_segments
    }

    const res = await fetch('/api/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    return res.ok
  } catch (err) {
    console.error('Failed to save snapshot:', err)
    return false
  }
}

export async function getSnapshots(cityId: string, minutes: number = 60): Promise<any[]> {
  try {
    const res = await fetch(`/api/snapshots?cityId=${cityId}&minutes=${minutes}`)
    if (!res.ok) return []
    return await res.json()
  } catch (err) {
    console.error('Failed to fetch snapshots:', err)
    return []
  }
}
