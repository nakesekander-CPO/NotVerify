/**
 * Governance dashboard — mock data layer.
 *
 * The dashboard is the governance work surface: Checks → Flags → Publishes
 * stats over a queue of held changes. A hold is the product working
 * correctly, never an error — every hold carries a named reason (in
 * what-it-catches before/after style), a cited source rule, and a named
 * reviewer. Content echoes the fixtures used elsewhere in the demo
 * (Meridian IR Glossary v3 in SwiftBridge, the app-wide reviewer cast)
 * so the whole demo tells one story.
 *
 * Two states, keyed off projectsCompleted:
 *   day0 — zero stats, empty queue, Cortex pre-loaded (147 entries)
 *   live — the approved ground-study numbers + the held-changes queue
 */

/* ── Reviewer cast (app-wide) ──────────────────────────────────── */

export const REVIEWERS = {
  sarah:  { name: 'Sarah Jenkins', role: 'Lead Compliance',     initials: 'SJ' },
  yuki:   { name: 'Yuki Tanaka',   role: 'Compliance Reviewer', initials: 'YT' },
  marcus: { name: 'Marcus Lee',    role: 'Legal Reviewer',      initials: 'ML' },
  emma:   { name: 'Emma Ross',     role: 'Brand Lead',          initials: 'ER' },
}

/* ── Stats ─────────────────────────────────────────────────────────
   Invariants (tested): every check either publishes clean or raises a
   flag (checks = published + flags); holds are the subset of flags
   still awaiting a reviewer (held ≤ flags). */

export const LIVE_STATS = {
  checksThisWeek: 12847,
  flagsRaised: 214,
  heldForReview: 10,
  publishedSafely: 12633,
  resolvedByReview: 4,
}

export const DAY0_STATS = {
  checksThisWeek: 0,
  flagsRaised: 0,
  heldForReview: 0,
  publishedSafely: 0,
  resolvedByReview: 0,
}

/* ── Held-changes queue ────────────────────────────────────────── */

// status: 'critical-hold' | 'held' | 'cleared' | 'rejected'
/** Triage order: open critical holds first, then open holds, then
 *  resolved — stable within each band so the queue keeps arrival order. */
export function triageOrder(changes) {
  const rank = (c) => (isOpen(c) ? (c.status === 'critical-hold' ? 0 : 1) : 2)
  return [...changes].sort((a, b) => rank(a) - rank(b))
}

export const HELD_CHANGES = [
  {
    id: 'hold-01',
    ruleId: 'FIN-REV-014',
    title: 'Q2 Earnings Release · JA→EN',
    status: 'critical-hold',
    reason: {
      label: 'Forbidden legacy term',
      before: 'のれん rendered as “goodwill premium”',
      after: 'のれん → “Goodwill”',
      source: 'Meridian IR Glossary v3',
    },
    reviewer: REVIEWERS.yuki,
    heldFor: '14 min',
  },
  {
    id: 'hold-02',
    ruleId: 'FIN-FLS-007',
    title: 'CEO letter · outlook paragraph',
    status: 'critical-hold',
    reason: {
      label: 'Unhedged forward-looking claim',
      before: '“revenue will grow 20% next year”',
      after: 'held for approved hedging language',
      source: 'Forward-Looking Statements policy v5',
    },
    reviewer: REVIEWERS.marcus,
    heldFor: '41 min',
  },
  {
    id: 'hold-03',
    ruleId: 'FIN-TERM-031',
    title: 'Guidance section · Q2 earnings deck',
    status: 'held',
    reason: {
      label: 'Glossary-preferred rendering',
      before: '通期業績予想 as “full-year forecast”',
      after: '“full-year guidance”',
      source: 'Meridian IR Glossary v3',
    },
    reviewer: REVIEWERS.sarah,
    heldFor: '1 h',
  },
  {
    id: 'hold-04',
    ruleId: 'FIN-DISC-009',
    title: 'Buyback announcement · IR page',
    status: 'held',
    reason: {
      label: 'IR-copy rule',
      before: '自己株式取得 as “treasury stock acquisition”',
      after: '“share buyback”',
      source: 'Meridian IR Glossary v3',
    },
    reviewer: REVIEWERS.marcus,
    heldFor: '2 h',
  },
  {
    id: 'hold-05',
    ruleId: 'BRD-VOX-102',
    title: 'Product page rewrite · EN',
    status: 'held',
    reason: {
      label: 'Brand voice drift',
      before: 'two banned superlatives (“revolutionary”, “seamless”)',
      after: 'suggested rewrite attached',
      source: 'Brand Rules v2',
    },
    reviewer: REVIEWERS.emma,
    heldFor: '3 h',
  },
  {
    id: 'hold-06',
    ruleId: 'SEC-PII-021',
    title: 'Support macro update',
    status: 'held',
    reason: {
      label: 'PII in example text',
      before: 'a real customer email in the sample reply',
      after: 'redacted placeholder',
      source: 'Data-Handling policy',
    },
    reviewer: REVIEWERS.sarah,
    heldFor: '4 h',
  },
  {
    id: 'hold-09',
    ruleId: 'VID-SUB-044',
    title: 'Product launch film · subtitles DE',
    status: 'critical-hold',
    reason: {
      label: 'Unapproved claim in a burned-in subtitle',
      before: '“the safest platform on the market”',
      after: 'held for legal-approved phrasing',
      source: 'Marketing Claims policy v2',
    },
    reviewer: REVIEWERS.marcus,
    heldFor: '22 min',
  },
  {
    id: 'hold-10',
    ruleId: 'MKT-CLM-018',
    title: 'Pricing page · EN',
    status: 'held',
    reason: {
      label: 'Unsupported comparative claim',
      before: '“3× faster than any competitor”',
      after: '“faster in our published benchmark”',
      source: 'Marketing Claims policy v2',
    },
    reviewer: REVIEWERS.emma,
    heldFor: '5 h',
  },
  {
    id: 'hold-11',
    ruleId: 'FIN-RSK-022',
    title: 'Risk factors · annual report DE',
    status: 'held',
    reason: {
      label: 'Omitted mandatory risk sentence',
      before: 'liquidity clause missing from the risk paragraph',
      after: 'approved clause reinserted',
      source: 'Disclosure Checklist v4',
    },
    reviewer: REVIEWERS.sarah,
    heldFor: '6 h',
  },
  {
    id: 'hold-12',
    ruleId: 'LOC-TON-077',
    title: 'Onboarding emails · JA',
    status: 'held',
    reason: {
      label: 'Register too informal for the audience',
      before: 'plain-form verbs in a customer-facing email',
      after: 'polite form (です・ます)',
      source: 'JA Style Guide v2',
    },
    reviewer: REVIEWERS.yuki,
    heldFor: '7 h',
  },
  // Cleared rows — the product working end-to-end; rendered dimmed.
  {
    id: 'hold-07',
    ruleId: 'FIN-NUM-003',
    title: 'Results table · numerals',
    status: 'cleared',
    reason: {
      label: 'Numeral normalization',
      before: 'full-width digits ２０２６',
      after: '2026',
      source: 'Numeric Format Rules v3',
    },
    reviewer: REVIEWERS.yuki,
    heldFor: 'auto-fixed',
  },
  {
    id: 'hold-08',
    ruleId: 'LOC-PLH-005',
    title: 'Email template · FR',
    status: 'cleared',
    reason: {
      label: 'Corrupted placeholder',
      before: '{{first_name}} translated to {{prénom}}',
      after: '{{first_name}} preserved',
      source: 'Placeholder Integrity rule',
    },
    reviewer: REVIEWERS.emma,
    heldFor: 'auto-fixed',
  },
  {
    id: 'hold-13',
    ruleId: 'SEC-KEY-013',
    title: 'Developer docs · sample config',
    status: 'cleared',
    reason: {
      label: 'Live-looking API key in a sample',
      before: 'sk_live_… pasted into a code block',
      after: 'sk_test_placeholder',
      source: 'Data-Handling policy',
    },
    reviewer: REVIEWERS.marcus,
    heldFor: 'auto-fixed',
  },
  {
    id: 'hold-14',
    ruleId: 'LOC-NUM-041',
    title: 'Invoice template · DE',
    status: 'cleared',
    reason: {
      label: 'Decimal separator',
      before: '1,250.00 on a German invoice',
      after: '1.250,00',
      source: 'Numeric Format Rules v3',
    },
    reviewer: REVIEWERS.emma,
    heldFor: 'auto-fixed',
  },
]

/* ── Reviewer decisions ─────────────────────────────────────────
   A decision is what makes the queue a work surface rather than a
   readout. Approving publishes the change and clears the hold;
   rejecting sends it back to the author with a reason. Both are
   resolutions, so both decrement "Held for review" and increment
   "Resolved by review" — nothing leaks out of the accounting.

   "Published safely" is deliberately NOT incremented on approve: that
   tile means "flowed straight through, never flagged", and a change
   that a human had to clear did not do that. */

export const DECISIONS = {
  approved: { status: 'cleared', label: 'Published after review' },
  rejected: { status: 'rejected', label: 'Sent back to author' },
}

export const OPEN_STATUSES = ['critical-hold', 'held']

export const isOpen = (change) => OPEN_STATUSES.includes(change.status)

/**
 * Pure reducer: apply a reviewer's decision to a dashboard state.
 * Returns the same state object when the id is unknown or already
 * resolved, so double-clicks and stale rows can never double-count.
 */
export function applyDecision(state, id, decision, reason = '') {
  const spec = DECISIONS[decision]
  const target = state.heldChanges.find(c => c.id === id)
  if (!spec || !target || !isOpen(target)) return state

  const heldChanges = state.heldChanges.map(c => (
    c.id === id
      ? {
        ...c,
        status: spec.status,
        decision: {
          type: decision,
          label: spec.label,
          by: c.reviewer.name,
          reason: reason.trim() || null,
          at: 'just now',
        },
      }
      : c
  ))

  return {
    ...state,
    heldChanges,
    stats: {
      ...state.stats,
      heldForReview: Math.max(0, state.stats.heldForReview - 1),
      resolvedByReview: state.stats.resolvedByReview + 1,
    },
  }
}

/* ── State selector ────────────────────────────────────────────── */

export function getDashboardState(projectsCompleted = 0) {
  if (!projectsCompleted) {
    return { mode: 'day0', stats: DAY0_STATS, heldChanges: [] }
  }
  return { mode: 'live', stats: LIVE_STATS, heldChanges: HELD_CHANGES }
}

/* ── Cortex mini-constellation (rendered on the dashboard) ─────────
   One point per pre-loaded entry (sums to the 147 badge), plus dim
   placeholder clusters that fill in once reviewing starts. */

export const MINI_CLUSTERS = [
  { label: 'J-GAAP Terminology', n: 54, x: 0.22, y: 0.42, spread: 0.09, color: '#FFBD59' },
  { label: 'TSE Conventions', n: 43, x: 0.5, y: 0.3, spread: 0.08, color: '#3D16FA' },
  { label: 'IFRS Mappings', n: 31, x: 0.78, y: 0.46, spread: 0.07, color: '#3D16FA' },
  { label: 'Brand & Cultural', n: 19, x: 0.36, y: 0.72, spread: 0.06, color: '#3D16FA' },
]

export const MINI_EMPTY = [
  { label: 'Reviewer Corrections', x: 0.62, y: 0.74 },
  { label: 'Verified Answers', x: 0.88, y: 0.78 },
]

export const PRELOADED_ENTRIES = MINI_CLUSTERS.reduce((a, c) => a + c.n, 0)
