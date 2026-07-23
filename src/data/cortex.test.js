import { describe, it, expect } from 'vitest'
import { CLUSTERS, TOTAL_FACTS, generateStars, FLOW_STAGES, METRICS } from './cortex'

describe('cortex data', () => {
  it('cluster counts sum to the advertised total', () => {
    const sum = CLUSTERS.reduce((a, c) => a + c.n, 0)
    expect(sum).toBe(TOTAL_FACTS)
    expect(sum).toBe(2500)
  })

  it('the starfield is deterministic and cluster-complete', () => {
    const a = generateStars()
    const b = generateStars()
    expect(a.length).toBe(TOTAL_FACTS)
    expect(a[0]).toEqual(b[0])
    expect(a[a.length - 1]).toEqual(b[b.length - 1])
    // every cluster contributes exactly its count
    for (const c of CLUSTERS) {
      expect(a.filter(s => s.cl === c.id).length).toBe(c.n)
    }
  })

  it('roughly 12% of facts are recent (compounding memory)', () => {
    const stars = generateStars()
    const recent = stars.filter(s => s.recent).length / stars.length
    expect(recent).toBeGreaterThan(0.08)
    expect(recent).toBeLessThan(0.16)
  })

  it('the learning loop narrows: extracted ≥ reviewed ≥ verified', () => {
    const byId = Object.fromEntries(FLOW_STAGES.map(s => [s.id, s.n]))
    expect(byId.cl).toBeGreaterThanOrEqual(byId.rev)
    expect(byId.rev).toBeGreaterThanOrEqual(byId.mem)
    expect(byId.mem).toBe(METRICS.verifiedEntries)
  })
})
