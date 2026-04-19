import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Réseau Transports — CrossFlow',
  description: 'État du réseau de transports en commun et multimodalité.',
}

export default function TransportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
