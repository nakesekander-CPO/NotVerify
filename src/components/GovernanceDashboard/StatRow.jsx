/**
 * Governance dashboard — the five governance stats.
 *
 * Checks this week · Flags raised · Held for review · Published safely ·
 * Resolved by review. Day 0 renders honest zeros — never blanks — with
 * "fills in after your first check" subcopy.
 *
 * Three of the five are filters over the queue below. The other two are
 * deliberately inert: a change that flowed straight through never entered
 * the queue, so there is nothing to filter it down to. Filter tiles are
 * real buttons with aria-pressed; readout tiles stay plain divs.
 */

import { Card, MonoLabel } from '../HITLVendorWorkflow/shared'

const pct = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : null)

export default function StatRow({ stats, mode, activeFilter, onFilterChange }) {
  const day0 = mode === 'day0'

  const cells = [
    {
      key: 'checks',
      label: 'Checks this week',
      value: stats.checksThisWeek,
      sub: day0 ? 'fills in after your first check' : 'across your connected systems',
      tone: 'text-ink',
      filter: null,
    },
    {
      key: 'flags',
      label: 'Flags raised',
      value: stats.flagsRaised,
      sub: day0 ? 'a flag is a rule doing its job' : `${pct(stats.flagsRaised, stats.checksThisWeek)} of all changes`,
      tone: day0 ? 'text-ink' : 'text-[#996800]',
      filter: 'flagged',
    },
    {
      key: 'held',
      label: 'Held for review',
      value: stats.heldForReview,
      sub: day0 ? 'each hold gets a named reason' : 'each with a named reason & reviewer',
      tone: day0 ? 'text-ink' : 'text-[#B3843E]',
      filter: 'held',
    },
    {
      key: 'published',
      label: 'Published safely',
      value: stats.publishedSafely,
      sub: day0 ? 'safe changes flow straight through' : `${pct(stats.publishedSafely, stats.checksThisWeek)} flowed straight through`,
      tone: day0 ? 'text-ink' : 'text-teal',
      filter: null,
    },
    {
      key: 'resolved',
      label: 'Resolved by review',
      value: stats.resolvedByReview,
      sub: day0 ? 'closed holds land here' : 'published after review or sent back',
      tone: day0 ? 'text-ink' : 'text-ocean',
      filter: 'resolved',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {cells.map(c => {
        const isFilter = !day0 && Boolean(c.filter)
        const active = isFilter && activeFilter === c.filter

        const body = (
          <>
            <MonoLabel>{c.label}</MonoLabel>
            <p
              className={`text-[26px] font-bold tabular-nums mt-1 ${c.tone}`}
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              {c.value.toLocaleString()}
            </p>
            <p className="text-[11px] text-mist mt-0.5">{c.sub}</p>
            {isFilter && (
              <p className="text-[10px] text-ocean mt-1.5 font-medium">
                {active ? 'Filtering the queue · click to clear' : 'Click to filter the queue'}
              </p>
            )}
          </>
        )

        if (!isFilter) {
          return <Card key={c.key} padding="p-4">{body}</Card>
        }

        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilterChange(active ? null : c.filter)}
            aria-pressed={active}
            aria-label={`${c.label}: ${c.value.toLocaleString()}. ${active ? 'Filter active, activate to clear.' : 'Activate to filter the queue.'}`}
            className={`text-left rounded-xl transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean ${active ? 'ring-2 ring-ocean' : 'hover:ring-1 hover:ring-ocean/40'}`}
          >
            <Card padding="p-4" className={active ? 'bg-ocean/[0.04]' : ''}>{body}</Card>
          </button>
        )
      })}
    </div>
  )
}
