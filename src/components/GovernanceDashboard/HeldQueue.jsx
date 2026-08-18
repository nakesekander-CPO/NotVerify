/**
 * Governance dashboard — the held-changes queue (the anchor).
 *
 * Every hold is the product working: a rule caught something, the change
 * was held with a named reason (before → after, source cited), and a named
 * reviewer owns it. Cleared rows render dimmed underneath — proof the loop
 * closes. No per-row action in v1 (a dedicated review screen is v2);
 * the rows carry the whole story inline.
 */

import { ShieldCheck } from 'lucide-react'
import { Card, MonoLabel, SectionHeading, StatusBadge, EmptyState } from '../HITLVendorWorkflow/shared'

const STATUS_RENDER = {
  'critical-hold': { badge: 'needs-rework', label: 'Critical hold' },
  held: { badge: 'awaiting-approval', label: 'Held' },
  cleared: { badge: 'approved', label: 'Cleared' },
}

function HeldRow({ change }) {
  const s = STATUS_RENDER[change.status]
  const cleared = change.status === 'cleared'
  return (
    <Card padding="p-4" className={cleared ? 'opacity-55' : ''}>
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
            {change.reason.source} · {cleared ? change.heldFor : `held ${change.heldFor}`}
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
    </Card>
  )
}

export default function HeldQueue({ heldChanges, mode }) {
  const open = heldChanges.filter(c => c.status !== 'cleared')
  const cleared = heldChanges.filter(c => c.status === 'cleared')

  return (
    <section>
      <SectionHeading
        title="Held for review"
        subtitle="A hold is arbitr working — every one has a named reason and a named reviewer."
      />
      {mode === 'day0' ? (
        <Card padding="p-8">
          <EmptyState
            icon={ShieldCheck}
            title="Nothing held yet"
            description="When a check catches something — a forbidden term, an unhedged claim, a policy conflict — the change is held here with a named reason and a named reviewer, before it can publish. Drop a document in “Check a document” to run your first check."
          />
        </Card>
      ) : (
        <div className="space-y-2.5">
          {open.map(c => <HeldRow key={c.id} change={c} />)}
          {cleared.length > 0 && (
            <>
              <MonoLabel className="block pt-2">Recently cleared</MonoLabel>
              {cleared.map(c => <HeldRow key={c.id} change={c} />)}
            </>
          )}
        </div>
      )}
    </section>
  )
}
