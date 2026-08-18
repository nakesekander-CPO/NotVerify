/**
 * Governance dashboard — the held-changes queue (the anchor).
 *
 * Every hold is the product working: a rule caught something, the change
 * was held with a named reason (before → after, source cited), and a named
 * reviewer owns it. Open holds carry their decision inline — approve to
 * publish, send back with a reason — and open a detail panel for the full
 * record. Resolved rows render dimmed underneath, proof the loop closes.
 */

import { ShieldCheck, Check, Undo2, ChevronRight } from 'lucide-react'
import { Card, MonoLabel, SectionHeading, StatusBadge, EmptyState } from '../HITLVendorWorkflow/shared'
import { isOpen } from '../../data/governanceDashboard'

const STATUS_RENDER = {
  'critical-hold': { badge: 'needs-rework', label: 'Critical hold' },
  held: { badge: 'awaiting-approval', label: 'Held' },
  cleared: { badge: 'approved', label: 'Cleared' },
  rejected: { badge: 'needs-rework', label: 'Sent back' },
}

const FILTER_COPY = {
  flagged: 'Showing every flagged change.',
  held: 'Showing open holds only.',
  resolved: 'Showing resolved changes only.',
}

function HeldRow({ change, onDecide, onOpenDetail }) {
  const s = STATUS_RENDER[change.status] || STATUS_RENDER.held
  const open = isOpen(change)

  return (
    <Card padding="p-4" className={open ? '' : 'opacity-55'}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{change.ruleId}</span>
            <p className="text-[13.5px] font-semibold text-ink">{change.title}</p>
          </div>
          <p className="text-[12px] text-slate mt-1.5">
            <span className="font-medium text-ink">{change.reason.label}:</span>{' '}
            <span className="line-through decoration-error/60 text-error/80">{change.reason.before}</span>
            <span className="text-mist"> → </span>
            <span className="text-teal font-medium">{change.reason.after}</span>
          </p>
          <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {change.reason.source} · {open ? `held ${change.heldFor}` : (change.decision?.label || change.heldFor)}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-sky/25 text-ink flex items-center justify-center text-[9.5px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {change.reviewer.initials}
            </span>
            <span className="hidden xl:block">
              <span className="block text-[11.5px] font-medium text-ink leading-tight">{change.reviewer.name}</span>
              <span className="block text-[10px] text-mist leading-tight">{change.reviewer.role}</span>
            </span>
          </div>
          <StatusBadge status={s.badge}>{s.label}</StatusBadge>
        </div>
      </div>

      {/* Decision bar — the row is a work surface, not a readout. */}
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-rule flex-wrap">
        {open ? (
          <>
            <button
              type="button"
              onClick={() => onDecide(change.id, 'approved')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-amber hover:bg-amber-deep text-white transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              type="button"
              onClick={() => onOpenDetail(change.id, true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border border-error/30 text-error hover:bg-error/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean"
            >
              <Undo2 className="w-3.5 h-3.5" /> Send back
            </button>
          </>
        ) : (
          <p className="text-[11.5px] text-slate">
            {change.decision
              ? `${change.decision.label} by ${change.decision.by} · ${change.decision.at}`
              : 'Auto-fixed against your rules.'}
          </p>
        )}
        <button
          type="button"
          onClick={() => onOpenDetail(change.id, false)}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-ocean hover:underline underline-offset-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ocean rounded"
        >
          Open <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </Card>
  )
}

export default function HeldQueue({ heldChanges, mode, filter, onClearFilter, onDecide, onOpenDetail }) {
  const visible = heldChanges.filter((c) => {
    if (filter === 'held') return isOpen(c)
    if (filter === 'resolved') return !isOpen(c)
    return true /* 'flagged' and no filter both show everything */
  })
  const open = visible.filter(isOpen)
  const resolved = visible.filter(c => !isOpen(c))

  return (
    <section>
      <SectionHeading
        title="Held for review"
        subtitle="A hold is arbitr working — every one has a named reason and a named reviewer."
        actions={filter ? (
          <button
            type="button"
            onClick={onClearFilter}
            className="text-[11.5px] font-medium text-ocean hover:underline underline-offset-2 cursor-pointer"
          >
            Clear filter
          </button>
        ) : null}
      />

      {filter && mode !== 'day0' && (
        <p className="text-[11.5px] text-slate mb-2.5">
          {FILTER_COPY[filter]} <span className="text-mist">{visible.length} of {heldChanges.length} changes.</span>
        </p>
      )}

      {mode === 'day0' ? (
        <Card padding="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="Nothing held yet"
            description="When a check catches something — a forbidden term, an unhedged claim, a policy conflict — the change is held here with a named reason and a named reviewer, before it can publish. Drop a document in “Check a document” to run your first check."
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card padding="p-8">
          <EmptyState
            icon={ShieldCheck}
            title={filter === 'held' ? 'Nothing held right now' : 'Nothing to show'}
            description={
              filter === 'held'
                ? 'Every hold has been decided. New ones land here the moment a rule catches something.'
                : 'No changes match this filter yet.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {open.map(c => (
            <HeldRow key={c.id} change={c} onDecide={onDecide} onOpenDetail={onOpenDetail} />
          ))}
          {resolved.length > 0 && (
            <>
              <MonoLabel className="block pt-2">Recently resolved</MonoLabel>
              {resolved.map(c => (
                <HeldRow key={c.id} change={c} onDecide={onDecide} onOpenDetail={onOpenDetail} />
              ))}
            </>
          )}
        </div>
      )}
    </section>
  )
}
