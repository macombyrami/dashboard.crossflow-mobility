import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Simulation de Mobilité — CrossFlow',
  description: 'Simuler des scénarios urbains et analyser l\'impact sur le trafic.',
}

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
