/**
 * Governed Change Register — versioned claims, federated approval,
 * exception re-affirmation (ruled 2026-09-21).
 * Clock frozen at 2026-09-17 like the engine suites.
 *
 * The register is mutable module state, so the sign-off tests run as one
 * narrative in order: refusals first, then Japan signs, then NZ signs and
 * the claim publishes.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import {
  CLAIMS, EXCEPTIONS, CLAIM_KIND_META,
  getClaimById, approvalUnits, impactOf,
  pendingClaims, reaffirmQueue,
  signClaimUnit, declineClaimUnit, reaffirmException,
} from './changeRegister'
import { FACTS } from './cortex'
import { getModelById } from './modelRegistry'
import { getAgentById } from './agentStudio'
import { AUDIT_LOG } from './rbacModel'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const GLOBAL = 'CHG-2026-041'
const MODEL = 'CHG-2026-039'
const DEPT = 'CHG-2026-036'
const BILLING = 'CHG-2026-031'

describe('seeds', () => {
  it('cover all four governed kinds', () => {
    expect(new Set(CLAIMS.map(c => c.kind))).toEqual(new Set(['fact', 'model', 'agent', 'billing']))
    expect(Object.keys(CLAIM_KIND_META).sort()).toEqual(['agent', 'billing', 'fact', 'model'])
  })
  it('every claim references a real subject and a real owner-shaped id', () => {
    for (const c of CLAIMS) {
      if (c.kind === 'fact') expect(FACTS[c.refId]).toBeTruthy()
      if (c.kind === 'model') expect(getModelById(c.refId)).toBeTruthy()
      if (c.kind === 'agent') expect(getAgentById(c.refId)).toBeTruthy()
      expect(c.version.from).toBeTruthy()
      expect(c.version.to).toBeTruthy()
      expect(c.evidence.length).toBeGreaterThan(0)
    }
  })
  it('canon: no retired names, no coins, in any seed copy', () => {
    const blob = JSON.stringify({ CLAIMS, EXCEPTIONS }).toLowerCase()
    for (const banned of ['notverify', 'not verify', 'straker', 'coins']) {
      expect(blob).not.toContain(banned)
    }
  })
})

describe('approval units (federated ratification)', () => {
  it('a Global business claim fans out to exactly the three Country Businesses', () => {
    expect(approvalUnits(getClaimById(GLOBAL)).map(n => n.id).sort())
      .toEqual(['mc-germany', 'mc-japan', 'mc-nz'])
  })
  it('vendor orgs and root-level group departments are never ratifying units', () => {
    const ids = approvalUnits(getClaimById(GLOBAL)).map(n => n.id)
    expect(ids).not.toContain('mc-vendor-nihon')
    expect(ids).not.toContain('mc-global-risk')
  })
  it('a BU-scope claim has a single slot at its own node', () => {
    expect(approvalUnits(getClaimById(MODEL)).map(n => n.id)).toEqual(['mc-japan-securities'])
  })
  it('an administrative (billing) claim at root keeps a single root slot — admin authority is hierarchical', () => {
    expect(approvalUnits(getClaimById(BILLING)).map(n => n.id)).toEqual(['mc-root'])
  })
  it('seeded approvals line up with the computed units', () => {
    for (const c of CLAIMS) {
      expect(c.approvals.map(a => a.unitNodeId).sort())
        .toEqual(approvalUnits(c).map(n => n.id).sort())
    }
  })
})

describe('impact map scales with altitude', () => {
  it('the Global claim covers all four altitudes with a deduped roster', () => {
    const impact = impactOf(getClaimById(GLOBAL))
    expect(impact.byAltitude.map(a => a.key)).toEqual(['tenant', 'country', 'business-unit', 'department'])
    expect(impact.nodeCount).toBeGreaterThanOrEqual(13)
    // alex (root grant) appears once even though he reaches every node
    expect(impact.people.filter(p => p.id === 'alex')).toHaveLength(1)
    expect(impact.peopleCount).toBeGreaterThan(5)
    // affected uses come from the Cortex fact + its live receipt
    expect(impact.uses.some(u => u.label === 'Meridian JA Reviewer')).toBe(true)
    expect(impact.replaces).toBe('v2.0')
    // both local exceptions sit inside the Global scope
    expect(impact.exceptions.map(e => e.id).sort()).toEqual(['EXC-4', 'EXC-5'])
  })
  it('the department claim covers exactly one node and no exceptions', () => {
    const impact = impactOf(getClaimById(DEPT))
    expect(impact.nodeCount).toBe(1)
    expect(impact.byAltitude.map(a => a.key)).toEqual(['department'])
    expect(impact.exceptions).toEqual([])
  })
  it('the model claim lists the registry card among its uses', () => {
    const impact = impactOf(getClaimById(MODEL))
    expect(impact.uses.some(u => u.label === 'Meridian JA Disclosure')).toBe(true)
  })
  it('the agent claim (guardrail change) lists the agent and its deployment surfaces', () => {
    const impact = impactOf(getClaimById('CHG-2026-044'))
    expect(impact.uses.some(u => u.label === 'Brand QA')).toBe(true)
    expect(impact.uses.some(u => u.detail === 'deployment surface')).toBe(true)
    expect(impact.byAltitude.map(a => a.key)).toEqual(['business-unit', 'department'])
  })
  it('the colour claim sits at country altitude with a single Germany slot', () => {
    const claim = getClaimById('CHG-2026-043')
    expect(approvalUnits(claim).map(n => n.id)).toEqual(['mc-germany'])
    const impact = impactOf(claim)
    expect(impact.byAltitude[0].key).toBe('country')
    expect(impact.uses.some(u => u.label === 'Brand QA')).toBe(true)
  })
})

describe('the live beat — sign-off through the ONE engine', () => {
  it('refuses the tenant admin: signing is a business decision (admin/business split)', () => {
    const res = signClaimUnit(GLOBAL, 'mc-japan', { actorId: 'alex' })
    expect(res.ok).toBe(false)
    expect(res.decision.decisivePolicy).toBe('admin-business-split')
    expect(getClaimById(GLOBAL).approvals.find(a => a.unitNodeId === 'mc-japan').status).toBe('pending')
  })
  it('refuses a signer outside the unit: Sarah cannot sign for Germany', () => {
    const res = signClaimUnit(GLOBAL, 'mc-germany', { actorId: 'sarah' })
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/already recorded/)
    const nz = signClaimUnit(GLOBAL, 'mc-nz', { actorId: 'sarah' })
    expect(nz.ok).toBe(false)
    expect(nz.decision.allow).toBe(false)
  })
  it('Japan signs (Sarah, country seat ra-34) — claim still pending', () => {
    const res = signClaimUnit(GLOBAL, 'mc-japan', { actorId: 'sarah', note: 'Securities exception to be re-affirmed.' })
    expect(res.ok).toBe(true)
    expect(res.published).toBe(false)
    expect(getClaimById(GLOBAL).status).toBe('pending')
    expect(AUDIT_LOG.some(e => e.eventType === 'claim.signed' && e.actorId === 'sarah')).toBe(true)
  })
  it('double-sign of the same unit is refused', () => {
    const res = signClaimUnit(GLOBAL, 'mc-japan', { actorId: 'sarah' })
    expect(res.ok).toBe(false)
    expect(res.reason).toMatch(/already recorded/)
  })
  it('the LAST signature (Lena, NZ) publishes: version advances, exceptions flip, audit written', () => {
    const before = FACTS.term.versions.join('|')
    expect(before).toContain('v2.0 Current')
    const res = signClaimUnit(GLOBAL, 'mc-nz', { actorId: 'lena' })
    expect(res.ok).toBe(true)
    expect(res.published).toBe(true)
    const claim = getClaimById(GLOBAL)
    expect(claim.status).toBe('approved')
    expect(claim.decidedAt).toBeTruthy()
    // version chain advanced with exactly one Current marker
    expect(FACTS.term.versions).toEqual(['v1.0', 'v2.0', 'v3.0 Current'])
    // exceptions preserved, flipped to re-affirmation — never voided
    expect(EXCEPTIONS.find(e => e.id === 'EXC-4').status).toBe('reaffirm-required')
    expect(EXCEPTIONS.find(e => e.id === 'EXC-5').status).toBe('reaffirm-required')
    expect(AUDIT_LOG.some(e => e.eventType === 'claim.published')).toBe(true)
    expect(AUDIT_LOG.filter(e => e.eventType === 'exception.reaffirm-required' && e.id.startsWith('al-chg')).length).toBe(2)
  })
  it('a published claim cannot be signed or declined again', () => {
    expect(signClaimUnit(GLOBAL, 'mc-nz', { actorId: 'lena' }).ok).toBe(false)
    expect(declineClaimUnit(GLOBAL, 'mc-nz', { actorId: 'lena' }).ok).toBe(false)
  })
})

describe('model claim publish advances the registry card', () => {
  it('Sarah signs the single BU slot; MDL-1005 gains v1.1', () => {
    const res = signClaimUnit(MODEL, 'mc-japan-securities', { actorId: 'sarah' })
    expect(res.ok).toBe(true)
    expect(res.published).toBe(true)
    const m = getModelById('MDL-1005')
    expect(m.technical.version).toBe('v1.1')
    expect(m.technical.versionHistory[0]).toMatchObject({ version: 'v1.1' })
    // enable state untouched by a version record
    expect(m.status).toBe('available')
  })
})

describe('re-affirmation', () => {
  it('the queue now holds the historic exception plus the two flipped ones', () => {
    expect(reaffirmQueue().map(e => e.id).sort()).toEqual(['EXC-2', 'EXC-4', 'EXC-5'])
  })
  it('refuses an actor without the permission at the exception node', () => {
    const res = reaffirmException('EXC-4', { actorId: 'thomas' })
    expect(res.ok).toBe(false)
    expect(EXCEPTIONS.find(e => e.id === 'EXC-4').status).toBe('reaffirm-required')
  })
  it('Sarah re-affirms the Securities exception; it is preserved with a fresh approval line', () => {
    const res = reaffirmException('EXC-4', { actorId: 'sarah' })
    expect(res.ok).toBe(true)
    const exc = EXCEPTIONS.find(e => e.id === 'EXC-4')
    expect(exc.status).toBe('reaffirmed')
    expect(exc.reaffirmedBy).toBe('sarah')
    expect(AUDIT_LOG.some(e => e.eventType === 'exception.reaffirmed')).toBe(true)
  })
  it('re-affirming twice is refused', () => {
    expect(reaffirmException('EXC-4', { actorId: 'sarah' }).ok).toBe(false)
  })
})

describe('pending list', () => {
  it('after the beat, only the untouched non-language claims remain pending', () => {
    expect(pendingClaims().map(c => c.id).sort()).toEqual(['CHG-2026-043', 'CHG-2026-044'])
  })
})
