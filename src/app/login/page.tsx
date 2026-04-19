import type { Metadata } from 'next'
import appData from '@/lib/data/app.json'
import LoginPageClient from './login-client'

export const metadata: Metadata = {
  title:       `Connexion — ${appData.fullName}`,
  description: 'Portail sécurisé CrossFlow Mobility. Connectez-vous pour accéder à vos outils de monitoring de trafic, d\'analyse IA et de gestion prédictive urbaine.',
  openGraph: {
    title:       `Accès Dashboard — ${appData.fullName}`,
    description: 'Connectez-vous à la plateforme de mobilité intelligente numéro 1 pour les Smart Cities.',
    type:        'website',
    url:         `${appData.url}/login`,
  },
  twitter: {
    card:        'summary_large_image',
    title:       `Connexion — ${appData.fullName}`,
    description: 'Interface décisionnelle CrossFlow Mobility.',
  }
}

export default function LoginPage() {
  return <LoginPageClient />
}
