/**
 * 🛰️ STAFF ENGINEER: Network Resilience Layer (SaaS Grade)
 * 
 * Implements exponential backoff, timeout handling, and rate-limit awareness
 * to eliminate 'TypeError: Failed to fetch' and ensure high availability.
 */

interface RetryConfig {
  maxRetries:   number
  baseDelay:    number
  maxDelay:     number
  timeoutMs:    number
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries:   3,
  baseDelay:    500,  // 0.5s
  maxDelay:     5000, // 5s
  timeoutMs:    8000  // 8s
}

/**
 * Enhanced fetch with exponential backoff and timeout
 */
export async function fetchWithRetry(
  url: string | URL | Request,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const { maxRetries, baseDelay, maxDelay, timeoutMs } = { ...DEFAULT_CONFIG, ...config }
  
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId   = setTimeout(() => controller.abort(), timeoutMs)

    try {
      if (attempt > 0) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
        console.warn(`[Network Resilience] Retry attempt ${attempt}/${maxRetries} in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Only retry on 5xx errors or 429 (Rate Limit)
      if (response.status >= 500 || response.status === 429) {
        if (attempt < maxRetries) {
          // If 429, respect Retry-After header if present
          const retryAfter = response.headers.get('Retry-After')
          if (retryAfter && response.status === 429) {
            const seconds = parseInt(retryAfter, 10) || 2
            await new Promise(resolve => setTimeout(resolve, seconds * 1000))
          }
          continue
        }
      }

      return response

    } catch (error: any) {
      clearTimeout(timeoutId)
      lastError = error

      // Detect "Failed to fetch" (Network Error)
      const isNetworkError = error.name === 'TypeError' || error.name === 'AbortError'
      
      if (isNetworkError && attempt < maxRetries) {
        continue
      }

      throw error
    }
  }

  throw lastError || new Error(`Failed to fetch after ${maxRetries} attempts`)
}
