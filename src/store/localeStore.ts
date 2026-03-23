import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Locale } from '@/config/i18n.config'

interface LocaleStore {
  locale: Locale
  setLocale: (l: Locale) => void
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: 'fr',
      setLocale: (l: Locale) => set({ locale: l }),
    }),
    { name: 'cf-locale-storage' }
  )
)
