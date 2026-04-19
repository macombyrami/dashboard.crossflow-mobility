import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Prévisions de Trafic — CrossFlow',
  description: 'Prédictions par IA des flux de mobilité à +30 et +60 minutes.',
}

export default function PredictionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
