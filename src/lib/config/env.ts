import { z } from 'zod'

const publicEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1).optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

const serverEnvSchema = z.object({
  CRON_SECRET: z.string().min(24).optional(),
  PREDICTIVE_BACKEND_URL: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  OPENROUTER_API_KEY: z.string().min(20).optional(),
})

const publicEnv = publicEnvSchema.parse(process.env)
const serverEnv = serverEnvSchema.parse(process.env)

export const ENV = {
  APP_URL: publicEnv.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  SUPABASE_URL: publicEnv.NEXT_PUBLIC_SUPABASE_URL ?? '',
  SUPABASE_ANON_KEY: publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  PREDICTIVE_BACKEND_URL: serverEnv.PREDICTIVE_BACKEND_URL ?? 'http://localhost:8000',
  CRON_SECRET: serverEnv.CRON_SECRET ?? '',
  IS_DEV: publicEnv.NODE_ENV === 'development',
  IS_PROD: publicEnv.NODE_ENV === 'production',
} as const

export function validateSupabaseConfig() {
  const missing: string[] = []

  if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL.includes('placeholder')) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY.includes('placeholder')) {
    missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return {
    isValid: missing.length === 0,
    missing,
  }
}

export function hasCronSecret() {
  return ENV.CRON_SECRET.length >= 24
}
