/**
 * Quick health-check for the Python predictive backend.
 * Returns { online: boolean, ...backendInfo }
 */
import { NextResponse } from 'next/server'
import { BACKEND_URL } from '@/lib/app-config'

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      signal: AbortSignal.timeout(3_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    return NextResponse.json({ online: true, ...data })
  } catch {
    return NextResponse.json({ online: false }, { status: 200 })
  }
}
