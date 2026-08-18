/**
 * Agent Studio — dashboard.
 *
 * Lists the workspace's agents (card or table view) with search + filters, and
 * an empty state offering the six templates. Native arbitr styling; every row
 * shows the trust/governance signals (quality, open issues, credits, sources,
 * deployments).
 */

import { useMemo, useState } from 'react'
import {
  Plus, LayoutGrid, Table as TableIcon, Search, Bot, LifeBuoy, Languages,
  Scale, ShieldCheck, Inbox, Sparkles, Boxes, MapPin,
} from 'lucide-react'
import {
  useAgentStore, TEMPLATES, activeVersion, ACTIVE_CUSTOMER,
} from '../../data/agentStudio'
import {
  Card, MonoLabel, PrimaryButton, SecondaryButton, EmptyState,
  AgentStatusBadge, ConfidenceBadge, CreditUsageBadge,
} from './shared'

const TEMPLATE_ICON = {
  'life-buoy': LifeBuoy, languages: Languages, scale: Scale,
  'shield-check': ShieldCheck, inbox: Inbox, sparkles: Sparkles,
}
const AGENT_TYPE_LABEL = Object.fromEntries(TEMPLATES.map(t => [t.type, t.name]))

function relTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AgentStudioDashboard({ go }) {
  const { agents } = useAgentStore()
  const [layout, setLayout] = useState('cards')
  const [q, setQ] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [typeF, setTypeF] = useState('all')

  const filtered = useMemo(() => agents.filter(a => {
    if (statusF !== 'all' && a.status !== statusF) return false
    if (typeF !== 'all' && a.type !== typeF) return false
    if (q && !`${a.name} ${a.description} ${a.owner}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [agents, q, statusF, typeF])

  const hasAgents = agents.length > 0

  return (
    <div className="space-y-5">
      {/* No page title here — the module header above already names Agent
          Studio; this row carries only the description + primary actions. */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-5 border-b border-rule pb-4">
        <p className="text-[13px] text-slate max-w-2xl leading-relaxed">Create governed AI agents that use your Cortex and work inside arbitr.</p>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={() => go('new')}>Browse Templates</SecondaryButton>
          <PrimaryButton onClick={() => go('new')}><Plus className="w-4 h-4" /> Create Agent</PrimaryButton>
        </div>
      </div>

      {!hasAgents ? (
        <EmptyDashboard go={go} />
      ) : (
        <>
          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-mist absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                value={q} onChange={e => setQ(e.target.value)} placeholder="Search agents"
                className="w-full text-[13px] border border-rule rounded-lg pl-8 pr-3 py-2 focus:outline-none focus:border-ocean/50"
              />
            </div>
            <Select value={statusF} onChange={setStatusF} options={[['all', 'All statuses'], ['active', 'Active'], ['draft', 'Draft'], ['paused', 'Paused'], ['archived', 'Archived']]} />
            <Select value={typeF} onChange={setTypeF} options={[['all', 'All types'], ...TEMPLATES.map(t => [t.type, t.name])]} />
            <div className="inline-flex items-center rounded-lg border border-rule overflow-hidden">
              <button onClick={() => setLayout('cards')} aria-label="Card view" className={`px-2.5 py-2 cursor-pointer ${layout === 'cards' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
              <button onClick={() => setLayout('table')} aria-label="Table view" className={`px-2.5 py-2 cursor-pointer ${layout === 'table' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}><TableIcon className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          <p className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {filtered.length} agent{filtered.length === 1 ? '' : 's'} · workspace {ACTIVE_CUSTOMER.name}
          </p>

          {layout === 'cards' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(a => <AgentCard key={a.id} agent={a} onOpen={() => go('overview', { agentId: a.id })} />)}
            </div>
          ) : (
            <AgentTable agents={filtered} onOpen={(id) => go('overview', { agentId: id })} />
          )}
          {filtered.length === 0 && <p className="text-[13px] text-mist py-8 text-center">No agents match your filters.</p>}
        </>
      )}
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="text-[12.5px] border border-rule rounded-lg px-2.5 py-2 bg-white cursor-pointer text-slate">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}

export function AgentCard({ agent, onOpen }) {
  const Icon = TEMPLATE_ICON[agent.icon] || Bot
  const v = activeVersion(agent)
  return (
    <button onClick={onOpen} className="text-left w-full">
      <Card className="hover:border-ocean/40 transition-colors h-full cursor-pointer">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0"><Icon className="w-4.5 h-4.5 text-ocean" /></div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink truncate">{agent.name}</p>
              <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{AGENT_TYPE_LABEL[agent.type]}</p>
            </div>
          </div>
          <AgentStatusBadge status={agent.status} />
        </div>
        <p className="text-[12.5px] text-slate leading-relaxed mb-3 line-clamp-2">{agent.description}</p>
        <div className="flex items-center gap-3 flex-wrap text-[11px] text-mist mb-3">
          <span title="Knowledge sources" className="inline-flex items-center gap-1"><Boxes className="w-3 h-3" /> {v?.knowledgeScope?.length || 0} sources</span>
          <span title="Deployments" className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {(agent._deployedSurfaces || []).length} deployed</span>
          <CreditUsageBadge value={agent.creditsUsed} />
        </div>
        <div className="flex items-center justify-between border-t border-rule pt-2.5">
          <div className="flex items-center gap-2">
            {agent.qualityScore != null
              ? <span className="text-[11px] text-teal font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Quality {agent.qualityScore}</span>
              : <span className="text-[11px] text-mist">Not yet tested</span>}
            {agent.openIssues > 0 && <span className="text-[10.5px] text-[#996800] bg-[#FFF7E6] px-1.5 py-0.5 rounded-full">{agent.openIssues} open</span>}
          </div>
          <span className="text-[10.5px] text-mist">Last run {relTime(agent.lastRunAt)}</span>
        </div>
      </Card>
    </button>
  )
}

export function AgentTable({ agents, onOpen }) {
  return (
    <Card padding="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-pale/50 border-b border-rule text-left">
              {['Agent', 'Status', 'Type', 'Sources', 'Deployed', 'Quality', 'Issues', 'Credits', 'Owner', 'Last run'].map(h => (
                <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {agents.map(a => {
              const v = activeVersion(a)
              return (
                <tr key={a.id} onClick={() => onOpen(a.id)} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/40 cursor-pointer">
                  <td className="px-4 py-2.5 font-medium text-ink whitespace-nowrap">{a.name}</td>
                  <td className="px-4 py-2.5"><AgentStatusBadge status={a.status} /></td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{AGENT_TYPE_LABEL[a.type]}</td>
                  <td className="px-4 py-2.5 text-slate">{v?.knowledgeScope?.length || 0}</td>
                  <td className="px-4 py-2.5 text-slate">{(a._deployedSurfaces || []).length}</td>
                  <td className="px-4 py-2.5">{a.qualityScore != null ? <span className="text-teal">{a.qualityScore}</span> : <span className="text-mist">—</span>}</td>
                  <td className="px-4 py-2.5">{a.openIssues > 0 ? <span className="text-[#996800]">{a.openIssues}</span> : <span className="text-mist">0</span>}</td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(a.creditsUsed || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{a.owner}</td>
                  <td className="px-4 py-2.5 text-mist whitespace-nowrap">{relTime(a.lastRunAt)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function EmptyDashboard({ go }) {
  return (
    <div className="space-y-5">
      <Card>
        <EmptyState
          icon={Bot}
          title="Build your first governed agent"
          description="Agent Studio lets you create AI agents that use your Cortex, only do what you allow, cite their sources, and escalate to humans when it matters. Start from a template below."
        />
      </Card>
      <div>
        <MonoLabel>Start from a template</MonoLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
          {TEMPLATES.map(t => {
            const Icon = TEMPLATE_ICON[t.icon] || Bot
            return (
              <button key={t.type} onClick={() => go('new', { template: t.type })} className="text-left">
                <Card className="hover:border-ocean/40 transition-colors h-full cursor-pointer">
                  <div className="w-9 h-9 rounded-lg bg-ocean/10 flex items-center justify-center mb-2.5"><Icon className="w-4.5 h-4.5 text-ocean" /></div>
                  <p className="text-[14px] font-semibold text-ink">{t.name}</p>
                  <p className="text-[12px] text-slate leading-relaxed mt-1">{t.tagline}</p>
                </Card>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
