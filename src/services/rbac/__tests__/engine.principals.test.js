/**
 * Rule 5 / Part 4 behaviour 15 — principals are not only users.
 * Agents, vendor orgs, and JIT support sessions are grants like anyone
 * else's, evaluated by can(), in the same audit log.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { can, effectiveMembers } from '../engine'
import { approveGrant } from '../grants'
import { AUDIT_LOG, GRANTS } from '../../../data/rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('agent principals (behaviour 15)', () => {
  it('an agent with a scoped grant is allowed there', () => {
    const d = can({ principal: { type: 'agent', id: 'AG-1001' }, permission: 'verify_segment', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(true)
    expect(d.grantId).toBe('ra-26')
  })
  it('the same agent is denied outside its grant, and any agent with no grant is denied', () => {
    expect(can({ principal: { type: 'agent', id: 'AG-1001' }, permission: 'verify_segment', nodeId: 'mc-germany-tax' }).allow).toBe(false)
    const d = can({ principal: { type: 'agent', id: 'AG-9999' }, permission: 'view_resource', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('no-grant')
  })
  it('agents appear in effective member lists like any principal', () => {
    const names = effectiveMembers('mc-japan-finance').map(m => m.user.name)
    expect(names).toContain('Meridian JA Reviewer (agent)')
  })
})

describe('vendor plane finally executes', () => {
  it('a vendor-user acts on assigned work inside their scoped, expiring grant', () => {
    const d = can({ principal: 'hana', permission: 'edit_segment', nodeId: 'mc-japan-finance', context: { assignedUserIds: ['hana'] } })
    expect(d.allow).toBe(true)
  })
  it('and is denied unassigned work with the assigned-only policy named', () => {
    const d = can({ principal: 'hana', permission: 'edit_segment', nodeId: 'mc-japan-finance' })
    expect(d.decisivePolicy).toBe('assigned-only')
  })
  it('the vendor ORGANISATION holds its own scoped engagement grant', () => {
    const d = can({ principal: { type: 'vendor-org', id: 'v-nihon-linguistics' }, permission: 'view_resource', nodeId: 'mc-japan-finance', context: { assignedUserIds: [] } })
    // assignedOnly applies to the org grant too — with no assignment it is inert
    expect(d.decisivePolicy).toBe('assigned-only')
  })
})

describe('JIT support session (ruled: approval before activation)', () => {
  it('is denied while pending, with the pending policy named', () => {
    const d = can({ principal: { type: 'support-session', id: 'support-session-4921' }, permission: 'view_resource', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('pending-approval')
  })
  it('activates when a tenant admin approves — one audit event — then works until expiry', () => {
    const before = AUDIT_LOG.length
    const r = approveGrant({ grantId: 'ra-27', actorId: 'alex' })
    expect(r.grant.conditions.approval.approvedBy).toBe('alex')
    expect(AUDIT_LOG.length).toBe(before + 1)
    const d = can({ principal: { type: 'support-session', id: 'support-session-4921' }, permission: 'view_resource', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(true)
    // and it dies on its own after 2026-09-24
    const later = can({ principal: { type: 'support-session', id: 'support-session-4921' }, permission: 'view_resource', nodeId: 'mc-japan-finance', at: '2026-09-25T00:00:00Z' })
    expect(later.decisivePolicy).toBe('expired')
    // restore pending seed state
    const g = GRANTS.find(x => x.id === 'ra-27')
    delete g.conditions.approval
  })
  it('a viewer cannot approve support access', () => {
    const r = approveGrant({ grantId: 'ra-27', actorId: 'thomas' })
    expect(r.error).toMatch(/manage_members/)
  })
})
