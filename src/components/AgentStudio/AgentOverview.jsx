/**
 * Agent Studio — agent overview.
 *
 * Summary of the agent + its active version, the trust/governance signals, and
 * the lifecycle CTAs (Edit / Test / Publish / Pause / Duplicate / Archive).
 * Recent runs + feedback link into the trace. Editing routes to the config
 * editor, which creates a draft version rather than mutating the published one.
 */

import {
  Pencil, Play, Rocket, Pause, Copy, Archive, RotateCcw, BookOpen, Boxes,
  Wrench, ShieldCheck, MapPin, ArrowRight,
} from 'lucide-react'
import {
  getAgentById, activeVersion, runsForAgent, publishAgent, setAgentStatus,
  duplicateAgent, DEPLOYMENT_SURFACES, KNOWLEDGE_CATALOG, CAPABILITY_CATALOG,
  GUARDRAIL_CATALOG, OUTPUT_STATUS_LABEL,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, KeyValueRow, PrimaryButton, SecondaryButton,
  DangerButton, AgentStatusBadge, OutputStatusBadge, ConfidenceBadge, CreditUsageBadge,
} from './shared'

const nameOf = (catalog, id) => catalog.find(x => x.id === id)?.name || catalog.find(x => x.id === id)?.label || id
const surfaceName = (id) => DEPLOYMENT_SURFACES.find(s => s.id === id)?.label || id

export default function AgentOverview({ agentId, go }) {
  const agent = getAgentById(agentId)
  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>
  const v = activeVersion(agent)
  const runs = runsForAgent(agent.id).slice(0, 5)
  const hasDraft = !!agent.draftVersionId
  const enabledGuardrails = GUARDRAIL_CATALOG.filter(g => g.locked || v?.guardrails?.enabled?.[g.id])

  const doDuplicate = () => { const c = duplicateAgent(agent.id); if (c) go('overview', { agentId: c.id }) }

  return (
    <div className="space-y-5">
      <SectionHeading
        title={agent.name}
        subtitle={agent.description}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <SecondaryButton onClick={() => go('configure')}><Pencil className="w-3.5 h-3.5" /> Edit</SecondaryButton>
            <SecondaryButton onClick={() => go('playground')}><Play className="w-3.5 h-3.5" /> Test</SecondaryButton>
            <SecondaryButton onClick={() => go('deployments')}><MapPin className="w-3.5 h-3.5" /> Deploy</SecondaryButton>
            {hasDraft && <PrimaryButton onClick={() => publishAgent(agent.id)}><Rocket className="w-3.5 h-3.5" /> Publish draft</PrimaryButton>}
            {agent.status === 'active'
              ? <SecondaryButton onClick={() => setAgentStatus(agent.id, 'paused')}><Pause className="w-3.5 h-3.5" /> Pause</SecondaryButton>
              : agent.status === 'paused'
                ? <SecondaryButton onClick={() => setAgentStatus(agent.id, 'active')}><Play className="w-3.5 h-3.5" /> Resume</SecondaryButton>
                : null}
            <SecondaryButton onClick={doDuplicate}><Copy className="w-3.5 h-3.5" /> Duplicate</SecondaryButton>
            {agent.status !== 'archived'
              ? <DangerButton onClick={() => setAgentStatus(agent.id, 'archived')}><Archive className="w-3.5 h-3.5" /> Archive</DangerButton>
              : <SecondaryButton onClick={() => setAgentStatus(agent.id, 'draft')}><RotateCcw className="w-3.5 h-3.5" /> Restore</SecondaryButton>}
          </div>
        }
      />

      {/* Status strip */}
      <div className="flex items-center gap-3 flex-wrap">
        <AgentStatusBadge status={agent.status} />
        <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v{v?.versionNumber} · {v?.status}{hasDraft ? ' (draft pending)' : ''}</span>
        <span className="text-[11px] text-mist">Owner {agent.owner}</span>
        {agent.qualityScore != null && <span className="text-[11px] text-teal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Quality {agent.qualityScore}</span>}
        <CreditUsageBadge value={agent.creditsUsed} />
        {agent.openIssues > 0 && <span className="text-[10.5px] text-amber-deep bg-amber/15 px-1.5 py-0.5 rounded-full">{agent.openIssues} open issue{agent.openIssues === 1 ? '' : 's'}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <div className="space-y-4">
          {/* Config summary */}
          <Card padding="p-0">
            <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Configuration</p></div>
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 text-[12.5px]">
              <KeyValueRow label="Type" value={agent.type.replace(/_/g, ' ')} />
              <KeyValueRow label="Mission" value={v?.mission || '—'} />
              <KeyValueRow label="Default language" value={agent.defaultLanguage} mono />
              <KeyValueRow label="Supported" value={(agent.supportedLanguages || []).join(', ')} mono />
            </div>
            <div className="px-5 pb-5 space-y-3">
              <SummaryChips icon={BookOpen} label="Knowledge" items={(v?.knowledgeScope || []).map(id => nameOf(KNOWLEDGE_CATALOG, id))} />
              <SummaryChips icon={Boxes} label="Capabilities" items={(v?.capabilities || []).map(id => nameOf(CAPABILITY_CATALOG, id))} />
              <SummaryChips icon={ShieldCheck} label="Guardrails" items={enabledGuardrails.map(g => g.name)} tone="teal" />
              <SummaryChips icon={MapPin} label="Deployed on" items={(agent._deployedSurfaces || []).map(surfaceName)} tone="ocean" empty="Not deployed yet" />
            </div>
          </Card>

          {/* Recent runs */}
          <Card padding="p-0">
            <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
              <p className="text-[13px] font-semibold text-ink">Recent runs</p>
              <button onClick={() => go('analytics')} className="text-[11.5px] text-ocean hover:text-ocean/80 cursor-pointer inline-flex items-center gap-1">Analytics <ArrowRight className="w-3 h-3" /></button>
            </div>
            {runs.length === 0
              ? <p className="text-[12.5px] text-mist px-5 py-4">No runs yet — test the agent in the playground.</p>
              : <ul className="divide-y divide-rule">
                  {runs.map(r => (
                    <li key={r.id}>
                      <button onClick={() => go('run-trace', { runId: r.id })} className="w-full text-left px-5 py-3 hover:bg-pale/40 cursor-pointer flex items-center gap-3">
                        <span className="flex-1 min-w-0"><span className="text-[12.5px] text-ink truncate block">{r.input}</span>
                          <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.userId} · {new Date(r.createdAt).toLocaleString()}</span></span>
                        <ConfidenceBadge value={r.confidence} />
                        <OutputStatusBadge status={r.outputStatus} />
                      </button>
                    </li>
                  ))}
                </ul>}
          </Card>
        </div>

        {/* Right rail: quick actions + guardrail posture */}
        <div className="space-y-4">
          <Card>
            <MonoLabel>Governance posture</MonoLabel>
            <ul className="mt-2 space-y-1.5 text-[12px] text-slate">
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-teal" /> {enabledGuardrails.length} guardrails enforced</li>
              <li className="flex items-center gap-2"><Wrench className="w-3.5 h-3.5 text-ocean" /> {(v?.tools || []).length} tools granted</li>
              <li className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-ocean" /> {(v?.knowledgeScope || []).length} knowledge sources</li>
              <li className="flex items-center gap-2 text-mist">Cross-workspace access blocked (always)</li>
            </ul>
          </Card>
          <Card>
            <MonoLabel>Version</MonoLabel>
            <p className="text-[13px] text-ink mt-1">v{v?.versionNumber} · <span className="text-slate">{v?.changeSummary}</span></p>
            <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v?.createdBy} · {v?.publishedAt ? `published ${new Date(v.publishedAt).toLocaleDateString()}` : 'draft'}</p>
            <div className="mt-3"><SecondaryButton onClick={() => go('configure')}>Manage versions</SecondaryButton></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryChips({ icon: Icon, label, items, tone = 'slate', empty = 'None' }) {
  const toneCls = tone === 'teal' ? 'bg-teal/10 text-teal border-teal/30' : tone === 'ocean' ? 'bg-ocean/10 text-ocean border-ocean/20' : 'bg-pale text-slate border-rule'
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5"><Icon className="w-3.5 h-3.5 text-mist" /><MonoLabel>{label}</MonoLabel></div>
      {items.length === 0 ? <p className="text-[11.5px] text-mist">{empty}</p> : (
        <div className="flex flex-wrap gap-1.5">
          {items.map((it, i) => <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full border ${toneCls}`}>{it}</span>)}
        </div>
      )}
    </div>
  )
}
