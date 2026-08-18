import { describe, it, expect } from 'vitest'
import { CLUSTERS, TOTAL_FACTS, generateStars, FLOW_STAGES, METRICS, GRAPH_SATELLITES, GRAPH_AGENTS, GRAPH_HUB_FACT_KEYS, MEMORY_AT_WORK, FACTS } from './cortex'

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

  it('every graph satellite points at a hub and a real fact', () => {
    const hubIds = new Set(CLUSTERS.map(c => c.id))
    for (const s of GRAPH_SATELLITES) {
      expect(hubIds.has(s.hub)).toBe(true)
      expect(FACTS[s.factKey]).toBeDefined()
    }
  })

  it('every satellite/hub agent edge resolves to a known graph agent', () => {
    const agentNames = new Set(GRAPH_AGENTS.map(a => a.name))
    for (const s of GRAPH_SATELLITES) {
      for (const name of FACTS[s.factKey].agents || []) {
        expect(agentNames.has(name)).toBe(true)
      }
    }
    for (const factKey of Object.values(GRAPH_HUB_FACT_KEYS)) {
      for (const name of FACTS[factKey].agents || []) {
        expect(agentNames.has(name)).toBe(true)
      }
    }
  })

  it('every memory-at-work card links to a real fact with a highlight', () => {
    for (const m of MEMORY_AT_WORK) {
      expect(FACTS[m.factKey]).toBeDefined()
      expect(m.value).toBeTruthy()
      expect(m.meta).toBeTruthy()
    }
  })
})
