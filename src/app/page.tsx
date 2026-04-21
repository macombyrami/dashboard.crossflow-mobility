import { redirect } from 'next/navigation'

/**
 * Root route — redirect to login page.
 * The marketing landing is not the entry point for this B2B service.
 */
export default function HomePage() {
  redirect('/login')
}
