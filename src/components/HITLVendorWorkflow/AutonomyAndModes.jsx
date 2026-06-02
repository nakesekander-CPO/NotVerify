import { Lock } from 'lucide-react'
import { SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton } from './shared'
import { useGovernance } from '../../context/GovernanceStore'
import { canManageAutonomy } from './governance/capabilities'
import { gateFor, DEFAULT_THRESHOLDS } from './governance/gates'

const MODES = [
  { id: 'autonomous', name: 'Autonomous', desc: 'Content at/above the auto-publish gate ships with no human review.' },
  { id: 'supervised', name: 'Supervised', desc: 'Every publish routes through review, regardless of score.' },
  { id: 'paused', name: 'Paused', desc: 'Nothing ships. All output held pending an explicit resume.' },
]

export default function AutonomyAndModes() {
  const { currentRole, systemMode, setSystemMode, manualOverride, setManualOverride, thresholds, setThresholds, record } = useGovernance()
  const canEdit = canManageAutonomy(currentRole)
  const t = thresholds.project

  const setT = (key, value) => {
    if (!canEdit) return
    const next = { ...t, [key]: Number(value) }
    setThresholds(prev => ({ ...prev, project: next }))
    record({ eventType: 'autonomy.threshold_change', reason: `${key} → ${value}`, beforeValue: t[key], afterValue: Number(value) })
  }

  return (
    <div>
      <SectionHeading title="Autonomy & Modes"
        subtitle="Govern · first-class config. Scope: Project — Q3 Earnings Pack. Inherits org defaults unless overridden." />

      {!canEdit && (
        <div className="mb-4 flex items-center gap-2 bg-pale border border-rule rounded-lg px-3 py-2 text-[12.5px] text-ocean">
          <Lock className="w-4 h-4" /> View-only. Changing thresholds or system mode requires Admin or Compliance. Every change is written to the Audit Log.
        </div>
      )}

      <Card className="mb-4" padding="p-4">
        <MonoLabel>System mode</MonoLabel>
        <div className="grid grid-cols-3 gap-3 mt-3">
          {MODES.map(m => (
            <button key={m.id} type="button" disabled={!canEdit}
              onClick={() => setSystemMode(m.id)}
              className={`text-left rounded-xl p-3 border ${systemMode === m.id ? 'border-teal bg-teal/10' : 'border-rule bg-cream'} ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-90'}`}>
              <span className="flex items-center gap-2 font-bold text-[14px] text-ink">
                <span className={`w-2.5 h-2.5 rounded-full ${systemMode === m.id ? 'bg-teal' : 'bg-mist'}`} /> {m.name}
              </span>
              <span className="block text-[11.5px] text-slate mt-1.5 leading-snug">{m.desc}</span>
            </button>
          ))}
        </div>
        <label className={`mt-3 flex items-center gap-3 rounded-lg border border-dashed border-ocean px-3 py-2.5 ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
          <input type="checkbox" checked={manualOverride} disabled={!canEdit} onChange={e => setManualOverride(e.target.checked)} />
          <span className="text-[12.5px] text-slate"><b className="text-ink">Manual / HITL override</b> — pin this project to human review even in Autonomous mode.</span>
        </label>
      </Card>

      <Card className="mb-4" padding="p-4">
        <MonoLabel>Confidence-score autonomy thresholds</MonoLabel>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <ThresholdInput label="Escalate to senior — below" value={t.escalate} onChange={v => setT('escalate', v)} disabled={!canEdit} />
          <ThresholdInput label="Reviewer required — below" value={t.review} onChange={v => setT('review', v)} disabled={!canEdit} />
        </div>
        <div className="flex gap-2 mt-4 text-[12px]">
          <Band cls="bg-error/10 border-error/30" title={`Below ${t.escalate} → Escalate`} desc="Second-reviewer escalation fires." />
          <Band cls="bg-amber/15 border-amber/30" title={`${t.escalate}–${t.review} → Review`} desc="Assignment forced before publish." />
          <Band cls="bg-teal/10 border-teal/30" title={`${t.review}+ → Auto-publish`} desc="Ships with no human review." />
        </div>
        <p className="text-[11px] text-mist mt-3">Preview: a score of 88 currently sits at <b>{gateFor(88, t)?.label ?? '—'}</b>.</p>
      </Card>

      {canEdit && (
        <div className="flex gap-3">
          <PrimaryButton onClick={() => record({ eventType: 'autonomy.threshold_change', reason: 'Saved autonomy config', afterValue: JSON.stringify(t) })}>Save &amp; record to audit</PrimaryButton>
          <SecondaryButton onClick={() => {
            setThresholds(prev => ({ ...prev, project: { ...DEFAULT_THRESHOLDS } }))
            record({ eventType: 'autonomy.threshold_change', reason: 'Reset thresholds to org defaults', beforeValue: JSON.stringify(t), afterValue: JSON.stringify(DEFAULT_THRESHOLDS) })
          }}>Reset to org defaults</SecondaryButton>
        </div>
      )}
    </div>
  )
}

function ThresholdInput({ label, value, onChange, disabled }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-wide text-mist font-semibold mb-1.5">{label}</span>
      <input type="range" min="0" max="100" value={value} disabled={disabled} onChange={e => onChange(e.target.value)} className="w-full" />
      <span className="text-[13px] font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value}</span>
    </label>
  )
}

function Band({ cls, title, desc }) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 border ${cls}`}>
      <b className="block text-[12.5px] text-ink mb-0.5">{title}</b>
      <span className="text-slate">{desc}</span>
    </div>
  )
}
