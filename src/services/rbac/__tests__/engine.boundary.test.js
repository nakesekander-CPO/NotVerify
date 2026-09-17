/**
 * Part 4 behaviour 2 — static boundary check.
 *
 * Nothing under src/components/** or src/services/** may read the grant
 * table (or the pre-alignment decision helpers) to gate anything. Only
 * the engine folder touches GRANTS; the ROLES catalogue may be imported
 * for *display* (role pickers, the Roles tab), never for decisions —
 * the decision helpers below must not appear anywhere else at all.
 */
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

// The only files allowed to touch the grant table.
const GRANT_READERS = new Set([
  'services/rbac/engine.js',
  'services/rbac/grants.js',
])

// Never anywhere: the pre-alignment decision paths.
const BANNED_EVERYWHERE = [
  /\bROLE_ASSIGNMENTS\b/,
  /\bcheckAccess\b/,
  /\bgetNodeEffectiveMembers\b/,
  /\bgetUserEffectiveRoles\b/,
  /\bhasPermission\s*\(/,
]

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue
      walk(full, out)
    } else if (/\.(js|jsx)$/.test(entry.name) && !entry.name.endsWith('.test.js')) {
      out.push(full)
    }
  }
  return out
}

describe('engine boundary', () => {
  const files = [
    ...walk(path.join(SRC, 'components')),
    ...walk(path.join(SRC, 'services')),
  ]

  it('scans a realistic number of files', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('only the engine folder reads GRANTS', () => {
    const offenders = []
    for (const f of files) {
      const rel = path.relative(SRC, f)
      if (GRANT_READERS.has(rel)) continue
      const src = fs.readFileSync(f, 'utf8')
      if (/\bGRANTS\b/.test(src)) offenders.push(rel)
    }
    expect(offenders).toEqual([])
  })

  it('no file anywhere uses the pre-alignment decision helpers', () => {
    const offenders = []
    for (const f of files) {
      const rel = path.relative(SRC, f)
      const src = fs.readFileSync(f, 'utf8')
      for (const re of BANNED_EVERYWHERE) {
        if (re.test(src)) offenders.push(`${rel}: ${re}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
