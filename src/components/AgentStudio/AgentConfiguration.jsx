/**
 * Agent Studio — configuration editor (tabbed).
 *
 * Tabs: Basics · Instructions · Knowledge · Capabilities · Guardrails ·
 * Deployment · Versions · Advanced. GOVERNANCE RULE: editing a published agent
 * never mutates the live version — the first edit spawns a draft version
 * (ensureDraftVersion) and all edits apply to that draft. Publish promotes it.
 */

import { useState } from 'react'
import { Rocket, Info } from 'lucide-react'
import {
  getAgentById, activeVersion, ensureDraftVersion, publishAgent, useAgentStore, ACTIVE_CUSTOMER,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton,
} from './shared'
import {
  KnowledgeSourceSelector, CapabilitySelector, ToolPermissionSelector,
  GuardrailBuilder, DeploymentSurfaceSelector, SystemPromptPreview,
} from './parts'
import AgentVersionHistory from './AgentVersionHistory'
import { Tabs } from '../ui'

const TABS = ['Basics', 'Instructions', 'Knowledge', 'Capabilities', 'Guardrails', 'Deployment', 'Versions']

export default function AgentConfiguration({ agentId, go }) {
  const { refresh } = useAgentStore()
  const [tab, setTab] = useState('Basics')
  const agent = getAgentById(agentId)
  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>
  const v = activeVersion(agent)
  const hasDraft = !!agent.draftVersionId

  // Every edit goes to a draft — never the published version.
  const edit = (patch) => {
    const target = agent.draftVersionId ? v : ensureDraftVersion(agent.id)
    Object.assign(target, patch)
    if (!target.changeSummary?.startsWith('Edited')) target.changeSummary = 'Edited in configuration'
    refresh()
  }
  const editGuardrails = (g) => edit({ guardrails: g })
  const editDeploy = (patch) => {
    const target = agent.draftVersionId ? v : ensureDraftVersion(agent.id)
    target.deploymentSettings = { ...target.deploymentSettings, ...patch }
    // Mirror surfaces onto the agent so the dashboard/overview chips stay true.
    if (patch.surfaces) agent._deployedSurfaces = patch.surfaces
    refresh()
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title={`Configure · ${agent.name}`}
        subtitle="Changes are saved to a draft version. Publish to make them live."
        actions={hasDraft
          ? <PrimaryButton onClick={() => { publishAgent(agent.id); go('overview') }}><Rocket className="w-3.5 h-3.5" /> Publish draft</PrimaryButton>
          : null}
      />

      {hasDraft && (
        <div className="flex items-center gap-2 text-[12px] text-[#996800] bg-[#FFF7E6] border border-[#FFB000]/40 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 shrink-0" /> You’re editing an unpublished <strong>draft (v{v.versionNumber})</strong>. The live version stays unchanged until you publish.
        </div>
      )}

      {/* Tab bar */}
      <Tabs ariaLabel="Configuration sections" tabs={TABS.map(t => ({ id: t, label: t }))} active={tab} onChange={setTab} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <Card>
          {tab === 'Basics' && (
            <div className="space-y-4">
              <MonoLabel>Basics</MonoLabel>
              <Field label="Agent name"><input value={v.name} onChange={e => edit({ name: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
              <Field label="Description"><input value={agent.description} onChange={e => { agent.description = e.target.value; refresh() }} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
              <Field label="Response style"><input value={v.responseStyle} onChange={e => edit({ responseStyle: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
            </div>
          )}
          {tab === 'Instructions' && (
            <div className="space-y-4">
              <MonoLabel>Mission &amp; instructions</MonoLabel>
              <Field label="Mission"><textarea rows={2} value={v.mission} onChange={e => edit({ mission: e.target.value })} className="w-full text-[13px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Should help with (one per line)"><textarea rows={4} value={(v.allowedTasks || []).join('\n')} onChange={e => edit({ allowedTasks: e.target.value.split('\n').filter(Boolean) })} className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
                <Field label="Should NOT do (one per line)"><textarea rows={4} value={(v.disallowedTasks || []).join('\n')} onChange={e => edit({ disallowedTasks: e.target.value.split('\n').filter(Boolean) })} className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
              </div>
              <Field label="Custom system instructions"><textarea rows={3} value={v.systemInstructions} onChange={e => edit({ systemInstructions: e.target.value })} className="w-full text-[12.5px] border border-rule rounded-md px-2.5 py-2 focus:outline-none focus:border-ocean/50" /></Field>
            </div>
          )}
          {tab === 'Knowledge' && <KnowledgeSourceSelector value={v.knowledgeScope} onChange={val => edit({ knowledgeScope: val })} />}
          {tab === 'Capabilities' && <div className="space-y-5"><CapabilitySelector value={v.capabilities} onChange={val => edit({ capabilities: val })} /><ToolPermissionSelector value={v.tools} onChange={val => edit({ tools: val })} /></div>}
          {tab === 'Guardrails' && <GuardrailBuilder value={v.guardrails} onChange={editGuardrails} />}
          {tab === 'Deployment' && (
            <div className="space-y-4">
              <MonoLabel>Deployment surfaces</MonoLabel>
              <DeploymentSurfaceSelector value={v.deploymentSettings?.surfaces || []} onChange={val => editDeploy({ surfaces: val })} />
              <Toggle label="Proactive" checked={!!v.deploymentSettings?.proactive} onChange={val => editDeploy({ proactive: val })} />
              <Toggle label="Outputs require Verify / Approve" checked={!!v.deploymentSettings?.requireVerify} onChange={val => editDeploy({ requireVerify: val })} />
            </div>
          )}
          {tab === 'Versions' && <AgentVersionHistory agent={agent} />}
        </Card>

        <div className="xl:sticky xl:top-4">
          <SystemPromptPreview version={v} customerName={ACTIVE_CUSTOMER.name} />
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return <label className="block"><span className="text-[11px] text-mist">{label}</span><div className="mt-1">{children}</div></label>
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
