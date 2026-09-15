/**
 * Governed enable — the modal behind "Enable model".
 *
 * Three internal steps: review (pick the approver) → checking (the four
 * policy checks reveal their results) → confirm (the approval line that
 * will be recorded). Only enableModel() in the registry store can flip
 * the status, and it re-runs the same checks as a guard.
 */

import { useEffect, useState } from 'react'
import { Check, Clock, ShieldCheck } from 'lucide-react'
import Modal from '../Modal'
import { useToast } from '../ToastProvider'
import { runEnableChecks, enableModel } from '../../data/modelRegistry'
import { REVIEWERS } from '../../data/governanceDashboard'
import { PrimaryButton, SecondaryButton, KeyValueRow } from './shared'

const APPROVERS = Object.values(REVIEWERS)
const CHECK_REVEAL_MS = 550

export default function ModelEnableModal({ model, isOpen, onClose, onEnabled }) {
  if (!model) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Enable ${model.name}`} size="md">
      {/* The Modal unmounts its children when closed, so the flow's step
          state starts fresh on every open — no reset effect needed. */}
      <EnableFlow model={model} onClose={onClose} onEnabled={onEnabled} />
    </Modal>
  )
}

function EnableFlow({ model, onClose, onEnabled }) {
  const { addToast } = useToast()
  const [step, setStep] = useState('review') // review | checking | confirm
  const [approverName, setApproverName] = useState(APPROVERS[0].name)
  const [revealed, setRevealed] = useState(0)

  const approver = APPROVERS.find(a => a.name === approverName) || APPROVERS[0]
  const checks = runEnableChecks(model)

  // Reveal one policy-check result at a time, then advance.
  useEffect(() => {
    if (step !== 'checking') return
    if (revealed >= checks.length) {
      const t = setTimeout(() => setStep('confirm'), CHECK_REVEAL_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealed(n => n + 1), CHECK_REVEAL_MS)
    return () => clearTimeout(t)
  }, [step, revealed, checks.length])

  const approve = () => {
    const result = enableModel(model.id, { approver })
    if (result) {
      addToast(`${model.name} enabled for the workspace`, 'success')
      onEnabled?.(result)
    } else {
      addToast('Enable was refused by the policy guard', 'error')
    }
    onClose()
  }

  return (
    <>
      {step === 'review' && (
        <div className="space-y-4">
          <p className="text-[13px] text-slate leading-relaxed">
            Enabling a model makes it selectable for every agent in this workspace. Four policy checks run first, and the approval is recorded on the model&rsquo;s audit trail.
          </p>
          <div className="border border-rule rounded-lg px-4 py-2">
            <KeyValueRow label="Model" value={model.name} />
            <KeyValueRow label="Cost per check" value={`${model.creditCostPerRun} Intelligence Credits`} mono />
            <KeyValueRow label="Data residency" value={model.compliance.dataResidency.join(', ')} mono />
          </div>
          <div>
            <label htmlFor="model-enable-approver" className="block text-[11px] uppercase tracking-wider text-mist mb-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Approving reviewer
            </label>
            <select
              id="model-enable-approver"
              value={approverName}
              onChange={e => setApproverName(e.target.value)}
              className="w-full text-[13px] border border-rule rounded-lg px-3 py-2 bg-white cursor-pointer text-ink"
            >
              {APPROVERS.map(a => <option key={a.name} value={a.name}>{a.name} · {a.role}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            <PrimaryButton onClick={() => setStep('checking')}><ShieldCheck className="w-4 h-4" /> Run policy checks</PrimaryButton>
          </div>
        </div>
      )}

      {(step === 'checking' || step === 'confirm') && (
        <div className="space-y-4">
          <ul className="space-y-2">
            {checks.map((c, i) => {
              const shown = step === 'confirm' || i < revealed
              return (
                <li key={c.id} className="flex items-start gap-2.5 border border-rule rounded-lg px-3 py-2.5">
                  {shown
                    ? <Check className="w-4 h-4 text-teal mt-0.5 shrink-0" />
                    : <Clock className="w-4 h-4 text-mist mt-0.5 shrink-0" />}
                  <div className="min-w-0">
                    <p className={`text-[13px] font-medium ${shown ? 'text-ink' : 'text-mist'}`}>{c.label}</p>
                    {shown && <p className="text-[12px] text-slate leading-snug">{c.detail}</p>}
                  </div>
                </li>
              )
            })}
          </ul>

          {step === 'confirm' ? (
            <>
              <div className="bg-pale border border-rule rounded-lg px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-mist mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Approval to be recorded</p>
                <p className="text-[13px] text-ink">
                  Approved by <span className="font-semibold">{approver.name}</span> · {approver.role} · {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
                <PrimaryButton onClick={approve}><Check className="w-4 h-4" /> Approve &amp; enable</PrimaryButton>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1">
              <p className="text-[12px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Running policy checks…</p>
              <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
            </div>
          )}
        </div>
      )}
    </>
  )
}
