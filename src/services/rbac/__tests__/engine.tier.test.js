/**
 * Rule 11 / Part 4 behaviour 16 — tier is a real axis.
 * Enterprise-only (ruled 2026-09-17): barriers, custom roles, access
 * reviews, residency controls, agent principals, SoD exceptions.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { can, planAllows, setTenantPlan, tenantPlan } from '../engine'
import { addGrant, removeGrant, setNodeBarrier } from '../grants'
import { ORG_NODES } from '../../../data/rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())
afterEach(() => setTenantPlan('meridian', 'enterprise')) // restore seed plan

describe('plan-gated capabilities (behaviour 16)', () => {
  it('creating a barrier on the standard plan is denied with reason plan', () => {
    setTenantPlan('meridian', 'standard')
    const r = setNodeBarrier({ nodeId: 'mc-germany-pb', barrier: true, barrierReason: 'test', actorId: 'alex' })
    expect(r.error).toMatch(/Enterprise capability/)
    expect(r.reason).toBe('plan')
    expect(ORG_NODES.find(n => n.id === 'mc-germany-pb').barrier).toBeFalsy()
  })

  it('the same operation works on Enterprise, and is reversible', () => {
    expect(tenantPlan('meridian')).toBe('enterprise')
    const r = setNodeBarrier({ nodeId: 'mc-germany-pb', barrier: true, barrierReason: 'test wall', actorId: 'alex' })
    expect(r.node.barrier).toBe(true)
    // barrier is live in the engine immediately
    expect(can({ principal: 'marcus', permission: 'view_resource', nodeId: 'mc-germany-tax' }).decisivePolicy).toBe('barrier')
    const off = setNodeBarrier({ nodeId: 'mc-germany-pb', barrier: false, actorId: 'alex' })
    expect(off.node.barrier).toBe(false)
    expect(can({ principal: 'marcus', permission: 'view_resource', nodeId: 'mc-germany-tax' }).allow).toBe(true)
  })

  it('an agent principal is denied with reason plan below Enterprise', () => {
    const { grant } = addGrant({
      principal: { type: 'agent', id: 'agent-brand-qa' }, roleId: 'viewer',
      nodeId: 'mc-japan-finance', tenantId: 'meridian', actorId: 'alex',
    })
    expect(grant).toBeTruthy()
    expect(can({ principal: { type: 'agent', id: 'agent-brand-qa' }, permission: 'view_resource', nodeId: 'mc-japan-finance' }).allow).toBe(true)
    setTenantPlan('meridian', 'pro')
    const d = can({ principal: { type: 'agent', id: 'agent-brand-qa' }, permission: 'view_resource', nodeId: 'mc-japan-finance' })
    expect(d.allow).toBe(false)
    expect(d.decisivePolicy).toBe('plan')
    setTenantPlan('meridian', 'enterprise')
    removeGrant({ grantId: grant.id, actorId: 'alex' })
  })

  it('SoD named exceptions are Enterprise-only; the warning itself is not', () => {
    setTenantPlan('meridian', 'standard')
    // The conflict is still detected on every plan…
    const warned = addGrant({ principal: 'priya', roleId: 'approver', nodeId: 'mc-germany-wealth', tenantId: 'meridian', actorId: 'alex' })
    expect(warned.conflict).toBeTruthy()
    // …but the override path is gated.
    const overridden = addGrant({
      principal: 'priya', roleId: 'approver', nodeId: 'mc-germany-wealth', tenantId: 'meridian', actorId: 'alex',
      sodException: { approvedBy: 'alex', reason: 'x' },
    })
    expect(overridden.reason).toBe('plan')
  })

  it('planAllows names non-gated capabilities as allowed on any plan', () => {
    setTenantPlan('meridian', 'standard')
    expect(planAllows('meridian', 'access-explorer').allow).toBe(true)
    expect(planAllows('meridian', 'barriers').allow).toBe(false)
  })
})
