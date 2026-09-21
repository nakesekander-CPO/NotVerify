/**
 * Rule 6 — one role catalogue, all of it real.
 * No hidden-but-enforceable roles, no scope-suffixed permissions,
 * merged roles gone, assigned-only is a grant condition the engine
 * evaluates. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { ROLES } from '../../../data/rbacModel'
import { can } from '../engine'
import { addGrant, removeGrant } from '../grants'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('the catalogue', () => {
  it('has no hidden roles — visible and enforceable are the same set', () => {
    expect(ROLES.filter(r => r.hidden)).toHaveLength(0)
  })
  it('one verb per meaning: request_rework merged into request_changes', () => {
    expect(ROLES.flatMap(r => r.permissions)).not.toContain('request_rework')
  })
  it('has no scope-suffixed permissions — scope belongs to the grant', () => {
    const suffixed = ROLES.flatMap(r => r.permissions).filter(p => p.includes(':'))
    expect(suffixed).toEqual([])
  })
  it('merged the duplicate roles away', () => {
    const ids = ROLES.map(r => r.id)
    expect(ids).not.toContain('read-only-observer')
    expect(ids).not.toContain('org-admin')
    // and their survivors carry the load
    expect(ROLES.find(r => r.id === 'org-manager').permissions).toContain('manage_vendor_pool')
  })
  it('vendor-user holds the SAME permission names the services check', () => {
    // Part 2 #4: edit_assigned_segment vs edit_segment meant the vendor
    // plane could never execute. One vocabulary now.
    const vu = ROLES.find(r => r.id === 'vendor-user')
    expect(vu.permissions).toContain('edit_segment')
    expect(vu.permissions).toContain('verify_segment')
    expect(vu.permissions.filter(p => p.startsWith('view_assigned') || p.includes('assigned_segment'))).toEqual([])
  })
  it('exactly two internal platform roles, both marked', () => {
    const platform = ROLES.filter(r => r.level === 'platform')
    expect(platform.map(r => r.id).sort()).toEqual(['arbitr-global-admin', 'support-operator'])
    expect(platform.every(r => r.internal)).toBe(true)
  })
})

describe('assigned-only is a condition, evaluated by the engine', () => {
  it('an assignedOnly grant works only on assigned work', () => {
    const { grant } = addGrant({
      principal: { type: 'user', id: 'test-vendor' }, roleId: 'vendor-user',
      nodeId: 'mc-japan-finance', tenantId: 'meridian',
      conditions: { assignedOnly: true }, actorId: 'alex',
    })
    // not assigned → denied with the assigned-only policy named
    const denied = can({ principal: 'test-vendor', permission: 'edit_segment', nodeId: 'mc-japan-finance' })
    expect(denied.allow).toBe(false)
    expect(denied.decisivePolicy).toBe('assigned-only')
    // assigned → allowed through the very same grant
    const allowed = can({ principal: 'test-vendor', permission: 'edit_segment', nodeId: 'mc-japan-finance', context: { assignedUserIds: ['test-vendor'] } })
    expect(allowed.allow).toBe(true)
    expect(allowed.grantId).toBe(grant.id)
    removeGrant({ grantId: grant.id, actorId: 'alex' })
  })
})
