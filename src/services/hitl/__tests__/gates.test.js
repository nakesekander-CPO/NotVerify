import { describe, it, expect } from 'vitest'
import { gateFor, GATES, DEFAULT_THRESHOLDS } from '../../../components/HITLVendorWorkflow/governance/gates'

describe('gateFor — autonomy gate from score', () => {
  const t = { escalate: 75, review: 92 }

  it('escalates below the escalate threshold', () => {
    expect(gateFor(0, t).id).toBe('escalate')
    expect(gateFor(74, t).id).toBe('escalate')
  })

  it('requires review between escalate and review thresholds (inclusive of escalate)', () => {
    expect(gateFor(75, t).id).toBe('review')
    expect(gateFor(91, t).id).toBe('review')
  })

  it('auto-publishes at or above the review threshold', () => {
    expect(gateFor(92, t).id).toBe('auto-publish')
    expect(gateFor(100, t).id).toBe('auto-publish')
  })

  it('uses DEFAULT_THRESHOLDS when none passed', () => {
    expect(gateFor(96).id).toBe('auto-publish')
    expect(gateFor(80).id).toBe('review')
    expect(gateFor(50).id).toBe('escalate')
  })

  it('every gate exposes label, dot, and chip classes', () => {
    for (const key of ['auto-publish', 'review', 'escalate']) {
      expect(typeof GATES[key].label).toBe('string')
      expect(typeof GATES[key].dot).toBe('string')
      expect(typeof GATES[key].chip).toBe('string')
    }
  })

  it('returns null gate for a null score', () => {
    expect(gateFor(null, t)).toBeNull()
  })
})
