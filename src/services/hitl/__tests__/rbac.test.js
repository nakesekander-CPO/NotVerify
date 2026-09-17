/**
 * HITL RBAC adapter — every service-layer gate now goes through the one
 * engine, node-scoped. Part 4 behaviour 3 for the service path.
 * Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { requirePermission, getUserRoles, isRole } from '../rbac'
import { HITL_PROJECTS } from '../../../data/hitlVendorWorkflow'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

// Projects by client node, straight from the seed data.
const japanProject = HITL_PROJECTS.find(p => p.clientNodeId === 'mc-japan-finance')
const germanyProject = HITL_PROJECTS.find(p => p.clientNodeId === 'mc-germany-tax')

describe('HITL RBAC adapter — scoped enforcement', () => {
  it('refuses a scope-blind check outright (developer error, not a deny)', () => {
    expect(() => requirePermission('alex', 'view_resource', {})).toThrow(/cannot resolve an org node/)
  })

  it('grants tenant-admin via the wildcard, inside a real project scope', () => {
    const d = requirePermission('alex', 'approve_retraining', { projectId: japanProject.id })
    expect(d.allow).toBe(true)
    expect(d.role.id).toBe('tenant-admin')
  })

  it('denies Marcus edit_resource on a Japan project — Germany org-manager does not cross countries', () => {
    expect(japanProject).toBeTruthy()
    try {
      requirePermission('marcus', 'edit_resource', { projectId: japanProject.id })
      throw new Error('expected PERMISSION_DENIED')
    } catch (e) {
      expect(e.code).toBe('PERMISSION_DENIED')
      expect(e.decision.decisivePolicy).toBe('out-of-scope')
    }
  })

  it('allows Marcus the same permission on a Germany project', () => {
    expect(germanyProject).toBeTruthy()
    const d = requirePermission('marcus', 'edit_resource', { projectId: germanyProject.id })
    expect(d.allow).toBe(true)
  })

  it('blocks anonymous callers with PERMISSION_DENIED', () => {
    try {
      requirePermission(null, 'final_validate', { projectId: japanProject.id })
      throw new Error('expected PERMISSION_DENIED')
    } catch (e) {
      expect(e.code).toBe('PERMISSION_DENIED')
    }
  })

  it('denies Thomas (viewer, Germany Tax) final_validate even inside his own scope', () => {
    try {
      requirePermission('thomas', 'final_validate', { projectId: germanyProject.id })
      throw new Error('expected PERMISSION_DENIED')
    } catch (e) {
      expect(e.code).toBe('PERMISSION_DENIED')
    }
  })

  it('keeps the display helpers working', () => {
    expect(getUserRoles('alex').some(r => r.id === 'tenant-admin')).toBe(true)
    expect(isRole('alex', 'org-manager', 'tenant-admin')).toBe(true)
    expect(isRole('alex', 'vendor-user')).toBe(false)
  })
})
