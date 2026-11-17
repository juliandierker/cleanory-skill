import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const script = path.join(here, '..', 'detect.mjs')

function detect(dir) {
  return spawnSync(process.execPath, [script, path.join(here, 'fixtures', dir)], {
    encoding: 'utf8',
  })
}

test('detects checks for a node project in a stable order', () => {
  const result = detect('node-project')
  assert.equal(result.status, 0, result.stderr)
  const { checks } = JSON.parse(result.stdout)
  assert.deepEqual(
    checks.map((check) => [check.category, check.command]),
    [
      ['lint', 'npm run lint'],
      ['typecheck', 'npx tsc --noEmit'],
      ['deadcode', 'npx knip'],
      ['audit', 'npm audit --audit-level=high'],
      ['test', 'npm run test'],
    ],
  )
  assert.equal(detect('node-project').stdout, result.stdout)
})

test('fails with a clear message when nothing is recognised', () => {
  const result = detect('empty-project')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /no known project files/)
})

test('fails when the directory does not exist', () => {
  const result = detect('does-not-exist')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /directory not found/)
})
