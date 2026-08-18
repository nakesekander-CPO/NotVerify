import { describe, it, expect } from 'vitest'
import {
  REVIEWERS, LIVE_STATS, DAY0_STATS, HELD_CHANGES, getDashboardState,
  MINI_CLUSTERS, PRELOADED_ENTRIES,
} from './governanceDashboard'

describe('governance dashboard — stats reconcile', () => {
  it('every check either publishes clean or raises a flag', () => {
    expect(LIVE_STATS.checksThisWeek).toBe(LIVE_STATS.publishedSafely + LIVE_STATS.flagsRaised)
  })

  it('holds are the subset of flags awaiting a reviewer', () => {
    expect(LIVE_STATS.heldForReview).toBeLessThanOrEqual(LIVE_STATS.flagsRaised)
    const openHolds = HELD_CHANGES.filter(c => c.status !== 'cleared').length
    expect(LIVE_STATS.heldForReview).toBe(openHolds)
  })
})

describe('held-changes queue — every hold tells the whole story', () => {
  it('every row has a rule id in the FIN-REV-014 idiom', () => {
    for (const c of HELD_CHANGES) {
      expect(c.ruleId).toMatch(/^[A-Z]+(-[A-Z]+)+-\d{3}$/)
    }
  })

  it('every row carries a named reason with before/after and a cited source', () => {
    for (const c of HELD_CHANGES) {
      expect(c.reason.label).toBeTruthy()
      expect(c.reason.before).toBeTruthy()
      expect(c.reason.after).toBeTruthy()
      expect(c.reason.source).toBeTruthy()
    }
  })

  it('every row has a named reviewer from the app-wide cast', () => {
    const cast = Object.values(REVIEWERS)
    for (const c of HELD_CHANGES) {
      expect(cast).toContain(c.reviewer)
    }
  })

  it('statuses stay within the three-state vocabulary', () => {
    for (const c of HELD_CHANGES) {
      expect(['critical-hold', 'held', 'cleared']).toContain(c.status)
    }
  })
})

describe('dashboard state selector', () => {
  it('day 0 is zeros with an empty queue', () => {
    const s = getDashboardState(0)
    expect(s.mode).toBe('day0')
    expect(s.stats).toEqual(DAY0_STATS)
    expect(s.heldChanges).toEqual([])
    expect(Object.values(s.stats).every(v => v === 0)).toBe(true)
  })

  it('after the first project the live state applies', () => {
    const s = getDashboardState(1)
    expect(s.mode).toBe('live')
    expect(s.stats).toBe(LIVE_STATS)
    expect(s.heldChanges).toBe(HELD_CHANGES)
  })
})

describe('cortex mini-constellation data', () => {
  it('cluster counts sum to the pre-loaded badge (147)', () => {
    expect(PRELOADED_ENTRIES).toBe(147)
    expect(MINI_CLUSTERS.reduce((a, c) => a + c.n, 0)).toBe(PRELOADED_ENTRIES)
  })
})

describe('copy discipline', () => {
  it('no banned terms anywhere in the module', () => {
    const all = JSON.stringify({ REVIEWERS, LIVE_STATS, HELD_CHANGES, MINI_CLUSTERS }).toLowerCase()
    expect(all).not.toContain('notverify')
    expect(all).not.toContain('straker')
    expect(all).not.toContain('coins')
  })
})
