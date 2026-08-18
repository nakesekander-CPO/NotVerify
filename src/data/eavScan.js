/**
 * AI Visibility — new-scan flow + the Cortex tie-back.
 *
 * The story this data tells: marketing refreshed campaign copy with new
 * brand language ("future-ready learning ecosystem" replacing "business
 * school"). The next visibility scan shows assistants matching fewer
 * buying questions to Northstar — Coverage and Prominence drop, EAVI
 * falls 74 → 71 — and arbitr closes the loop: the scan raises an alert
 * here, a held change lands on the governance queue with a named reason
 * and reviewer, and the fact is recorded in Cortex so the phrasing is
 * flagged wherever it appears next.
 */

import { BENCHMARK, ALERTS } from './eav'
import { HELD_CHANGES, LIVE_STATS, REVIEWERS } from './governanceDashboard'

/* ── Scan configuration (the wizard's scope step) ─────────────── */

export const SCAN_PROVIDERS = ['ChatGPT', 'Perplexity', 'Gemini', 'Claude']
export const SCAN_LANGUAGES = [
  { id: 'en', label: 'English', ref: true },
  { id: 'vi', label: 'Vietnamese' },
  { id: 'es', label: 'Spanish' },
  { id: 'ja', label: 'Japanese' },
]
export const SCAN_PROMPT_SET = { name: 'Buying questions v3', prompts: BENCHMARK.uniquePrompts, repeats: BENCHMARK.repetitions }

export function scanObservations(langCount = 4) {
  // observations = prompts × providers × repeats (languages partition the prompt set)
  return SCAN_PROMPT_SET.prompts * SCAN_PROVIDERS.length * SCAN_PROMPT_SET.repeats * (langCount / SCAN_LANGUAGES.length)
}

/* ── Result: the language regression ──────────────────────────── */

// EAVI dimension weights (must match the EAVI model in eav.js)
const W = { coverage: 0.25, prominence: 0.20, citation: 0.15, accuracy: 0.15, consistency: 0.10, multilingual: 0.10, freshness: 0.05 }

export const SCAN_RESULT = {
  previous: { eavi: 74, coverage: 72, prominence: 68, citation: 80, accuracy: 90, consistency: 75, multilingual: 50, freshness: 85 },
  current: { coverage: 64, prominence: 63, citation: 80, accuracy: 90, consistency: 75, multilingual: 50, freshness: 87 },
}

export function scanEavi(dims) {
  return Math.round(
    dims.coverage * W.coverage + dims.prominence * W.prominence + dims.citation * W.citation +
    dims.accuracy * W.accuracy + dims.consistency * W.consistency + dims.multilingual * W.multilingual +
    dims.freshness * W.freshness
  )
}

/* ── The flag (what Cortex catches) ───────────────────────────── */

export const LANGUAGE_FLAG = {
  ruleId: 'VIS-LANG-001',
  title: 'New campaign language reduced AI visibility',
  phraseBefore: 'business school',
  phraseAfter: 'future-ready learning ecosystem',
  finding:
    'Refreshed campaign pages replaced “business school” with “future-ready learning ecosystem”. Assistants now match Northstar to fewer school-shaped buying questions: Coverage −8, Prominence −5, EAVI 74 → 71.',
  evidence: [
    '“best online MBA” cluster: mention rate 81% → 62% on refreshed pages',
    'ChatGPT and Perplexity stopped listing Northstar for “top business schools in Vietnam”',
    'Pages keeping the original phrasing show no movement',
  ],
  reviewer: REVIEWERS.emma,
  owner: 'Marketing',
}

/* ── The loop: write the flag into the three surfaces ─────────── */

let scanCounter = 0

export function raiseLanguageFlag(now = new Date()) {
  scanCounter += 1
  const id = `hold-vis-${scanCounter}`

  // 1. Governance queue — a held change with a named reason + reviewer.
  const held = {
    id,
    ruleId: LANGUAGE_FLAG.ruleId,
    title: 'Campaign copy refresh · brand language',
    status: 'held',
    reason: {
      label: 'Visibility regression',
      before: `“${LANGUAGE_FLAG.phraseAfter}” replacing “${LANGUAGE_FLAG.phraseBefore}”`,
      after: `restore “${LANGUAGE_FLAG.phraseBefore}” alongside the new phrase`,
      source: `AI Visibility scan · EAVI 74 → 71`,
    },
    reviewer: LANGUAGE_FLAG.reviewer,
    heldFor: 'just now',
  }
  if (!HELD_CHANGES.some(c => c.ruleId === LANGUAGE_FLAG.ruleId)) {
    HELD_CHANGES.unshift(held)
    LIVE_STATS.checksThisWeek += 1
    LIVE_STATS.flagsRaised += 1
    LIVE_STATS.heldForReview += 1
  }

  // 2. AI Visibility alert.
  if (!ALERTS.some(a => a.id === 'al-vis-lang')) {
    ALERTS.unshift({
      id: 'al-vis-lang', severity: 'high',
      reason: 'New campaign language reduced AI visibility (Cortex flagged)',
      scope: 'brand-language · all providers · en',
      evidence: 'scan', action: 'Open held change', when: now.toISOString().slice(0, 10), ack: false,
    })
  }

  // 3. Cortex — the fact, inspectable like any other.
  const fact = {
    t: 'Campaign phrase: “future-ready learning ecosystem”',
    flagged: true,
    s: 'Flagged language',
    sub: `${LANGUAGE_FLAG.ruleId} · flagged by AI Visibility scan`,
    who: LANGUAGE_FLAG.reviewer.name,
    role: LANGUAGE_FLAG.reviewer.role,
    date: now.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }),
    src: 'visibility-scan → cortex writeback',
    impact: 'Held in 1 campaign · watched everywhere the phrase appears',
    agents: ['Brand QA', 'Brand Voice'],
    versions: ['v1.0 Current'],
    note: `“${LANGUAGE_FLAG.finding}”`,
  }
  if (!CORTEX_FLAGS.some(f => f.sub === fact.sub)) CORTEX_FLAGS.unshift(fact)

  return { held, fact }
}

/** Facts Cortex surfaces in its "Recently flagged" strip. */
export const CORTEX_FLAGS = []
