import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Flux Social IDF — CrossFlow',
  description: 'Actualité du trafic et signalements communautaires en Île-de-France.',
}

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
