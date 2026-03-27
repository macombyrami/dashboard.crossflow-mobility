import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Path to localized cache
const CACHE_PATH = path.join(process.cwd(), 'src/lib/data/social_cache.json')

interface SocialPost {
  id:       string
  type:     'alert' | 'congestion' | 'info'
  text:     string
  location: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  tags:     string[]
  author?: {
    name: string
    handle: string
    avatar: string
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === 'true'

  try {
    // 1. Load localized cache as baseline fallback
    let fallbackData: { posts: any[] } = { posts: [] }
    if (fs.existsSync(CACHE_PATH)) {
      fallbackData = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
    }

    // 2. Try to sync with Supabase if refresh is requested
    if (refresh && fallbackData.posts.length > 0) {
      try {
        const inserts = fallbackData.posts.map(p => ({
          external_id: p.id,
          source: 'x-pulse',
          text: p.text,
          type: p.type,
          severity: p.severity,
          location: p.location,
          axis: p.axis,
          author_name: p.author_name || 'Sytadin',
          author_handle: p.author_handle || 'sytadin',
          author_avatar: p.author_avatar || '',
          timestamp: p.timestamp,
          tags: p.tags
        }))
        await supabase.from('social_alerts').upsert(inserts, { onConflict: 'external_id' })
      } catch (dbErr) {
        console.warn('[X-Pulse API] Supabase sync failed, using local cache:', dbErr)
      }
    }

    // 3. Fetch from Supabase WITH fallback to JSON
    let alerts = []
    try {
      const { data, error } = await supabase
        .from('social_alerts')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(20)
      
      if (!error && data && data.length > 0) {
        alerts = data
      } else {
        // Use JSON fallback if DB is empty or fails
        alerts = fallbackData.posts
      }
    } catch {
      alerts = fallbackData.posts
    }

    return NextResponse.json({
      posts: alerts.map(a => ({
        id: a.id || a.external_id,
        type: a.type,
        text: a.text,
        location: a.location,
        severity: a.severity,
        timestamp: a.timestamp,
        tags: a.tags || [],
        author: {
          name: a.author_name || 'Sytadin',
          handle: a.author_handle || 'sytadin',
          avatar: a.author_avatar || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png'
        }
      })),
      fetchedAt: new Date().toISOString(),
      source: alerts === fallbackData.posts ? 'Local Cache (High Resilience)' : 'Supabase Pulse API',
      status: 'online'
    })
  } catch (error) {
    console.error('[X-Pulse API] Fatal Error:', error)
    return NextResponse.json({ error: 'Social engine failure' }, { status: 500 })
  }
}

