/**
 * Rule 12 — jurisdiction is a property of the node.
 * Ruled 2026-09-17: cross-residency access is a HARD deny; the only way
 * through is an explicit residency exception on the grant. Enterprise
 * capability — lower plans do not enforce it.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { can, effectiveMembers, setTenantPlan } from '../engine'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())
afterEach(() => setTenantPlan('meridian', 'enterprise'))

describe('data residency (rule 12)', () => {
  it('a global grant without the jurisdiction named is hard-denied with reason residency', () => {
    // James audits group-wide but his grant names only JP and NZ.
    const d = can({ principal: 'james', permission: 'view_audit', nodeId: 'mc-germany-tax' })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('residency')
    expect(d.reason).toMatch(/EU jurisdiction/)
  })

  it('the exception is the condition: the same grant works where it names the jurisdiction', () => {
    const d = can({ principal: 'james', permission: 'view_audit', nodeId: 'mc-nz-legal' })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-13')
  })

  it('in-jurisdiction grants need no exception', () => {
    // Kenji's grant is scoped inside JP; JP targets are same-residency.
    const d = can({ principal: 'kenji', permission: 'manage_members', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(true)
  })

  it('even the tenant admin crosses borders only by explicit condition', () => {
    // Alex's root grant names JP/EU/NZ — visible, deliberate reach.
    expect(can({ principal: 'alex', permission: 'view_resource', nodeId: 'mc-germany-tax' }).allow).toBe(true)
  })

  it('member lists tell the same story: James is absent from German nodes', () => {
    const ids = effectiveMembers('mc-germany-tax').map(m => m.user.id)
    expect(ids).not.toContain('james')
    expect(ids).toContain('marcus')
    expect(ids).toContain('alex')
  })

  it('residency is an Enterprise control: lower plans do not enforce it', () => {
    setTenantPlan('meridian', 'pro')
    const d = can({ principal: 'james', permission: 'view_audit', nodeId: 'mc-germany-tax' })
    expect(d.allow).toBe(true)
  })
})
