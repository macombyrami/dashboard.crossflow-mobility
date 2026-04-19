import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tableau de Bord — CrossFlow',
  description: 'Aperçu global de la mobilité urbaine et des KPIs de trafic.',
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
