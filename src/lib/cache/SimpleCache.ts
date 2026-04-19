/**
 * Simple In-Memory Singleton Cache
 * Used by Next.js API routes to deduplicate and cache heavy API calls
 * during the same process lifetime (e.g. concurrent user requests for same city).
 */

type CacheEntry<T> = {
  data: T
  expiresAt: number
}

class SimpleCache {
  private static instance: SimpleCache
  private cache: Map<string, CacheEntry<any>> = new Map()

  private constructor() {
    // Periodic cleanup (every minute)
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60000)
    }
  }

  public static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache()
    }
    return SimpleCache.instance
  }

  /**
   * Get an item from the cache
   * @param key Unique key (e.g. "flow:paris:12.3,45.6")
   */
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  /**
   * Set an item in the cache
   * @param key Unique key
   * @param data Data to store
   * @param ttlSeconds Time to live in seconds
   */
  public set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000
    })
  }

  /**
   * Delete an item from the cache
   */
  public delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * Manual cleanup of expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

export const cache = SimpleCache.getInstance()
