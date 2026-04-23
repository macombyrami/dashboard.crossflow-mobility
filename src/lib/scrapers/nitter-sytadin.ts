/**
 * Nitter Sytadin Scraper
 * Fetches real-time traffic incidents from Sytadin via Nitter
 * Uses Cheerio for fast parsing with Puppeteer fallback
 */

import * as cheerio from 'cheerio'
import type { RawTweet } from '@/types'

interface NitterScraperConfig {
  url: string
  timeout: number
  retries: number
}

export class NitterSytadinScraper {
  private config: NitterScraperConfig
  private lastTweetIds: Set<string> = new Set()

  constructor(config: Partial<NitterScraperConfig> = {}) {
    this.config = {
      url: 'https://nitter.net/sytadin',
      timeout: 10000,
      retries: 2,
      ...config
    }
  }

  async scrape(): Promise<RawTweet[]> {
    try {
      const html = await this.fetchHTML()
      const tweets = this.parseCheerio(html)

      if (tweets.length === 0) {
        console.warn('[NitterScraper] No tweets found, Cheerio might have failed')
      }

      return tweets
    } catch (error) {
      console.error('[NitterScraper] Fatal error:', error)
      return []
    }
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

          if (this.lastTweetIds.has(tweetId)) {
            return // Skip duplicates
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
            this.lastTweetIds.add(tweetId)
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
