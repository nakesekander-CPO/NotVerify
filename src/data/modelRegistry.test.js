/**
 * Model Registry invariants: seed shape, governed-enable transitions,
 * agent↔model linkage, and canon vocabulary bans.
 */
import { describe, it, expect } from 'vitest'
import {
  MODELS,
  getModelById,
  getModelByKey,
  selectableModels,
  agentsUsingModel,
  runEnableChecks,
  enableModel,
  disableModel,
} from './modelRegistry'
import { AGENTS, activeVersion } from './agentStudio'
import { REVIEWERS } from './governanceDashboard'

const CAST = Object.values(REVIEWERS).map(r => r.name)

describe('model registry seeds', () => {
  it('holds 7 models: 4 enabled, 2 available, 1 in evaluation', () => {
    expect(MODELS).toHaveLength(7)
    expect(MODELS.filter(m => m.status === 'enabled')).toHaveLength(4)
    expect(MODELS.filter(m => m.status === 'available')).toHaveLength(2)
    expect(MODELS.filter(m => m.status === 'evaluation')).toHaveLength(1)
  })

  it('includes the model keys agents already reference', () => {
    expect(getModelByKey('arbitr-reason-1')?.status).toBe('enabled')
    expect(getModelByKey('arbitr-general')?.status).toBe('enabled')
  })

  it('every seeded agent runs on a model that is enabled in the registry', () => {
    for (const agent of AGENTS) {
      const key = activeVersion(agent)?.modelConfig?.model
      const model = getModelByKey(key)
      expect(model, `agent ${agent.id} model key "${key}" missing from registry`).toBeTruthy()
      expect(model.status).toBe('enabled')
    }
  })

  it('agentsUsingModel derives the linkage from agent versions', () => {
    const users = agentsUsingModel('arbitr-reason-1')
    expect(users.length).toBeGreaterThan(0)
    expect(agentsUsingModel('meridian-fls-detect-1')).toHaveLength(0)
  })

  it('every enabled model records who enabled it, from the reviewer cast', () => {
    for (const m of MODELS.filter(x => x.status === 'enabled')) {
      expect(m.enabledBy).toBeTruthy()
      expect(CAST).toContain(m.enabledBy.name)
      expect(m.enabledAt).toBeTruthy()
      expect(m.auditTrail.some(l => l.event === 'enabled')).toBe(true)
    }
  })
})

describe('selectable models', () => {
  it('only enabled models are selectable for agents', () => {
    const keys = selectableModels().map(m => m.modelKey)
    expect(keys).not.toContain('meridian-ja-disclosure-1')
    expect(keys).not.toContain('meridian-term-enforce-1')
    expect(keys).not.toContain('meridian-fls-detect-1')
    expect(keys).toContain('arbitr-reason-1')
  })
})

describe('governed enable', () => {
  it('runs the four named policy checks, all passing for an available model', () => {
    const checks = runEnableChecks(getModelById('MDL-1005'))
    expect(checks.map(c => c.id)).toEqual(['data_residency', 'guardrail_compat', 'credit_budget', 'audit_currency'])
    expect(checks.every(c => c.pass)).toBe(true)
  })

  it('blocks the audit-currency check for a model still in evaluation', () => {
    const checks = runEnableChecks(getModelById('MDL-1007'))
    expect(checks.find(c => c.id === 'audit_currency').pass).toBe(false)
  })

  it('refuses to enable an evaluation model and mutates nothing', () => {
    const before = JSON.stringify(getModelById('MDL-1007'))
    expect(enableModel('MDL-1007', { approver: REVIEWERS.sarah })).toBeNull()
    expect(JSON.stringify(getModelById('MDL-1007'))).toBe(before)
  })

  it('refuses to enable an already-enabled model', () => {
    expect(enableModel('MDL-1001', { approver: REVIEWERS.sarah })).toBeNull()
  })

  it('enables an available model with an approval line and audit trail entry', () => {
    const m = getModelById('MDL-1005')
    const trailBefore = m.auditTrail.length
    const result = enableModel('MDL-1005', { approver: REVIEWERS.sarah })
    expect(result).toBe(m)
    expect(m.status).toBe('enabled')
    expect(m.enabledBy).toEqual({ name: 'Sarah Jenkins', role: REVIEWERS.sarah.role })
    expect(new Date(m.enabledAt).toString()).not.toBe('Invalid Date')
    expect(m.auditTrail).toHaveLength(trailBefore + 1)
    const line = m.auditTrail[m.auditTrail.length - 1]
    expect(line.event).toBe('enabled')
    expect(line.actor).toBe('Sarah Jenkins')
    expect(selectableModels().map(x => x.id)).toContain('MDL-1005')

    // restore seed state so test order never matters
    const restored = disableModel('MDL-1005', { approver: REVIEWERS.sarah })
    expect(restored.status).toBe('available')
    expect(restored.enabledBy).toBeNull()
  })
})

describe('canon vocabulary', () => {
  it('seed copy is free of retired names, "coins", and mis-cased product name', () => {
    const blob = JSON.stringify(MODELS)
    expect(blob).not.toMatch(/NotVerify/i)
    expect(blob).not.toMatch(/Straker/i)
    expect(blob).not.toMatch(/\bcoins?\b/i)
    // product name is always lowercase "arbitr"
    expect(blob).not.toMatch(/\bArbitr\b/)
  })

  it('audit actors are the reviewer cast or the platform', () => {
    for (const m of MODELS) {
      for (const line of m.auditTrail) {
        expect([...CAST, 'arbitr']).toContain(line.actor)
      }
    }
  })
})
