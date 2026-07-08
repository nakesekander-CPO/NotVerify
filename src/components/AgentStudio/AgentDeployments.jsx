/**
 * Agent Studio — deployment settings.
 *
 * Controls where the agent appears inside arbitr, who can use it, scope
 * (projects/languages), whether it's proactive or invoked, and whether outputs
 * require Verify/Approve. Applying writes to the agent's active version's
 * deploymentSettings and the agent's live surface list. Version + rollback are
 * managed on the Configuration → Versions tab.
 */

import { useState } from 'react'
import { Rocket, Check, Info } from 'lucide-react'
import {
  getAgentById, activeVersion, useAgentStore, DEPLOYMENT_SURFACES,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton, StatusBadge,
} from './shared'
import { DeploymentSurfaceSelector } from './parts'

const ROLE_SCOPES = ['Admins', 'Reviewers', 'Operators', 'All members']

export default function AgentDeployments({ agentId, go }) {
  const { refresh } = useAgentStore()
  const agent = getAgentById(agentId)
  const v = agent ? activeVersion(agent) : null
  const [saved, setSaved] = useState(false)
  const [scope, setScope] = useState({
    surfaces: v?.deploymentSettings?.surfaces || agent?._deployedSurfaces || [],
    roles: ['Reviewers', 'Operators'],
    languages: agent?.supportedLanguages || ['en'],
    proactive: !!v?.deploymentSettings?.proactive,
    requireVerify: v?.deploymentSettings?.requireVerify ?? true,
    canComment: false,
  })
  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>

  const patch = (p) => { setScope(s => ({ ...s, ...p })); setSaved(false) }
  const apply = () => {
    v.deploymentSettings = { ...v.deploymentSettings, surfaces: scope.surfaces, proactive: scope.proactive, requireVerify: scope.requireVerify }
    agent._deployedSurfaces = scope.surfaces
    agent.updatedAt = new Date().toISOString()
    refresh(); setSaved(true)
  }

  return (
    <div className="space-y-5">
      <SectionHeading
        title={`Deployments · ${agent.name}`}
        subtitle="Choose where this agent appears inside arbitr and how it behaves."
        actions={<SecondaryButton onClick={() => go('overview')}>Back to overview</SecondaryButton>}
      />

      <div className="flex items-center gap-2 text-[12px] text-slate bg-pale/50 border border-rule rounded-lg px-3 py-2">
        <Info className="w-3.5 h-3.5 shrink-0 text-ocean" />
        Deploying v{v?.versionNumber} ({v?.status}). Roll back or promote a version from Configuration → Versions.
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <Card>
          <MonoLabel>Surfaces</MonoLabel>
          <p className="text-[12px] text-slate mt-1 mb-3">Where the agent is available. Human-review and QA surfaces keep the human in the loop.</p>
          <DeploymentSurfaceSelector value={scope.surfaces} onChange={v2 => patch({ surfaces: v2 })} />
        </Card>

        <div className="space-y-4">
          <Card>
            <MonoLabel>Who can use it</MonoLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ROLE_SCOPES.map(r => {
                const on = scope.roles.includes(r)
                return <button key={r} onClick={() => patch({ roles: on ? scope.roles.filter(x => x !== r) : [...scope.roles, r] })}
                  className={`px-2.5 py-1 rounded-full border text-[11.5px] cursor-pointer ${on ? 'bg-ocean text-white border-ocean' : 'bg-white text-slate border-rule hover:border-ocean/40'}`}>{r}</button>
              })}
            </div>
          </Card>
          <Card>
            <MonoLabel>Languages / locales</MonoLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(agent.supportedLanguages || ['en']).map(l => (
                <span key={l} className="px-2 py-0.5 rounded-full bg-pale border border-rule text-[11px] text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{l}</span>
              ))}
            </div>
          </Card>
          <Card>
            <MonoLabel>Behaviour</MonoLabel>
            <div className="mt-2 space-y-2">
              <Toggle label="Proactive (offers help unprompted)" checked={scope.proactive} onChange={val => patch({ proactive: val })} />
              <Toggle label="Can create comments (not just suggestions)" checked={scope.canComment} onChange={val => patch({ canComment: val })} />
              <Toggle label="Outputs require Verify / Approve" checked={scope.requireVerify} onChange={val => patch({ requireVerify: val })} />
            </div>
          </Card>
          <div className="flex items-center gap-2">
            <PrimaryButton onClick={apply}><Rocket className="w-3.5 h-3.5" /> Apply deployment</PrimaryButton>
            {saved && <span className="text-[12px] text-teal inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Saved</span>}
          </div>
        </div>
      </div>

      {/* Current deployment summary */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Currently deployed</p></div>
        {(agent._deployedSurfaces || []).length === 0
          ? <p className="text-[12.5px] text-mist px-5 py-4">Not deployed to any surface yet.</p>
          : <ul className="divide-y divide-rule">
              {agent._deployedSurfaces.map(s => {
                const surf = DEPLOYMENT_SURFACES.find(x => x.id === s)
                return (
                  <li key={s} className="px-5 py-3 flex items-center justify-between">
                    <div><p className="text-[12.5px] font-medium text-ink">{surf?.label || s}</p><p className="text-[11px] text-slate">{surf?.desc}</p></div>
                    <StatusBadge status={agent.status === 'active' ? 'active' : 'pending'}>{agent.status === 'active' ? 'Live' : 'Pending publish'}</StatusBadge>
                  </li>
                )
              })}
            </ul>}
      </Card>
    </div>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-2.5 text-left cursor-pointer w-full">
      <span className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${checked ? 'bg-ocean' : 'bg-rule-strong'}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </span>
      <span className="text-[12.5px] text-ink">{label}</span>
    </button>
  )
}
