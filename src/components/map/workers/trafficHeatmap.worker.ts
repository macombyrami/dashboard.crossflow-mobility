import type { HeatmapPoint } from '@/types'
import { aggregateHeatmapToFeatureCollection } from '@/lib/map/trafficHeatmap'

type HeatmapWorkerRequest = {
  jobId: number
  points: HeatmapPoint[]
  zoomBucket: number
}

self.onmessage = (event: MessageEvent<HeatmapWorkerRequest>) => {
  const { jobId, points, zoomBucket } = event.data
  const featureCollection = aggregateHeatmapToFeatureCollection(points, zoomBucket)
  self.postMessage({ jobId, featureCollection })
}
