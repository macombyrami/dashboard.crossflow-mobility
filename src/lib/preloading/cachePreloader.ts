import { createClient } from '@/lib/supabase/server'
import { aggregationEngine } from '@/lib/aggregation/AggregationEngine'

export class CachePreloader {
  private supabase = createClient()

  /**
   * Preload snapshots for most visited cities
   * Called by background job every 30 minutes
   */
  async preloadMostVisitedCities() {
    console.log('[Preloader] Starting preload for top cities...')

    try {
      // Get top 10 visited cities
      const supabase = await this.supabase
      const { data: topCities } = await supabase
        .from('user_city_visits')
        .select('city_id, visit_count')
        .order('visit_count', { ascending: false })
        .limit(10)

      if (!topCities || topCities.length === 0) {
        console.log('[Preloader] No user visit history found')
        return
      }

      console.log(`[Preloader] Preloading ${topCities.length} cities...`)

      // Preload in parallel
      const results = await Promise.allSettled(
        topCities.map(({ city_id }) =>
          aggregationEngine.getOrFetchSnapshot(city_id)
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      console.log(`[Preloader] Preloaded ${succeeded}/${topCities.length} cities`)

      return {
        cities_preloaded: succeeded,
        total_cities: topCities.length,
      }
    } catch (error) {
      console.error('[Preloader] Error:', error)
      throw error
    }
  }

  /**
   * Preload for a specific user based on their patterns
   */
  async preloadForUser(userId: string) {
    try {
      const supabase = await this.supabase
      const { data: userCities } = await supabase
        .from('user_city_visits')
        .select('city_id')
        .eq('user_id', userId)
        .order('last_visited', { ascending: false })
        .limit(5)

      if (!userCities) return

      // Preload user's favorite cities
      await Promise.allSettled(
        userCities.map(({ city_id }) =>
          aggregationEngine.getOrFetchSnapshot(city_id)
        )
      )
    } catch (error) {
      console.error('[Preloader] User preload error:', error)
    }
  }

  /**
   * Track user city visit
   */
  async trackVisit(userId: string, cityId: string) {
    try {
      const supabase = await this.supabase
      const { data: existing } = await supabase
        .from('user_city_visits')
        .select('visit_count')
        .eq('user_id', userId)
        .eq('city_id', cityId)
        .maybeSingle()

      if (existing) {
        await supabase
          .from('user_city_visits')
          .update({
            last_visited: new Date().toISOString(),
            visit_count: existing.visit_count + 1,
          })
          .eq('user_id', userId)
          .eq('city_id', cityId)
      } else {
        await supabase.from('user_city_visits').insert({
          user_id: userId,
          city_id: cityId,
          visit_count: 1,
          last_visited: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error('[Preloader] Track visit error:', error)
    }
  }
}

export const cachePreloader = new CachePreloader()
