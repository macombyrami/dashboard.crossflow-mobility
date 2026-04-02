/**
 * Token Bucket Rate Limiter
 * Respects HERE, TomTom, Overpass and Nominatim API limits
 *
 * HERE limits (from dashboard):
 *   - account/auth:         1666 req/min
 *   - advanced-datasets:    100  req/10s (most), 1000 req/10s (index/attributes)
 *   - geofencing:           500  req/10s (query), 10 req/10s (upload/modify)
 *   - traffic flow/incidents: ~5 req/s (free tier conservative estimate)
 * TomTom: ~5 req/s free tier
 * Overpass: 1 req/2s (public server fair-use policy)
 * Nominatim: 1 req/s (OSM usage policy)
 */

export class RateLimiter {
  private tokens:     number
  private maxTokens:  number
  private refillRate: number   // tokens per millisecond
  private lastRefill: number
  private queue:      Array<() => void> = []
  private processing  = false

  /**
   * @param requestsPerWindow  — max requests allowed in the window
   * @param windowMs           — window size in milliseconds
   */
  constructor(requestsPerWindow: number, windowMs: number) {
    this.maxTokens  = requestsPerWindow
    this.tokens     = requestsPerWindow
    this.refillRate = requestsPerWindow / windowMs
    this.lastRefill = Date.now()
  }

  private refill() {
    const now     = Date.now()
    const elapsed = now - this.lastRefill
    this.tokens   = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now
  }

  /** Acquire a token — waits if the bucket is empty */
  async acquire(): Promise<void> {
    return new Promise<void>(resolve => {
      this.queue.push(resolve)
      if (!this.processing) this.processQueue()
    })
  }

  private async processQueue() {
    this.processing = true
    while (this.queue.length > 0) {
      this.refill()
      if (this.tokens >= 1) {
        this.tokens--
        const resolve = this.queue.shift()!
        resolve()
      } else {
        // Wait until next token available
        const waitMs = Math.ceil((1 - this.tokens) / this.refillRate)
        await sleep(waitMs)
      }
    }
    this.processing = false
  }

  /** Current token count (0–max) */
  get available(): number {
    this.refill()
    return Math.floor(this.tokens)
  }

  /** Max tokens (= requests per window) */
  get limit(): number { return this.maxTokens }
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

// ─── Pre-configured limiters ──────────────────────────────────────────────────

/** HERE Traffic Flow: 5 req/s (conservative for free tier) */
export const hereFlowLimiter = new RateLimiter(5, 1_000)

/** HERE Incidents: 5 req/s */
export const hereIncidentsLimiter = new RateLimiter(5, 1_000)

/** HERE Account/Auth: 1666 req/min */
export const hereAccountLimiter = new RateLimiter(1666, 60_000)

/** HERE Advanced Datasets (most endpoints): 100 req/10s */
export const hereDatasetLimiter = new RateLimiter(100, 10_000)

/** TomTom Traffic: 5 req/s (free tier) */
export const tomtomLimiter = new RateLimiter(5, 1_000)

/** Overpass OSM: 1 req/2s (public server fair use) */
export const overpassLimiter = new RateLimiter(1, 2_000)

/** Nominatim OSM geocoding: 1 req/s (OSM usage policy) */
export const nominatimLimiter = new RateLimiter(1, 1_000)

/** 🛰️ Supabase Auth: 30 req/min (Conservative safety for Free Tier) */
export const supabaseAuthLimiter = new RateLimiter(30, 60_000)
