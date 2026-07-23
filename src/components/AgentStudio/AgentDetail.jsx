/**
 * Agent Studio — the ONE agent page.
 *
 * A thin tab wrapper (Overview · Configure · Analytics) around the existing
 * panels, so an agent is a single surface instead of four separate views.
 * Deployment lives inside Configure. The router maps the legacy view ids
 * (overview / configure / analytics / deployments) here, so all go() callers
 * keep working.
 */

import { getAgentById } from '../../data/agentStudio'
import { Card, AgentStatusBadge } from './shared'
import AgentOverview from './AgentOverview'
import AgentConfiguration from './AgentConfiguration'
import AgentAnalytics from './AgentAnalytics'

const TAB_VIEWS = [
  { id: 'overview', label: 'Overview' },
  { id: 'configure', label: 'Configure' },
  { id: 'analytics', label: 'Analytics' },
]

export default function AgentDetail({ agentId, tab = 'overview', go }) {
  const agent = getAgentById(agentId)
  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>

  return (
    <div className="space-y-4">
      {/* Agent tab bar */}
      <div className="flex items-center gap-1 border-b border-rule">
        {TAB_VIEWS.map(t => (
          <button
            key={t.id}
            onClick={() => go(t.id)}
            className={`px-3 py-2 -mb-px border-b-2 text-[12.5px] cursor-pointer transition-colors ${tab === t.id ? 'border-ocean text-ocean font-semibold' : 'border-transparent text-slate hover:bg-pale/50'}`}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto pb-1"><AgentStatusBadge status={agent.status} /></span>
      </div>

      {tab === 'overview' && <AgentOverview agentId={agentId} go={go} />}
      {tab === 'configure' && <AgentConfiguration agentId={agentId} go={go} />}
      {tab === 'analytics' && <AgentAnalytics agentId={agentId} go={go} />}
    </div>
  )
}
