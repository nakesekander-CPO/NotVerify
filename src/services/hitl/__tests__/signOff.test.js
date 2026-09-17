/**
 * Rule 9 / Part 4 behaviour 12 — nobody signs off their own work.
 * Sign-off authority comes from the engine; the signer must not be the
 * last editor of any segment; skipAuth no longer exists.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { signOff, buildValidationReport, lastEditorsOf } from '../signOff'
import { decideSegment } from '../review'
import { HITL_SEGMENTS } from '../../../data/hitlVendorWorkflow'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

// A second Japan-Finance project the integration test does not consume.
const PROJECT_ID = 'hp-q3-mda-internal-single'

describe('sign-off separation of duties (behaviour 12)', () => {
  it('rejects the actor who last edited any segment in the project', () => {
    const seg = HITL_SEGMENTS.find(s => s.projectId === PROJECT_ID && !s.locked && s.decision === 'pending')
    expect(seg).toBeTruthy()
    decideSegment({ segmentId: seg.id, actorId: 'alex', action: 'edited', newValue: 'edited by the would-be signer', rationaleTags: ['register'] })
    expect(lastEditorsOf(PROJECT_ID).has('alex')).toBe(true)

    expect(() => signOff({ projectId: PROJECT_ID, actorId: 'alex', statement: 'self sign' }))
      .toThrow(/Separation of duties/)
  })

  it('accepts a different signer who holds sign-off authority at the node', () => {
    // Sarah: final-validator at the Securities BU (covers mc-japan-finance),
    // and she edited nothing here.
    const rec = signOff({ projectId: PROJECT_ID, actorId: 'sarah', statement: 'Signed after review' })
    expect(rec.actorRole).toBe('final-validator')
  })

  it('rejects a signer with no sign-off grant at the node', () => {
    expect(() => signOff({ projectId: 'hp-de-regulatory', actorId: 'thomas', statement: 'x' }))
      .toThrow(/Sign-off not permitted/)
  })

  it('buildValidationReport always checks — the skipAuth bypass is gone', () => {
    const here = path.dirname(fileURLToPath(import.meta.url))
    const src = fs.readFileSync(path.join(here, '../signOff.js'), 'utf8')
    expect(src).not.toMatch(/skipAuth/)
    expect(() => buildValidationReport({ projectId: PROJECT_ID, actorId: null })).toThrow()
  })
})
