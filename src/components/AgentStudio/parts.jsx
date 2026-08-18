/**
 * Agent Studio — reusable configuration parts.
 *
 * Selectors + the live system-prompt preview, shared by the Create Agent
 * wizard and the Configuration editor so both edit the same shape. Each is a
 * controlled component: { value, onChange }. Governance is visible in-place
 * (approval-required tools flagged, locked guardrails non-togglable).
 *
 * The long catalogs collapse by default to what's SELECTED (+ "Show all (N)")
 * so a template-prefilled agent reads as a short summary, not a checklist wall.
 */

import { useState } from 'react'
import {
  Check, ShieldCheck, Lock, AlertTriangle, BookOpen, Wrench, Boxes, Coins,
} from 'lucide-react'
import {
  KNOWLEDGE_CATALOG, CAPABILITY_CATALOG, TOOL_CATALOG, PERMISSION_LEVELS,
  GUARDRAIL_CATALOG, ESCALATION_RULES, DEPLOYMENT_SURFACES, generateSystemPrompt,
} from '../../data/agentStudio'
import { MonoLabel, Card } from './shared'

function toggle(list, id) {
  return list.includes(id) ? list.filter(x => x !== id) : [...list, id]
}

/**
 * Collapse a catalog to the selected entries unless expanded (or nothing is
 * selected yet, in which case show everything so a blank agent can choose).
 */
function useCollapsedCatalog(catalog, selectedIds) {
  const [showAll, setShowAll] = useState(false)
  const collapsible = selectedIds.length > 0 && selectedIds.length < catalog.length
  const visible = !collapsible || showAll ? catalog : catalog.filter(x => selectedIds.includes(x.id))
  return { visible, showAll, setShowAll, collapsible, hidden: catalog.length - visible.length }
}

function ShowAllToggle({ state, total }) {
  if (!state.collapsible) return null
  return (
    <button
      type="button"
      onClick={() => state.setShowAll(!state.showAll)}
      className="text-[11.5px] text-ocean hover:text-ocean/80 cursor-pointer"
    >
      {state.showAll ? 'Show selected only' : `+ Show all (${total})`}
    </button>
  )
}

/* ─── Knowledge sources ────────────────────────────────────────── */

export function KnowledgeSourceSelector({ value = [], onChange }) {
  const list = useCollapsedCatalog(KNOWLEDGE_CATALOG, value)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Knowledge scope</MonoLabel></div>
      <p className="text-[12px] text-slate">Grant only the approved sources this agent may use. It must cite them and say when it doesn’t know.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {list.visible.map(k => {
          const on = value.includes(k.id)
          return (
            <button key={k.id} type="button" onClick={() => onChange(toggle(value, k.id))}
              className={`text-left rounded-lg border p-3 cursor-pointer transition-colors ${on ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
              <div className="flex items-start gap-2">
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${on ? 'bg-ocean border-ocean' : 'border-rule-strong'}`}>{on && <Check className="w-3 h-3 text-white" />}</span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[12.5px] font-medium text-ink">{k.name}</span>
                    {k.citations
                      ? <span className="text-[9px] text-teal bg-teal/10 px-1 py-0.5 rounded" title="Citations available">cites</span>
                      : <span className="text-[9px] text-mist bg-rule/60 px-1 py-0.5 rounded" title="No citations">no cites</span>}
                  </span>
                  <span className="block text-[11px] text-slate mt-0.5">{k.desc}</span>
                  <span className="block text-[10px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{k.records.toLocaleString()} records</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>
      <ShowAllToggle state={list} total={KNOWLEDGE_CATALOG.length} />
    </div>
  )
}

/* ─── Capabilities ─────────────────────────────────────────────── */

export function CapabilitySelector({ value = [], onChange }) {
  const list = useCollapsedCatalog(CAPABILITY_CATALOG, value)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5"><Boxes className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Capabilities</MonoLabel></div>
      <div className="flex flex-wrap gap-1.5">
        {list.visible.map(c => {
          const on = value.includes(c.id)
          return (
            <button key={c.id} type="button" onClick={() => onChange(toggle(value, c.id))}
              className={`px-2.5 py-1 rounded-full border text-[11.5px] cursor-pointer transition-colors ${on ? 'bg-ocean text-white border-ocean' : 'bg-white text-slate border-rule hover:border-ocean/40'}`}>
              {c.label}
            </button>
          )
        })}
      </div>
      <ShowAllToggle state={list} total={CAPABILITY_CATALOG.length} />
    </div>
  )
}

/* ─── Tools (with permission + approval gating) ────────────────── */

const PERM_LABEL = Object.fromEntries(PERMISSION_LEVELS.map(p => [p.id, p.label]))

export function ToolPermissionSelector({ value = [], onChange }) {
  const list = useCollapsedCatalog(TOOL_CATALOG, value)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Tools &amp; actions</MonoLabel></div>
      <p className="text-[12px] text-slate">Risky actions require human approval in V1. Fully-autonomous actions are disabled.</p>
      <div className="space-y-1.5">
        {list.visible.map(t => {
          const on = value.includes(t.id)
          return (
            <button key={t.id} type="button" onClick={() => onChange(toggle(value, t.id))}
              className={`w-full text-left rounded-lg border p-2.5 cursor-pointer transition-colors flex items-center gap-2.5 ${on ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-ocean border-ocean' : 'border-rule-strong'}`}>{on && <Check className="w-3 h-3 text-white" />}</span>
              <span className="flex-1 min-w-0">
                <span className="text-[12.5px] font-medium text-ink">{t.label}</span>
                <span className="block text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{PERM_LABEL[t.permission]}</span>
              </span>
              {t.requiresApproval && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#996800] bg-[#FFF7E6] px-1.5 py-0.5 rounded-full shrink-0"><Lock className="w-2.5 h-2.5" /> approval</span>
              )}
            </button>
          )
        })}
      </div>
      <ShowAllToggle state={list} total={TOOL_CATALOG.length} />
    </div>
  )
}

/* ─── Guardrails ───────────────────────────────────────────────── */

export function GuardrailBuilder({ value, onChange }) {
  const enabled = value?.enabled || {}
  const setEnabled = (id, on) => onChange({ ...value, enabled: { ...enabled, [id]: on } })
  const setField = (k, v) => onChange({ ...value, [k]: v })
  const escalation = value?.escalationRules || []

  // Collapse to the guardrails actually being ENFORCED (locked or on);
  // "Show all" reveals the switched-off ones for editing.
  const [showAllRails, setShowAllRails] = useState(false)
  const isOn = (g) => g.locked ? true : (enabled[g.id] ?? g.defaultOn)
  const visibleRails = showAllRails ? GUARDRAIL_CATALOG : GUARDRAIL_CATALOG.filter(isOn)
  const railsCollapsible = visibleRails.length < GUARDRAIL_CATALOG.length || showAllRails

  const escList = useCollapsedCatalog(ESCALATION_RULES, escalation)

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Guardrails</MonoLabel></div>
        <div className="space-y-1.5">
          {visibleRails.map(g => {
            const on = g.locked ? true : (enabled[g.id] ?? g.defaultOn)
            return (
              <div key={g.id} className={`rounded-lg border p-2.5 flex items-center gap-3 ${on ? 'border-rule bg-white' : 'border-rule bg-pale/40'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-ink flex items-center gap-1.5">
                    {g.name}
                    {g.locked && <span className="inline-flex items-center gap-1 text-[10px] text-slate bg-rule/60 px-1.5 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> always on</span>}
                    {g.severity === 'high' && <span className="text-[9px] text-error bg-error/10 px-1 py-0.5 rounded">high</span>}
                  </p>
                  <p className="text-[11px] text-slate mt-0.5">{g.desc}</p>
                </div>
                <button type="button" disabled={g.locked} onClick={() => setEnabled(g.id, !on)}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${on ? 'bg-ocean' : 'bg-rule-strong'} ${g.locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${on ? 'left-4' : 'left-0.5'}`} />
                </button>
              </div>
            )
          })}
        </div>
        {railsCollapsible && (
          <button
            type="button"
            onClick={() => setShowAllRails(!showAllRails)}
            className="text-[11.5px] text-ocean hover:text-ocean/80 cursor-pointer mt-1.5"
          >
            {showAllRails ? 'Show enforced only' : `+ Show all (${GUARDRAIL_CATALOG.length})`}
          </button>
        )}
      </div>

      <div>
        <MonoLabel>Escalate to Need Review when</MonoLabel>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {escList.visible.map(e => {
            const on = escalation.includes(e.id)
            return (
              <button key={e.id} type="button" onClick={() => setField('escalationRules', toggle(escalation, e.id))}
                className={`px-2.5 py-1 rounded-full border text-[11px] cursor-pointer transition-colors ${on ? 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' : 'bg-white text-slate border-rule hover:border-[#FFB000]/40'}`}>
                {on && <AlertTriangle className="w-2.5 h-2.5 inline mr-1" />}{e.label}
              </button>
            )
          })}
        </div>
        <div className="mt-1.5"><ShowAllToggle state={escList} total={ESCALATION_RULES.length} /></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <NumberField label="Max answer length" value={value?.maxAnswerLength} onChange={v => setField('maxAnswerLength', v)} suffix="chars" />
        <NumberField label="Credit budget / day" value={value?.creditBudgetPerDay} onChange={v => setField('creditBudgetPerDay', v)} icon={Coins} />
        <NumberField label="Rate limit / min" value={value?.rateLimitPerMin} onChange={v => setField('rateLimitPerMin', v)} suffix="req" />
      </div>
    </div>
  )
}

function NumberField({ label, value, onChange, suffix, icon: Icon }) {
  return (
    <label className="block">
      <span className="text-[11px] text-mist flex items-center gap-1">{Icon && <Icon className="w-3 h-3 text-[#996800]" />}{label}</span>
      <span className="flex items-center gap-1.5 mt-1">
        <input type="number" value={value ?? ''} onChange={e => onChange(Number(e.target.value))}
          className="w-full text-[13px] border border-rule rounded-md px-2 py-1.5 focus:outline-none focus:border-ocean/50" />
        {suffix && <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{suffix}</span>}
      </span>
    </label>
  )
}

/* ─── Deployment surfaces ──────────────────────────────────────── */

export function DeploymentSurfaceSelector({ value = [], onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {DEPLOYMENT_SURFACES.map(s => {
        const on = value.includes(s.id)
        return (
          <button key={s.id} type="button" onClick={() => onChange(toggle(value, s.id))}
            className={`text-left rounded-lg border p-3 cursor-pointer transition-colors flex items-start gap-2.5 ${on ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${on ? 'bg-ocean border-ocean' : 'border-rule-strong'}`}>{on && <Check className="w-3 h-3 text-white" />}</span>
            <span>
              <span className="text-[12.5px] font-medium text-ink">{s.label}</span>
              <span className="block text-[11px] text-slate mt-0.5">{s.desc}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── System prompt preview ────────────────────────────────────── */

export function SystemPromptPreview({ version, customerName }) {
  const text = generateSystemPrompt(version, customerName)
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="px-4 py-2.5 border-b border-rule flex items-center gap-2 bg-pale/40">
        <ShieldCheck className="w-3.5 h-3.5 text-ocean" />
        <MonoLabel>Generated system prompt</MonoLabel>
      </div>
      <pre className="text-[11.5px] text-slate leading-relaxed p-4 whitespace-pre-wrap max-h-[420px] overflow-y-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{text}</pre>
    </Card>
  )
}
