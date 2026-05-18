/**
 * EmptyStateStat — replaces every raw `0` / `0%` metric in the cockpit
 * with one of six explicit states. The visual treatment is distinct
 * per state so a glance is never ambiguous.
 *
 *   not-started  – grey badge       "Not started"
 *   in-progress  – ocean badge      "In progress · N of M"
 *   passed       – teal check       "Passed · 0 open issues"
 *   failed       – red cross        "Failed · N open issues"
 *   blocked      – amber pause      "Blocked · awaiting [reason]"
 *   n/a          – diagonal hatch   "Not applicable"
 *
 * If `value` and `label` are passed and status is none of the above,
 * the component falls back to the legacy <Stat /> visual.
 */

import { Check, X, Pause, Slash, Clock, Minus, ArrowRight } from 'lucide-react'

const STATES = {
  'not-started': { bg: 'bg-rule',       border: 'border-rule-strong', text: 'text-mist',       icon: Clock, copy: 'Not started' },
  'in-progress': { bg: 'bg-pale',       border: 'border-ocean/30',    text: 'text-ocean',      icon: Clock, copy: 'In progress' },
  passed:        { bg: 'bg-teal/10',    border: 'border-teal/30',     text: 'text-teal',       icon: Check, copy: 'Passed' },
  failed:        { bg: 'bg-error/10',   border: 'border-error/30',    text: 'text-error',      icon: X,     copy: 'Failed' },
  blocked:       { bg: 'bg-amber/15',   border: 'border-amber/30',    text: 'text-amber-deep', icon: Pause, copy: 'Blocked' },
  'n/a':         { bg: 'bg-rule/50',    border: 'border-rule',        text: 'text-mist',       icon: Slash, copy: 'Not applicable' },
}

export default function EmptyStateStat({ label, status = 'not-started', value, detail, onClick, actionHint }) {
  const s = STATES[status] || STATES['not-started']
  const Icon = s.icon
  const interactive = typeof onClick === 'function'
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
        {interactive && (
          <span className="inline-flex items-center gap-1 text-[10px] text-ocean opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {actionHint || 'Open'} <ArrowRight className="w-3 h-3" />
          </span>
        )}
      </div>
      {value != null ? (
        <p className="text-[22px] font-semibold text-ink mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      ) : (
        <p className={`text-[14px] font-semibold ${s.text} mt-1 inline-flex items-center gap-1.5`}>
          <Icon className="w-3.5 h-3.5" /> {s.copy}
        </p>
      )}
      {detail && <p className="text-[11px] text-slate mt-1">{detail}</p>}
    </>
  )
  if (interactive) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group text-left w-full rounded-md p-3 border ${s.bg} ${s.border} cursor-pointer transition-shadow hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-ocean/30`}
      >
        {body}
      </button>
    )
  }
  return (
    <div className={`rounded-md p-3 border ${s.bg} ${s.border}`}>
      {body}
    </div>
  )
}
