/**
 * Agent Studio — Create Agent wizard.
 *
 * 7 steps: Basics · Mission & Instructions · Knowledge · Capabilities & Tools ·
 * Guardrails · Test & Evaluate · Deploy. A live system-prompt preview reflects
 * the config throughout. Starting from a template prefills everything. On
 * finish, creates a Draft agent and hands back its id (lands on Overview).
 */

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Sparkles, Play, AlertTriangle } from 'lucide-react'
import {
  TEMPLATES, templateByType, createAgentFromTemplate, createVersion, addAgent,
  activeVersion, ACTIVE_CUSTOMER, CAPABILITY_CATALOG,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton, OutputStatusBadge, ConfidenceBadge,
} from './shared'
import {
  KnowledgeSourceSelector, CapabilitySelector, ToolPermissionSelector,
  GuardrailBuilder, DeploymentSurfaceSelector, SystemPromptPreview,
} from './parts'

const STEPS = ['Basics', 'Instructions', 'Knowledge', 'Capabilities', 'Guardrails', 'Test', 'Deploy']

export default function CreateAgentWizard({ initialTemplate, onCancel, onCreated, currentUserId = 'You' }) {
  const [step, setStep] = useState(0)
  const seed = initialTemplate ? templateByType(initialTemplate) : null
  const [draft, setDraft] = useState(() => makeInitialDraft(seed, currentUserId))
  const set = (patch) => setDraft(d => ({ ...d, ...patch }))

  // Build a version-shaped object for the live prompt preview.
  const previewVersion = useMemo(() => ({
    name: draft.name, mission: draft.mission,
    allowedTasks: draft.allowedTasks, disallowedTasks: draft.disallowedTasks,
    responseStyle: draft.responseStyle, knowledgeScope: draft.knowledgeScope,
    tools: draft.tools, guardrails: draft.guardrails,
  }), [draft])

  const canNext = step !== 0 || (draft.name.trim() && draft.type)

  const finish = () => {
    const tpl = templateByType(draft.type) || TEMPLATES[0]
    const agent = createAgentFromTemplate(tpl, { owner: draft.owner, customer: ACTIVE_CUSTOMER })
    // overlay wizard choices onto the fresh agent + its draft version
    agent.name = draft.name
    agent.description = draft.description || tpl.tagline
    agent.type = draft.type
    agent.icon = tpl.icon
    agent.defaultLanguage = draft.defaultLanguage
    agent.supportedLanguages = draft.supportedLanguages
    const v = activeVersion(agent)
    Object.assign(v, {
      name: draft.name, mission: draft.mission,
      allowedTasks: draft.allowedTasks, disallowedTasks: draft.disallowedTasks,
      responseStyle: draft.responseStyle, outputFormat: draft.outputFormat,
      systemInstructions: draft.systemInstructions, knowledgeScope: draft.knowledgeScope,
      capabilities: draft.capabilities, tools: draft.tools, guardrails: draft.guardrails,
      deploymentSettings: draft.deploymentSettings, changeSummary: 'Created via wizard',
    })
    agent._deployedSurfaces = draft.deploymentSettings.surfaces
    addAgent(agent)
    onCreated?.(agent.id)
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Create Agent"
        subtitle="Governed, Org-Brain-aware, and testable before it goes live."
        actions={<SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>}
      />

      {/* Stepper */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {STEPS.map((s, i) => (
          <button key={s} onClick={() => i <= step && setStep(i)}
            className={`inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full border transition-colors ${
              i === step ? 'bg-ocean text-white border-ocean'
              : i < step ? 'bg-teal/10 text-teal border-teal/30 cursor-pointer'
              : 'bg-white text-mist border-rule'}`}
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {i < step ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}{s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <div className="space-y-4">
          <Card>
            {step === 0 && <BasicsStep draft={draft} set={set} />}
            {step === 1 && <InstructionsStep draft={draft} set={set} />}
            {step === 2 && <KnowledgeSourceSelector value={draft.knowledgeScope} onChange={v => set({ knowledgeScope: v })} />}
            {step === 3 && <div className="space-y-5"><CapabilitySelector value={draft.capabilities} onChange={v => set({ capabilities: v })} /><ToolPermissionSelector value={draft.tools} onChange={v => set({ tools: v })} /></div>}
            {step === 4 && <GuardrailBuilder value={draft.guardrails} onChange={v => set({ guardrails: v })} />}
            {step === 5 && <TestStep draft={draft} />}
            {step === 6 && <DeployStep draft={draft} set={set} />}
          </Card>

          <div className="flex items-center justify-between">
            <SecondaryButton onClick={() => (step === 0 ? onCancel() : setStep(step - 1))}>
              <ChevronLeft className="w-4 h-4" /> {step === 0 ? 'Cancel' : 'Back'}
            </SecondaryButton>
            {step < STEPS.length - 1 ? (
              <PrimaryButton onClick={() => canNext && setStep(step + 1)} disabled={!canNext}>Next <ChevronRight className="w-4 h-4" /></PrimaryButton>
            ) : (
              <PrimaryButton onClick={finish}>Create agent (Draft)</PrimaryButton>
            )}
          </div>
        </div>

        {/* Live system-prompt preview rail */}
        <div className="xl:sticky xl:top-4">
          <SystemPromptPreview version={previewVersion} customerName={ACTIVE_CUSTOMER.name} />
        </div>
      </div>
    </div>
  )
}

function makeInitialDraft(tpl, owner) {
  const base = createVersion({}, { versionNumber: 1 })
  return {
    name: tpl?.name || '',
    description: tpl?.tagline || '',
    type: tpl?.type || TEMPLATES[0].type,
    owner,
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    mission: tpl?.mission || '',
    allowedTasks: tpl?.allowed || [],
    disallowedTasks: tpl?.disallowed || [],
    responseStyle: 'Clear, concise, professional. Cite sources.',
    outputFormat: 'Answer + sources + confidence + suggested status',
    systemInstructions: '',
    knowledgeScope: tpl?.knowledge || [],
    capabilities: tpl?.capabilities || [],
    tools: tpl?.tools || [],
    guardrails: base.guardrails,
    deploymentSettings: { surfaces: [], proactive: false, requireVerify: true },
  }
}

/* ─── Step 1: Basics ───────────────────────────────────────────── */

function BasicsStep({ draft, set }) {
  return (
    <div className="space-y-4">
      <MonoLabel>Basics</MonoLabel>
      <Field label="Agent name" required>
        <input value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Meridian JA Reviewer"
          className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
      </Field>
      <Field label="Short description">
        <input value={draft.description} onChange={e => set({ description: e.target.value })} placeholder="What this agent helps with"
          className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
      </Field>
      <Field label="Agent type">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.type} type="button" onClick={() => set({ type: t.type, name: draft.name || t.name })}
              className={`text-left rounded-lg border p-2.5 cursor-pointer transition-colors ${draft.type === t.type ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
              <p className="text-[12.5px] font-medium text-ink">{t.name}</p>
              <p className="text-[11px] text-slate mt-0.5 line-clamp-1">{t.tagline}</p>
            </button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner"><input value={draft.owner} onChange={e => set({ owner: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
        <Field label="Default language"><input value={draft.defaultLanguage} onChange={e => set({ defaultLanguage: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
      </div>
      <p className="text-[11px] text-mist">New agents start as <span className="text-slate font-medium">Draft</span> and only go live after you publish.</p>
    </div>
  )
}

/* ─── Step 2: Mission & Instructions ───────────────────────────── */

function InstructionsStep({ draft, set }) {
  const listField = (key) => (e) => set({ [key]: e.target.value.split('\n').filter(Boolean) })
  return (
    <div className="space-y-4">
      <MonoLabel>Mission &amp; instructions</MonoLabel>
      <Field label="Agent mission"><textarea rows={2} value={draft.mission} onChange={e => set({ mission: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Should help with (one per line)"><textarea rows={4} value={draft.allowedTasks.join('\n')} onChange={listField('allowedTasks')} className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
        <Field label="Should NOT do (one per line)"><textarea rows={4} value={draft.disallowedTasks.join('\n')} onChange={listField('disallowedTasks')} className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Tone of voice"><input value={draft.responseStyle} onChange={e => set({ responseStyle: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
        <Field label="Output format"><input value={draft.outputFormat} onChange={e => set({ outputFormat: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
      </div>
      <Field label="Custom system instructions (optional)"><textarea rows={3} value={draft.systemInstructions} onChange={e => set({ systemInstructions: e.target.value })} placeholder="Extra guidance appended to the generated prompt" className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
    </div>
  )
}

/* ─── Step 6: Test & Evaluate (light; full playground post-create) ─ */

function TestStep({ draft }) {
  const [result, setResult] = useState(null)
  const run = () => {
    const kn = draft.knowledgeScope.length
    const conf = Math.min(96, 60 + kn * 4 + draft.capabilities.length * 2)
    const status = conf >= 85 ? 'verified' : conf >= 70 ? 'need_review' : 'not_verified'
    setResult({ conf, status, sources: Math.min(kn, 3) })
  }
  return (
    <div className="space-y-4">
      <MonoLabel>Test &amp; evaluate</MonoLabel>
      <p className="text-[12px] text-slate">Run a quick sanity check now; the full playground (sources, tool calls, guardrail checks) is available after you create the agent.</p>
      <Card className="bg-pale/40">
        <p className="text-[12px] text-ink font-medium mb-1">Sample task</p>
        <p className="text-[12.5px] text-slate">“Is this the approved term, and does it meet our rules?”</p>
        <div className="mt-3"><PrimaryButton onClick={run}><Play className="w-3.5 h-3.5" /> Run sample</PrimaryButton></div>
      </Card>
      {result && (
        <Card>
          <div className="flex items-center gap-2 mb-2">
            <OutputStatusBadge status={result.status} />
            <ConfidenceBadge value={result.conf} />
          </div>
          <p className="text-[12.5px] text-slate">Simulated answer citing {result.sources} approved source{result.sources === 1 ? '' : 's'}.
            {result.status !== 'verified' && <span className="text-amber-deep"> Low support → flagged for human review.</span>}</p>
          {draft.knowledgeScope.length === 0 && (
            <p className="text-[11.5px] text-amber-deep mt-2 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No knowledge sources granted — answers will be marked Need Review.</p>
          )}
        </Card>
      )}
    </div>
  )
}

/* ─── Step 7: Deploy ───────────────────────────────────────────── */

function DeployStep({ draft, set }) {
  const d = draft.deploymentSettings
  const setD = (patch) => set({ deploymentSettings: { ...d, ...patch } })
  return (
    <div className="space-y-4">
      <MonoLabel>Deploy</MonoLabel>
      <p className="text-[12px] text-slate">Choose where this agent appears. You can change this any time; it stays Draft until you publish.</p>
      <DeploymentSurfaceSelector value={d.surfaces} onChange={v => setD({ surfaces: v })} />
      <div className="flex flex-col gap-2 pt-1">
        <Toggle label="Proactive (agent can offer help unprompted)" checked={d.proactive} onChange={v => setD({ proactive: v })} />
        <Toggle label="Outputs require Verify / Approve before use" checked={d.requireVerify} onChange={v => setD({ requireVerify: v })} />
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left cursor-pointer">
      <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-ocean' : 'bg-rule-strong'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
      <span className="text-[12.5px] text-ink">{label}</span>
    </button>
  )
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="text-[11px] text-mist">{label}{required && <span className="text-error"> *</span>}</span>
      <div className="mt-1">{children}</div>
    </label>
  )
}
