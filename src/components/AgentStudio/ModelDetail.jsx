/**
 * Model Registry — full model card.
 *
 * Everything a customer needs before enabling: purpose and intended use,
 * technical lineage, evals, training-data provenance, cost, which agents
 * run on it, and the enable audit trail. The "Enable model" action opens
 * the governed enable modal.
 */

import { useState } from 'react'
import { Cpu, Check, Bot, ShieldCheck, History } from 'lucide-react'
import {
  useModelRegistry, getModelById, agentsUsingModel,
} from '../../data/modelRegistry'
import {
  Card, MonoLabel, KeyValueRow, ScoreBar, EmptyState,
  PrimaryButton, ModelStatusBadge, AgentStatusBadge,
} from './shared'
import ModelEnableModal from './ModelEnableModal'

const SCORE_LABEL = { accuracy: 'Accuracy', tone: 'Tone', regulatory: 'Regulatory', speed: 'Speed' }

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function ModelDetail({ modelId, go }) {
  useModelRegistry() // subscribe so the enable flow re-renders this card
  const model = getModelById(modelId)
  const [enableOpen, setEnableOpen] = useState(false)

  if (!model) {
    return <EmptyState icon={Cpu} title="Model not found" description="This model is no longer registered to the workspace." />
  }

  const agents = agentsUsingModel(model.modelKey)

  return (
    <div className="space-y-5">
      {/* Title row */}
      <div className="flex items-start justify-between gap-3 flex-wrap border-b border-rule pb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0"><Cpu className="w-5 h-5 text-ocean" /></div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-[20px] font-semibold text-ink tracking-tight">{model.name}</h2>
              <ModelStatusBadge status={model.status} />
            </div>
            <p className="text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {model.tier} · {model.modelKey}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {model.status === 'available' && (
            <PrimaryButton onClick={() => setEnableOpen(true)}><ShieldCheck className="w-4 h-4" /> Enable model</PrimaryButton>
          )}
          {model.status === 'evaluation' && (
            <span className="text-[12px] text-[#996800] bg-[#FFF7E6] border border-[#FFB000]/40 rounded-lg px-3 py-2">
              In evaluation — enable unlocks when the evaluation report is delivered
            </span>
          )}
          {model.status === 'enabled' && model.enabledBy && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-teal bg-teal/10 border border-teal/30 rounded-lg px-3 py-2">
              <Check className="w-3.5 h-3.5" /> Enabled by {model.enabledBy.name} · {fmtDate(model.enabledAt)}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column — purpose + evals + provenance */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <MonoLabel>What it does</MonoLabel>
            <p className="text-[13.5px] text-ink leading-relaxed mt-2">{model.purpose}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <MonoLabel>Intended use</MonoLabel>
                <ul className="mt-2 space-y-1.5">
                  {model.intendedUse.map((u, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate leading-snug">
                      <Check className="w-3.5 h-3.5 text-teal mt-0.5 shrink-0" />{u}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <MonoLabel>Not intended for</MonoLabel>
                <ul className="mt-2 space-y-1.5">
                  {model.notIntendedUse.map((u, i) => (
                    <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate leading-snug">
                      <span className="w-3.5 h-3.5 mt-0.5 shrink-0 text-mist text-center leading-none">—</span>{u}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <MonoLabel>Evaluation</MonoLabel>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {Object.entries(model.evals.scores).map(([k, v]) => (
                <div key={k}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate">{SCORE_LABEL[k] || k}</span>
                    <span className="text-[12px] font-semibold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v ?? '—'}</span>
                  </div>
                  <ScoreBar value={v ?? 0} color={v == null ? 'error' : v >= 90 ? 'teal' : 'ocean'} />
                </div>
              ))}
            </div>
            <div className="mt-4 border border-rule rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-pale/60 border-b border-rule">
                <p className="text-[11px] text-mist mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>INPUT · baseline score {model.evals.testDrive.baselineScore}</p>
                <p className="text-[13px] text-ink leading-relaxed">{model.evals.testDrive.before}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[11px] text-teal mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>WITH THIS MODEL · score {model.evals.testDrive.boostedScore}</p>
                <p className="text-[13px] text-ink leading-relaxed">{model.evals.testDrive.after}</p>
              </div>
            </div>
          </Card>

          <Card>
            <MonoLabel>Training data &amp; compliance</MonoLabel>
            <div className="mt-2">
              <KeyValueRow label="Provenance" value={model.compliance.trainingDataProvenance} />
              <KeyValueRow label="Data residency" value={model.compliance.dataResidency.join(', ')} mono />
              <KeyValueRow label="Certifications" value={model.compliance.certifications.join(' · ')} mono />
              <KeyValueRow label="Bias audit score" value={model.compliance.biasAuditScore ?? 'Pending'} mono />
              <KeyValueRow label="Last audit" value={model.compliance.lastAuditDate ? fmtDate(model.compliance.lastAuditDate) : 'Scheduled with evaluation'} mono />
            </div>
            {model.compliance.guardrailNotes.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {model.compliance.guardrailNotes.map((n, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-slate leading-snug">
                    <ShieldCheck className="w-3.5 h-3.5 text-ocean mt-0.5 shrink-0" />{n}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Right column — technical, cost, agents, audit trail */}
        <div className="space-y-4">
          <Card>
            <MonoLabel>Technical</MonoLabel>
            <div className="mt-2">
              <KeyValueRow label="Base model" value={model.technical.baseModel} />
              <KeyValueRow label="Version" value={model.technical.version} mono />
              <KeyValueRow label="Context window" value={model.technical.contextWindow} mono />
              <KeyValueRow label="Avg latency" value={model.technical.avgLatency} mono />
            </div>
            <div className="mt-3">
              <MonoLabel>Version history</MonoLabel>
              <ul className="mt-2 space-y-2">
                {model.technical.versionHistory.map(v => (
                  <li key={v.version} className="text-[12px] leading-snug">
                    <span className="font-semibold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v.version}</span>
                    <span className="text-mist"> · {fmtDate(v.date)}</span>
                    <p className="text-slate">{v.notes}</p>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <MonoLabel>Cost</MonoLabel>
            <p className="text-[18px] font-semibold text-ink mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {model.creditCostPerRun} <span className="text-[12px] font-normal text-slate">Intelligence Credits / check</span>
            </p>
          </Card>

          <Card>
            <MonoLabel>Agents using this model</MonoLabel>
            {agents.length === 0 ? (
              <p className="text-[12.5px] text-mist mt-2">No agents run on this model yet{model.status !== 'enabled' ? ' — enable it to make it selectable' : ''}.</p>
            ) : (
              <ul className="mt-2 divide-y divide-rule">
                {agents.map(a => (
                  <li key={a.id}>
                    <button
                      onClick={() => go('overview', { agentId: a.id })}
                      className="w-full flex items-center justify-between gap-2 py-2 text-left cursor-pointer hover:bg-pale/60 rounded px-1 -mx-1"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <Bot className="w-3.5 h-3.5 text-ocean shrink-0" />
                        <span className="text-[13px] text-ink truncate">{a.name}</span>
                      </span>
                      <AgentStatusBadge status={a.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-slate" />
              <MonoLabel>Audit trail</MonoLabel>
            </div>
            <ul className="mt-3 space-y-3">
              {[...model.auditTrail].reverse().map(line => (
                <li key={line.id} className="text-[12px] leading-snug border-l-2 border-rule pl-3">
                  <p className="text-ink font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {line.event.toUpperCase()} · {fmtDate(line.at)}
                  </p>
                  <p className="text-slate">{line.actor} · {line.role}</p>
                  <p className="text-mist">{line.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <ModelEnableModal
        model={model}
        isOpen={enableOpen}
        onClose={() => setEnableOpen(false)}
      />
    </div>
  )
}
