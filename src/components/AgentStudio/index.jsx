/**
 * Agent Studio — module shell + internal view router.
 *
 * Mounted as the `agent-studio` phase (nav sibling of Cortex / Analytics).
 * This app is phase-driven (no react-router), so the module's views are held
 * as local state: { view, agentId, runId }. Five surfaces: dashboard, the
 * 3-step wizard, the tabbed agent page (Overview · Configure · Analytics —
 * legacy view ids map onto its tabs), the playground, and the run trace.
 */

import { useState, useCallback } from 'react'
import { Bot, ChevronRight, ArrowLeft } from 'lucide-react'
import { useAgentStore, getAgentById } from '../../data/agentStudio'
import { MonoLabel } from './shared'
import AgentStudioDashboard from './AgentStudioDashboard'
import CreateAgentWizard from './CreateAgentWizard'
import AgentDetail from './AgentDetail'
import AgentPlayground from './AgentPlayground'
import AgentRunTrace from './AgentRunTrace'

// Legacy agent-scoped view ids → tabs on the single agent page.
const AGENT_TABS = { overview: 'overview', configure: 'configure', analytics: 'analytics', deployments: 'configure' }

const VIEW_LABEL = {
  playground: 'Playground',
  'run-trace': 'Run trace',
}

export default function AgentStudio({ onBack, currentUserId = 'You' }) {
  useAgentStore() // subscribe to store mutations
  const [nav, setNav] = useState({ view: 'dashboard', agentId: null, runId: null, template: null })

  const go = useCallback((view, extra = {}) => {
    setNav(prev => ({
      view,
      agentId: extra.agentId ?? prev.agentId,
      runId: extra.runId ?? prev.runId,
      template: view === 'new' ? (extra.template ?? null) : prev.template,
    }))
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 })
  }, [])

  const agent = nav.agentId ? getAgentById(nav.agentId) : null

  // Breadcrumb trail: Agent Studio › [Agent name] › (Playground / Run trace)
  const crumbs = [{ label: 'Agent Studio', onClick: () => go('dashboard', { agentId: null, runId: null }) }]
  if (agent && nav.view !== 'dashboard' && nav.view !== 'new') {
    crumbs.push({ label: agent.name, onClick: () => go('overview') })
  }
  if (nav.view === 'new') crumbs.push({ label: 'New agent' })
  else if (VIEW_LABEL[nav.view]) crumbs.push({ label: VIEW_LABEL[nav.view] })

  let screen
  if (nav.view === 'new') {
    screen = <CreateAgentWizard initialTemplate={nav.template} onCancel={() => go('dashboard')} onCreated={(id) => go('overview', { agentId: id })} currentUserId={currentUserId} />
  } else if (AGENT_TABS[nav.view]) {
    screen = <AgentDetail agentId={nav.agentId} tab={AGENT_TABS[nav.view]} go={go} />
  } else if (nav.view === 'playground') {
    screen = <AgentPlayground agentId={nav.agentId} go={go} />
  } else if (nav.view === 'run-trace') {
    screen = <AgentRunTrace runId={nav.runId} go={go} />
  } else {
    screen = <AgentStudioDashboard go={go} />
  }

  return (
    <div className="w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
      {/* Module header */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-ocean" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-ink leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Agent Studio</h1>
            <MonoLabel>Governed AI agents · powered by your Cortex</MonoLabel>
          </div>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate hover:text-ink border border-rule rounded-lg px-3 py-1.5 cursor-pointer hover:bg-pale transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to arbitr
        </button>
      </div>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[12px] mb-5" aria-label="Breadcrumb">
        {crumbs.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            {i > 0 && <ChevronRight className="w-3 h-3 text-mist" />}
            {c.onClick && i < crumbs.length - 1 ? (
              <button onClick={c.onClick} className="text-ocean hover:text-ocean/80 cursor-pointer">{c.label}</button>
            ) : (
              <span className={i === crumbs.length - 1 ? 'text-ink font-medium' : 'text-slate'}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      {screen}
    </div>
  )
}
