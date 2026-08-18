/**
 * Governance dashboard — the hold detail panel.
 *
 * The row carries the headline; this carries the record a reviewer needs
 * before deciding: what the rule is, what it caught, which source it cites,
 * who owns it, and what was decided. Approving publishes the change;
 * rejecting sends it back and requires a reason, because an unexplained
 * rejection is exactly the gap an audit picks apart.
 */

import { useState } from 'react'
import { Check, Undo2, FileText } from 'lucide-react'
import Drawer from '../Drawer'
import {
  MonoLabel, KeyValueRow, StatusBadge, PrimaryButton, DangerButton,
} from '../HITLVendorWorkflow/shared'
import { isOpen } from '../../data/governanceDashboard'

const STATUS_RENDER = {
  'critical-hold': { badge: 'needs-rework', label: 'Critical hold' },
  held: { badge: 'awaiting-approval', label: 'Held' },
  cleared: { badge: 'approved', label: 'Cleared' },
  rejected: { badge: 'needs-rework', label: 'Sent back' },
}

export default function HoldDetailDrawer({ change, initialReject = false, onClose, onDecide }) {
  /* Opening straight from a row's "Send back" lands on the reason form.
     The parent remounts this component per hold (via key), so the form
     resets itself — no state-syncing effect needed. */
  const [rejecting, setRejecting] = useState(initialReject)
  const [reason, setReason] = useState('')

  if (!change) return null

  const s = STATUS_RENDER[change.status] || STATUS_RENDER.held
  const open = isOpen(change)

  return (
    <Drawer isOpen={Boolean(change)} onClose={onClose} title="Held change" width="lg">
      <div className="space-y-5">
        {/* Identity */}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {change.ruleId}
            </span>
            <StatusBadge status={s.badge}>{s.label}</StatusBadge>
          </div>
          <h3 className="text-[17px] font-bold text-ink mt-1.5">{change.title}</h3>
        </div>

        {/* What the rule caught */}
        <div>
          <MonoLabel className="block mb-2">What the rule caught</MonoLabel>
          <div className="rounded-lg border border-rule bg-pale/50 p-4 space-y-2">
            <p className="text-[13px] font-medium text-ink">{change.reason.label}</p>
            <p className="text-[12.5px]">
              <span className="line-through decoration-error/60 text-error/80">{change.reason.before}</span>
            </p>
            <p className="text-[12.5px] text-teal font-medium">{change.reason.after}</p>
          </div>
        </div>

        {/* Provenance */}
        <div>
          <MonoLabel className="block mb-1">Record</MonoLabel>
          <KeyValueRow label="Source rule" value={change.reason.source} />
          <KeyValueRow label="Rule id" value={change.ruleId} mono />
          <KeyValueRow label="Reviewer" value={`${change.reviewer.name} · ${change.reviewer.role}`} />
          <KeyValueRow label="Held for" value={change.heldFor} />
        </div>

        {/* Decision already made */}
        {change.decision && (
          <div className="rounded-lg border border-rule bg-white p-4">
            <MonoLabel className="block mb-1.5">Decision</MonoLabel>
            <p className="text-[13px] font-semibold text-ink">{change.decision.label}</p>
            <p className="text-[11.5px] text-slate mt-0.5">
              by {change.decision.by} · {change.decision.at}
            </p>
            {change.decision.reason && (
              <p className="text-[12px] text-slate mt-2 border-l-2 border-rule-strong pl-2.5">
                “{change.decision.reason}”
              </p>
            )}
          </div>
        )}

        {/* Actions */}
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
          <div className="rounded-lg border border-rule bg-pale/50 p-4 space-y-3">
            <label htmlFor="reject-reason" className="block text-[12.5px] font-semibold text-ink">
              Why is this going back?
            </label>
            <textarea
              id="reject-reason"
              rows={3}
              autoFocus
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. rewrite using the approved hedging language, then resubmit"
              className="w-full rounded-lg border border-rule-strong px-3 py-2 text-[12.5px] text-ink placeholder:text-mist focus:outline-2 focus:outline-offset-0 focus:outline-ocean resize-y"
            />
            <div className="flex items-center gap-2.5">
              <DangerButton
                disabled={!reason.trim()}
                onClick={() => onDecide(change.id, 'rejected', reason)}
              >
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
    </Drawer>
  )
}
