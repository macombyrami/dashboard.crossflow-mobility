/**
 * TomTom Server-Side API Service
 * Handle actual calls to api.tomtom.com using the private API KEY.
 * This is NOT used by the client-side directly.
 */

import { FlowSegmentData, TomTomIncident } from '../tomtom'

const API_KEY = process.env.TOMTOM_API_KEY

/**
 * Fetch real-time flow data for a specific segment point
 */
export async function serverFetchFlowSegment(lat: number, lng: number, zoom = 10): Promise<FlowSegmentData | null> {
  if (!API_KEY) throw new Error('TOMTOM_API_KEY is missing')
  
  try {
    const url = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point=${lat},${lng}&unit=KMPH&openLr=false&key=${API_KEY}`
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
    if (!res.ok) return null
    
    const data = await res.json()
    const flow = data.flowSegmentData
    if (!flow) return null

    return {
      currentSpeed:       flow.currentSpeed,
      freeFlowSpeed:      flow.freeFlowSpeed,
      currentTravelTime:  flow.currentTravelTime,
      freeFlowTravelTime: flow.freeFlowTravelTime,
      confidence:         flow.confidence,
      roadClosure:        flow.roadClosure,
      coordinates:        flow.coordinates
    }
  } catch (err) {
    console.error('[TomTomService] Flow Fetch Error:', err)
    return null
  }
}

/**
 * Fetch incident details for a bounding box
 */
export async function serverFetchIncidents(bbox: string): Promise<any[]> {
  if (!API_KEY) throw new Error('TOMTOM_API_KEY is missing')
  
  try {
    const fields = '{incidents{type,geometry,properties{id,iconCategory,magnitudeOfDelay,events{description,code,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers}}}'
    const url = `https://api.tomtom.com/traffic/services/5/incidentDetails.json?bbox=${bbox}&fields=${encodeURIComponent(fields)}&language=fr-FR&key=${API_KEY}`
    
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return []
    
    const data = await res.json()
    return data.incidents ?? []
  } catch (err) {
    console.error('[TomTomService] Incidents Fetch Error:', err)
    return []
  }
}
