import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Paramètres — CrossFlow',
  description: 'Configuration du dashboard et gestion des sources de données.',
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
