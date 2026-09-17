/**
 * Rule 4 / Part 4 behaviour 6 — inheritance stops at a barrier.
 * Ruling 2026-09-17: NOBODY sees through the wall without an explicit,
 * expiring, audited crossing grant — not the tenant admin, not the
 * group auditor. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { can, effectiveMembers } from '../engine'
import { addGrant, removeGrant } from '../grants'
import { AUDIT_LOG } from '../../../data/rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const MA = 'mc-japan-ma'

describe('information barrier on M&A Advisory', () => {
  it('blocks the tenant admin: a root wildcard grant does not cross the wall', () => {
    const d = can({ principal: 'alex', permission: 'view_resource', nodeId: MA })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('barrier')
    expect(d.reason).toMatch(/Information barrier on M&A Advisory/)
  })

  it('blocks the country org-manager and the BU approver grant one level up', () => {
    expect(can({ principal: 'kenji', permission: 'view_resource', nodeId: MA }).decisivePolicy).toBe('barrier')
    // Yuki's ra-8 (Investment Banking BU) stops at the wall — but her
    // DIRECT deal-team grant ra-15 gets her in. Decisive grant must be ra-15.
    const d = can({ principal: 'yuki', permission: 'approve_resource', nodeId: MA })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-15')
    expect(d.decisivePolicy).toBe('nearest-allow')
  })

  it("blocks James's group-wide auditor grant but honours his explicit crossing", () => {
    const d = can({ principal: 'james', permission: 'view_audit', nodeId: MA })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-14') // the crossing, not the root grant
    expect(d.role.id).toBe('auditor')
  })

  it('the crossing expires: after 2026-10-15 James is back outside the wall', () => {
    const d = can({ principal: 'james', permission: 'view_audit', nodeId: MA, at: '2026-10-16T00:00:00Z' })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('expired')
  })

  it('the member list tells the same story: only the deal team is inside', () => {
    const ids = effectiveMembers(MA).map(m => m.user.id).sort()
    expect(ids).toEqual(['james', 'yuki'])
    // and the parent BU has a LONGER inherited list than the walled child
    expect(effectiveMembers('mc-japan-ib').length).toBeGreaterThan(ids.length)
  })

  it('creating a crossing writes exactly one audit event', () => {
    const before = AUDIT_LOG.length
    const { grant } = addGrant({
      principal: 'sarah', roleId: 'approver', nodeId: MA, tenantId: 'meridian',
      conditions: { expiresAt: '2026-10-01T00:00:00Z', justification: 'test crossing' },
      actorId: 'alex',
    })
    expect(AUDIT_LOG.length).toBe(before + 1)
    expect(AUDIT_LOG[0].action).toBe('role.assigned')
    expect(AUDIT_LOG[0].details).toMatch(/barrier crossing/)
    // and it works…
    expect(can({ principal: 'sarah', permission: 'approve_resource', nodeId: MA }).allow).toBe(true)
    // …until removed (restore seed state; removal is its own single event)
    const mid = AUDIT_LOG.length
    removeGrant({ grantId: grant.id, actorId: 'alex' })
    expect(AUDIT_LOG.length).toBe(mid + 1)
    expect(can({ principal: 'sarah', permission: 'approve_resource', nodeId: MA }).allow).toBe(false)
  })
})
