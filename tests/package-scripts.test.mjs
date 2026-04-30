import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('package.json exposes core quality scripts', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )

  assert.equal(packageJson.scripts.lint, 'eslint .')
  assert.equal(packageJson.scripts.typecheck, 'tsc --noEmit --pretty false')
  assert.ok(packageJson.scripts.test)
  assert.ok(packageJson.scripts.build)
  assert.ok(packageJson.scripts.check)
})
