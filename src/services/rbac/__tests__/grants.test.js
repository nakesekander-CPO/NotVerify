/**
 * Rules 7 + 8 — Part 4 behaviours 7, 8, 9, 10.
 * Granting is constrained by the granter; conflicting duties are caught
 * at assign time; the last tenant admin is irremovable.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { addGrant, removeGrant, sodConflictFor } from '../grants'
import { GRANTS } from '../../../data/rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('granter constraints (behaviours 8, 9)', () => {
  it('org-manager cannot grant tenant-admin — grantable roles ⊆ granter permissions', () => {
    const r = addGrant({ principal: 'thomas', roleId: 'tenant-admin', nodeId: 'mc-root', tenantId: 'meridian', actorId: 'kenji' })
    expect(r.error).toBeTruthy()
    expect(r.grant).toBeUndefined()
  })
  it('org-manager cannot grant outside their subtree', () => {
    // Kenji manages Japan; Germany is not his to hand out.
    const r = addGrant({ principal: 'thomas', roleId: 'viewer', nodeId: 'mc-germany-wealth', tenantId: 'meridian', actorId: 'kenji' })
    expect(r.error).toMatch(/subtree|covering/i)
  })
  it('org-manager CAN grant a role they hold the permissions for, inside their subtree', () => {
    const r = addGrant({ principal: 'thomas', roleId: 'viewer', nodeId: 'mc-japan-finance', tenantId: 'meridian', actorId: 'kenji' })
    expect(r.grant).toBeTruthy()
    removeGrant({ grantId: r.grant.id, actorId: 'kenji' })
  })
  it('a tenant-level role at a department scope is rejected', () => {
    const r = addGrant({ principal: 'thomas', roleId: 'tenant-admin', nodeId: 'mc-germany-tax', tenantId: 'meridian', actorId: 'alex' })
    expect(r.error).toMatch(/tenant-level role/)
  })
  it('a viewer cannot grant anything — no manage_members anywhere', () => {
    const r = addGrant({ principal: 'priya', roleId: 'viewer', nodeId: 'mc-germany-tax', tenantId: 'meridian', actorId: 'thomas' })
    expect(r.error).toBeTruthy()
  })
})

describe('separation of duties (behaviour 7)', () => {
  it('approver over an existing contributor at overlapping scope returns a conflict', () => {
    // Priya is contributor at Germany Wealth; approver there would let
    // her approve her own work.
    // Granter is Alex: rule 7 already stops Marcus here — an org-manager
    // holds no approve_resource, so he cannot hand out approval authority.
    const r = addGrant({ principal: 'priya', roleId: 'approver', nodeId: 'mc-germany-wealth', tenantId: 'meridian', actorId: 'alex' })
    expect(r.conflict).toBeTruthy()
    expect(r.conflict.pair.sort()).toEqual(['approve_resource', 'create_resource'])
    expect(r.grant).toBeUndefined()
  })
  it('the seeded double-hat is a live conflict the form can catch: James contributes AND audits', () => {
    const c = sodConflictFor({ principalId: 'james', roleId: 'auditor', nodeId: 'mc-global-risk', tenantId: 'meridian' })
    expect(c).toBeTruthy()
    expect(c.pair.sort()).toEqual(['create_resource', 'view_audit'])
  })
  it('a named exception with an approver records the override and grants', () => {
    const r = addGrant({
      principal: 'priya', roleId: 'approver', nodeId: 'mc-germany-wealth', tenantId: 'meridian', actorId: 'alex',
      sodException: { approvedBy: 'alex', reason: 'Interim cover while Sarah is on leave' },
    })
    expect(r.grant).toBeTruthy()
    expect(r.grant.conditions.sodException.approvedBy).toBe('alex')
    removeGrant({ grantId: r.grant.id, actorId: 'alex' })
  })
  it('non-overlapping scopes do not conflict', () => {
    // Approver in Japan Securities does not clash with contributing in Germany.
    const c = sodConflictFor({ principalId: 'priya', roleId: 'approver', nodeId: 'mc-japan-securities', tenantId: 'meridian' })
    expect(c).toBeNull()
  })
})

describe('last-admin guard (behaviour 10)', () => {
  it('refuses to remove the only tenant-admin grant', () => {
    const alexAdmin = GRANTS.find(g => g.roleId === 'tenant-admin' && g.principal.id === 'alex')
    const r = removeGrant({ grantId: alexAdmin.id, actorId: 'alex' })
    expect(r.error).toMatch(/last Tenant Admin/)
    expect(GRANTS).toContain(alexAdmin)
  })
  it('allows removal once a second admin exists', () => {
    const second = addGrant({ principal: 'kenji', roleId: 'tenant-admin', nodeId: 'mc-root', tenantId: 'meridian', actorId: 'alex' })
    expect(second.grant).toBeTruthy()
    const r = removeGrant({ grantId: second.grant.id, actorId: 'alex' })
    expect(r.removed).toBeTruthy()
  })
})
