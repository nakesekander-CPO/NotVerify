/**
 * Point 5 (ruled 2026-09-21) — surfaces are permissions.
 * Modules, billing, and integrations are gated by the engine; API keys
 * are principals with expiring grants. Clock frozen at 2026-09-17.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { can, holdsPermissionAnywhere } from '../engine'

beforeAll(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-17T12:00:00Z'))
})
afterAll(() => vi.useRealTimers())

const SURFACES = ['access_cortex', 'access_agent_studio', 'access_analytics', 'access_governance', 'access_ai_visibility']

describe('surface access is role-shaped', () => {
  it('the admin wildcard covers surfaces (administration, not business)', () => {
    for (const p of SURFACES) expect(can({ principal: 'alex', permission: p, nodeId: 'mc-root' }).allow, p).toBe(true)
  })
  it('a viewer sees Governance and nothing else', () => {
    expect(holdsPermissionAnywhere('thomas', 'access_governance')).toBe(true)
    for (const p of ['access_cortex', 'access_agent_studio', 'access_analytics', 'access_ai_visibility']) {
      expect(holdsPermissionAnywhere('thomas', p), p).toBe(false)
    }
  })
  it('compliance watches external claims: AI Visibility is theirs', () => {
    expect(can({ principal: 'yuki', permission: 'access_ai_visibility', nodeId: 'mc-japan-compliance' }).allow).toBe(true)
  })
  it('billing and integrations are governed surfaces (held-anywhere semantics)', () => {
    expect(holdsPermissionAnywhere('kenji', 'view_billing')).toBe(true)
    expect(holdsPermissionAnywhere('kenji', 'manage_billing')).toBe(false)
    expect(holdsPermissionAnywhere('alex', 'manage_billing')).toBe(true)
    expect(holdsPermissionAnywhere('thomas', 'manage_integrations')).toBe(false)
    // and business decisions never ride the wildcard, even anywhere-checked
    expect(holdsPermissionAnywhere('alex', 'signoff_output')).toBe(false)
  })
})

describe('API keys are principals with expiring grants', () => {
  it('the reporting key reads analytics inside its residency and dies at rotation', () => {
    const svc = { type: 'service-account', id: 'svc-reporting-api' }
    expect(can({ principal: svc, permission: 'access_analytics', nodeId: 'mc-root' }).allow).toBe(true)
    expect(can({ principal: svc, permission: 'view_audit', nodeId: 'mc-japan' }).allow).toBe(true)
    // no write powers
    expect(can({ principal: svc, permission: 'edit_resource', nodeId: 'mc-japan' }).allow).toBe(false)
    // rotation date enforced
    expect(can({ principal: svc, permission: 'access_analytics', nodeId: 'mc-root', at: '2027-01-02T00:00:00Z' }).decisivePolicy).toBe('expired')
  })
})
