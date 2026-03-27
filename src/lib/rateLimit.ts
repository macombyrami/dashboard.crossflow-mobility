/**
 * Sliding-window rate limiter — uses the shared cache layer
 *
 * Usage in API routes:
 *   const ip = req.headers.get('x-forwarded-for') ?? 'anon'
 *   const rl = await rateLimit(ip, 'ai', 15, 60) // 15 req per 60s
 *   if (!rl.allowed) {
 *     return NextResponse.json({ error: 'Too many requests' }, {
 *       status: 429,
 *       headers: { 'Retry-After': String(rl.resetIn) },
 *     })
 *   }
 */

import { cache } from '@/lib/cache'

export interface RateLimitResult {
  allowed:   boolean
  remaining: number
  resetIn:   number   // seconds until window resets
}

export async function rateLimit(
  identifier: string,  // IP address or user ID
  endpoint:   string,  // route slug for namespacing
  limit:      number,  // max requests per window
  windowSec:  number,  // window size in seconds
): Promise<RateLimitResult> {
  const key       = `rl:${endpoint}:${identifier}`
  const now       = Math.floor(Date.now() / 1_000) // unix seconds
  const windowEnd = now + windowSec

  // Retrieve existing sliding-window timestamps
  const existing = await cache.get<number[]>(key) ?? []

  // Drop timestamps outside the current window
  const valid = existing.filter(t => t > now - windowSec)

  if (valid.length >= limit) {
    const oldestInWindow = valid[0]
    return {
      allowed:   false,
      remaining: 0,
      resetIn:   oldestInWindow + windowSec - now,
    }
  }

  valid.push(now)
  // TTL = full window so entries auto-expire in Redis
  await cache.set(key, valid, windowSec + 5)

  return {
    allowed:   true,
    remaining: limit - valid.length,
    resetIn:   windowEnd - now,
  }
}

/** Extract best-effort client IP from Next.js request headers */
export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    headers.get('x-real-ip') ??
    'unknown'
  )
}
