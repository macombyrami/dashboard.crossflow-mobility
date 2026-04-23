import type { Metadata } from 'next'
import appData from '@/lib/data/app.json'
import LoginPageClient from './login-client'

export const metadata: Metadata = {
  title:       `Connexion — ${appData.fullName}`,
  description: 'Portail sécurisé CrossFlow. Accédez à votre espace de pilotage urbain, à vos lectures en temps réel et à vos analyses décisionnelles.',
  openGraph: {
    title:       `Accès Dashboard — ${appData.fullName}`,
    description: 'Connectez-vous à votre espace de pilotage urbain premium.',
    type:        'website',
    url:         `${appData.url}/login`,
  },
  twitter: {
    card:        'summary_large_image',
    title:       `Connexion — ${appData.fullName}`,
    description: 'Interface de pilotage CrossFlow.',
  }
}

export default function LoginPage() {
  return <LoginPageClient />
}
