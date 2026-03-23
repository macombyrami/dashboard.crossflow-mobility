'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Login not required — redirect to platform
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/map') }, [router])
  return null
}
