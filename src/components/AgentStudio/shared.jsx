/**
 * Agent Studio shared UI.
 *
 * Re-exports the existing arbitr design-system primitives (from the HITL
 * workspace) so screens import everything from one place, and adds the
 * Agent-Studio-specific badges: agent lifecycle status, output/run status,
 * confidence, and credit usage. Keeps the module native to arbitr rather than
 * introducing a parallel design language.
 */

import { Check, Clock, AlertTriangle, Lock, ShieldAlert, XCircle, Coins } from 'lucide-react'
import { OUTPUT_STATUS_LABEL } from '../../data/agentStudio'

export {
  MonoLabel, SectionHeading, Card, StatusBadge, PrimaryButton,
  SecondaryButton, DangerButton, KeyValueRow, ScoreBar, EmptyState,
} from '../HITLVendorWorkflow/shared'

/* ─── Agent lifecycle status ───────────────────────────────────── */

const AGENT_TONE = {
  active: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check, label: 'Active' },
  draft: { bg: 'bg-rule/50', text: 'text-slate', border: 'border-rule-strong', icon: Clock, label: 'Draft' },
  paused: { bg: 'bg-[#FFF7E6]', text: 'text-[#996800]', border: 'border-[#FFB000]/40', icon: Clock, label: 'Paused' },
  archived: { bg: 'bg-rule', text: 'text-mist', border: 'border-rule-strong', icon: Lock, label: 'Archived' },
}

export function AgentStatusBadge({ status }) {
  const t = AGENT_TONE[status] || AGENT_TONE.draft
  const Icon = t.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${t.bg} ${t.text} ${t.border} text-[11px] font-medium`}>
      <Icon className="w-3 h-3" /> {t.label}
    </span>
  )
}

/* ─── Output / run status (the trust-first states) ─────────────── */

const OUTPUT_TONE = {
  verified: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  need_review: { bg: 'bg-[#FFF7E6]', text: 'text-[#996800]', border: 'border-[#FFB000]/40', icon: AlertTriangle },
  not_verified: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30', icon: XCircle },
  blocked: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/40', icon: ShieldAlert },
  requires_approval: { bg: 'bg-[#FFF7E6]', text: 'text-[#996800]', border: 'border-[#FFB000]/40', icon: Lock },
  draft: { bg: 'bg-rule/50', text: 'text-slate', border: 'border-rule-strong', icon: Clock },
}

export function OutputStatusBadge({ status }) {
  const t = OUTPUT_TONE[status] || OUTPUT_TONE.draft
  const Icon = t.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${t.bg} ${t.text} ${t.border} text-[11px] font-medium`}>
      <Icon className="w-3 h-3" /> {OUTPUT_STATUS_LABEL[status] || status}
    </span>
  )
}

/* ─── Confidence ───────────────────────────────────────────────── */

export function ConfidenceBadge({ value, size = 'sm' }) {
  if (value == null) return <span className="text-[11px] text-mist">—</span>
  const tone = value >= 85 ? 'text-teal' : value >= 70 ? 'text-[#996800]' : 'text-error'
  const dot = value >= 85 ? 'bg-teal' : value >= 70 ? 'bg-amber' : 'bg-error'
  const pad = size === 'lg' ? 'text-[13px] px-2.5 py-1' : 'text-[11px] px-2 py-0.5'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-rule bg-white ${tone} ${pad} font-medium`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${dot}`} />
      {Math.round(value)}% confidence
    </span>
  )
}

/* ─── Credit usage ─────────────────────────────────────────────── */

export function CreditUsageBadge({ value, kind = 'Intelligence' }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-slate" title={`${kind} Credits`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <Coins className="w-3 h-3 text-[#996800]" />
      {(value ?? 0).toLocaleString()}
    </span>
  )
}
