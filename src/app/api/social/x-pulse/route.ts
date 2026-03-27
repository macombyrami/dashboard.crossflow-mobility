import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

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

// ─── Real Data from Scraping (Browser Subagent result) ────────────────────────
const RECENT_SCRAPED_ALERTS = [
  { text: "[Terminé] FLASH/Accident sur l'A1 vers Paris (La Bourget) (#590276)", time: -15 },
  { text: "FLASH/Accident sur l'A86 extérieur (Maisons-Alfort) http://sytadin.fr/sys/alert_reseau.jsp.html#590277", time: -49 },
  { text: "FLASH/Accident sur l'A1 vers Paris (La Bourget) http://sytadin.fr/sys/alert_reseau.jsp.html#590274", time: -60 },
  { text: "[Terminé] FLASH/Accident sur l'A3 vers Paris (Aulnay sous Bois) (#590270)", time: -65 },
  { text: "FLASH/Accident sur l'A3 vers Paris (Aulnay sous Bois) http://sytadin.fr/sys/alert_reseau.jsp.html#590270", time: -70 },
  { text: "FLASH/Accident sur l'A4 vers Paris (Aulnay sous Bois) http://sytadin.fr/sys/alert_reseau.jsp.html#590269", time: -75 },
  { text: "[Terminé] FLASH/BUS en panne sur l'A1 vers Paris (Saint Denis) (#590268)", time: -120 },
  { text: "FLASH/BUS en panne sur l'A1 vers Paris (Saint Denis) http://sytadin.fr/sys/alert_reseau.jsp.html#590268", time: -180 },
]

function parseText(rawText: string, timeOffset: number): Partial<SocialPost> {
  const text = rawText.toUpperCase()
  let severity: SocialPost['severity'] = 'low'
  if (text.includes('COUPÉE') || text.includes('BLOQUÉE') || text.includes('NEUTRALISÉES')) severity = 'critical'
  else if (text.includes('ACCIDENT') || text.includes('FERMETURE')) severity = 'high'
  else if (text.includes('DIFFICILE') || text.includes('BOUCHON') || text.includes('PANNE')) severity = 'medium'

  let type: SocialPost['type'] = 'info'
  if (text.includes('ACCIDENT') || text.includes('PANNE')) type = 'alert'
  else if (text.includes('BOUCHON') || text.includes('DIFFICILE')) type = 'congestion'

  const locMatch = rawText.match(/\(([^)]+)\)/) || rawText.match(/(à|au niveau de|entre|vers)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
  const axisMatch = rawText.match(/\/(A\d+|N\d+|D\d+|RN\d+|BP|RN\d+)\b/i)
  
  return {
    text: rawText,
    type,
    severity,
    location: locMatch ? (locMatch[1] || locMatch[2]) : 'Île-de-France',
    tags: axisMatch ? [axisMatch[1].toUpperCase()] : [],
    timestamp: new Date(Date.now() + timeOffset * 60000).toISOString()
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const refresh = searchParams.get('refresh') === 'true'

  try {
    // 1. If refresh requested, simulate an ingestion of real-time data into Supabase
    if (refresh) {
      const inserts = RECENT_SCRAPED_ALERTS.map((a, i) => {
        const parsed = parseText(a.text, a.time)
        return {
          external_id: `sytadin-${Date.now()}-${i}`,
          source: 'x-pulse',
          text: a.text,
          type: parsed.type,
          severity: parsed.severity,
          location: parsed.location,
          axis: parsed.tags?.[0],
          author_name: 'Sytadin',
          author_handle: 'sytadin',
          author_avatar: 'https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png',
          timestamp: parsed.timestamp,
          tags: parsed.tags
        }
      })

      // In a real scenario, we'd use upsert to avoid duplicates by external_id
      await supabase.from('social_alerts').upsert(inserts, { onConflict: 'external_id' })
    }

    // 2. Fetch the latest 20 alerts from Supabase
    const { data: alerts, error } = await supabase
      .from('social_alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({
      posts: alerts.map(a => ({
        id: a.id,
        type: a.type,
        text: a.text,
        location: a.location,
        severity: a.severity,
        timestamp: a.timestamp,
        tags: a.tags || [],
        author: {
          name: a.author_name,
          handle: a.author_handle,
          avatar: a.author_avatar
        }
      })),
      fetchedAt: new Date().toISOString(),
      source: 'Supabase Pulse API',
      status: 'online'
    })
  } catch (error) {
    console.error('[X-Pulse API] Error:', error)
    return NextResponse.json({ error: 'Database synchronization failed' }, { status: 500 })
  }
}

