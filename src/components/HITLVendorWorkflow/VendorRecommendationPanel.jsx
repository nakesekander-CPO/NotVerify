import { useMemo, useState } from 'react'
import { Sparkles, ChevronRight, Ban, Replace, CheckCircle2 } from 'lucide-react'
import { HITL_PROJECTS, VENDORS, getVendorById } from '../../data/hitlVendorWorkflow'
import { recommendVendors } from '../../services/hitl/selectionEngine'
import { manualOverride, approveAssignment, rejectAssignment } from '../../services/hitl/assignment'
import { SectionHeading, Card, MonoLabel, KeyValueRow, StatusBadge, PrimaryButton, SecondaryButton, ScoreBar } from './shared'

export default function VendorRecommendationPanel({ activeProjectId, currentUserId }) {
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || HITL_PROJECTS[0]
  const [override, setOverride] = useState({ vendorId: '', reason: '' })
  const [status, setStatus] = useState(null)

  const rec = useMemo(() => recommendVendors({ project }), [project.id])

  const handleOverride = () => {
    try {
      manualOverride({ projectId: project.id, vendorId: override.vendorId, actorId: currentUserId, reason: override.reason })
      setStatus({ kind: 'ok', text: `Override recorded. ${getVendorById(override.vendorId)?.name} assigned.` })
      setOverride({ vendorId: '', reason: '' })
    } catch (e) {
      setStatus({ kind: 'err', text: e.message })
    }
  }

  return (
    <div>
      <SectionHeading
        title="Vendor Recommendation"
        subtitle={`Selection engine ran under policy "${rec.policyId}"${rec.poolId ? ` against pool "${rec.poolId}"` : ''}. Hard filters are applied first; then a weighted score ranks eligible candidates.`}
      />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KV label="Policy" value={rec.policyId} mono />
        <KV label="Pool" value={rec.poolId || '—'} mono />
        <KV label="Auto-assign eligible" value={rec.autoAssignAllowed ? 'Yes' : 'No'} />
      </div>

      {rec.recommended ? (
        <Card padding="p-0">
          <div className="px-5 py-4 border-b border-rule">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFBD59]" />
                  <MonoLabel className="!text-ocean">Recommended vendor</MonoLabel>
                </div>
                <p className="mt-1.5 text-[20px] font-semibold text-ink">{rec.recommended.name}</p>
                <p className="text-[12.5px] text-slate mt-1">{rec.recommended.explanation}</p>
              </div>
              <div className="text-right">
                <p className="text-[32px] font-semibold text-[#FFBD59] leading-none" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{(rec.recommended.score * 100).toFixed(0)}%</p>
                <p className="text-[10.5px] text-mist mt-1">match confidence</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5">
              <KV label="Estimated cost" value={`$${rec.recommended.estimatedCost.toLocaleString()}`} mono />
              <KV label="Estimated turnaround" value={`${rec.recommended.estimatedTurnaroundHours}h`} mono />
              <KV label="Risk level" value={rec.recommended.riskLevel} />
            </div>

            <div className="mt-5">
              <MonoLabel>Score breakdown</MonoLabel>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2.5">
                {Object.entries(rec.recommended.breakdown).map(([k, b]) => (
                  <div key={k}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-ink">{k}</span>
                      <span className="text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(b.raw * 100).toFixed(0)}% × {(b.weight * 100).toFixed(0)}%</span>
                    </div>
                    <ScoreBar value={b.contribution * 100} color="ocean" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            {rec.autoAssignAllowed ? (
              <div className="flex items-center gap-2">
                <PrimaryButton>Confirm auto-assignment</PrimaryButton>
                <SecondaryButton>Hold for manual approval</SecondaryButton>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <PrimaryButton>Approve assignment</PrimaryButton>
                <SecondaryButton>Reject (record reason)</SecondaryButton>
              </div>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <p className="text-[14px] text-ink font-semibold">No eligible vendor found.</p>
          <p className="text-[12.5px] text-slate mt-1">All candidates failed at least one hard filter. Review the disqualifications below and adjust the pool / policy / vendor capabilities.</p>
        </Card>
      )}

      {rec.alternatives.length > 0 && (
        <div className="mt-6">
          <MonoLabel>Ranked alternatives</MonoLabel>
          <ul className="mt-3 space-y-2">
            {rec.alternatives.map(a => (
              <li key={a.vendorId} className="bg-white border border-rule rounded-md p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink">{a.name}</p>
                  <p className="text-[11px] text-mist">{a.estimatedTurnaroundHours}h · ${a.estimatedCost.toLocaleString()} · risk {a.riskLevel}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] font-semibold text-ocean" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{(a.score * 100).toFixed(0)}%</span>
                  <ChevronRight className="w-4 h-4 text-mist" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {rec.disqualified.length > 0 && (
        <div className="mt-6">
          <MonoLabel>Disqualified ({rec.disqualified.length})</MonoLabel>
          <ul className="mt-3 space-y-2">
            {rec.disqualified.map(d => (
              <li key={d.vendorId} className="bg-cream border border-rule rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Ban className="w-3.5 h-3.5 text-error" />
                  <p className="text-[13px] font-semibold text-ink">{d.name}</p>
                </div>
                <ul className="mt-1.5 ml-5 list-disc text-[11.5px] text-slate space-y-0.5">
                  {d.reasons.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card className="mt-8">
        <div className="flex items-center gap-2">
          <Replace className="w-4 h-4 text-[#FFBD59]" />
          <p className="text-[14px] font-semibold text-ink">Manual override</p>
        </div>
        <p className="text-[12.5px] text-slate mt-1">Choosing a different vendor requires a written reason. The original recommendation, your override, and the reason are written to the audit log.</p>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Vendor</span>
            <select
              value={override.vendorId}
              onChange={e => setOverride({ ...override, vendorId: e.target.value })}
              className="mt-1 w-full text-[13px] border border-rule rounded px-2 py-1.5 bg-white cursor-pointer"
            >
              <option value="">— Choose —</option>
              {VENDORS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Reason (required)</span>
            <input
              value={override.reason}
              onChange={e => setOverride({ ...override, reason: e.target.value })}
              placeholder="e.g. internal team preferred for confidentiality"
              className="mt-1 w-full text-[13px] border border-rule rounded px-2 py-1.5 bg-white"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <PrimaryButton disabled={!override.vendorId || !override.reason.trim()} onClick={handleOverride}>Apply override</PrimaryButton>
          {status && <span className={`text-[12px] ${status.kind === 'ok' ? 'text-teal' : 'text-error'} flex items-center gap-1.5`}>{status.kind === 'ok' && <CheckCircle2 className="w-3.5 h-3.5" />}{status.text}</span>}
        </div>
      </Card>
    </div>
  )
}

function KV({ label, value, mono }) {
  return (
    <div className="bg-white border border-rule rounded-md p-3">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className={`mt-0.5 text-[14px] text-ink ${mono ? 'font-mono' : ''}`} style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}>{value}</p>
    </div>
  )
}
