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

// ─── In-memory fallback (LRU, 500-entry cap) ─────────────────────────────────

interface MemEntry { value: string; expiresAt: number }

/**
 * LRU store: Map preserves insertion order; on access we delete + re-insert
 * to move the key to the "most recently used" tail.
 */
const memStore = new Map<string, MemEntry>()
const MEM_MAX  = 500
let lastEviction = 0

function memTouch(key: string, entry: MemEntry) {
  memStore.delete(key)
  memStore.set(key, entry) // re-insert at tail → MRU position
}

function memEvict() {
  const now = Date.now()
  // Passive TTL sweep at most every 30 s
  if (now - lastEviction >= 30_000) {
    lastEviction = now
    for (const [k, v] of memStore) {
      if (v.expiresAt < now) memStore.delete(k)
    }
  }
  // Active LRU cap: evict head (= least recently used) entries
  while (memStore.size >= MEM_MAX) {
    const lruKey = memStore.keys().next().value
    if (lruKey) memStore.delete(lruKey)
    else break
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
  memTouch(key, entry) // promote to MRU
  try { return JSON.parse(entry.value) as T } catch { return null }
}

async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const s = JSON.stringify(value)
  if (hasUpstash()) {
    await redisCmd('SET', key, s, 'EX', ttlSec)
    return
  }
  memEvict() // enforces MEM_MAX cap before inserting
  memStore.set(key, { value: s, expiresAt: Date.now() + ttlSec * 1_000 })
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

// ─── In-flight deduplication ─────────────────────────────────────────────────
// Coalesces concurrent calls with the same key: only the first caller fires the
// loader; subsequent callers await the same Promise.

const inFlight = new Map<string, Promise<unknown>>()

async function getOrSetDeduped<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSec: number,
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached != null) return cached

  const existing = inFlight.get(key) as Promise<T> | undefined
  if (existing) return existing

  const promise = fn().then(async fresh => {
    await cacheSet(key, fresh, ttlSec)
    inFlight.delete(key)
    return fresh
  }).catch(err => {
    inFlight.delete(key)
    throw err
  })

  inFlight.set(key, promise as Promise<unknown>)
  return promise
}

export const cache = {
  get:      cacheGet,
  set:      cacheSet,
  del:      cacheDel,
  /** Simple getOrSet (no dedup) — use when fn is cheap or already guarded */
  getOrSet,
  /** Deduped getOrSet — coalesces concurrent in-flight requests for the same key */
  getOrSetDeduped,
}
