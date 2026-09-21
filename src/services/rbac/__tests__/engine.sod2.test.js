/**
 * SoD v2 (ruled 2026-09-21): admin/business split, second-line
 * independence pairs, standing-conflict detection with named
 * exceptions. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { can, BUSINESS_DECISION_PERMISSIONS } from '../engine'
import { standingSodFindings, SOD_CONFLICT_PAIRS } from '../grants'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

describe('admin ≠ business sign-off', () => {
  it('the wildcard is refused every business decision, with the split named', () => {
    for (const perm of BUSINESS_DECISION_PERMISSIONS) {
      const d = can({ principal: 'alex', permission: perm, nodeId: 'mc-japan-finance' })
      expect(d.allow, perm).toBe(false)
      expect(d.decisivePolicy, perm).toBe('admin-business-split')
    }
  })
  it('the wildcard still administers: members, structure, workflows, audit', () => {
    for (const perm of ['manage_members', 'manage_structure', 'reassign_task', 'view_audit', 'view_resource']) {
      expect(can({ principal: 'alex', permission: perm, nodeId: 'mc-japan-finance' }).allow, perm).toBe(true)
    }
  })
  it('explicitly granted business roles still decide', () => {
    expect(can({ principal: 'sarah', permission: 'final_validate', nodeId: 'mc-japan-finance' }).allow).toBe(true)
    expect(can({ principal: 'kenji', permission: 'client_signoff', nodeId: 'mc-japan-finance' }).allow).toBe(true)
    expect(can({ principal: 'yuki', permission: 'approve_resource', nodeId: 'mc-japan-ma' }).allow).toBe(true)
  })
})

describe('standing SoD findings', () => {
  it('detects the seeded double-hats and shows their named exceptions', () => {
    const findings = standingSodFindings('meridian')
    const james = findings.find(f => f.userId === 'james' && f.pair.includes('view_audit'))
    expect(james).toBeTruthy()
    expect(james.exception?.approvedBy).toBe('alex')
    const lena = findings.find(f => f.userId === 'lena' && f.pair.includes('legal_review'))
    expect(lena).toBeTruthy()
    expect(lena.exception?.reason).toMatch(/Interim NZ legal review/)
  })
  it('second-line independence pairs are declared', () => {
    const flat = SOD_CONFLICT_PAIRS.map(p => p.join('+'))
    expect(flat).toContain('edit_resource+compliance_review')
    expect(flat).toContain('edit_resource+legal_review')
  })
  it('every finding without an exception is a visible violation (none in seeds)', () => {
    expect(standingSodFindings('meridian').filter(f => !f.exception)).toEqual([])
  })
})
