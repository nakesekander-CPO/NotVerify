import { useState, useCallback, useRef } from 'react'

const STORAGE_KEY = 'nv-knowledge-rules'

const SEED_RULES = [
  {
    id: 'kr-seed-001',
    sourceTerm: 'ASC 350',
    targetTerm: '企業会計基準第10号',
    contextNote: 'TSE filing context — always use ASBJ standard reference',
    createdFrom: 'seg-042',
    createdAt: '2025-11-15T09:23:00.000Z',
    verifiedBy: 'Kenji Tanaka',
  },
  {
    id: 'kr-seed-002',
    sourceTerm: 'ASC 606',
    targetTerm: 'ASBJ第29号',
    contextNote: 'Revenue recognition standard mapping for Japanese market',
    createdFrom: 'seg-018',
    createdAt: '2025-12-03T14:11:00.000Z',
    verifiedBy: 'Sarah Jenkins',
  },
  {
    id: 'kr-seed-003',
    sourceTerm: 'goodwill impairment',
    targetTerm: 'のれんの減損損失',
    contextNote: 'Preferred J-GAAP terminology for financial disclosures',
    createdFrom: 'seg-042',
    createdAt: '2026-01-10T08:45:00.000Z',
    verifiedBy: 'Yuki Tanaka',
  },
  {
    id: 'kr-seed-004',
    sourceTerm: 'forward-looking statements',
    targetTerm: '将来の見通しに関する記述',
    contextNote: 'Regulatory boilerplate — consistent across all TSE filings',
    createdFrom: 'seg-012',
    createdAt: '2026-02-18T11:30:00.000Z',
    verifiedBy: 'Alex Chen',
  },
  {
    id: 'kr-seed-005',
    sourceTerm: 'operating expenses',
    targetTerm: '営業費用',
    contextNote: 'Standard accounting term — use ¥ denomination for TSE',
    createdFrom: 'seg-007',
    createdAt: '2026-03-01T16:05:00.000Z',
    verifiedBy: 'Kenji Tanaka',
  },
]

function loadRules() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (stored && stored.length > 0) return stored
    // Seed with demo rules on first load
    saveRules(SEED_RULES)
    return SEED_RULES
  } catch {
    saveRules(SEED_RULES)
    return SEED_RULES
  }
}

function saveRules(rules) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rules))
}

export default function useKnowledgeRules() {
  const [rules, setRules] = useState(loadRules)
  const intervalRef = useRef(null)

  const addRule = useCallback((rule) => {
    const newRule = {
      id: `kr-${Date.now()}`,
      ...rule,
      createdAt: new Date().toISOString(),
    }
    setRules(prev => {
      const next = [...prev, newRule]
      saveRules(next)
      return next
    })
    return newRule
  }, [])

  const removeRule = useCallback((id) => {
    setRules(prev => {
      const next = prev.filter(r => r.id !== id)
      saveRules(next)
      return next
    })
  }, [])

  /**
   * Simulate AI-driven realignment.
   * Returns { start, cancel } where start begins the simulation
   * and calls onProgress/onComplete callbacks.
   */
  const createRealignment = useCallback((rule, segments, lockedIds, { onProgress, onComplete }) => {
    // Find candidate segments: not locked, translation contains sourceTerm
    const candidates = segments.filter(seg =>
      !lockedIds.has(seg.id) && seg.translation && seg.translation.includes(rule.sourceTerm)
    )

    let processed = 0
    const realigned = []

    function start() {
      if (candidates.length === 0) {
        onComplete(realigned)
        return
      }

      intervalRef.current = setInterval(() => {
        if (processed >= candidates.length) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
          onComplete(realigned)
          return
        }

        const seg = candidates[processed]
        // 80% chance of realignment (simulates AI contextual judgment)
        const shouldRealign = Math.random() < 0.8
        if (shouldRealign) {
          realigned.push({
            segId: seg.id,
            previousTranslation: seg.translation,
            newTranslation: seg.translation.replace(rule.sourceTerm, rule.targetTerm),
            ruleId: rule.id,
          })
        }
        processed++
        onProgress({ processed, total: candidates.length, realigned: [...realigned] })
      }, 500)
    }

    function cancel() {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return { start, cancel, total: candidates.length }
  }, [])

  return { rules, addRule, removeRule, createRealignment }
}
