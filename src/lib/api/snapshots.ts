import type { TrafficSnapshot } from '@/types'

/**
 * Staff Engineer Client API: Snapshots
 */

export async function saveSnapshot(payload: {
  cityId: string
  source: string
  segments: any[]
  stats?: any
}) {
  const resp = await fetch('/api/snapshots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!resp.ok) throw new Error(`Snapshot persistence failed: ${resp.statusText}`)
  return resp.json()
}

export async function getSnapshots(cityId: string, limit: number = 20) {
  const resp = await fetch(`/api/snapshots?cityId=${cityId}&limit=${limit}`)
  if (!resp.ok) throw new Error(`Snapshot fetch failed: ${resp.statusText}`)
  return resp.json()
}
