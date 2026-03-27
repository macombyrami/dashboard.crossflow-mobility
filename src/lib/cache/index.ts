/**
 * Shared cache layer — CrossFlow Backend
 *
 * Priority:
 *   1. Upstash Redis (via REST API — no extra package)
 *      Set: UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *   2. In-memory Map (fallback — single-instance, works in dev)
 *
 * API:
 *   cache.get<T>(key)
 *   cache.set(key, value, ttlSec)
 *   cache.del(key)
 *   cache.getOrSet(key, fn, ttlSec)
 */

// ─── In-memory fallback ───────────────────────────────────────────────────────

interface MemEntry { value: string; expiresAt: number }
const memStore = new Map<string, MemEntry>()
let lastEviction = 0

function memEvict() {
  const now = Date.now()
  if (now - lastEviction < 30_000) return
  lastEviction = now
  for (const [k, v] of memStore) {
    if (v.expiresAt < now) memStore.delete(k)
  }
}

// ─── Upstash REST client ──────────────────────────────────────────────────────

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  )
}

async function redisCmd<T = unknown>(command: string, ...args: (string | number)[]): Promise<T | null> {
  try {
    const res = await fetch(process.env.UPSTASH_REDIS_REST_URL!, {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body:   JSON.stringify([command, ...args]),
      signal: AbortSignal.timeout(3_000),
    })
    if (!res.ok) return null
    const json = (await res.json()) as { result?: T }
    return json.result ?? null
  } catch {
    return null
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

async function cacheGet<T>(key: string): Promise<T | null> {
  if (hasUpstash()) {
    const raw = await redisCmd<string>('GET', key)
    if (raw == null) return null
    try { return JSON.parse(raw) as T } catch { return null }
  }
  memEvict()
  const entry = memStore.get(key)
  if (!entry) return null
  if (entry.expiresAt < Date.now()) { memStore.delete(key); return null }
  try { return JSON.parse(entry.value) as T } catch { return null }
}

async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const s = JSON.stringify(value)
  if (hasUpstash()) {
    await redisCmd('SET', key, s, 'EX', ttlSec)
    return
  }
  memEvict()
  memStore.set(key, { value: s, expiresAt: Date.now() + ttlSec * 1_000 })
  if (memStore.size > 1_000) {
    const first = memStore.keys().next().value
    if (first) memStore.delete(first)
  }
}

async function cacheDel(key: string): Promise<void> {
  if (hasUpstash()) { await redisCmd('DEL', key); return }
  memStore.delete(key)
}

async function getOrSet<T>(key: string, fn: () => Promise<T>, ttlSec: number): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached != null) return cached
  const fresh = await fn()
  await cacheSet(key, fresh, ttlSec)
  return fresh
}

export const cache = {
  get:      cacheGet,
  set:      cacheSet,
  del:      cacheDel,
  getOrSet,
}
