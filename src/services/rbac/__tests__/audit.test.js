/**
 * Rule 10 / Part 4 behaviours 11 + 13 — one audit log, correct
 * attribution. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { authorize } from '../engine'
import { AUDIT_LOG } from '../../../data/rbacModel'
import { HITL_AUDIT_LOG } from '../../../data/hitlVendorWorkflow'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('one log (behaviour 13)', () => {
  it('HITL_AUDIT_LOG and AUDIT_LOG are literally the same store', () => {
    expect(HITL_AUDIT_LOG).toBe(AUDIT_LOG)
  })

  it('every denial appends exactly one event, same schema as allows', () => {
    const before = AUDIT_LOG.length
    const denied = authorize({ principal: 'thomas', permission: 'final_validate', nodeId: 'mc-germany-tax' })
    expect(denied.allow).toBe(false)
    expect(AUDIT_LOG.length).toBe(before + 1)
    const denyEvt = AUDIT_LOG[0]
    expect(denyEvt.action).toBe('access.denied')

    const allowed = authorize({ principal: 'thomas', permission: 'view_resource', nodeId: 'mc-germany-tax' })
    expect(allowed.allow).toBe(true)
    expect(AUDIT_LOG.length).toBe(before + 2)
    const allowEvt = AUDIT_LOG[0]
    expect(allowEvt.action).toBe('access.allowed')

    // Same schema: identical keys on deny and allow events.
    expect(Object.keys(denyEvt).sort()).toEqual(Object.keys(allowEvt).sort())
    for (const k of ['actor', 'actorId', 'action', 'eventType', 'tenantId', 'scopeId', 'permission', 'decisivePolicy', 'details', 'reason']) {
      expect(denyEvt).toHaveProperty(k)
    }
  })
})

describe('attribution is the decisive grant (behaviour 11)', () => {
  it('Yuki acting at Japan Compliance logs compliance-reviewer, not her older approver grant', () => {
    const d = authorize({ principal: 'yuki', permission: 'verify_segment', nodeId: 'mc-japan-compliance' })
    expect(d.allow).toBe(true)
    expect(AUDIT_LOG[0].actorRole).toBe('compliance-reviewer')
    expect(AUDIT_LOG[0].roleId).toBe('compliance-reviewer')
  })

  it('James acting inside the M&A wall logs auditor via his explicit crossing grant', () => {
    const d = authorize({ principal: 'james', permission: 'view_audit', nodeId: 'mc-japan-ma' })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-14')
    expect(AUDIT_LOG[0].actorRole).toBe('auditor')
  })

  it('denials in the customer-facing log carry the near-miss role and the reason', () => {
    authorize({ principal: 'marcus', permission: 'edit_resource', nodeId: 'mc-japan-finance' })
    expect(AUDIT_LOG[0].action).toBe('access.denied')
    expect(AUDIT_LOG[0].details).toMatch(/does not cover/)
  })
})
