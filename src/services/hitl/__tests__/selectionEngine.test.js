import { describe, it, expect } from 'vitest'
import {
  HITL_PROJECTS, VENDORS, SELECTION_POLICIES, getPolicyById,
} from '../../../data/hitlVendorWorkflow'
import { recommendVendors, __internals__ } from '../selectionEngine'

const findProject = (id) => HITL_PROJECTS.find(p => p.id === id)

describe('vendor selection engine — hard filters', () => {
  it('disqualifies a vendor that does not cover the target language', () => {
    const project = findProject('hp-q3-ja-earnings') // EN → JA
    const milano = VENDORS.find(v => v.id === 'v-milano-finance') // no JA
    const policy = getPolicyById('sp-quality-first')
    const { eligible, reasons } = __internals__.applyHardFilters(milano, project, policy, null)
    expect(eligible).toBe(false)
    expect(reasons.some(r => /language coverage/i.test(r))).toBe(true)
  })

  it('disqualifies a vendor outside the required pool', () => {
    const project = findProject('hp-q3-ja-earnings') // requires vp-japanese-financial
    const rec = recommendVendors({ project })
    const milanoDQ = rec.disqualified.find(d => d.vendorId === 'v-milano-finance')
    expect(milanoDQ).toBeTruthy()
    expect(milanoDQ.reasons.some(r => /Japanese Financial/i.test(r) || /pool/i.test(r))).toBe(true)
  })

  it('disqualifies a vendor whose security tier is below the project classification', () => {
    const project = findProject('hp-q3-ja-earnings') // 'high'
    const elevated = { ...VENDORS.find(v => v.id === 'v-milano-finance'), securityTier: 'elevated' }
    const policy = getPolicyById('sp-quality-first')
    const { eligible, reasons } = __internals__.applyHardFilters(elevated, project, policy, null)
    expect(eligible).toBe(false)
    expect(reasons.some(r => /Security tier/i.test(r))).toBe(true)
  })

  it('disqualifies a vendor without the required NDA', () => {
    const project = findProject('hp-q3-ja-earnings')
    const v = { ...VENDORS.find(x => x.id === 'v-nihon-linguistics'), ndaStatus: 'pending' }
    const policy = getPolicyById('sp-quality-first')
    const { eligible, reasons } = __internals__.applyHardFilters(v, project, policy, null)
    expect(eligible).toBe(false)
    expect(reasons.some(r => /NDA/i.test(r))).toBe(true)
  })
})

describe('vendor selection engine — weighted scoring', () => {
  it('recommends Nihon Linguistics for the Q3 JA earnings project under quality-first policy', () => {
    const project = findProject('hp-q3-ja-earnings')
    const rec = recommendVendors({ project })
    expect(rec.recommended).toBeTruthy()
    expect(rec.recommended.vendorId).toBe('v-nihon-linguistics')
    expect(rec.recommended.score).toBeGreaterThan(0.7)
  })

  it('produces an explainable score breakdown summing weights ~= 1.0', () => {
    const project = findProject('hp-q3-ja-earnings')
    const rec = recommendVendors({ project })
    const weights = Object.values(rec.recommended.breakdown).map(b => b.weight)
    const sum = weights.reduce((a, b) => a + b, 0)
    expect(sum).toBeGreaterThan(0.99)
    expect(sum).toBeLessThan(1.01)
  })

  it('flags the BaFin project as NOT auto-assignable (compliance policy requires manual approval)', () => {
    const project = findProject('hp-de-regulatory')
    const rec = recommendVendors({ project })
    expect(rec.recommended).toBeTruthy()
    expect(rec.autoAssignAllowed).toBe(false)
  })
})

describe('vendor selection engine — ranking', () => {
  it('returns alternatives sorted by descending score', () => {
    const project = findProject('hp-q3-ja-earnings')
    const rec = recommendVendors({ project })
    const all = [rec.recommended, ...rec.alternatives].filter(Boolean)
    for (let i = 1; i < all.length; i++) {
      expect(all[i - 1].score).toBeGreaterThanOrEqual(all[i].score)
    }
  })

  it('returns a non-null recommended OR null with disqualifications captured', () => {
    const project = findProject('hp-q3-ja-earnings')
    const rec = recommendVendors({ project, candidates: [] })
    expect(rec.recommended).toBeNull()
    expect(Array.isArray(rec.disqualified)).toBe(true)
  })
})
