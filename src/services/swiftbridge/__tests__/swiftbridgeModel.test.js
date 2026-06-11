import { describe, it, expect } from 'vitest'
import {
  SLA_BY_DOC_TYPE, slaFor, slaCountdown,
  buildWorkflow, retryStep, overrideStep, advanceStep,
  checkGlossaryCompliance, DUBBING_STAGES, summarizeQa,
  getSwiftBridgeDemo, STEP_AGENTS,
} from '../swiftbridgeModel'

describe('SLA targets — the relaunch headline numbers', () => {
  it('matches the brief: 24h disclosure/quarterly, 72h PPT, 10-day annual report', () => {
    expect(SLA_BY_DOC_TYPE['timely-disclosure'].hours).toBe(24)
    expect(SLA_BY_DOC_TYPE['quarterly-report'].hours).toBe(24)
    expect(SLA_BY_DOC_TYPE['powerpoint'].hours).toBe(72)
    expect(SLA_BY_DOC_TYPE['annual-securities'].hours).toBe(240)
  })

  it('every demo project derives its SLA from its document type', () => {
    const { projects } = getSwiftBridgeDemo()
    for (const p of projects) {
      expect(p.slaHours).toBe(slaFor(p.docType).hours)
    }
  })

  it('countdown reports remaining time, breach, and on-time delivery', () => {
    const now = Date.now()
    const live = { createdAt: new Date(now - 10 * 3600_000).toISOString(), slaHours: 24 }
    expect(slaCountdown(live, now).remainingHours).toBe(14)
    expect(slaCountdown(live, now).breached).toBe(false)
    const late = { createdAt: new Date(now - 30 * 3600_000).toISOString(), slaHours: 24 }
    expect(slaCountdown(late, now).breached).toBe(true)
    const delivered = { createdAt: new Date(now - 72 * 3600_000).toISOString(), slaHours: 24, deliveredAt: new Date(now - 52 * 3600_000).toISOString() }
    expect(slaCountdown(delivered, now).met).toBe(true)
  })
})

describe('workflow templates — human gates cannot be configured away', () => {
  const combos = [
    ['timely-disclosure', ['translation', 'qa']],
    ['quarterly-report', ['translation']],
    ['powerpoint', ['translation', 'dtp', 'qa']],
    ['annual-securities', ['translation', 'dtp', 'qa', 'glossary']],
    ['media-dubbing', ['dubbing']],
    ['quarterly-report', []],
  ]
  it.each(combos)('%s + %j includes a human review and exactly one customer approval', (docType, services) => {
    const steps = buildWorkflow(docType, services)
    expect(steps.filter(s => s.kind === 'human_review').length).toBeGreaterThanOrEqual(1)
    expect(steps.filter(s => s.kind === 'customer_action').length).toBe(1)
  })

  it('dubbing swaps translation for dubbing prep, powered by the AV agent', () => {
    const steps = buildWorkflow('media-dubbing', ['dubbing'])
    expect(steps.some(s => s.key === 'dubbing-prep' && s.agentId === STEP_AGENTS.dubbing.id)).toBe(true)
    expect(steps.some(s => s.key === 'translation')).toBe(false)
  })

  it('DTP appears only for PPT / annual reports or when requested', () => {
    expect(buildWorkflow('powerpoint', []).some(s => s.key === 'dtp')).toBe(true)
    expect(buildWorkflow('annual-securities', []).some(s => s.key === 'dtp')).toBe(true)
    expect(buildWorkflow('timely-disclosure', []).some(s => s.key === 'dtp')).toBe(false)
    expect(buildWorkflow('timely-disclosure', ['dtp']).some(s => s.key === 'dtp')).toBe(true)
  })

  it('automated steps carry real arbitr marketplace agent identities', () => {
    const steps = buildWorkflow('quarterly-report', ['translation'])
    const ids = steps.map(s => s.agentId).filter(Boolean)
    expect(ids).toContain('JP-FIN-3')
    expect(ids).toContain('TERM-GUARDIAN-1')
    expect(ids).toContain('LQA-AUDIT-1')
    expect(ids).toContain('RISK-SENTINEL-2')
  })
})

describe('step state machine', () => {
  const blockedSteps = () => {
    const steps = buildWorkflow('powerpoint', ['dtp'])
    const dtp = steps.find(s => s.key === 'dtp')
    return [advanceStep(steps, dtp.id, 'blocked'), dtp.id]
  }

  it('retry is only allowed from blocked, and increments the retry count', () => {
    const [steps, dtpId] = blockedSteps()
    const after = retryStep(steps, dtpId)
    const dtp = after.find(s => s.id === dtpId)
    expect(dtp.status).toBe('in_progress')
    expect(dtp.retryCount).toBe(1)
    expect(() => retryStep(after, dtpId)).toThrow() // no longer blocked
  })

  it('override requires a note and flags the step for audit', () => {
    const [steps, dtpId] = blockedSteps()
    expect(() => overrideStep(steps, dtpId, { note: '', actor: 'ops' })).toThrow()
    const after = overrideStep(steps, dtpId, { note: 'Fonts embedded manually', actor: 'ops@swiftbridge' })
    const dtp = after.find(s => s.id === dtpId)
    expect(dtp.status).toBe('completed')
    expect(dtp.overridden).toBe(true)
    expect(dtp.notes).toContain('Fonts embedded manually')
  })

  it('completed steps are immutable', () => {
    const steps = buildWorkflow('quarterly-report', [])
    const first = steps[0]
    const done = advanceStep(steps, first.id, 'completed')
    expect(() => advanceStep(done, first.id, 'in_progress')).toThrow()
    expect(() => overrideStep(done, first.id, { note: 'x', actor: 'ops' })).toThrow()
  })
})

describe('glossary compliance', () => {
  const terms = [
    { id: 't1', ja: 'のれん', en: 'Goodwill', status: 'approved' },
    { id: 't2', ja: '通期業績予想', en: 'full-year guidance', status: 'approved' },
    { id: 't3', ja: 'のれん', en: 'goodwill premium', status: 'forbidden' },
    { id: 't4', ja: '中期経営計画', en: 'medium-term management plan', status: 'pending' },
  ]

  it('passes compliant text and ignores pending terms', () => {
    const rows = checkGlossaryCompliance('Goodwill impairment; we maintain full-year guidance.', terms)
    expect(rows.find(r => r.term.id === 't1').verdict).toBe('pass')
    expect(rows.find(r => r.term.id === 't2').verdict).toBe('pass')
    expect(rows.find(r => r.term.id === 't4')).toBeUndefined() // pending excluded
  })

  it('flags missing approved renderings when the JA term is left in place', () => {
    const rows = checkGlossaryCompliance('のれん impairment was recorded.', terms)
    expect(rows.find(r => r.term.id === 't1').verdict).toBe('missing')
  })

  it('flags forbidden renderings', () => {
    const rows = checkGlossaryCompliance('A goodwill premium of $42m was recorded.', terms)
    expect(rows.find(r => r.term.id === 't3').verdict).toBe('violation')
  })
})

describe('AI dubbing stages', () => {
  it('runs upload → transcript → script review (human) → voice → preview → approval (human) → export', () => {
    expect(DUBBING_STAGES.map(s => s.id)).toEqual(
      ['upload', 'transcript', 'script_review', 'voice_selection', 'preview', 'approval', 'export'])
    expect(DUBBING_STAGES.filter(s => s.kind === 'human_review').map(s => s.id))
      .toEqual(['script_review', 'approval'])
  })
})

describe('demo seed consistency — the sales story holds up', () => {
  const demo = getSwiftBridgeDemo()

  it('the delivered project completed every step and met its SLA', () => {
    const p = demo.projects.find(x => x.status === 'delivered')
    expect(p.steps.every(s => s.status === 'completed')).toBe(true)
    expect(slaCountdown(p).met).toBe(true)
  })

  it('the blocked PPT project has exactly one blocked step with a retry count', () => {
    const p = demo.projects.find(x => x.status === 'blocked')
    const blocked = p.steps.filter(s => s.status === 'blocked')
    expect(p.docType).toBe('powerpoint')
    expect(blocked).toHaveLength(1)
    expect(blocked[0].key).toBe('dtp')
    expect(blocked[0].retryCount).toBeGreaterThanOrEqual(1)
  })

  it('the live timely-disclosure project has a running 24h countdown', () => {
    const p = demo.projects.find(x => x.id === 'SB-2026-041')
    const c = slaCountdown(p)
    expect(p.slaHours).toBe(24)
    expect(c.breached).toBe(false)
    expect(c.remainingHours).toBeGreaterThan(0)
  })

  it('QA summary counts severities and open items', () => {
    const s = summarizeQa(demo.qaResults)
    expect(s.total).toBe(5)
    expect(s.critical).toBe(1)
    expect(s.open).toBe(4)
  })

  it('the custom agent binds the client glossary to a real marketplace base agent', () => {
    expect(demo.customAgent.baseAgentId).toBe('JP-FIN-3')
    expect(demo.customAgent.glossaryId).toBe(demo.glossary.id)
  })
})
