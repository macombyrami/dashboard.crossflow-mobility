/**
 * Exponential backoff retry utility.
 *
 * Usage:
 *   const data = await withRetry(() => fetch(url), { attempts: 3, baseMs: 300 })
 */

export interface RetryOptions {
  /** Max total attempts (including the first try). Default: 3 */
  attempts?: number
  /** Base delay in ms before first retry. Default: 300 */
  baseMs?: number
  /** Multiplier applied after each failure. Default: 2 */
  factor?: number
  /** Max delay cap in ms. Default: 10_000 */
  maxMs?: number
  /** Optional predicate — return false to abort retries immediately. */
  shouldRetry?: (err: unknown, attempt: number) => boolean
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const {
    attempts   = 3,
    baseMs     = 300,
    factor     = 2,
    maxMs      = 10_000,
    shouldRetry,
  } = opts

  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (shouldRetry && !shouldRetry(err, i + 1)) break
      if (i < attempts - 1) {
        const delay = Math.min(baseMs * Math.pow(factor, i), maxMs)
        await sleep(delay)
      }
    }
  }
  throw lastErr
}

/**
 * Convenience wrapper for fetch with retry.
 * Retries on network errors AND 5xx responses.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOpts: RetryOptions = {},
): Promise<Response> {
  return withRetry(async () => {
    const res = await fetch(url, init)
    // Retry server errors but not client errors
    if (res.status >= 500) {
      throw new Error(`HTTP ${res.status} from ${url}`)
    }
    return res
  }, retryOpts)
}
