import { describe, it, expect } from 'vitest'
import { evaluateSegmentForRetraining, evaluateSegmentForOrgBrain } from '../retrainingGate'

function project(overrides = {}) {
  return {
    id: 'p-test',
    status: 'signed-off',
    requirements: { retrainingAllowed: true, orgBrainAllowed: true, targetLanguages: ['ja'], domain: 'financial' },
    ...overrides,
  }
}
function signOff(overrides = {}) {
  return { id: 'so-test', feedOrgBrain: true, feedRetraining: true, ...overrides }
}
function segment(overrides = {}) {
  return { id: 'seg-test', decision: 'verified', ...overrides }
}

// Stub the decisions array so the "tagged" gate has data to find.
// Tests that don't care about tags pass a `_taggedDecision` flag which
// pushes a decision with at least one rationale tag.
import { REVIEW_DECISIONS } from '../../../data/hitlVendorWorkflow'
function withTaggedDecision(segId) {
  REVIEW_DECISIONS.push({
    id: `rd-test-${segId}`, segmentId: segId, actorId: 'tester', actorRole: 'final-validator',
    action: 'verified', rationaleTags: ['register'], timestamp: new Date().toISOString(),
  })
}

describe('retraining gate — eligibility', () => {
  it('approves a verified, tagged segment when project is signed-off and policy + sign-off allow retraining', () => {
    const seg = segment({ id: 'seg-test-1' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff(), project())
    expect(r.eligible).toBe(true)
  })

  it('blocks retraining when the decision has no rationale tags (display-only)', () => {
    const seg = segment({ id: 'seg-test-untagged' })
    REVIEW_DECISIONS.push({ id: `rd-untagged-${seg.id}`, segmentId: seg.id, actorId: 'tester', actorRole: 'final-validator', action: 'verified', rationaleTags: [], timestamp: new Date().toISOString() })
    const r = evaluateSegmentForRetraining(seg, signOff(), project())
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /no rationale tags/i.test(x))).toBe(true)
  })

  it('blocks retraining when project policy disallows it (regardless of sign-off)', () => {
    const seg = segment({ id: 'seg-test-2' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff(), project({ requirements: { retrainingAllowed: false, orgBrainAllowed: true } }))
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /policy disallows/i.test(x))).toBe(true)
  })

  it('blocks retraining when sign-off did not authorise feedRetraining', () => {
    const seg = segment({ id: 'seg-test-3' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff({ feedRetraining: false }), project())
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /sign-off did not authorise/i.test(x))).toBe(true)
  })

  it('blocks retraining for not-verified segments', () => {
    const seg = segment({ id: 'seg-test-4', decision: 'not-verified' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff(), project())
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /not eligible/i.test(x))).toBe(true)
  })

  it('blocks retraining for rejected segments', () => {
    const seg = segment({ id: 'seg-test-5', decision: 'rejected' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff(), project())
    expect(r.eligible).toBe(false)
  })

  it('blocks retraining for projects not signed off yet', () => {
    const seg = segment({ id: 'seg-test-6' })
    withTaggedDecision(seg.id)
    const r = evaluateSegmentForRetraining(seg, signOff(), project({ status: 'in-vendor-review' }))
    expect(r.eligible).toBe(false)
    expect(r.reasons.some(x => /not signed-off/i.test(x))).toBe(true)
  })

  it('allows Org Brain feed under a separate flag from retraining', () => {
    const ob = evaluateSegmentForOrgBrain(segment(), signOff({ feedRetraining: false }), project({ requirements: { retrainingAllowed: false, orgBrainAllowed: true } }))
    expect(ob.eligible).toBe(true)
  })

  it('respects orgBrainAllowed = false project policy', () => {
    const ob = evaluateSegmentForOrgBrain(segment(), signOff(), project({ requirements: { retrainingAllowed: true, orgBrainAllowed: false } }))
    expect(ob.eligible).toBe(false)
  })
})
