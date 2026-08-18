import { describe, it, expect } from 'vitest'
import {
  DUB_STAGES, CONSENT_RECORDS, DUB_PROJECTS, dubbingSummary, consentFor,
} from './videoDubbing'
import { REVIEWERS } from './governanceDashboard'

describe('video dubbing — governed pipeline shape', () => {
  it('stage ids are unique and the gates sit where governance demands', () => {
    const ids = DUB_STAGES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    // script checks BEFORE voice clone; consent BEFORE lip sync; review BEFORE export
    expect(ids.indexOf('script')).toBeLessThan(ids.indexOf('clone'))
    expect(ids.indexOf('consent')).toBeLessThan(ids.indexOf('lipsync'))
    expect(ids.indexOf('review')).toBeLessThan(ids.indexOf('export'))
  })

  it('the partner credit lives on the lip-sync stage only', () => {
    const withEngine = DUB_STAGES.filter(s => s.engine)
    expect(withEngine.map(s => s.id)).toEqual(['lipsync'])
  })
})

describe('language tracks — every hold tells the whole story', () => {
  const tracks = DUB_PROJECTS.flatMap(p => p.tracks)

  it('track statuses stay within the vocabulary and stages exist', () => {
    const stageIds = DUB_STAGES.map(s => s.id)
    for (const t of tracks) {
      expect(['cleared', 'in-progress', 'held']).toContain(t.status)
      expect(stageIds).toContain(t.stage)
    }
  })

  it('held tracks carry a named reason, a cited source, and a reviewer from the cast', () => {
    const cast = Object.values(REVIEWERS)
    for (const t of tracks.filter(x => x.status === 'held')) {
      expect(t.reason).toBeTruthy()
      expect(t.source).toBeTruthy()
      expect(cast).toContain(t.reviewer)
    }
  })

  it('held tracks are parked at governance gates, not agent stages', () => {
    const gates = DUB_STAGES.filter(s => s.kind === 'gate').map(s => s.id)
    for (const t of tracks.filter(x => x.status === 'held')) {
      expect(gates).toContain(t.stage)
    }
  })
})

describe('consent registry — no consent, no synthetic likeness', () => {
  it('every project speaker resolves to a consent record', () => {
    for (const p of DUB_PROJECTS) {
      expect(consentFor(p).length).toBe(p.speakers.length)
    }
  })

  it('projects whose only consent is expired have all tracks held at the consent gate', () => {
    for (const p of DUB_PROJECTS) {
      const records = consentFor(p)
      if (records.length > 0 && records.every(r => r.status === 'expired')) {
        for (const t of p.tracks) {
          expect(t.status).toBe('held')
          expect(t.stage).toBe('consent')
        }
      }
    }
  })

  it('consent statuses stay within the vocabulary', () => {
    for (const r of CONSENT_RECORDS) {
      expect(['valid', 'expired']).toContain(r.status)
    }
  })
})

describe('summary rollup', () => {
  it('reconciles with the tracks', () => {
    const s = dubbingSummary()
    expect(s.projects).toBe(DUB_PROJECTS.length)
    expect(s.tracks).toBe(s.held + s.cleared + s.inProgress)
  })
})

describe('copy discipline', () => {
  it('no banned terms in the module', () => {
    const all = JSON.stringify({ DUB_STAGES, CONSENT_RECORDS, DUB_PROJECTS }).toLowerCase()
    expect(all).not.toContain('notverify')
    expect(all).not.toContain('straker')
    expect(all).not.toContain('coins')
  })
})

describe('new-project run — governed stage machine', () => {
  it('runs forward one stage at a time, ending at export', async () => {
    const { nextRunStage, RUN_ORDER } = await import('./videoDubbing')
    let s = RUN_ORDER[0]
    const walked = [s]
    while ((s = nextRunStage(s))) walked.push(s)
    expect(walked).toEqual(RUN_ORDER)
    expect(walked[walked.length - 1]).toBe('export')
  })

  it('consent gate blocks voice clone and lip sync until cleared', async () => {
    const { canRunStage } = await import('./videoDubbing')
    expect(canRunStage('clone', ['script'])).toBe(false)
    expect(canRunStage('lipsync', ['script'])).toBe(false)
    expect(canRunStage('clone', ['script', 'consent'])).toBe(true)
  })

  it('script checks apply corrections before any cloning', async () => {
    const { RUN_SCRIPT_CHECKS, RUN_ORDER } = await import('./videoDubbing')
    expect(RUN_ORDER.indexOf('script')).toBeLessThan(RUN_ORDER.indexOf('clone'))
    const applied = RUN_SCRIPT_CHECKS.filter(c => c.action === 'applied')
    expect(applied.length).toBeGreaterThan(0)
    for (const c of applied) { expect(c.before).toBeTruthy(); expect(c.after).toBeTruthy() }
  })
})
