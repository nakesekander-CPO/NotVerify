/**
 * Autonomy gates — maps a 0–100 confidence score to the gate it sits at,
 * given per-project thresholds. Pure; no React, no data imports.
 */

export const DEFAULT_THRESHOLDS = { escalate: 75, review: 92 }

export const GATES = {
  'auto-publish': {
    id: 'auto-publish', label: 'Auto-publish', short: 'Auto',
    dot: 'bg-teal', text: 'text-teal', chip: 'text-teal bg-teal/10 border-teal/30',
    desc: 'Above threshold — ships with no human review.',
  },
  review: {
    id: 'review', label: 'Review required', short: 'Review',
    dot: 'bg-amber', text: 'text-amber-deep', chip: 'text-amber-deep bg-amber/15 border-amber/30',
    desc: 'Assignment is forced before publish.',
  },
  escalate: {
    id: 'escalate', label: 'Escalate to senior', short: 'Escalate',
    dot: 'bg-error', text: 'text-error', chip: 'text-error bg-error/10 border-error/30',
    desc: 'Second-reviewer escalation fires automatically.',
  },
}

/**
 * @param {number|null} score 0–100, or null if unscored
 * @param {{escalate:number, review:number}} thresholds
 * @returns gate object from GATES, or null when score is null
 */
export function gateFor(score, thresholds = DEFAULT_THRESHOLDS) {
  if (score == null || Number.isNaN(score)) return null
  if (score < thresholds.escalate) return GATES.escalate
  if (score < thresholds.review) return GATES.review
  return GATES['auto-publish']
}
