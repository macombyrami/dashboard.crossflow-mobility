/**
 * Central re-export of app configuration from data/app.json
 * Import from here instead of duplicating strings across the codebase.
 */
import appData from '@/lib/data/app.json'

export const APP_NAME         = appData.fullName
export const APP_URL          = process.env.NEXT_PUBLIC_APP_URL ?? appData.url
export const USER_AGENT       = appData.userAgent
export const USER_AGENT_FULL  = `${appData.userAgent} (traffic dashboard; contact@crossflow-mobility.com)`
export const USER_AGENT_COMPAT = `Mozilla/5.0 (compatible; ${appData.userAgent})`

export const BACKEND_URL      = process.env.PREDICTIVE_BACKEND_URL ?? 'http://localhost:8000'
export const DEV_FALLBACK_URL = 'http://localhost:3000'

export { appData }
