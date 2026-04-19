import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Carte Live — CrossFlow',
  description: 'Surveillance du trafic en temps réel et alertes de mobilité.',
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
