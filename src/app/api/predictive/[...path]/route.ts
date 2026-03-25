/**
 * Proxy Next.js → FastAPI predictive backend (localhost:8000)
 * Forwards all /api/predictive/* requests to the Python server.
 */
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.PREDICTIVE_BACKEND_URL ?? 'http://localhost:8000'

async function proxy(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/')
  const search = req.nextUrl.search
  const url = `${BACKEND_URL}/${path}${search}`

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
      signal: AbortSignal.timeout(15_000),
    })

    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Backend unavailable'
    return NextResponse.json({ error: msg, backend: BACKEND_URL }, { status: 503 })
  }
}

export const GET     = proxy
export const POST    = proxy
export const PUT     = proxy
export const DELETE  = proxy
export const PATCH   = proxy
