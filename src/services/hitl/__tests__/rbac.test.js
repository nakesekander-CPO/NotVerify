import { describe, it, expect } from 'vitest'
import { hasPermission, requirePermission, getUserRoles, isRole } from '../rbac'

describe('HITL RBAC — permission resolution', () => {
  it('grants tenant-admin every permission via the * wildcard', () => {
    expect(hasPermission('alex', 'manage_vendor_pool:org')).toBe(true)
    expect(hasPermission('alex', 'approve_retraining')).toBe(true)
    expect(hasPermission('alex', 'final_validate')).toBe(true)
  })

  it('returns the role list for a user', () => {
    const roles = getUserRoles('alex')
    expect(roles.length).toBeGreaterThan(0)
    expect(roles.some(r => r.id === 'tenant-admin')).toBe(true)
  })

  it('isRole matches multiple role IDs', () => {
    expect(isRole('alex', 'tenant-admin')).toBe(true)
    expect(isRole('alex', 'org-manager', 'tenant-admin')).toBe(true)
    expect(isRole('alex', 'vendor-user')).toBe(false)
  })

  it('blocks anonymous callers and throws PERMISSION_DENIED', () => {
    expect(() => requirePermission(null, 'final_validate')).toThrow(/Permission denied/)
  })

  it('throws on missing permission and tags the error with code PERMISSION_DENIED', () => {
    // Thomas is a viewer in Germany — cannot final-validate.
    try {
      requirePermission('thomas', 'final_validate')
      throw new Error('expected throw')
    } catch (e) {
      expect(e.code).toBe('PERMISSION_DENIED')
    }
  })

  it('allows a contributor to use create_resource but not approve_retraining', () => {
    // James is contributor on Global Risk.
    expect(hasPermission('james', 'create_resource')).toBe(true)
    expect(hasPermission('james', 'approve_retraining')).toBe(false)
  })
})
