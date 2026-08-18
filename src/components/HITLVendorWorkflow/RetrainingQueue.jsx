import { useState } from 'react'
import { GraduationCap, Brain, Check, X, Lock } from 'lucide-react'
import {
  RETRAINING_CANDIDATES, ORG_BRAIN_UPDATES, ERROR_CATEGORIES, REVIEW_DECISIONS,
} from '../../data/hitlVendorWorkflow'
import { USERS } from '../../data/rbacModel'
import { approveRetrainingCandidate, rejectRetrainingCandidate } from '../../services/hitl/retrainingGate'
import { SectionHeading, Card, MonoLabel, StatusBadge, PrimaryButton, SecondaryButton, DangerButton, EmptyState } from './shared'

export default function RetrainingQueue({ currentUserId }) {
  const [filter, setFilter] = useState('pending')
  const [error, setError] = useState(null)
  const [, force] = useState(0)
  const refresh = () => { setError(null); force(n => n + 1) }

  const list = RETRAINING_CANDIDATES.filter(c => filter === 'all' || c.status === filter)

  const approve = (id, target) => {
    try { approveRetrainingCandidate({ candidateId: id, actorId: currentUserId, target }); refresh() }
    catch (e) { setError(e.message) }
  }
  const reject = (id) => {
    const reason = window.prompt('Reason for rejecting this candidate?')
    if (!reason) return
    try { rejectRetrainingCandidate({ candidateId: id, actorId: currentUserId, reason }); refresh() }
    catch (e) { setError(e.message) }
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 text-[12px] text-error bg-error/10 border border-error/30 rounded-lg px-3 py-2">{error}</p>
      )}
      <SectionHeading
        title="Reuse Queue · three governed pipelines"
        subtitle="Only signed-off rulings enter this queue. An authorised approver must approve each candidate before it flows into a pipeline: Translation Memory (TM), terminology dataset, or model improvement (RLHF). RLHF additionally requires a rationale tag. Rejected rulings never enter any pipeline."
      />

      <div className="flex items-center gap-2 mb-4">
        {['pending', 'approved', 'rejected', 'used', 'all'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-md border text-[12.5px] cursor-pointer transition-colors ${filter === s ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-slate hover:border-ocean/30'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title="No candidates in this state."
          description="Sign off a project from Final Sign-Off to generate candidates. Untagged commits never appear here — only adjudications with at least one Rationale Chip are training-eligible."
          icon={GraduationCap}
        />
      ) : (
        <ul className="space-y-4">
          {list.map(c => {
            const latestDecision = [...REVIEW_DECISIONS].reverse().find(d => d.segmentId === c.segmentId)
            const contributor = latestDecision ? USERS.find(u => u.id === latestDecision.actorId) : null
            return (
            <li key={c.id}>
              <Card padding="p-0">
                <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 text-[#FFBD59]" />
                    <p className="text-[13px] font-semibold text-ink">{c.id}</p>
                    <StatusBadge status={c.status} />
                    {c.eligibleTM && <span className="text-[10.5px] text-teal bg-teal/10 px-2 py-0.5 rounded-full">TM eligible</span>}
                    {c.eligibleTerminology && <span className="text-[10.5px] text-ocean bg-ocean/10 px-2 py-0.5 rounded-full">Terminology eligible</span>}
                    {c.eligibleModel && <span className="text-[10.5px] text-[#996800] bg-[#FFF7E6] px-2 py-0.5 rounded-full">Model (RLHF) eligible</span>}
                  </div>
                  <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.domain} · {c.language} · {c.errorCategory}</span>
                </div>

                {/* Contributor footprint strip */}
                {contributor && (
                  <div className="px-5 py-2 border-b border-rule bg-cream/50 flex items-center justify-between gap-3 text-[11.5px]">
                    <span className="text-slate inline-flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-ocean text-white text-[10px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{contributor.initials}</span>
                      Adjudicated by <strong className="text-ink">{contributor.name}</strong>
                      {latestDecision?.actorRole && <span className="text-mist">({latestDecision.actorRole})</span>}
                    </span>
                    {latestDecision?.rationaleTags?.length > 0 && (
                      <span className="flex items-center gap-1">
                        {latestDecision.rationaleTags.map(t => (
                          <span key={t} className="px-1.5 py-0.5 rounded-full bg-ocean/10 text-ocean text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t}</span>
                        ))}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-0 divide-x divide-rule">
                  <Column title="Original agent output" body={c.originalAgentOutput} />
                  <Column title="Vendor edit" body={c.vendorEdit} />
                  <Column title="Human final" body={c.humanFinalEdit} highlight />
                </div>

                <div className="px-5 py-3 border-t border-rule flex items-center justify-between">
                  <div className="text-[12px] text-slate flex items-center gap-3">
                    <span>Sign-off <span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.signoffRecordId}</span></span>
                    <span>Project <span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.projectId}</span></span>
                  </div>
                  {c.status === 'pending' && (
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <SecondaryButton onClick={() => approve(c.id, 'tm')} disabled={!c.eligibleTM}><Brain className="w-3.5 h-3.5" /> → TM</SecondaryButton>
                      <SecondaryButton onClick={() => approve(c.id, 'terminology')} disabled={!c.eligibleTerminology}><Brain className="w-3.5 h-3.5" /> → Terminology</SecondaryButton>
                      <SecondaryButton onClick={() => approve(c.id, 'model')} disabled={!c.eligibleModel}><Brain className="w-3.5 h-3.5" /> → Model (RLHF)</SecondaryButton>
                      <PrimaryButton onClick={() => approve(c.id, 'all')} disabled={!(c.eligibleTM && c.eligibleTerminology && c.eligibleModel)}><Check className="w-3.5 h-3.5" /> Approve → all</PrimaryButton>
                      <DangerButton onClick={() => reject(c.id)}><X className="w-3.5 h-3.5" /> Reject</DangerButton>
                    </div>
                  )}
                  {c.status !== 'pending' && (
                    <div className="flex items-center gap-2 text-[12px] text-slate"><Lock className="w-3.5 h-3.5 text-mist" /> Decision locked</div>
                  )}
                </div>
              </Card>
            </li>
            )
          })}
        </ul>
      )}

      <div className="mt-8">
        <MonoLabel>TM & terminology updates produced ({ORG_BRAIN_UPDATES.length})</MonoLabel>
        {ORG_BRAIN_UPDATES.length === 0 && <p className="text-[12.5px] text-mist mt-2">No reuse updates yet — approve a candidate (TM or terminology) to record provenance.</p>}
        <ul className="mt-2 space-y-1.5">
          {ORG_BRAIN_UPDATES.slice(-5).reverse().map(o => (
            <li key={o.id} className="text-[12.5px] bg-pale rounded p-2.5 flex items-center justify-between">
              <span><Brain className="inline w-3.5 h-3.5 mr-1.5 text-ocean" />{o.approvedFragment.slice(0, 80)}…</span>
              <span className="text-mist text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.domain} · {o.language}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Column({ title, body, highlight }) {
  return (
    <div className={`p-4 ${highlight ? 'bg-teal/5' : ''}`}>
      <MonoLabel>{title}</MonoLabel>
      <p className="mt-1.5 text-[12.5px] text-ink leading-relaxed">{body}</p>
    </div>
  )
}
