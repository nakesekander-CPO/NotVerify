import { describe, it, expect } from 'vitest'
import {
  SCAN_PROVIDERS, SCAN_LANGUAGES, SCAN_PROMPT_SET, scanObservations,
  SCAN_RESULT, scanEavi, LANGUAGE_FLAG, raiseLanguageFlag, CORTEX_FLAGS,
} from './eavScan'
import { HELD_CHANGES, LIVE_STATS } from './governanceDashboard'
import { ALERTS } from './eav'

describe('visibility scan — the language-regression loop', () => {
  it('full-scope observations match the benchmark story (500 × 4 × 2 = 4,000)', () => {
    expect(scanObservations(SCAN_LANGUAGES.length)).toBe(4000)
    expect(SCAN_PROVIDERS.length).toBe(4)
    expect(SCAN_PROMPT_SET.prompts).toBe(500)
  })

  it('the dimension drops reconcile to EAVI 74 → 71 under the model weights', () => {
    expect(scanEavi(SCAN_RESULT.previous)).toBe(SCAN_RESULT.previous.eavi)
    expect(scanEavi(SCAN_RESULT.current)).toBe(71)
  })

  it('the flag carries phrase before/after, evidence, and a named reviewer', () => {
    expect(LANGUAGE_FLAG.phraseBefore).not.toBe(LANGUAGE_FLAG.phraseAfter)
    expect(LANGUAGE_FLAG.evidence.length).toBeGreaterThanOrEqual(2)
    expect(LANGUAGE_FLAG.reviewer.name).toBe('Emma Ross')
  })

  it('raising the flag writes all three surfaces exactly once (idempotent)', () => {
    const heldBefore = HELD_CHANGES.length
    const statsBefore = { ...LIVE_STATS }
    raiseLanguageFlag(new Date('2026-08-18T10:00:00Z'))
    raiseLanguageFlag(new Date('2026-08-18T10:05:00Z'))
    expect(HELD_CHANGES.length).toBe(heldBefore + 1)
    expect(HELD_CHANGES[0].ruleId).toBe('VIS-LANG-001')
    expect(HELD_CHANGES[0].reviewer.name).toBe('Emma Ross')
    expect(LIVE_STATS.heldForReview).toBe(statsBefore.heldForReview + 1)
    // stats invariant holds after the write
    expect(LIVE_STATS.checksThisWeek).toBe(LIVE_STATS.publishedSafely + LIVE_STATS.flagsRaised)
    expect(ALERTS.filter(a => a.id === 'al-vis-lang').length).toBe(1)
    expect(CORTEX_FLAGS.length).toBe(1)
    expect(CORTEX_FLAGS[0].note).toContain('future-ready learning ecosystem')
  })
})
