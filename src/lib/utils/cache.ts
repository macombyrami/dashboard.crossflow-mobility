/**
 * Simple in-memory cache with TTL support
 */
export class CacheWithTTL<T> {
  private cache: Map<string, { value: T; expireAt: number }> = new Map()

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined if expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    if (Date.now() > entry.expireAt) {
      this.cache.delete(key)
      return undefined
    }

    return entry.value
  }

  /**
   * Set a value in cache with TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttlMs Time to live in milliseconds
   */
  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expireAt: Date.now() + ttlMs,
    })
  }

  /**
   * Check if a key exists and is not expired
   * @param key Cache key
   */
  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  /**
   * Clear a specific key
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get cache size
   */
  get size(): number {
    return this.cache.size
  }
}

/**
 * Create a memoized selector for expensive calculations
 */
export function memoizeSelector<T, R>(
  selector: (data: T) => R,
  ttlMs: number = 5000
) {
  const cache = new CacheWithTTL<R>()
  let lastData: T | null = null

  return (data: T): R => {
    // If data object reference hasn't changed, return cached result
    if (lastData === data && cache.has('_default')) {
      return cache.get('_default')!
    }

    lastData = data
    const result = selector(data)
    cache.set('_default', result, ttlMs)
    return result
  }
}

/**
 * Prediction cache store
 */
export const predictionCache = new CacheWithTTL<any>()
export const PREDICTION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Transport cache store
 */
export const transportCache = new CacheWithTTL<any>()
export const TRANSPORT_CACHE_TTL = 2 * 60 * 1000 // 2 minutes

/**
 * Incident cache store
 */
export const incidentCache = new CacheWithTTL<any>()
export const INCIDENT_CACHE_TTL = 1 * 60 * 1000 // 1 minute
