import { describe, it, expect } from 'vitest'
import {
  HITL_SEGMENTS, REVIEW_DECISIONS, RATIONALE_CHIPS,
  rationaleChipsForDomain, divergenceScore,
} from '../../../data/hitlVendorWorkflow'
import {
  segmentPedigree, documentPedigree, classifyVerificationDepth,
  contributorLifetimeImpact,
} from '../pedigree'

describe('rationaleChipsForDomain — closed taxonomy', () => {
  it('always returns universal chips', () => {
    const out = rationaleChipsForDomain('anything')
    expect(out.some(c => c.id === 'register')).toBe(true)
    expect(out.some(c => c.id === 'brand-voice')).toBe(true)
    expect(out.some(c => c.id === 'source-drift')).toBe(true)
  })

  it('surfaces financial chips for financial domain', () => {
    const out = rationaleChipsForDomain('financial')
    expect(out.some(c => c.id === 'term-jgaap')).toBe(true)
    expect(out.some(c => c.id === 'tse-convention')).toBe(true)
  })

  it('does not surface financial chips for legal domain', () => {
    const out = rationaleChipsForDomain('legal')
    expect(out.some(c => c.id === 'tse-convention')).toBe(false)
    expect(out.some(c => c.id === 'contracts')).toBe(true)
  })

  it('exposes the canonical chip list as a closed enum', () => {
    expect(RATIONALE_CHIPS.length).toBeGreaterThan(6)
    for (const c of RATIONALE_CHIPS) {
      expect(typeof c.id).toBe('string')
      expect(typeof c.label).toBe('string')
      expect(Array.isArray(c.domain)).toBe(true)
    }
  })
})

describe('divergenceScore — adjudication signal', () => {
  it('returns 0 for unanimous proposals', () => {
    expect(divergenceScore([
      { text: 'the same' }, { text: 'the same' }, { text: 'the same' },
    ])).toBe(0)
  })

  it('returns >0 for divergent proposals', () => {
    const d = divergenceScore([
      { text: 'apple banana cherry' },
      { text: 'date elderberry fig' },
    ])
    expect(d).toBeGreaterThan(0.5)
  })
})

describe('classifyVerificationDepth', () => {
  it('treats segments with no decisions as Untouched', () => {
    const seg = HITL_SEGMENTS.find(s => s.id === 'seg-q3ja-1')
    expect(seg).toBeTruthy()
    // Untouched at fixture-load time.
    expect(classifyVerificationDepth(seg)).toBe('untouched')
  })

  it('classifies a chosen-candidate decision as Adjudicated', () => {
    const seg = HITL_SEGMENTS.find(s => s.id === 'seg-q3ja-3')
    REVIEW_DECISIONS.push({
      id: 'rd-test-pedigree-adj',
      segmentId: seg.id, actorId: 'sarah', actorRole: 'final-validator',
      action: 'verified', chosenCandidateId: 'c1', rationaleTags: ['register'],
      originalValue: seg.target, newValue: null,
      timestamp: new Date().toISOString(),
    })
    seg.chosenCandidateId = 'c1'
    expect(classifyVerificationDepth(seg)).toBe('adjudicated')
  })

  it('classifies an edited segment with no chosenCandidate as Authored', () => {
    const seg = HITL_SEGMENTS.find(s => s.id === 'seg-q3ja-5')
    REVIEW_DECISIONS.push({
      id: 'rd-test-pedigree-aut',
      segmentId: seg.id, actorId: 'sarah', actorRole: 'final-validator',
      action: 'edited', chosenCandidateId: null, rationaleTags: ['brand-voice'],
      originalValue: seg.target, newValue: '完全に新しい翻訳',
      timestamp: new Date().toISOString(),
    })
    expect(classifyVerificationDepth(seg)).toBe('authored')
  })
})

describe('segmentPedigree + documentPedigree', () => {
  it('produces a composite score and a dual-track confidence', () => {
    const seg = HITL_SEGMENTS.find(s => s.id === 'seg-q3ja-3')
    const ped = segmentPedigree(seg.id)
    expect(ped).toBeTruthy()
    expect(typeof ped.composite).toBe('number')
    expect(typeof ped.modelConfidence).toBe('number')
    // After the adjudication above, humanConfidence is set.
    expect(ped.humanConfidence).not.toBeNull()
  })

  it('returns null for unknown segments', () => {
    expect(segmentPedigree('nope')).toBeNull()
  })

  it('computes document-level pedigree with Untouched/Adjudicated/Authored split', () => {
    const ped = documentPedigree('hp-q3-ja-earnings')
    expect(ped).toBeTruthy()
    expect(ped.distribution.untouchedPct + ped.distribution.adjudicatedPct + ped.distribution.authoredPct).toBeCloseTo(100, 0)
    expect(typeof ped.provenanceHash).toBe('string')
    expect(ped.provenanceHash.startsWith('0x')).toBe(true)
  })
})

describe('contributorLifetimeImpact', () => {
  it('counts adjudications and tagged decisions for a user', () => {
    const impact = contributorLifetimeImpact('sarah')
    expect(impact.adjudicated).toBeGreaterThanOrEqual(1)
    expect(impact.tagged).toBeGreaterThanOrEqual(1)
    expect(impact.tagFrequency).toBeTypeOf('object')
  })
})
