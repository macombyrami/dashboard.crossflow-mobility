import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Alertes & Incidents — CrossFlow',
  description: 'Liste des incidents en temps réel, travaux et perturbations majeures.',
}

export default function IncidentsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
