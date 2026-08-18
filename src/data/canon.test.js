import { describe, it, expect } from 'vitest'
import { LIVE_STATS, PRELOADED_ENTRIES } from './governanceDashboard'
import { METRICS } from './cortex'
import { generateOrgIntelligence } from './orgIntelligence'

/**
 * Canon reconciliation — one set of numbers across every surface.
 * If a module drifts from the shared facts, this suite fails.
 */
describe('canonical numbers reconcile across data modules', () => {
  it('the Cortex has exactly one size story: 147 pre-loaded → 4,120 verified', () => {
    expect(PRELOADED_ENTRIES).toBe(147)
    expect(METRICS.verifiedEntries).toBe(4120)
    const org = generateOrgIntelligence()
    expect(org.orgPatterns.glossaryTerms).toBe(METRICS.verifiedEntries)
  })

  it('governance stats reconcile and stay the app-wide reference', () => {
    expect(LIVE_STATS.checksThisWeek).toBe(LIVE_STATS.publishedSafely + LIVE_STATS.flagsRaised)
    expect(LIVE_STATS.heldForReview).toBeLessThanOrEqual(LIVE_STATS.flagsRaised)
  })

  it('the retired 1,247 figure appears nowhere in data modules', async () => {
    const org = JSON.stringify(generateOrgIntelligence())
    expect(org).not.toContain('1247')
    expect(org).not.toContain('1,247')
  })
})
