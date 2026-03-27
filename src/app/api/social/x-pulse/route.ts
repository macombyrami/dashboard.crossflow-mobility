import { NextRequest, NextResponse } from 'next/server'

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

// ─── Simulated Raw Tweets (representing a scrape result) ──────────────────────
const MOCK_RAW_TWEETS = [
  {
    id: 'x1',
    text: "Gros carton sur l'A13 direction Paris au niveau de Rocquencourt. 3 voitures impliquées, ça ne bouge plus du tout ! #A13 #TraficIDF",
    user: { name: "Jean-Pierre T.", handle: "jpt_paris", avatar: "https://i.pravatar.cc/150?u=x1" },
    time: -2,
  },
  {
    id: 'x2',
    text: "Incroyable bouchon sur le périph intérieur entre Porte d'Italie et Porte de Versailles. On est à l'arrêt complet depuis 20 min. #Périph #Bouchon",
    user: { name: "Léa Mobility", handle: "lea_mob", avatar: "https://i.pravatar.cc/150?u=x2" },
    time: -15,
  },
  {
    id: 'x3',
    text: "Travaux non signalés sur la N118 vers Vélizy. Passage sur une voie seulement. Évitez le secteur si possible. #N118 #Travaux",
    user: { name: "Alertes Route", handle: "route_alert", avatar: "https://i.pravatar.cc/150?u=x3" },
    time: -45,
  },
  {
    id: 'x4',
    text: "Manifestation en cours à République, les bus sont déviés. Circulation très compliquée dans le 11ème. #Paris #Manifestation",
    user: { name: "Actu Paris", handle: "actu_paris", avatar: "https://i.pravatar.cc/150?u=x4" },
    time: -60,
  },
  {
    id: 'x5',
    text: "Panne de signalisation sur l'A1 à hauteur du Stade de France. Ça commence à bien coincer en direction de Roissy. #A1 #InfoTrafic",
    user: { name: "Thomas Driver", handle: "tom_drive", avatar: "https://i.pravatar.cc/150?u=x5" },
    time: -10,
  }
]

// ─── AI-like Parser (RAG-lite) ────────────────────────────────────────────────
// In a real scenario, this would call the /api/ai route or a dedicated model
function parseTweet(raw: typeof MOCK_RAW_TWEETS[0]): SocialPost {
  const text = raw.text.toUpperCase()
  
  // Severity detection
  let severity: SocialPost['severity'] = 'low'
  if (text.includes('ARRÊT COMPLET') || text.includes('CARTON') || text.includes('GRAVE')) severity = 'critical'
  else if (text.includes('BOUCHON') || text.includes('COMPLIQUÉE')) severity = 'high'
  else if (text.includes('TRAVAUX') || text.includes('DÉVIÉS')) severity = 'medium'

  // Type detection
  let type: SocialPost['type'] = 'info'
  if (text.includes('ACCIDENT') || text.includes('CARTON') || text.includes('PANNE')) type = 'alert'
  else if (text.includes('BOUCHON') || text.includes('FLUX') || text.includes('COINCER')) type = 'congestion'

  // Location extraction
  const locationMatch = raw.text.match(/(à|au niveau de|entre|vers)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/)
  const location = locationMatch ? locationMatch[2] : 'Île-de-France'

  // Axis extraction (A1, A13, N118, etc.)
  const axes = raw.text.match(/(A\d+|N\d+|D\d+|RN\d+|BP|Périph)/i)
  const tags = raw.text.match(/#[a-zA-Z0-9]+/g)?.map(t => t.replace('#', '')) || []
  if (axes) tags.push(axes[0].toUpperCase())

  const timestamp = new Date(Date.now() + raw.time * 60000).toISOString()

  return {
    id: raw.id,
    type,
    text: raw.text,
    location,
    severity,
    timestamp,
    tags: Array.from(new Set(tags)),
    author: raw.user
  }
}

export async function GET(req: NextRequest) {
  // Simulate latency of a scraper + AI processing
  await new Promise(r => setTimeout(r, 600))

  try {
    const posts = MOCK_RAW_TWEETS.map(parseTweet)
    
    return NextResponse.json({
      posts,
      fetchedAt: new Date().toISOString(),
      source: 'X (Twitter) Monitoring',
      status: 'online'
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process social feed' }, { status: 500 })
  }
}
