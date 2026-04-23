import { createClient } from '@/lib/supabase/server'

export class PerformanceMonitor {
  private supabase = createClient()

  async logAPICall(
    apiName: string,
    endpoint: string,
    responseTimeMs: number,
    success: boolean,
    cacheHit: boolean = false,
    dataQualityScore: number = 1.0,
    cityId?: string,
    errorMessage?: string
  ) {
    const supabase = await this.supabase
    await supabase.from('api_performance_log').insert({
      api_name: apiName,
      endpoint,
      response_time_ms: responseTimeMs,
      success,
      cache_hit: cacheHit,
      data_quality_score: dataQualityScore,
      city_id: cityId,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    })
  }

  async getPerformanceStats(apiName: string, hours: number = 24) {
    const supabase = await this.supabase
    const { data } = await supabase
      .from('api_performance_log')
      .select('*')
      .eq('api_name', apiName)
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    if (!data || data.length === 0) return null

    const successful = data.filter(d => d.success)
    const cacheHits = data.filter(d => d.cache_hit)

    return {
      total_calls: data.length,
      success_rate: (successful.length / data.length) * 100,
      avg_response_time: data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / data.length,
      cache_hit_rate: (cacheHits.length / data.length) * 100,
      avg_data_quality: data.reduce((sum, d) => sum + (d.data_quality_score || 1), 0) / data.length,
    }
  }

  async getAllStats(hours: number = 24) {
    const supabase = await this.supabase
    const { data } = await supabase
      .from('api_performance_log')
      .select('api_name, success, cache_hit, response_time_ms')
      .gte('created_at', new Date(Date.now() - hours * 60 * 60 * 1000).toISOString())

    if (!data || data.length === 0) return null

    const byAPI = data.reduce((acc, log) => {
      if (!acc[log.api_name]) {
        acc[log.api_name] = []
      }
      acc[log.api_name].push(log)
      return acc
    }, {} as Record<string, any[]>)

    return {
      total_calls: data.length,
      success_rate: (data.filter(d => d.success).length / data.length) * 100,
      cache_hit_rate: (data.filter(d => d.cache_hit).length / data.length) * 100,
      avg_response_time: data.reduce((sum, d) => sum + (d.response_time_ms || 0), 0) / data.length,
      by_api: Object.entries(byAPI).reduce((acc, [api, logs]) => {
        acc[api] = {
          calls: logs.length,
          success_rate: (logs.filter(l => l.success).length / logs.length) * 100,
          cache_hit_rate: (logs.filter(l => l.cache_hit).length / logs.length) * 100,
        }
        return acc
      }, {} as Record<string, any>),
    }
  }

  async trackUserVisit(userId: string, cityId: string) {
    const supabase = await this.supabase
    await supabase.from('user_city_visits').upsert(
      {
        user_id: userId,
        city_id: cityId,
        last_visited: new Date().toISOString(),
        visit_count: 1,
      },
      { onConflict: 'user_id,city_id' }
    )
  }
}

export const performanceMonitor = new PerformanceMonitor()
