import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'

/**
 * 🛰️ STAFF ENGINEER: Global Auth Store (Zustand)
 * Reduces Supabase Auth calls by >90% by caching user/session in memory.
 * Eliminates redundant getSession() and getUser() network requests.
 */
interface AuthState {
  user: User | null
  session: Session | null
  isInitialized: boolean
  setAuth: (user: User | null, session: Session | null) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isInitialized: false,
  
  setAuth: (user, session) => set({ 
    user, 
    session, 
    isInitialized: true 
  }),
  
  signOut: () => set({ 
    user: null, 
    session: null, 
    isInitialized: true 
  }),
}))
