import { describe, it, expect } from 'vitest'
import {
  REVIEWERS, LIVE_STATS, DAY0_STATS, HELD_CHANGES, getDashboardState,
  MINI_CLUSTERS, PRELOADED_ENTRIES, applyDecision, isOpen,
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

describe('reviewer decisions — the queue is a work surface', () => {
  const live = () => getDashboardState(1)
  const firstOpenId = () => HELD_CHANGES.find(isOpen).id

  it('approving clears the hold and records who decided it', () => {
    const next = applyDecision(live(), firstOpenId(), 'approved')
    const row = next.heldChanges.find(c => c.id === firstOpenId())
    expect(row.status).toBe('cleared')
    expect(row.decision.type).toBe('approved')
    expect(row.decision.by).toBe(row.reviewer.name)
  })

  it('rejecting sends the change back and keeps the stated reason', () => {
    const next = applyDecision(live(), firstOpenId(), 'rejected', '  needs approved hedging  ')
    const row = next.heldChanges.find(c => c.id === firstOpenId())
    expect(row.status).toBe('rejected')
    expect(row.decision.reason).toBe('needs approved hedging')
  })

  it('a decision moves one change from held to resolved', () => {
    const before = live()
    const after = applyDecision(before, firstOpenId(), 'approved')
    expect(after.stats.heldForReview).toBe(before.stats.heldForReview - 1)
    expect(after.stats.resolvedByReview).toBe(before.stats.resolvedByReview + 1)
  })

  it('never inflates "published safely" — that tile means never flagged', () => {
    const before = live()
    const after = applyDecision(before, firstOpenId(), 'approved')
    expect(after.stats.publishedSafely).toBe(before.stats.publishedSafely)
    expect(after.stats.flagsRaised).toBe(before.stats.flagsRaised)
    expect(after.stats.checksThisWeek).toBe(before.stats.checksThisWeek)
  })

  it('the held tile always equals the number of open rows in the queue', () => {
    let state = live()
    expect(state.stats.heldForReview).toBe(state.heldChanges.filter(isOpen).length)
    for (const id of HELD_CHANGES.filter(isOpen).map(c => c.id)) {
      state = applyDecision(state, id, 'approved')
      expect(state.stats.heldForReview).toBe(state.heldChanges.filter(isOpen).length)
    }
    expect(state.stats.heldForReview).toBe(0)
  })

  it('deciding twice on the same change is a no-op', () => {
    const once = applyDecision(live(), firstOpenId(), 'approved')
    const twice = applyDecision(once, firstOpenId(), 'rejected', 'changed my mind')
    expect(twice).toBe(once)
  })

  it('unknown ids and unknown decisions leave the state untouched', () => {
    const state = live()
    expect(applyDecision(state, 'hold-does-not-exist', 'approved')).toBe(state)
    expect(applyDecision(state, firstOpenId(), 'maybe')).toBe(state)
  })

  it('does not mutate the shared fixture', () => {
    const snapshot = JSON.stringify(HELD_CHANGES)
    applyDecision(live(), firstOpenId(), 'approved')
    expect(JSON.stringify(HELD_CHANGES)).toBe(snapshot)
  })
})
