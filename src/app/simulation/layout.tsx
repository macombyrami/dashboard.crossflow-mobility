import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Simulation — Tester l'impact — CrossFlow",
  description: "Tester l'impact de scénarios urbains sur le trafic avec le moteur prédictif.",
}

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
