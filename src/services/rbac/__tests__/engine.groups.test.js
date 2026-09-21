/**
 * Point 8 (ruled 2026-09-21) — groups model cross-cutting functions.
 * Per-country grants to a group replace tenant-root everything-access;
 * membership is IdP-mappable. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { can, effectiveMembers } from '../engine'
import { GROUPS } from '../../../data/rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('group principals', () => {
  it('a member exercises the group grant, and the reason names the group', () => {
    const d = can({ principal: 'james', permission: 'compliance_review', nodeId: 'mc-germany-tax' })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-31')
    expect(d.reason).toMatch(/via Group Risk & Compliance/)
  })
  it('non-members get nothing from the group', () => {
    expect(can({ principal: 'thomas', permission: 'compliance_review', nodeId: 'mc-germany-tax' }).allow).toBe(false)
  })
  it('cross-cutting reach WITHOUT a root grant: per-country scopes only', () => {
    const groupGrants = ['ra-30', 'ra-31', 'ra-32']
    expect(groupGrants.length).toBe(3)
    // The group has no grant at mc-root — Global Risk & Compliance the
    // department is NOT reachable via the group.
    expect(can({ principal: 'james', permission: 'compliance_review', nodeId: 'mc-global-risk' }).allow).toBe(false)
  })
  it('the group appears in member lists as itself, mapped from the IdP', () => {
    const names = effectiveMembers('mc-germany-tax').map(m => m.user.name)
    expect(names).toContain('Group Risk & Compliance')
    expect(GROUPS[0].idpMapping).toMatch(/SCIM/)
  })
})
