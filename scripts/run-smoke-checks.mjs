import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

function pass(message) {
  console.log(`PASS ${message}`)
}

const envContent = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
for (const key of [
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PREDICTIVE_BACKEND_URL',
  'OPENROUTER_API_KEY',
  'CRON_SECRET',
]) {
  assert.match(envContent, new RegExp(`^${key}=`, 'm'))
}
pass('.env.example contains required variables')

const packageJson = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
)
assert.equal(packageJson.scripts.lint, 'eslint .')
assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit --pretty false')
assert.equal(packageJson.scripts.test, 'node ./scripts/run-smoke-checks.mjs')
assert.ok(packageJson.scripts.build)
assert.ok(packageJson.scripts.check)
pass('package.json contains quality gates')
