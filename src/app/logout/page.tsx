'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/useAuthStore'
import { Loader2 } from 'lucide-react'

export default function LogoutPage() {
  const router = useRouter()
  const signOutStore = useAuthStore(s => s.signOut)
  const supabase = createClient()

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Sign out from Supabase
        await supabase.auth.signOut()
        // Clear local auth store
        signOutStore()
        
        // Final redirection
        router.push('/login')
        router.refresh()
      } catch (error) {
        console.error('Logout error:', error)
        router.push('/login')
      }
    }

    performLogout()
  }, [router, signOutStore, supabase.auth])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0B0E] text-white">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 rounded-2xl bg-brand/10 flex items-center justify-center border border-brand/20">
          <Loader2 className="w-8 h-8 text-brand animate-spin" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-bold tracking-tight uppercase italic">Déconnexion Sécurisée</h1>
          <p className="text-sm text-text-muted mt-1 uppercase tracking-widest opacity-60">Fermeture de session en cours...</p>
        </div>
      </div>
    </div>
  )
}
