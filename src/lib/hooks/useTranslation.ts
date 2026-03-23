import { useLocaleStore } from '@/store/localeStore'
import { translations, Locale } from '@/config/i18n.config'

export function useTranslation() {
  const { locale } = useLocaleStore()
  
  const t = (path: string) => {
    const keys = path.split('.')
    let current: any = translations[locale]
    
    for (const key of keys) {
      if (current[key] === undefined) {
        // Fallback to FR if key not found in EN (or vice-versa)
        const fallback: any = translations['fr']
        let fCurrent = fallback
        for (const fKey of keys) {
          if (fCurrent[fKey] === undefined) return path
          fCurrent = fCurrent[fKey]
        }
        return fCurrent
      }
      current = current[key]
    }
    
    return current
  }

  return { t, locale }
}
