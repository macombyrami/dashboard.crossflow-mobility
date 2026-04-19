import { Metadata } from 'next'
import OnboardingClient from './onboarding-client'

export const metadata: Metadata = {
  title: 'Activation | CrossFlow Mobility',
  description: 'Configurez votre espace de travail intelligent et connectez vos flux de données.',
  robots: 'noindex, nofollow',
}

export default function OnboardingPage() {
  return (
    <main id="onboarding-flow">
      <OnboardingClient />
    </main>
  )
}
