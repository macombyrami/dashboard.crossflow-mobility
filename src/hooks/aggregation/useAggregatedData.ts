import { useEffect, useState } from 'react'
import type { CitySnapshot } from '@/lib/aggregation/AggregationEngine'

export function useAggregatedData(cityId: string = 'paris') {
  const [snapshot, setSnapshot] = useState<CitySnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/aggregation/city?city_id=${cityId}`)

        if (!res.ok) throw new Error('Failed to fetch snapshot')

        const data = await res.json()
        setSnapshot(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setSnapshot(null)
      } finally {
        setLoading(false)
      }
    }

    fetchSnapshot()

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSnapshot, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [cityId])

  return { snapshot, loading, error }
}
