/**
 * Governance dashboard — split-pane triage for held changes.
 *
 * The email-client pattern: a dense, internally-scrolling row list on
 * the left (critical holds pinned first, resolved dimmed at the bottom),
 * and a fixed detail + decision panel on the right. One click selects;
 * Approve / Send back never move, so working the queue is select →
 * decide → the next open hold is selected automatically. Arrow keys
 * move the selection. The pane owns its height — the page never grows
 * with queue volume.
 */

import { useCallback, useState } from 'react'
import { ShieldCheck, Check, Undo2, FileText, AlertTriangle } from 'lucide-react'
import {
  Card, MonoLabel, SectionHeading, StatusBadge, EmptyState, KeyValueRow,
  PrimaryButton, DangerButton,
} from '../HITLVendorWorkflow/shared'
import { isOpen, triageOrder } from '../../data/governanceDashboard'

const STATUS_RENDER = {
  'critical-hold': { badge: 'needs-rework', label: 'Critical hold' },
  held: { badge: 'awaiting-approval', label: 'Held' },
  cleared: { badge: 'approved', label: 'Cleared' },
  rejected: { badge: 'needs-rework', label: 'Sent back' },
}

function TriageRow({ change, selected, onSelect }) {
  const open = isOpen(change)
  const critical = change.status === 'critical-hold'
  return (
    <button
      type="button"
      onClick={() => onSelect(change.id)}
      aria-current={selected ? 'true' : undefined}
      className={`w-full text-left px-3.5 py-2.5 border-l-2 cursor-pointer transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ocean ${
        selected ? 'border-l-amber bg-ocean/[0.05]' : 'border-l-transparent hover:bg-pale/60'
      } ${open ? '' : 'opacity-55'}`}
    >
      <span className="flex items-center gap-2 min-w-0">
        {open
          ? <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${critical ? 'bg-error' : 'bg-[#FFB000]'}`} aria-hidden />
          : <Check className="w-3 h-3 text-teal shrink-0" aria-hidden />}
        <span className="text-[10.5px] text-ocean shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{change.ruleId}</span>
        <span className="text-[12.5px] font-medium text-ink truncate">{change.title}</span>
      </span>
      <span className="block text-[11px] text-slate truncate mt-0.5 pl-3.5">
        {change.reason.label}
        <span className="text-mist"> · {open ? `held ${change.heldFor}` : (change.decision?.label || 'resolved')}</span>
      </span>
    </button>
  )
}

/* The decision panel — the HoldDetailDrawer record, docked. Keyed by
   hold id from the parent so the send-back form resets per selection. */
function HoldDetail({ change, onDecide }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')

  if (!change) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <EmptyState icon={ShieldCheck} title="Select a change" description="Pick a row on the left to see its full record and decide." />
      </div>
    )
  }

  const s = STATUS_RENDER[change.status] || STATUS_RENDER.held
  const open = isOpen(change)

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{change.ruleId}</span>
          <StatusBadge status={s.badge}>{s.label}</StatusBadge>
        </div>
        <h3 className="text-[16px] font-bold text-ink mt-1">{change.title}</h3>
      </div>

      <div>
        <MonoLabel className="block mb-1.5">What the rule caught</MonoLabel>
        <div className="rounded-lg border border-rule bg-pale/50 p-3.5 space-y-1.5">
          <p className="text-[12.5px] font-medium text-ink">{change.reason.label}</p>
          <p className="text-[12px]"><span className="line-through decoration-error/60 text-error/80">{change.reason.before}</span></p>
          <p className="text-[12px] text-teal font-medium">{change.reason.after}</p>
        </div>
      </div>

      <div>
        <MonoLabel className="block mb-1">Record</MonoLabel>
        <KeyValueRow label="Source rule" value={change.reason.source} />
        <KeyValueRow label="Rule id" value={change.ruleId} mono />
        <KeyValueRow label="Reviewer" value={`${change.reviewer.name} · ${change.reviewer.role}`} />
        <KeyValueRow label="Held for" value={change.heldFor} />
      </div>

      {change.decision && (
        <div className="rounded-lg border border-rule bg-white p-3.5">
          <MonoLabel className="block mb-1">Decision</MonoLabel>
          <p className="text-[12.5px] font-semibold text-ink">{change.decision.label}</p>
          <p className="text-[11px] text-slate mt-0.5">by {change.decision.by} · {change.decision.at}</p>
          {change.decision.reason && (
            <p className="text-[11.5px] text-slate mt-1.5 border-l-2 border-rule-strong pl-2.5">“{change.decision.reason}”</p>
          )}
        </div>
      )}

      {open && !rejecting && (
        <div className="flex items-center gap-2.5 pt-1">
          <PrimaryButton onClick={() => onDecide(change.id, 'approved')}>
            <Check className="w-4 h-4" /> Approve &amp; publish
          </PrimaryButton>
          <DangerButton onClick={() => setRejecting(true)}>
            <Undo2 className="w-4 h-4" /> Send back
          </DangerButton>
        </div>
      )}

      {open && rejecting && (
        <div className="rounded-lg border border-rule bg-pale/50 p-3.5 space-y-2.5">
          <label htmlFor="triage-reject-reason" className="block text-[12.5px] font-semibold text-ink">
            Why is this going back?
          </label>
          <textarea
            id="triage-reject-reason"
            rows={3}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. rewrite using the approved hedging language, then resubmit"
            className="w-full rounded-lg border border-rule-strong px-3 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-2 focus:outline-offset-0 focus:outline-ocean resize-y"
          />
          <div className="flex items-center gap-2.5">
            <DangerButton disabled={!reason.trim()} onClick={() => onDecide(change.id, 'rejected', reason)}>
              <Undo2 className="w-4 h-4" /> Confirm send back
            </DangerButton>
            <button
              type="button"
              onClick={() => { setRejecting(false); setReason('') }}
              className="text-[12.5px] text-slate hover:text-ink underline underline-offset-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <p className="text-[11px] text-mist flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> The reason is written into the change’s record.
          </p>
        </div>
      )}
    </div>
  )
}

const FILTER_OPTIONS = [
  { id: null, label: 'All' },
  { id: 'held', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
]

export default function TriageQueue({
  heldChanges, mode, filter, onFilterChange, selectedId, onSelect, onDecide,
}) {
  const visible = triageOrder(heldChanges.filter((c) => {
    if (filter === 'held') return isOpen(c)
    if (filter === 'resolved') return !isOpen(c)
    return true /* 'flagged' and no filter both show everything */
  }))
  const selected = visible.find(c => c.id === selectedId) || null

  /* Arrow keys move the selection through the visible list. */
  const handleListKeyDown = useCallback((e) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const idx = visible.findIndex(c => c.id === selectedId)
    const next = e.key === 'ArrowDown' ? Math.min(visible.length - 1, idx + 1) : Math.max(0, idx - 1)
    if (visible[next]) onSelect(visible[next].id)
  }, [visible, selectedId, onSelect])

  return (
    <section>
      <SectionHeading
        title="Held for review"
        subtitle="A hold is arbitr working — every one has a named reason and a named reviewer."
        actions={mode !== 'day0' ? (
          <div role="group" aria-label="Queue filter" className="inline-flex items-center rounded-lg border border-rule overflow-hidden bg-white">
            {FILTER_OPTIONS.map(o => {
              const active = (filter ?? null) === o.id || (o.id === null && filter === 'flagged')
              return (
                <button
                  key={o.label}
                  type="button"
                  onClick={() => onFilterChange(o.id)}
                  aria-pressed={active}
                  className={`px-3 py-1.5 text-[11.5px] font-medium cursor-pointer transition-colors ${active ? 'bg-ocean/[0.08] text-ocean' : 'text-slate hover:bg-pale'}`}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        ) : null}
      />

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
        <Card padding="p-0" className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] h-[540px]">
            {/* Row list — internal scroll, the page never grows */}
            <div
              role="listbox"
              aria-label="Held changes"
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="overflow-y-auto border-b lg:border-b-0 lg:border-r border-rule divide-y divide-rule/60 max-lg:max-h-[240px] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ocean"
            >
              {visible.map(c => (
                <TriageRow key={c.id} change={c} selected={c.id === selectedId} onSelect={onSelect} />
              ))}
            </div>

            {/* Docked detail + decision panel */}
            <div className="min-h-0 flex flex-col">
              {selected && selected.status === 'critical-hold' && (
                <p className="px-5 pt-3 text-[11px] text-error inline-flex items-center gap-1.5 shrink-0">
                  <AlertTriangle className="w-3 h-3" /> Critical hold — blocks publish until decided.
                </p>
              )}
              <div className="flex-1 min-h-0">
                <HoldDetail key={selected?.id || 'none'} change={selected} onDecide={onDecide} />
              </div>
            </div>
          </div>
        </Card>
      )}
    </section>
  )
}
