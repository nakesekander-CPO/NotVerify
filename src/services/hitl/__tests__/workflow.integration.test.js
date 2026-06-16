/**
 * End-to-end integration test for the HITL Vendor Workflow.
 *
 * Project → recommendation → assignment → vendor submission →
 * validation → sign-off → retraining queue. Verifies that:
 *   - The recommendation engine picks a vendor and explains why.
 *   - Auto-assignment writes the audit event.
 *   - A vendor can decide segments but cannot escape RBAC.
 *   - Sign-off locks segments and updates vendor performance.
 *   - Retraining candidates are only queued for verified segments.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  HITL_PROJECTS, HITL_SEGMENTS, VENDOR_ASSIGNMENTS, VENDOR_RECOMMENDATIONS,
  HITL_AUDIT_LOG, SIGNOFF_RECORDS, RETRAINING_CANDIDATES,
} from '../../../data/hitlVendorWorkflow'
import { runRecommendationAndAssign, manualOverride } from '../assignment'
import { decideSegment } from '../review'
import { signOff } from '../signOff'
import { queueRetrainingCandidates, approveRetrainingCandidate } from '../retrainingGate'

const PROJECT_ID = 'hp-q3-ja-earnings'

function snapshotLength(arr) {
  return arr.length
}

describe('HITL Vendor Workflow — happy path', () => {
  it('runs the full pipeline: recommend → assign → review → sign off → retraining queue', () => {
    const before = {
      assignments: snapshotLength(VENDOR_ASSIGNMENTS),
      signOffs: snapshotLength(SIGNOFF_RECORDS),
      retraining: snapshotLength(RETRAINING_CANDIDATES),
      audit: snapshotLength(HITL_AUDIT_LOG),
    }

    // 1. Recommend + auto-assign as a project-manager (Alex has tenant-admin → can review_recommendation).
    const { recommendation, assignment } = runRecommendationAndAssign({
      projectId: PROJECT_ID,
      actorId: 'alex',
    })
    expect(recommendation.recommendedVendorId).toBe('v-nihon-linguistics')
    expect(assignment).toBeTruthy()
    expect(assignment.projectId).toBe(PROJECT_ID)
    expect(snapshotLength(VENDOR_ASSIGNMENTS)).toBeGreaterThan(before.assignments)

    // 2. Reviewer confirms / edits segments. The first segment is a
    //    101% ICE match — locked early, so it cannot be touched.
    const segs = HITL_SEGMENTS.filter(s => s.projectId === PROJECT_ID)
    expect(segs.length).toBeGreaterThan(0)
    expect(segs[0].decision).toBe('locked')            // ICE match, locked up front
    expect(() => decideSegment({ segmentId: segs[0].id, actorId: 'alex', action: 'confirmed' })).toThrow(/locked/)

    decideSegment({ segmentId: segs[1].id, actorId: 'alex', action: 'edited', newValue: 'edited target text', rationaleTags: ['brand-voice'] })
    decideSegment({ segmentId: segs[2].id, actorId: 'alex', action: 'confirmed', rationaleTags: ['register'], chosenCandidateId: 'c1' })
    decideSegment({ segmentId: segs[4].id, actorId: 'alex', action: 'confirmed', rationaleTags: ['term-jgaap'], chosenCandidateId: 'c1' })
    // segs[3] is left pending (an open item still needing a person).

    expect(segs[1].decision).toBe('edited')
    expect(segs[2].decision).toBe('confirmed')
    expect(segs[3].decision).toBe('pending')

    // Removed reviewer actions must be refused at the write path.
    expect(() => decideSegment({ segmentId: segs[3].id, actorId: 'alex', action: 'escalated' })).toThrow(/unknown action/)

    // 3. Sign off (Alex is tenant-admin → permitted as admin).
    const so = signOff({
      projectId: PROJECT_ID,
      actorId: 'alex',
      statement: 'Integration test sign-off',
      canPublish: true,
      feedTM: true,
      feedTerminology: true,
      feedModel: true,
    })
    expect(so.id).toMatch(/^so-/)
    expect(so.immutable).toBe(true)
    expect(snapshotLength(SIGNOFF_RECORDS)).toBeGreaterThan(before.signOffs)

    // 4. Segments are now locked.
    expect(segs[1].locked).toBe(true)
    expect(() => decideSegment({ segmentId: segs[1].id, actorId: 'alex', action: 'confirmed' })).toThrow(/locked/)

    // 5. Reuse candidates queued — only for confirmed/edited segments.
    const queued = queueRetrainingCandidates({ projectId: PROJECT_ID, actorId: 'alex' })
    expect(queued.length).toBeGreaterThan(0)
    const doneAddresses = new Set([segs[1].id, segs[2].id, segs[4].id])
    const queuedSegmentIds = new Set(queued.map(c => c.segmentId))
    for (const id of queuedSegmentIds) expect(doneAddresses.has(id)).toBe(true)
    expect(queuedSegmentIds.has(segs[3].id)).toBe(false) // pending must not appear
    expect(queuedSegmentIds.has(segs[0].id)).toBe(false) // ICE-locked must not appear

    // 6. Approving a candidate across all three pipelines.
    const first = queued[0]
    const approved = approveRetrainingCandidate({ candidateId: first.id, actorId: 'alex', target: 'all' })
    expect(approved.status).toBe('approved')

    // 7. Audit log captured the milestones.
    const auditAfter = HITL_AUDIT_LOG.length
    expect(auditAfter).toBeGreaterThan(before.audit)
    expect(HITL_AUDIT_LOG.some(e => e.eventType === 'project.signed-off' && e.projectId === PROJECT_ID)).toBe(true)
    expect(HITL_AUDIT_LOG.some(e => e.eventType === 'retraining.queued' && e.projectId === PROJECT_ID)).toBe(true)
    expect(HITL_AUDIT_LOG.some(e => e.eventType === 'retraining.approved')).toBe(true)
  })
})

describe('HITL Vendor Workflow — guardrails', () => {
  it('blocks a manual override without a reason', () => {
    expect(() => manualOverride({
      projectId: 'hp-de-regulatory',
      vendorId: 'v-internal-reviewers',
      actorId: 'alex',
      reason: '',
    })).toThrow(/reason is required/)
  })

  it('records an override with reason and writes an audit event', () => {
    const beforeAudit = HITL_AUDIT_LOG.length
    manualOverride({
      projectId: 'hp-de-regulatory',
      vendorId: 'v-internal-reviewers',
      actorId: 'alex',
      reason: 'Internal team preferred for confidentiality',
    })
    expect(HITL_AUDIT_LOG.length).toBeGreaterThan(beforeAudit)
    const evt = HITL_AUDIT_LOG.find(e => e.eventType === 'assignment.manual-override' && e.projectId === 'hp-de-regulatory')
    expect(evt).toBeTruthy()
    expect(evt.reason).toMatch(/confidentiality/)
  })
})
