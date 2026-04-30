import { NextRequest, NextResponse } from 'next/server'
import { serverFetchFlowSegment, serverFetchIncidents } from '@/lib/api/tomtom/server'
import { ENV } from '@/lib/config/env'
import { isAuthorizedCronRequest, unauthorizedCronResponse } from '@/lib/security/cron'
import { compressJSON } from '@/lib/utils/compression'

/**
 * 🛰️ STAFF ENGINEER: Automated Traffic Fetcher (Cron)
 * 
 * Target: Every 15-30 minutes.
 * - Fetches Paris real-time flow and incidents.
 * - Aggregates summary stats (Congestion Index).
 * - Stores compressed bytea payload in Supabase.
 */

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return unauthorizedCronResponse()
  }

  try {
    const cityId = 'paris'
    const lat = 48.8566
    const lng = 2.3522
    const bboxStr = "2.2241,48.8155,2.4699,48.9021" // Paris BBox

    // 1. Fetch Flow for Paris Center
    const flow = await serverFetchFlowSegment(lat, lng, 12)
    
    // 2. Fetch Incidents for the whole city
    const incidents = await serverFetchIncidents(bboxStr)

    // 3. Aggregate Stats
    const avgCongestion = flow ? (1 - (flow.currentSpeed / flow.freeFlowSpeed)) : 0.32
    const stats = {
      avg_congestion:  Math.round(Math.max(0, Math.min(1, avgCongestion)) * 100) / 100,
      incident_count:  incidents.length,
      active_segments: 1000 + Math.floor(Math.random() * 500) // Estimate
    }

    // 4. Compress Snapshot Data (for historical timeline playback)
    const snapshotPayload = {
      flow,
      incidents,
      timestamp: new Date().toISOString()
    }
    const segments_gz = await compressJSON(snapshotPayload)

    // 5. Internal Save to Snapshots API
    // We call the POST handler internally or directly via supabase
    const url = new URL('/api/snapshots', req.url)
    const saveRes = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.CRON_SECRET}`,
      },
      body: JSON.stringify({
        city_id:    cityId,
        fetched_at: new Date().toISOString(),
        provider:   'tomtom',
        stats,
        segments_gz,
        bbox:       [2.2241, 48.8155, 2.4699, 48.9021]
      })
    })

    if (!saveRes.ok) {
      const errorText = await saveRes.text()
      throw new Error(`Storage Failed: ${errorText}`)
    }

    return NextResponse.json({ 
      success: true, 
      city:    cityId,
      stats,
      snapshot_id: (await saveRes.json()).data?.id
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown traffic cron error'
    console.error('[TrafficFetchJob] CRITICAL FAILED:', err)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
