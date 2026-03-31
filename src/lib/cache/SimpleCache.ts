/**
 * SimpleCache — Next.js In-Memory Level 1 Cache
 * Dédoublonne les requêtes API (TomTom, Weather, etc.) 
 * pour éviter d'appeler le même point dans une fenêtre < TTL.
 */

type CacheItem<T> = {
  data:      T
  expiresAt: number
}

class SimpleCache {
  private static instance: SimpleCache
  private store: Map<string, CacheItem<any>> = new Map()

  private constructor() {
    // Nettoyage périodique toutes les minutes
    if (typeof window === 'undefined') {
      setInterval(() => this.cleanup(), 60_000)
    }
  }

  public static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache()
    }
    return SimpleCache.instance
  }

  /**
   * Récupère une donnée du cache si elle est encore valide.
   */
  public get<T>(key: string): T | null {
    const item = this.store.get(key)
    if (!item) return null

    if (Date.now() > item.expiresAt) {
      this.store.delete(key)
      return null
    }

    return item.data as T
  }

  /**
   * Stocke une donnée avec une durée de vie (TTL) en secondes.
   */
  public set<T>(key: string, data: T, ttlSeconds: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    })
  }

  /**
   * Génère une clé unique basée sur les paramètres.
   */
  public makeKey(...args: any[]): string {
    return args
      .map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg))
      .join(':')
  }

  private cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        this.store.delete(key)
      }
    }
  }

  /**
   * Pour le monitoring : retourne la taille actuelle du cache.
   */
  public size(): number {
    return this.store.size
  }
}

export const simpleCache = SimpleCache.getInstance()
