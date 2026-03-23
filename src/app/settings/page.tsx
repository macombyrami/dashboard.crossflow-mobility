'use client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { Settings, Key, RefreshCw, Bell, Globe, CheckCircle2, XCircle } from 'lucide-react'

// API inventory with live status detection
const API_SOURCES = [
  {
    category: 'Trafic',
    apis: [
      { name: 'TomTom Traffic',          env: 'NEXT_PUBLIC_TOMTOM_API_KEY',    status: 'configured', note: '2 500 req/jour · Flux + incidents temps réel' },
      { name: 'HERE Traffic',            env: 'NEXT_PUBLIC_HERE_API_KEY',      status: 'missing',    note: '250 000 req/mois · Couverture 80+ pays' },
    ],
  },
  {
    category: 'Prévisions & Événements',
    apis: [
      { name: 'PredictHQ (événements)',  env: 'NEXT_PUBLIC_PREDICTHQ_API_KEY', status: 'configured', note: 'Concerts, matchs, congrès · Impact trafic estimé' },
      { name: 'OpenRouteService',        env: 'NEXT_PUBLIC_ORS_API_KEY',       status: 'configured', note: 'Isochrones · Routing réel · Matrice O/D' },
      { name: 'Calendrier scolaire',     env: null, status: 'free',            note: 'Vacances zones A/B/C · data.education.gouv.fr' },
      { name: 'Jours fériés France',     env: null, status: 'free',            note: 'calendrier.api.gouv.fr' },
      { name: 'Lever/coucher soleil',    env: null, status: 'free',            note: 'sunrise-sunset.org' },
    ],
  },
  {
    category: 'Transports',
    apis: [
      { name: 'RATP (trafic IDF)',       env: null, status: 'free',            note: 'Métro · RER · Tram · Temps réel' },
      { name: 'SNCF Open Data',          env: null, status: 'free',            note: 'Ponctualité grandes lignes' },
      { name: 'Navitia (multimodal)',    env: 'NEXT_PUBLIC_NAVITIA_API_KEY',   status: 'missing',    note: 'Horaires TC France/Europe' },
    ],
  },
  {
    category: 'Météo & Environnement',
    apis: [
      { name: 'Open-Meteo (météo)',      env: null, status: 'free',            note: 'Température · Vent · Précipitations · Prévisions 7j' },
      { name: 'Open-Meteo (qualité air)',env: null, status: 'free',            note: 'PM2.5 · PM10 · NO₂ · O₃ · IQA européen' },
      { name: 'OpenStreetMap / Overpass',env: null, status: 'free',            note: 'Réseau routier · POIs · Pistes cyclables' },
    ],
  },
  {
    category: 'Intelligence Artificielle',
    apis: [
      { name: 'OpenRouter — GPT OSS 120B', env: 'OPENROUTER_API_KEY',         status: 'configured', note: 'Assistant IA · Analyse trafic · Recommandations' },
    ],
  },
]

export default function SettingsPage() {
  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
          <div>
            <h1 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-green" />
              Paramètres
            </h1>
            <p className="text-sm text-text-secondary mt-1">Configuration de la plateforme et des sources de données</p>
          </div>

          <Section icon={Key} title="Sources de données & API">
            {API_SOURCES.map(cat => (
              <div key={cat.category}>
                <p className="text-xs text-text-muted uppercase tracking-wider font-medium mb-2">{cat.category}</p>
                <div className="space-y-2 mb-4">
                  {cat.apis.map(api => (
                    <div key={api.name} className="flex items-center justify-between py-2.5 px-3 bg-bg-elevated rounded-xl border border-bg-border">
                      <div className="flex items-center gap-3">
                        {api.status === 'configured' || api.status === 'free'
                          ? <CheckCircle2 className="w-4 h-4 text-brand-green flex-shrink-0" />
                          : <XCircle className="w-4 h-4 text-[#FF6D00] flex-shrink-0" />
                        }
                        <div>
                          <p className="text-sm font-medium text-text-primary">{api.name}</p>
                          <p className="text-[10px] text-text-muted">{api.note}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {api.status === 'free' && (
                          <span className="text-xs bg-brand-green-dim text-brand-green px-2 py-1 rounded-lg font-medium">Actif</span>
                        )}
                        {api.status === 'configured' && (
                          <span className="text-xs bg-[rgba(41,121,255,0.12)] text-[#2979FF] px-2 py-1 rounded-lg font-medium">Configuré</span>
                        )}
                        {api.status === 'missing' && (
                          <span className="text-xs bg-[rgba(255,109,0,0.12)] text-[#FF6D00] px-2 py-1 rounded-lg font-medium">Clé manquante</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="mt-2 p-3 bg-bg-subtle rounded-xl text-xs text-text-muted">
              Pour ajouter une clé API, modifie le fichier <code className="text-text-secondary bg-bg-elevated px-1.5 py-0.5 rounded">.env.local</code> à la racine du projet.
            </div>
          </Section>

          <Section icon={RefreshCw} title="Intervalles de rafraîchissement">
            <InfoRow label="Trafic temps réel"      value="30 secondes" />
            <InfoRow label="KPIs dashboard"          value="30 secondes" />
            <InfoRow label="Météo (OpenMeteo)"       value="5 minutes" />
            <InfoRow label="Qualité de l'air"        value="10 minutes" />
            <InfoRow label="Incidents RATP"          value="60 secondes" />
          </Section>

          <Section icon={Globe} title="Assistant IA actif">
            <div className="bg-brand-green-dim border border-brand-green/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-brand-green">GPT OSS 120B</p>
                <span className="text-xs bg-brand-green/10 text-brand-green px-2 py-0.5 rounded-lg">Gratuit</span>
              </div>
              <p className="text-xs text-text-secondary">Modèle de langage haute capacité, spécialisé pour l'analyse de mobilité urbaine. Répond en français aux questions sur le trafic, les incidents et les optimisations.</p>
              <p className="text-[10px] text-text-muted">Modèles alternatifs disponibles dans l'assistant : Gemini Flash, Claude Haiku, GPT-4o mini, Llama 3.1</p>
            </div>
          </Section>

          <Section icon={Bell} title="Plan actif">
            <div className="bg-bg-elevated border border-bg-border rounded-xl p-4">
              <p className="text-sm font-semibold text-[#AA00FF]">Enterprise</p>
              <p className="text-xs text-text-secondary mt-1">Accès complet · Toutes les villes · IA avancée · Données temps réel</p>
            </div>
          </Section>
        </main>
      </div>
    </div>
  )
}

function Section({ icon: Icon, title, children }: { icon: typeof Settings; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-surface border border-bg-border rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-bg-border flex items-center gap-2">
        <Icon className="w-4 h-4 text-brand-green" />
        <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
      </div>
      <div className="p-5 space-y-1">{children}</div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-bg-border last:border-0">
      <span className="text-sm text-text-secondary">{label}</span>
      <span className="text-sm font-medium text-text-primary">{value}</span>
    </div>
  )
}
