/**
 * ConfidenceThresholdEditor — embedded inside SelectionPolicyBuilder.
 * Tenant admins tune auto-publish / flag / escalate thresholds per
 * policy + per-domain override. Writes a `policy.threshold.changed`
 * audit event on save.
 */

import { useState } from 'react'
import { Sliders } from 'lucide-react'
import { appendAuditEvent } from '../../../services/hitl/auditLog'
import { MonoLabel, KeyValueRow, PrimaryButton, SecondaryButton } from '../shared'

const DOMAINS = ['financial', 'regulatory', 'legal', 'marketing', 'cultural']

export default function ConfidenceThresholdEditor({ policy, currentUserId, onSaved }) {
  const initial = policy?.confidenceThresholds || {
    autoPublishAt: 0.95, flagAt: 0.90, escalateAt: 0.75, perDomain: {},
  }
  const [draft, setDraft] = useState(JSON.parse(JSON.stringify(initial)))
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState(null)

  const setVal = (path, value) => {
    setDraft(prev => {
      const next = JSON.parse(JSON.stringify(prev))
      let cur = next
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i]
        if (cur[k] == null) cur[k] = {}
        cur = cur[k]
      }
      cur[path[path.length - 1]] = value
      return next
    })
    setDirty(true)
  }

  const save = () => {
    try {
      const before = JSON.parse(JSON.stringify(policy.confidenceThresholds))
      policy.confidenceThresholds = JSON.parse(JSON.stringify(draft))
      appendAuditEvent({
        actorId: currentUserId, actorRole: 'org-admin',
        eventType: 'policy.threshold.changed',
        beforeValue: before, afterValue: policy.confidenceThresholds,
        reason: `Policy "${policy.id}" thresholds tuned`,
      })
      setDirty(false)
      setStatus({ kind: 'ok', text: 'Thresholds saved · audit event written.' })
      onSaved?.()
    } catch (e) {
      setStatus({ kind: 'err', text: e.message })
    }
  }

  return (
    <div className="mt-5 border-t border-rule pt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-ocean" />
          <MonoLabel>Confidence thresholds · tenant-tunable</MonoLabel>
        </div>
        {dirty && (
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => { setDraft(JSON.parse(JSON.stringify(initial))); setDirty(false) }}>Reset</SecondaryButton>
            <PrimaryButton onClick={save}>Save thresholds</PrimaryButton>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <ThresholdField label="Auto-publish at" value={draft.autoPublishAt} onChange={(v) => setVal(['autoPublishAt'], v)} hint="Above this score, ship without human review." />
        <ThresholdField label="Flag for reviewer at"        value={draft.flagAt}        onChange={(v) => setVal(['flagAt'], v)}        hint="Below this score, reviewer assignment is required." />
        <ThresholdField label="Escalate to senior at"        value={draft.escalateAt}    onChange={(v) => setVal(['escalateAt'], v)}    hint="Below this score, second-reviewer escalation fires." />
      </div>

      <div>
        <p className="text-[10.5px] uppercase tracking-wider text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Per-domain overrides</p>
        <div className="grid grid-cols-2 gap-3">
          {DOMAINS.map(dom => {
            const dom_override = draft.perDomain?.[dom] || {}
            return (
              <div key={dom} className="rounded-md border border-rule bg-white p-3">
                <p className="text-[12px] font-semibold text-ink mb-2 capitalize">{dom}</p>
                <div className="space-y-1.5 text-[11.5px]">
                  <DomainRow label="Flag at"     value={dom_override.flagAt}     fallback={draft.flagAt}     onChange={(v) => setVal(['perDomain', dom, 'flagAt'], v)} />
                  <DomainRow label="Escalate at" value={dom_override.escalateAt} fallback={draft.escalateAt} onChange={(v) => setVal(['perDomain', dom, 'escalateAt'], v)} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {status && (
        <p className={`mt-3 text-[12px] ${status.kind === 'ok' ? 'text-teal' : 'text-error'}`}>{status.text}</p>
      )}
    </div>
  )
}

function ThresholdField({ label, value, onChange, hint }) {
  return (
    <div className="rounded-md border border-rule bg-white p-3">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <div className="flex items-center gap-2 mt-1.5">
        <input
          type="range" min="0.5" max="1" step="0.01"
          value={value} onChange={e => onChange(parseFloat(e.target.value))}
          className="flex-1"
        />
        <span className="font-mono text-[13px] text-ink w-12 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {(value * 100).toFixed(0)}%
        </span>
      </div>
      <p className="text-[10.5px] text-mist mt-1.5">{hint}</p>
    </div>
  )
}

function DomainRow({ label, value, fallback, onChange }) {
  const isOverride = value != null
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate w-20">{label}</span>
      <input
        type="number" min="0.5" max="1" step="0.01"
        value={(value ?? fallback).toFixed(2)}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-16 px-1.5 py-0.5 text-[11.5px] text-right border border-rule rounded font-mono"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      />
      <span className={`text-[10px] uppercase tracking-wider ${isOverride ? 'text-ocean' : 'text-mist'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {isOverride ? 'override' : 'default'}
      </span>
    </div>
  )
}
