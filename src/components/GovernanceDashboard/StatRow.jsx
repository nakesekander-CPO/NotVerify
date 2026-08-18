/**
 * Governance dashboard — the four governance stats.
 *
 * Checks this week · Flags raised · Held for review · Published safely.
 * The numbers reconcile by construction (tested in
 * src/data/governanceDashboard.test.js). Day 0 renders honest zeros —
 * never blanks — with "fills in after your first check" subcopy.
 */

import { Card, MonoLabel } from '../HITLVendorWorkflow/shared'

const pct = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : null)

export default function StatRow({ stats, mode }) {
  const day0 = mode === 'day0'
  const cells = [
    {
      label: 'Checks this week',
      value: stats.checksThisWeek,
      sub: day0 ? 'fills in after your first check' : 'across your connected systems',
      tone: 'text-ink',
    },
    {
      label: 'Flags raised',
      value: stats.flagsRaised,
      sub: day0 ? 'a flag is a rule doing its job' : `${pct(stats.flagsRaised, stats.checksThisWeek)} of all changes`,
      tone: day0 ? 'text-ink' : 'text-[#996800]',
    },
    {
      label: 'Held for review',
      value: stats.heldForReview,
      sub: day0 ? 'each hold gets a named reason' : 'each with a named reason & reviewer',
      tone: day0 ? 'text-ink' : 'text-[#B3843E]',
    },
    {
      label: 'Published safely',
      value: stats.publishedSafely,
      sub: day0 ? 'safe changes flow straight through' : `${pct(stats.publishedSafely, stats.checksThisWeek)} flowed straight through`,
      tone: day0 ? 'text-ink' : 'text-teal',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cells.map(c => (
        <Card key={c.label} padding="p-4">
          <MonoLabel>{c.label}</MonoLabel>
          <p className={`text-[26px] font-bold tabular-nums mt-1 ${c.tone}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {c.value.toLocaleString()}
          </p>
          <p className="text-[11px] text-mist mt-0.5">{c.sub}</p>
        </Card>
      ))}
    </div>
  )
}
