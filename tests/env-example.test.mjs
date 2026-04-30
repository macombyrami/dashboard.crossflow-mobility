import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('.env.example exposes required production variables', () => {
  const content = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')

  const requiredKeys = [
    'NEXT_PUBLIC_APP_URL',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'PREDICTIVE_BACKEND_URL',
    'OPENROUTER_API_KEY',
    'CRON_SECRET',
  ]

  for (const key of requiredKeys) {
    assert.match(content, new RegExp(`^${key}=`, 'm'))
  }
})
