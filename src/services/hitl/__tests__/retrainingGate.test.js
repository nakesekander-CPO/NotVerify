import { describe, it, expect } from 'vitest'
import { evaluateForTM, evaluateForTerminology, evaluateForModel } from '../retrainingGate'

function project(overrides = {}) {
  return {
    id: 'p-test',
    status: 'signed-off',
    requirements: { tmAllowed: true, terminologyAllowed: true, modelImprovementAllowed: true, targetLanguages: ['ja'], domain: 'financial' },
    ...overrides,
  }
}
function signOff(overrides = {}) {
  return { id: 'so-test', feedTM: true, feedTerminology: true, feedModel: true, ...overrides }
}
function segment(overrides = {}) {
  return { id: 'seg-test', decision: 'confirmed', ...overrides }
}

import { REVIEW_DECISIONS } from '../../../data/hitlVendorWorkflow'
function withTaggedDecision(segId) {
  REVIEW_DECISIONS.push({
    id: `rd-test-${segId}`, segmentId: segId, actorId: 'tester', actorRole: 'client-reviewer',
    action: 'confirmed', rationaleTags: ['register'], timestamp: new Date().toISOString(),
  })
}

describe('reuse gate — three separate pipelines', () => {
  it('TM update is eligible for a confirmed/edited segment when signed off + policy + feed allow', () => {
    expect(evaluateForTM(segment(), signOff(), project()).eligible).toBe(true)
    expect(evaluateForTM(segment({ decision: 'edited' }), signOff(), project()).eligible).toBe(true)
  })

  it('terminology capture has its own flag and policy', () => {
    expect(evaluateForTerminology(segment(), signOff({ feedTerminology: false }), project()).eligible).toBe(false)
    expect(evaluateForTerminology(segment(), signOff(), project({ requirements: { terminologyAllowed: false } })).eligible).toBe(false)
    expect(evaluateForTerminology(segment(), signOff(), project()).eligible).toBe(true)
  })

  it('model improvement (RLHF) additionally requires a rationale tag', () => {
    const tagged = segment({ id: 'seg-rlhf-ok' })
    withTaggedDecision(tagged.id)
    expect(evaluateForModel(tagged, signOff(), project()).eligible).toBe(true)

    const untagged = segment({ id: 'seg-rlhf-untagged' })
    REVIEW_DECISIONS.push({ id: 'rd-untagged', segmentId: untagged.id, actorId: 'tester', actorRole: 'client-reviewer', action: 'confirmed', rationaleTags: [], timestamp: new Date().toISOString() })
    const r = evaluateForModel(untagged, signOff(), project())
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /no rationale tags/i.test(x))).toBe(true)
  })

  it('every pipeline blocks when the project is not signed off', () => {
    const p = project({ status: 'in-vendor-review' })
    expect(evaluateForTM(segment(), signOff(), p).eligible).toBe(false)
    expect(evaluateForTerminology(segment(), signOff(), p).eligible).toBe(false)
    expect(evaluateForModel(segment(), signOff(), p).eligible).toBe(false)
  })

  it('only confirmed or edited segments are eligible (no other states exist)', () => {
    expect(evaluateForTM(segment({ decision: 'pending' }), signOff(), project()).eligible).toBe(false)
    expect(evaluateForTM(segment({ decision: 'locked' }), signOff(), project()).eligible).toBe(false)
  })

  it('a client can allow TM but forbid model improvement (independent pipelines)', () => {
    const p = project({ requirements: { tmAllowed: true, terminologyAllowed: true, modelImprovementAllowed: false } })
    expect(evaluateForTM(segment(), signOff(), p).eligible).toBe(true)
    expect(evaluateForModel(segment(), signOff(), p).eligible).toBe(false)
  })
})
