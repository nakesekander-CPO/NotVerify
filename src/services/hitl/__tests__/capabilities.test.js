import { describe, it, expect } from 'vitest'
import {
  TIERS, tierForRole, canSignOff, canManageAutonomy, PERSONAS,
} from '../../../components/HITLVendorWorkflow/governance/capabilities'

describe('tierForRole — capability tier from role permissions', () => {
  it('grants approve-publish to sign-off roles', () => {
    expect(tierForRole('final-validator')).toBe(TIERS.PUBLISH)
    expect(tierForRole('tenant-admin')).toBe(TIERS.PUBLISH)
    expect(tierForRole('arbitr-global-admin')).toBe(TIERS.PUBLISH)
  })
  it('classifies client sign-off as approve-own', () => {
    expect(tierForRole('client-reviewer')).toBe(TIERS.APPROVE_OWN)
  })
  it('classifies vendor users as submit-only', () => {
    expect(tierForRole('vendor-user')).toBe(TIERS.SUBMIT)
  })
  it('classifies reviewers as review-comment', () => {
    expect(tierForRole('internal-reviewer')).toBe(TIERS.REVIEW)
    expect(tierForRole('compliance-reviewer')).toBe(TIERS.REVIEW)
    expect(tierForRole('vendor-manager')).toBe(TIERS.REVIEW)
  })
  it('classifies read-only roles as view-only', () => {
    expect(tierForRole('read-only-observer')).toBe(TIERS.VIEW)
    expect(tierForRole('auditor')).toBe(TIERS.VIEW)
  })
})

describe('canSignOff', () => {
  it('is true only for the publish tier', () => {
    expect(canSignOff('final-validator')).toBe(true)
    expect(canSignOff('internal-reviewer')).toBe(false)
    expect(canSignOff('vendor-user')).toBe(false)
  })
})

describe('canManageAutonomy', () => {
  it('is true for admins and final validators, false for reviewers', () => {
    expect(canManageAutonomy('arbitr-global-admin')).toBe(true)
    expect(canManageAutonomy('org-admin')).toBe(true)
    expect(canManageAutonomy('final-validator')).toBe(true)
    expect(canManageAutonomy('internal-reviewer')).toBe(false)
  })
})

describe('PERSONAS — demo view-as-role list', () => {
  it('maps each persona to a real role id', () => {
    const roleIds = PERSONAS.map(p => p.roleId)
    expect(roleIds).toContain('internal-reviewer')
    expect(roleIds).toContain('final-validator')
    expect(roleIds).toContain('vendor-user')
    PERSONAS.forEach(p => {
      expect(typeof p.id).toBe('string')
      expect(typeof p.label).toBe('string')
      expect(typeof p.roleId).toBe('string')
    })
  })
})
