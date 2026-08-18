import { useMemo, useState } from 'react'
import { BadgeCheck, FileCheck2, AlertTriangle, ArrowRight } from 'lucide-react'
import { HITL_PROJECTS, HITL_SEGMENTS, SIGNOFF_RECORDS } from '../../data/hitlVendorWorkflow'
import { signOff, buildValidationReport } from '../../services/hitl/signOff'
import { queueRetrainingCandidates } from '../../services/hitl/retrainingGate'
import { documentPedigree } from '../../services/hitl/pedigree'
import { DocumentPedigreeCard } from './PedigreeCard'
import { SectionHeading, Card, MonoLabel, StatusBadge, PrimaryButton, SecondaryButton, KeyValueRow, ScoreBar } from './shared'
import { EmptyStateStat, RiskMitigationSummary } from './cockpit'

export default function FinalSignOff({ activeProjectId, currentUserId, navigate, setReviewFocus }) {
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || HITL_PROJECTS[0]
  const segments = HITL_SEGMENTS.filter(s => s.projectId === project.id)

  /* Jump to the review workspace focused on a specific segment.
   * Prefers the first still-open (pending) match so the reviewer
   * lands on something to correct; falls back to the first match. */
  const isOpen = (s) => !s.decision || s.decision === 'pending'
  const focusSegment = (predicate) => {
    if (segments.length === 0) return
    const target = segments.find(s => predicate(s) && isOpen(s)) || segments.find(predicate)
    if (!target) return
    setReviewFocus?.({ segmentId: target.id })
    navigate('workspace')
  }
  const decisionMatchers = {
    confirmed: s => s.decision === 'confirmed',
    edited:    s => s.decision === 'edited',
    locked:    s => s.decision === 'locked' || (s.locked && s.lockReason === 'ice-match'),
    open:      s => !s.decision || s.decision === 'pending',
  }
  const signOffs = SIGNOFF_RECORDS.filter(r => r.projectId === project.id)
  const [statement, setStatement] = useState('')
  const [canPublish, setCanPublish] = useState(true)
  // Three independent reuse pipelines (each opt-in per project policy).
  const [feedTM, setFeedTM] = useState(true)
  const [feedTerminology, setFeedTerminology] = useState(true)
  const [feedModel, setFeedModel] = useState(true)
  const [status, setStatus] = useState(null)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  const report = useMemo(() => {
    try { return buildValidationReport({ projectId: project.id, actorId: currentUserId }) } catch { return null }
  }, [project.id, currentUserId, signOffs.length])

  const handleSign = () => {
    try {
      const rec = signOff({
        projectId: project.id,
        actorId: currentUserId,
        statement: statement || `Signed off by ${currentUserId}.`,
        canPublish,
        feedTM,
        feedTerminology,
        feedModel,
      })
      // Queue reuse candidates right after sign-off if allowed.
      let queued = []
      try { queued = queueRetrainingCandidates({ projectId: project.id, actorId: currentUserId }) } catch {}
      setStatus({ kind: 'ok', text: `Signed off. Record ${rec.id} created. ${queued.length} reuse candidates queued.` })
      refresh()
    } catch (e) {
      setStatus({ kind: 'err', text: e.message })
    }
  }

  const pedigree = documentPedigree(project.id)

  return (
    <div>
      <SectionHeading
        title="Final Sign-Off"
        subtitle="Sign-off is a client-side action (the client reviewer, or the last-touch vendor if delegated). It produces an immutable record, locks the job's segments, and — only where the client allowed it — queues approved corrections into the three reuse pipelines: Translation Memory, terminology dataset, and model improvement (RLHF)."
      />

      {/* Document-level Pedigree Card — the wax seal */}
      <div className="mb-6">
        <DocumentPedigreeCard pedigree={pedigree} />
      </div>

      {/* Risk mitigation summary — what arbitr caught (each line jumps
          into the workspace at the first matching / open segment). */}
      <RiskMitigationSummary
        projectId={project.id}
        onPick={(key) => focusSegment(s => (s.flagCategories || []).includes(key))}
      />

      <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
        <EmptyStateStat
          label="Validation"
          status={!report || segments.length === 0 ? 'not-started' : (report.openIssues.length === 0 ? 'passed' : (report.validationScore >= 90 ? 'in-progress' : 'failed'))}
          value={report && segments.length > 0 ? `${report.validationScore}%` : null}
          detail={report && segments.length > 0 ? `${report.counts.done} of ${report.counts.total} segments done` : undefined}
          actionHint="First open"
          onClick={segments.length ? () => focusSegment(decisionMatchers.open) : undefined}
        />
        <EmptyStateStat
          label="Quality score"
          status={!report || segments.length === 0 ? 'not-started' : (report.qualityScore >= 90 ? 'passed' : 'in-progress')}
          value={report && segments.length > 0 ? `${report.qualityScore}%` : null}
          detail={report && segments.length > 0 ? 'Composite of accepted agent confidence' : undefined}
          actionHint="Open workspace"
          onClick={segments.length ? () => focusSegment(() => true) : undefined}
        />
        <EmptyStateStat
          label="Open issues"
          status={!report || segments.length === 0 ? 'not-started' : (report.openIssues.length === 0 ? 'passed' : 'failed')}
          value={report && segments.length > 0 ? report.openIssues.length : null}
          detail={report && segments.length > 0 ? (report.openIssues.length === 0 ? 'No open issues detected after review' : 'Awaiting resolution') : 'No issues assessed yet'}
          actionHint="First open"
          onClick={report?.openIssues?.length ? () => {
            const firstOpen = report.openIssues[0]
            if (firstOpen?.segmentId) { setReviewFocus?.({ segmentId: firstOpen.segmentId }); navigate('workspace') }
            else focusSegment(isOpen)
          } : undefined}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Segment summary</p>
          </div>
          <ul className="px-5 py-3 text-[12.5px] space-y-1">
            <Row label="Confirmed" value={segments.filter(decisionMatchers.confirmed).length} tone="teal" onJump={() => focusSegment(decisionMatchers.confirmed)} />
            <Row label="Edited" value={segments.filter(decisionMatchers.edited).length} tone="ocean" onJump={() => focusSegment(decisionMatchers.edited)} />
            <Row label="Locked (101% match)" value={segments.filter(decisionMatchers.locked).length} tone="slate" onJump={() => focusSegment(decisionMatchers.locked)} />
            <Row label="Open" value={report?.counts.open ?? segments.filter(decisionMatchers.open).length} tone="amber" onJump={() => focusSegment(decisionMatchers.open)} />
          </ul>
          {report && (
            <div className="px-5 py-3 border-t border-rule">
              <MonoLabel>Open issues</MonoLabel>
              {report.openIssues.length === 0 ? (
                <p className="text-[12px] text-teal mt-2">All segments resolved.</p>
              ) : (
                <ul className="mt-2 text-[12px] space-y-0.5">
                  {report.openIssues.map((o, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => { if (o.segmentId) { setReviewFocus?.({ segmentId: o.segmentId }); navigate('workspace') } }}
                        title={`Open ${o.segmentId} in the review workspace`}
                        className="group w-full flex items-center gap-2 rounded-md px-2 py-1 -mx-2 cursor-pointer hover:bg-pale/70 focus:outline-none focus:ring-2 focus:ring-ocean/30 transition-colors"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-[#FFBD59] shrink-0" />
                        <span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.segmentId}</span>
                        <span className="text-slate">{o.decision}</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-ocean opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          Resolve <ArrowRight className="w-3 h-3" />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-[#FFBD59]" />
            <p className="text-[13px] font-semibold text-ink">Sign-off controls</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div>
              <MonoLabel>Sign-off statement</MonoLabel>
              <textarea
                rows={3}
                value={statement}
                onChange={e => setStatement(e.target.value)}
                placeholder="e.g. Reviewed against J-GAAP glossary v2.4; quality 93%; cleared for publication."
                className="mt-2 w-full text-[13px] border border-rule rounded-md p-2"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 text-[12.5px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={canPublish} onChange={e => setCanPublish(e.target.checked)} /> Approve for publish</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={feedTM} onChange={e => setFeedTM(e.target.checked)} disabled={!project.requirements.tmAllowed} /> Update Translation Memory (TM) {project.requirements.tmAllowed ? '' : '(policy: disallowed)'}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={feedTerminology} onChange={e => setFeedTerminology(e.target.checked)} disabled={!project.requirements.terminologyAllowed} /> Add approved terms to terminology dataset {project.requirements.terminologyAllowed ? '' : '(policy: disallowed)'}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={feedModel} onChange={e => setFeedModel(e.target.checked)} disabled={!project.requirements.modelImprovementAllowed} /> Use edits for model improvement · RLHF {project.requirements.modelImprovementAllowed ? '' : '(policy: disallowed)'}</label>
            </div>
            <div className="border-t border-rule pt-3">
              <MonoLabel>Who signs off</MonoLabel>
              <p className="text-[12.5px] text-ink mt-1">Client-side: the client reviewer, or the last-touch vendor if the client delegated it.</p>
            </div>
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={handleSign}>Sign off & lock</PrimaryButton>
              <SecondaryButton onClick={() => navigate('workspace')}>Back to workspace</SecondaryButton>
            </div>
            {status && <p className={`text-[12.5px] mt-2 ${status.kind === 'ok' ? 'text-teal' : 'text-error'}`}>{status.text}</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <MonoLabel>Sign-off history</MonoLabel>
        {signOffs.length === 0 && <p className="text-[12.5px] text-mist mt-2">No sign-off records yet.</p>}
        <ul className="mt-3 space-y-2">
          {signOffs.map(r => (
            <li key={r.id} className="bg-white border border-rule rounded-md p-4">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-ink">{r.id} · {r.version}</p>
                <StatusBadge status="signed-off" />
              </div>
              <p className="text-[12px] text-slate mt-1">{r.statement}</p>
              <div className="mt-2 grid grid-cols-5 gap-3 text-[11.5px]">
                <span>Validation <strong className="text-ink">{r.validationScore}%</strong></span>
                <span>Quality <strong className="text-ink">{r.qualityScore}%</strong></span>
                <span>TM <strong className={r.feedTM ? 'text-teal' : 'text-mist'}>{r.feedTM ? 'on' : 'off'}</strong></span>
                <span>Terminology <strong className={r.feedTerminology ? 'text-teal' : 'text-mist'}>{r.feedTerminology ? 'on' : 'off'}</strong></span>
                <span>Model <strong className={r.feedModel ? 'text-teal' : 'text-mist'}>{r.feedModel ? 'on' : 'off'}</strong></span>
              </div>
              <p className="text-[10.5px] text-mist mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.actorId} · {r.actorRole} · {new Date(r.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Row({ label, value, tone, onJump }) {
  const palette = { teal: 'text-teal', ocean: 'text-ocean', error: 'text-error', amber: 'text-[#996800]', slate: 'text-slate', mist: 'text-mist' }
  const clickable = typeof onJump === 'function' && value > 0
  return (
    <li>
      <button
        type="button"
        onClick={clickable ? onJump : undefined}
        disabled={!clickable}
        title={clickable ? `Jump to the first “${label}” segment` : `No ${label.toLowerCase()} segments`}
        className={`group w-full flex items-center justify-between rounded-md px-2 py-1 -mx-2 transition-colors ${
          clickable ? 'cursor-pointer hover:bg-pale/70 focus:outline-none focus:ring-2 focus:ring-ocean/30' : 'cursor-default'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 text-ink">
          {label}
          {clickable && (
            <ArrowRight className="w-3 h-3 text-ocean opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </span>
        <span className={`font-semibold ${palette[tone] || 'text-ink'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</span>
      </button>
    </li>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-rule rounded-md p-3">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className="text-[24px] font-semibold text-ink mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </div>
  )
}
