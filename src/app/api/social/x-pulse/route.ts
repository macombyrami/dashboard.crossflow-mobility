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

// ─── Simulated Raw Tweets (representing a high-density scrape of @sytadin) ─────
const MOCK_RAW_TWEETS = [
  {
    id: 'x1',
    text: "[EN COURS] FLASH/Accident sur l'A1 vers Paris au niveau de la Courneuve. Voie de droite bloquée, gros bouchon en amont. #A1 #Accident",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -5,
  },
  {
    id: 'x2',
    text: "FLASH/Accident sur l'A86 extérieur (Maisons-Alfort). Une voiture seule immobilisée. Prudence dans le secteur. #A86 #IDF",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -22,
  },
  {
    id: 'x3',
    text: "FLASH/A15 vers la province : Fermeture de la sortie n°2 vers Saint-Gratien et Enghien les Bains. #A15 #Travaux",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -45,
  },
  {
    id: 'x4',
    text: "FLASH/Circulation difficile sur l'A86 sens Extérieur, entre La Courneuve et Gennevilliers : Accident. #A86 #Trafic",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -12,
  },
  {
    id: 'x5',
    text: "Flash/ N12 coupée en direction de Paris (Maulette). Itinéraire de délestage conseillé par la RN10. #N12 #Blocage",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -30,
  },
  {
    id: 'x6',
    text: "FLASH/Accident sur l'A3 vers Paris (Aulnay sous Bois). Deux voies neutralisées. Bouchon de 5 km. #A3 #Bouchon",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -8,
  },
  {
    id: 'x7',
    text: "FLASH/A86 extérieur : Fermeture de la sortie 22 (D19-Créteil / l'échat). Travaux en cours. #A86 #SortieClose",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -18,
  },
  {
    id: 'x8',
    text: "FLASH/Accident sur l'A1 vers Paris (Le Bourget). Véhicule léger contre PL. Secteur très chargé. #A1 #InfoTrafic",
    user: { name: "Sytadin", handle: "sytadin", avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_2_normal.png" },
    time: -35,
  }
]

// ─── AI-like Parser (RAG-lite) ────────────────────────────────────────────────
// Improved to handle Sytadin-style syntax and IDF geography
function parseTweet(raw: typeof MOCK_RAW_TWEETS[0]): SocialPost {
  const text = raw.text.toUpperCase()
  
  // Severity detection
  let severity: SocialPost['severity'] = 'low'
  if (text.includes('COUPÉE') || text.includes('BLOQUÉE') || text.includes('NEUTRALISÉES')) severity = 'critical'
  else if (text.includes('ACCIDENT') || text.includes('FERMETURE')) severity = 'high'
  else if (text.includes('DIFFICILE') || text.includes('BOUCHON')) severity = 'medium'

  // Type detection
  let type: SocialPost['type'] = 'info'
  if (text.includes('ACCIDENT') || text.includes('VÉHICULE')) type = 'alert'
  else if (text.includes('BOUCHON') || text.includes('DIFFICLE') || text.includes('CHARGÉ')) type = 'congestion'
  else if (text.includes('FERMETURE') || text.includes('TRAVAUX')) type = 'alert'

  // Location extraction (Improved regex)
  const locMatch = raw.text.match(/\(([^)]+)\)/) || raw.text.match(/(à|au niveau de|entre|vers)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
  let location = 'Île-de-France'
  if (locMatch) {
    location = locMatch[1] || locMatch[2]
  }

  // Axis extraction (A1, A13, N118, BP, etc.)
  const axisMatch = raw.text.match(/\/(A\d+|N\d+|D\d+|RN\d+|BP|RN\d+)\b/i) || raw.text.match(/([A-Z]\d+)/)
  const tags = raw.text.match(/#[a-zA-Z0-9]+/g)?.map(t => t.replace('#', '')) || []
  if (axisMatch) tags.push(axisMatch[1].toUpperCase())


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
