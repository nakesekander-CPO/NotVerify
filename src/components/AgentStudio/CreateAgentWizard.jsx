/**
 * Agent Studio — Create Agent wizard (3 steps).
 *
 *   1 · Basics                — pick a template + name it. The template
 *                               prefills mission, knowledge, tools, guardrails.
 *   2 · Knowledge & guardrails — review what the agent may use and when it
 *                               escalates; capabilities/tools sit behind an
 *                               "Advanced permissions" disclosure.
 *   3 · Test & create          — run the REAL simulator (simulateAgentRun,
 *                               same engine as the playground), then create.
 *
 * Deployment happens post-create on the agent page (new agents are Drafts).
 * The live system-prompt preview tracks every change. Fine-grained editing
 * (tasks, tone, custom instructions) lives in Configure.
 */

import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, ChevronDown, Play, AlertTriangle, BookOpen } from 'lucide-react'
import {
  TEMPLATES, templateByType, createAgentFromTemplate, createVersion, addAgent,
  activeVersion, ACTIVE_CUSTOMER, simulateAgentRun, SAMPLE_TASKS,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton, OutputStatusBadge, ConfidenceBadge,
} from './shared'
import {
  KnowledgeSourceSelector, CapabilitySelector, ToolPermissionSelector,
  GuardrailBuilder, SystemPromptPreview,
} from './parts'

const STEPS = ['Basics', 'Knowledge & guardrails', 'Test & create']

export default function CreateAgentWizard({ initialTemplate, onCancel, onCreated, currentUserId = 'You' }) {
  const [step, setStep] = useState(0)
  const seed = initialTemplate ? templateByType(initialTemplate) : null
  const [draft, setDraft] = useState(() => makeInitialDraft(seed, currentUserId))
  const set = (patch) => setDraft(d => ({ ...d, ...patch }))

  // Version-shaped object shared by the live prompt preview AND the simulator,
  // so the pre-create test behaves exactly like the playground will.
  const previewVersion = useMemo(() => ({
    name: draft.name, mission: draft.mission,
    allowedTasks: draft.allowedTasks, disallowedTasks: draft.disallowedTasks,
    responseStyle: draft.responseStyle, knowledgeScope: draft.knowledgeScope,
    capabilities: draft.capabilities, tools: draft.tools, guardrails: draft.guardrails,
  }), [draft])

  const canNext = step !== 0 || (draft.name.trim() && draft.type)

  const finish = () => {
    const tpl = templateByType(draft.type) || TEMPLATES[0]
    const agent = createAgentFromTemplate(tpl, { owner: draft.owner, customer: ACTIVE_CUSTOMER })
    agent.name = draft.name
    agent.description = draft.description || tpl.tagline
    agent.type = draft.type
    agent.icon = tpl.icon
    const v = activeVersion(agent)
    Object.assign(v, {
      name: draft.name, mission: draft.mission,
      allowedTasks: draft.allowedTasks, disallowedTasks: draft.disallowedTasks,
      responseStyle: draft.responseStyle, knowledgeScope: draft.knowledgeScope,
      capabilities: draft.capabilities, tools: draft.tools, guardrails: draft.guardrails,
      changeSummary: 'Created via wizard',
    })
    addAgent(agent)
    onCreated?.(agent.id)
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Create Agent"
        subtitle="Pick a template, review its knowledge and guardrails, test it, done."
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
            {step === 1 && <KnowledgeGuardrailsStep draft={draft} set={set} />}
            {step === 2 && <TestCreateStep draft={draft} version={previewVersion} />}
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
  // Fall back to the first template's config so the highlighted template card
  // always matches the applied knowledge/tools (blank create still names itself).
  const t = tpl || TEMPLATES[0]
  return {
    name: tpl?.name || '',
    description: tpl?.tagline || '',
    type: t.type,
    owner,
    mission: t.mission,
    allowedTasks: t.allowed,
    disallowedTasks: t.disallowed,
    responseStyle: 'Clear, concise, professional. Cite sources.',
    knowledgeScope: t.knowledge,
    capabilities: t.capabilities,
    tools: t.tools,
    guardrails: base.guardrails,
  }
}

/* ─── Step 1 · Basics ──────────────────────────────────────────── */

function BasicsStep({ draft, set }) {
  const applyTemplate = (t) => set({
    type: t.type,
    name: draft.name || t.name,
    description: draft.description || t.tagline,
    mission: t.mission,
    allowedTasks: t.allowed,
    disallowedTasks: t.disallowed,
    knowledgeScope: t.knowledge,
    capabilities: t.capabilities,
    tools: t.tools,
  })
  return (
    <div className="space-y-4">
      <MonoLabel>Basics</MonoLabel>
      <Field label="Template">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TEMPLATES.map(t => (
            <button key={t.type} type="button" onClick={() => applyTemplate(t)}
              className={`text-left rounded-lg border p-2.5 cursor-pointer transition-colors ${draft.type === t.type ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
              <p className="text-[12.5px] font-medium text-ink">{t.name}</p>
              <p className="text-[11px] text-slate mt-0.5 line-clamp-1">{t.tagline}</p>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-mist mt-1.5">The template sets the mission, knowledge, tools, and guardrails — you review them next.</p>
      </Field>
      <Field label="Agent name" required>
        <input value={draft.name} onChange={e => set({ name: e.target.value })} placeholder="e.g. Meridian JA Reviewer"
          className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
      </Field>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field label="Short description">
          <input value={draft.description} onChange={e => set({ description: e.target.value })} placeholder="What this agent helps with"
            className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
        </Field>
        <Field label="Owner">
          <input value={draft.owner} onChange={e => set({ owner: e.target.value })}
            className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
        </Field>
      </div>
      <p className="text-[11px] text-mist">New agents start as <span className="text-slate font-medium">Draft</span> and only go live after you publish.</p>
    </div>
  )
}

/* ─── Step 2 · Knowledge & guardrails ──────────────────────────── */

function KnowledgeGuardrailsStep({ draft, set }) {
  const [advancedOpen, setAdvancedOpen] = useState(false)
  return (
    <div className="space-y-5">
      <Field label="Mission">
        <textarea rows={2} value={draft.mission} onChange={e => set({ mission: e.target.value })}
          className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" />
      </Field>

      <KnowledgeSourceSelector value={draft.knowledgeScope} onChange={v => set({ knowledgeScope: v })} />
      <GuardrailBuilder value={draft.guardrails} onChange={v => set({ guardrails: v })} />

      {/* Capabilities + tools are template-set; most creators never touch them. */}
      <div className="border-t border-rule pt-3">
        <button type="button" onClick={() => setAdvancedOpen(o => !o)}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate hover:text-ink cursor-pointer">
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${advancedOpen ? '' : '-rotate-90'}`} />
          Advanced permissions
          <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {draft.capabilities.length} capabilities · {draft.tools.length} tools (set by template)
          </span>
        </button>
        {advancedOpen && (
          <div className="mt-3 space-y-5">
            <CapabilitySelector value={draft.capabilities} onChange={v => set({ capabilities: v })} />
            <ToolPermissionSelector value={draft.tools} onChange={v => set({ tools: v })} />
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Step 3 · Test & create ───────────────────────────────────── */

function TestCreateStep({ draft, version }) {
  const [input, setInput] = useState(SAMPLE_TASKS[draft.type] || '')
  const [result, setResult] = useState(null)
  const run = () => { if (input.trim()) setResult(simulateAgentRun(version, input.trim())) }

  return (
    <div className="space-y-4">
      <MonoLabel>Test &amp; create</MonoLabel>
      <p className="text-[12px] text-slate">Same simulator as the playground — the answer shows its sources, confidence, and suggested status.</p>
      <textarea rows={3} value={input} onChange={e => setInput(e.target.value)}
        className="w-full text-[13px] border border-rule rounded-md p-2.5 focus:outline-none focus:border-ocean/50 leading-relaxed" />
      <PrimaryButton onClick={run} disabled={!input.trim()}><Play className="w-3.5 h-3.5" /> Run test</PrimaryButton>

      {result && (
        <Card className="bg-pale/40">
          <div className="flex items-center gap-2 mb-2">
            <OutputStatusBadge status={result.outputStatus} />
            <ConfidenceBadge value={result.confidence} />
            <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>~{result.creditEstimate} credits</span>
          </div>
          <p className="text-[12.5px] text-ink leading-relaxed">{result.output}</p>
          {result.sourcesUsed.length > 0 && (
            <ul className="mt-2 space-y-1">
              {result.sourcesUsed.map((s, i) => (
                <li key={i} className="text-[11.5px] text-slate flex items-start gap-1.5"><BookOpen className="w-3 h-3 text-ocean mt-0.5 shrink-0" /> {s.name}</li>
              ))}
            </ul>
          )}
          {draft.knowledgeScope.length === 0 && (
            <p className="text-[11.5px] text-amber-deep mt-2 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No knowledge sources granted — answers will be marked Need Review.</p>
          )}
        </Card>
      )}
      <p className="text-[11px] text-mist">Create the agent to keep testing in the full playground; deployment happens from the agent page.</p>
    </div>
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
