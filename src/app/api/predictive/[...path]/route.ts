/**
 * Proxy Next.js → FastAPI predictive backend (localhost:8000)
 * Forwards all /api/predictive/* requests to the Python server.
 */
import { NextRequest, NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/app-config'

async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await context.params
  const path = pathSegments.join('/')
  const search = req.nextUrl.search
  const url = `${BACKEND_URL}/${path}${search}`

  // 🛰️ Staff Engineer: High-Tolerance Proxy
  // OSMnx graph loading and complex simulations (route compare) can take 30-90s.
  // We use 120s for graph ops, 30s for general telemetry.
  const isGraphOp = path.includes('graph/')
  const timeout   = isGraphOp ? 120_000 : 30_000

  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD'
      ? await req.text()
      : undefined

    const res = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(timeout),
    })

    const data = await res.text()
    
    // Explicitly handle 404/500 from backend as JSON if possible
    let responseData = data
    if (!res.ok) {
       try {
         const parsed = JSON.parse(data)
         responseData = JSON.stringify({ 
           success: false, 
           error: parsed.detail || parsed.message || 'Backend logic error',
           backend_url: url
         })
       } catch {
         // Not JSON, use raw text
       }
    }

    return new NextResponse(responseData, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    const isTimeout = err.name === 'TimeoutError' || err.message?.includes('timeout')
    const msg = isTimeout 
      ? `Backend timeout (${timeout/1000}s) - OSMnx took too long.` 
      : (err instanceof Error ? err.message : 'Backend unavailable')
      
    return NextResponse.json({ 
      success: false, 
      error: msg, 
      backend: BACKEND_URL,
      timeout_ms: timeout
    }, { status: 504 })
  }
}

export const GET     = proxy
export const POST    = proxy
export const PUT     = proxy
export const DELETE  = proxy
export const PATCH   = proxy
