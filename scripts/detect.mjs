import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { parseArgs } from 'node:util'

const usage = `usage: detect.mjs [dir]

Prints a JSON list of static-analysis checks to run for the project in [dir]
(default .): lint, typecheck, dead code, dependency audit, tests. Nothing is executed.`

function fail(message) {
  process.stderr.write(`error: ${message}\n`)
  process.exit(1)
}

function readJson(file) {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    return fail(`invalid JSON in ${file}: ${error.message}`)
  }
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { help: { type: 'boolean', default: false } },
})
if (values.help) {
  process.stdout.write(`${usage}\n`)
  process.exit(0)
}
const dir = path.resolve(positionals[0] ?? '.')
if (!existsSync(dir)) fail(`directory not found: ${dir}`)

const has = (...names) => names.some((name) => existsSync(path.join(dir, name)))
const checks = []
const add = (category, id, command) => {
  if (!checks.some((check) => check.id === id)) checks.push({ category, id, command })
}

const pkg = readJson(path.join(dir, 'package.json'))
if (pkg) {
  const pm = has('pnpm-lock.yaml')
    ? 'pnpm'
    : has('yarn.lock')
      ? 'yarn'
      : has('bun.lock', 'bun.lockb')
        ? 'bun'
        : 'npm'
  const scripts = pkg.scripts ?? {}
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }
  const hasDep = (name) => name in deps
  const script = (name) => (name in scripts ? `${pm} run ${name}` : null)

  const scriptLint = script('check') ?? script('lint')
  if (scriptLint) add('lint', 'script-lint', scriptLint)
  else if (hasDep('vite-plus')) add('lint', 'vite-plus', 'npx vp check --deny-warnings')
  else if (has('biome.json', 'biome.jsonc') || hasDep('@biomejs/biome'))
    add('lint', 'biome', 'npx biome check .')
  else if (hasDep('oxlint')) add('lint', 'oxlint', 'npx oxlint --deny-warnings')
  else if (hasDep('eslint')) add('lint', 'eslint', 'npx eslint . --max-warnings 0')

  const scriptTypes = script('typecheck') ?? script('type-check')
  if (scriptTypes) add('typecheck', 'script-typecheck', scriptTypes)
  else if (has('tsconfig.json') && !hasDep('vite-plus')) add('typecheck', 'tsc', 'npx tsc --noEmit')

  if (hasDep('fallow') || has('.fallowrc.json')) {
    add('deadcode', 'fallow', 'npx fallow audit')
    if (has('.fallowrc.json')) add('deadcode', 'fallow-architecture', 'npx fallow architecture')
  } else if (hasDep('knip') || has('knip.json', 'knip.jsonc')) add('deadcode', 'knip', 'npx knip')
  else if (hasDep('ts-prune')) add('deadcode', 'ts-prune', 'npx ts-prune')

  const audit = {
    pnpm: 'pnpm audit --audit-level high',
    yarn: 'yarn npm audit --severity high',
    bun: 'bun audit',
    npm: 'npm audit --audit-level=high',
  }
  if (has('package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'bun.lock', 'bun.lockb'))
    add('audit', `${pm}-audit`, audit[pm])

  const scriptTest = script('test')
  if (scriptTest) add('test', 'script-test', scriptTest)
}

const read = (name) =>
  existsSync(path.join(dir, name)) ? readFileSync(path.join(dir, name), 'utf8') : ''
if (has('pyproject.toml', 'ruff.toml')) {
  const toml = read('pyproject.toml')
  if (has('ruff.toml') || /\[tool\.ruff/.test(toml)) add('lint', 'ruff', 'ruff check .')
  if (has('mypy.ini') || /\[tool\.mypy/.test(toml)) add('typecheck', 'mypy', 'mypy .')
  add('audit', 'pip-audit', 'pip-audit')
}
if (has('go.mod')) {
  add('lint', 'go-vet', 'go vet ./...')
  add('audit', 'govulncheck', 'govulncheck ./...')
}
if (has('Cargo.toml')) {
  add('lint', 'clippy', 'cargo clippy --all-targets -- -D warnings')
  add('audit', 'cargo-audit', 'cargo audit')
}

if (checks.length === 0)
  fail(`no known project files (package.json, pyproject.toml, go.mod, Cargo.toml) in ${dir}`)

const order = ['lint', 'typecheck', 'deadcode', 'audit', 'test']
checks.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
process.stdout.write(`${JSON.stringify({ checks }, null, 2)}\n`)
