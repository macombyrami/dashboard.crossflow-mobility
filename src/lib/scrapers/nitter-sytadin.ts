/**
 * Nitter Sytadin Scraper
 * Primary: Python ntscraper
 * Fallback: Cheerio HTML parser
 */

import * as cheerio from 'cheerio'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { RawTweet } from '@/types'

interface NitterScraperConfig {
  url: string
  timeout: number
  retries: number
  usePythonPrimary: boolean
}

export class NitterSytadinScraper {
  private config: NitterScraperConfig
  private lastTweetIds: Set<string> = new Set()

  constructor(config: Partial<NitterScraperConfig> = {}) {
    this.config = {
      url: 'https://nitter.net/sytadin',
      timeout: 10000,
      retries: 2,
      usePythonPrimary: true,
      ...config
    }
  }

  async scrape(): Promise<RawTweet[]> {
    try {
      if (this.config.usePythonPrimary) {
        const pythonTweets = await this.scrapeViaPython()
        if (pythonTweets.length > 0) {
          return this.deduplicateWithinRun(pythonTweets)
        }
        console.warn('[NitterScraper] Python scraper returned no tweets, falling back to Cheerio')
      }

      const html = await this.fetchHTML()
      const tweets = this.parseCheerio(html)
      return this.deduplicateWithinRun(tweets)
    } catch (error) {
      console.error('[NitterScraper] Fatal error:', error)
      return []
    }
  }

  private async scrapeViaPython(): Promise<RawTweet[]> {
    const scriptPath = join(process.cwd(), 'scripts', 'sytadin_ntscraper.py')
    if (!existsSync(scriptPath)) {
      return []
    }

    const candidates = process.platform === 'win32'
      ? ['python', 'python3', 'py']
      : ['python3', 'python']

    for (const bin of candidates) {
      try {
        const output = await this.runPython(bin, scriptPath)
        if (!output) continue

        const parsed = JSON.parse(output) as { ok?: boolean; tweets?: RawTweet[]; error?: string }
        if (!parsed.ok) {
          console.warn(`[NitterScraper] Python ${bin} execution failed: ${parsed.error ?? 'unknown error'}`)
          continue
        }

        const tweets = Array.isArray(parsed.tweets) ? parsed.tweets : []
        if (tweets.length > 0) {
          console.log(`[NitterScraper] Extracted ${tweets.length} tweets via ntscraper (${bin})`)
        }
        return tweets
      } catch (error) {
        console.debug(`[NitterScraper] Python candidate ${bin} unavailable:`, error)
      }
    }

    return []
  }

  private async runPython(binary: string, scriptPath: string): Promise<string> {
    const args = binary === 'py' ? ['-3', scriptPath, 'sytadin', '50'] : [scriptPath, 'sytadin', '50']
    const child = spawn(binary, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString()
    })

    const timeoutId = setTimeout(() => {
      child.kill()
    }, this.config.timeout)

    const [exitCode] = await once(child, 'close')
    clearTimeout(timeoutId)

    if (exitCode !== 0) {
      throw new Error(stderr.trim() || `Python exited with ${String(exitCode)}`)
    }

    return stdout.trim()
  }

  private deduplicateWithinRun(tweets: RawTweet[]): RawTweet[] {
    const out: RawTweet[] = []
    for (const tweet of tweets) {
      if (!tweet.id || this.lastTweetIds.has(tweet.id)) {
        continue
      }
      this.lastTweetIds.add(tweet.id)
      out.push(tweet)
    }

    if (out.length === 0) {
      console.warn('[NitterScraper] No tweets found from all strategies')
    }
    return out
  }

  private async fetchHTML(): Promise<string> {
    let lastError: Error | null = null

    for (let i = 0; i < this.config.retries; i++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

        try {
          const response = await fetch(this.config.url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          })

          clearTimeout(timeoutId)

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          return await response.text()
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (error) {
        lastError = error as Error
        if (i < this.config.retries - 1) {
          const delay = 1000 * (i + 1)
          console.debug(`[NitterScraper] Retry ${i + 1}/${this.config.retries} after ${delay}ms`)
          await new Promise(r => setTimeout(r, delay))
        }
      }
    }

    throw lastError || new Error('Failed to fetch from Nitter')
  }

  private parseCheerio(html: string): RawTweet[] {
    try {
      const $ = cheerio.load(html)
      const tweets: RawTweet[] = []

      // Nitter DOM structure: article elements contain tweets
      // Look for tweet containers in the timeline
      const tweetElements = $('div.timeline article, article.tweet-container, div[data-tweet-id]')

      if (tweetElements.length === 0) {
        console.debug('[NitterScraper] No tweet elements found in Nitter HTML')
        // Try alternative selectors
        const altElements = $('div.tweet, article')
        console.debug(`[NitterScraper] Found ${altElements.length} alternative elements`)
      }

      tweetElements.each((_, element) => {
        try {
          // Try to extract tweet ID
          let tweetId = $(element).attr('data-tweet-id') ||
                       $(element).find('a[href*="/status/"]').attr('href')?.split('/').pop()

          if (!tweetId) {
            const href = $(element).find('a[href*="/sytadin/status/"]').attr('href')
            if (href) {
              tweetId = href.split('/status/')[1]?.split('/')[0]
            }
          }

          if (!tweetId) {
            return
          }

          // Extract tweet text
          const textEl = $(element).find('p.tweet-text, div.tweet-content p, p')
          let text = textEl.text().trim()

          // If no text found, try alternative selectors
          if (!text) {
            text = $(element).find('div.text-secondary').first().text().trim()
          }

          if (!text) {
            text = $(element).text().trim().substring(0, 280)
          }

          // Extract timestamp
          let timestamp = $(element).find('time').attr('title')
          if (!timestamp) {
            const timeEl = $(element).find('a[href*="status"]').last()
            timestamp = timeEl.attr('title')
          }

          const created_at = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString()

          if (text && text.length > 10) {
            tweets.push({
              id: tweetId,
              text,
              created_at
            })
          }
        } catch (error) {
          console.debug(`[NitterScraper] Error parsing individual tweet element:`, error)
        }
      })

      console.log(`[NitterScraper] Extracted ${tweets.length} tweets from Nitter`)
      return tweets
    } catch (error) {
      console.error(`[NitterScraper] Error parsing HTML with Cheerio:`, error)
      return []
    }
  }
}

export async function scrapeSytadinIncidents(): Promise<RawTweet[]> {
  const scraper = new NitterSytadinScraper()
  return scraper.scrape()
}
