import { describe, it, expect } from 'vitest'
import { computeEAVI, EAVI_DIMENSIONS, EAVI, EAVI_WEIGHTS } from './eav'

describe('EAVI_v1 methodology', () => {
  it('golden fixture returns 73.85 and displays 74', () => {
    const golden = { coverage: 72, prominence: 68, citationQuality: 80, knowledgeAccuracy: 90, consistency: 75, multilingual: 50, freshness: 85 }
    const r = computeEAVI(golden)
    expect(r.raw).toBe(73.85)
    expect(r.display).toBe(74)
  })

  it('the seeded workspace uses the golden dimensions', () => {
    expect(EAVI_DIMENSIONS).toMatchObject({ coverage: 72, prominence: 68, citationQuality: 80, knowledgeAccuracy: 90, consistency: 75, multilingual: 50, freshness: 85 })
    expect(EAVI.raw).toBe(73.85)
    expect(EAVI.display).toBe(74)
  })

  it('weights sum to 1.0', () => {
    const sum = Object.values(EAVI_WEIGHTS).reduce((a, b) => a + b, 0)
    expect(Math.round(sum * 100) / 100).toBe(1)
  })

  it('is bounded 0–100', () => {
    expect(computeEAVI({ coverage: 0, prominence: 0, citationQuality: 0, knowledgeAccuracy: 0, consistency: 0, multilingual: 0, freshness: 0 }).display).toBe(0)
    expect(computeEAVI({ coverage: 100, prominence: 100, citationQuality: 100, knowledgeAccuracy: 100, consistency: 100, multilingual: 100, freshness: 100 }).display).toBe(100)
  })
})
