import { useMemo, useState } from 'react'
import { BadgeCheck, FileCheck2, AlertTriangle } from 'lucide-react'
import { HITL_PROJECTS, HITL_SEGMENTS, SIGNOFF_RECORDS } from '../../data/hitlVendorWorkflow'
import { signOff, buildValidationReport } from '../../services/hitl/signOff'
import { queueRetrainingCandidates } from '../../services/hitl/retrainingGate'
import { documentPedigree } from '../../services/hitl/pedigree'
import { DocumentPedigreeCard } from './PedigreeCard'
import { SectionHeading, Card, MonoLabel, StatusBadge, PrimaryButton, SecondaryButton, KeyValueRow, ScoreBar } from './shared'
import { EmptyStateStat, RiskMitigationSummary } from './cockpit'

export default function FinalSignOff({ activeProjectId, currentUserId, navigate }) {
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || HITL_PROJECTS[0]
  const segments = HITL_SEGMENTS.filter(s => s.projectId === project.id)
  const signOffs = SIGNOFF_RECORDS.filter(r => r.projectId === project.id)
  const [statement, setStatement] = useState('')
  const [canPublish, setCanPublish] = useState(true)
  const [feedOrgBrain, setFeedOrgBrain] = useState(true)
  const [feedRetraining, setFeedRetraining] = useState(true)
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
        feedOrgBrain,
        feedRetraining,
      })
      // Queue retraining candidates right after sign-off if allowed.
      let queued = []
      try { queued = queueRetrainingCandidates({ projectId: project.id, actorId: currentUserId }) } catch {}
      setStatus({ kind: 'ok', text: `Signed off. Record ${rec.id} created. ${queued.length} retraining candidates queued.` })
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
        subtitle="The validator compares source, agent panel, validator rulings, and the final document. Sign-off produces an immutable record, locks the project's segments, and (if approved) queues training-eligible corrections for Org Brain and retraining."
      />

      {/* Document-level Pedigree Card — the wax seal */}
      <div className="mb-6">
        <DocumentPedigreeCard pedigree={pedigree} />
      </div>

      {/* Risk mitigation summary — what arbitr caught */}
      <RiskMitigationSummary projectId={project.id} />

      <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
        <EmptyStateStat
          label="Validation"
          status={!report || segments.length === 0 ? 'not-started' : (report.openIssues.length === 0 ? 'passed' : (report.validationScore >= 90 ? 'in-progress' : 'failed'))}
          value={report && segments.length > 0 ? `${report.validationScore}%` : null}
          detail={report && segments.length > 0 ? `${report.counts.verified} of ${report.counts.total} segments verified` : undefined}
        />
        <EmptyStateStat
          label="Quality score"
          status={!report || segments.length === 0 ? 'not-started' : (report.qualityScore >= 90 ? 'passed' : 'in-progress')}
          value={report && segments.length > 0 ? `${report.qualityScore}%` : null}
          detail={report && segments.length > 0 ? 'Composite of accepted agent confidence' : undefined}
        />
        <EmptyStateStat
          label="Open issues"
          status={!report || segments.length === 0 ? 'not-started' : (report.openIssues.length === 0 ? 'passed' : 'failed')}
          value={report && segments.length > 0 ? report.openIssues.length : null}
          detail={report && segments.length > 0 ? (report.openIssues.length === 0 ? 'No open issues detected after review' : 'Awaiting resolution') : 'No issues assessed yet'}
        />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Segment summary</p>
          </div>
          <ul className="px-5 py-3 text-[12.5px] space-y-2">
            <Row label="Verified" value={report?.counts.verified ?? 0} tone="teal" />
            <Row label="Edited (kept)" value={segments.filter(s => s.decision === 'edited').length} tone="ocean" />
            <Row label="Not verified" value={report?.counts.notVerified ?? 0} tone="error" />
            <Row label="Needs rework" value={report?.counts.needsRework ?? 0} tone="amber" />
            <Row label="Escalated" value={report?.counts.escalated ?? 0} tone="amber" />
          </ul>
          {report && (
            <div className="px-5 py-3 border-t border-rule">
              <MonoLabel>Open issues</MonoLabel>
              {report.openIssues.length === 0 ? (
                <p className="text-[12px] text-teal mt-2">All segments resolved.</p>
              ) : (
                <ul className="mt-2 text-[12px] space-y-1.5">
                  {report.openIssues.map((o, i) => (
                    <li key={i} className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-amber" /><span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.segmentId}</span><span className="text-slate">{o.decision}</span></li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>

        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 text-amber" />
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
              <label className="flex items-center gap-2"><input type="checkbox" checked={feedOrgBrain} onChange={e => setFeedOrgBrain(e.target.checked)} disabled={!project.requirements.orgBrainAllowed} /> Feed approved corrections to Org Brain {project.requirements.orgBrainAllowed ? '' : '(policy: disallowed)'}</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={feedRetraining} onChange={e => setFeedRetraining(e.target.checked)} disabled={!project.requirements.retrainingAllowed} /> Queue approved corrections for retraining {project.requirements.retrainingAllowed ? '' : '(policy: disallowed)'}</label>
            </div>
            <div className="border-t border-rule pt-3">
              <MonoLabel>Required role</MonoLabel>
              <p className="text-[12.5px] text-ink mt-1">{project.requirements.requiredSignoffRole}</p>
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
              <div className="mt-2 grid grid-cols-4 gap-3 text-[11.5px]">
                <span>Validation <strong className="text-ink">{r.validationScore}%</strong></span>
                <span>Quality <strong className="text-ink">{r.qualityScore}%</strong></span>
                <span>Org Brain <strong className={r.feedOrgBrain ? 'text-teal' : 'text-mist'}>{r.feedOrgBrain ? 'on' : 'off'}</strong></span>
                <span>Retraining <strong className={r.feedRetraining ? 'text-teal' : 'text-mist'}>{r.feedRetraining ? 'on' : 'off'}</strong></span>
              </div>
              <p className="text-[10.5px] text-mist mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.actorId} · {r.actorRole} · {new Date(r.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Row({ label, value, tone }) {
  const palette = { teal: 'text-teal', ocean: 'text-ocean', error: 'text-error', amber: 'text-amber-deep', mist: 'text-mist' }
  return (
    <li className="flex items-center justify-between">
      <span className="text-ink">{label}</span>
      <span className={`font-semibold ${palette[tone] || 'text-ink'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</span>
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
