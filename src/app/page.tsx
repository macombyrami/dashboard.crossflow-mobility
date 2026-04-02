import { HeroExperience } from '@/app/landing/hero-experience'
import { Metadata } from 'next'
import appData from '@/lib/data/app.json'

export const metadata: Metadata = {
  title: appData.metaTitle,
  description: appData.metaDescription,
}

export default function HomePage() {
  return <HeroExperience />
}
