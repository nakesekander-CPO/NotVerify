/**
 * Agent Studio — module shell + internal view router.
 *
 * Mounted as the `agent-studio` phase (nav sibling of Org Brain / Analytics).
 * This app is phase-driven (no react-router), so the module's 8 "routes" are
 * held as local view state: { view, agentId, runId }. A breadcrumb provides
 * back-navigation within the module; `onBack` returns to the app.
 */

import { useState, useCallback } from 'react'
import { Bot, ChevronRight, ArrowLeft } from 'lucide-react'
import { useAgentStore, getAgentById } from '../../data/agentStudio'
import { MonoLabel } from './shared'
import AgentStudioDashboard from './AgentStudioDashboard'
import CreateAgentWizard from './CreateAgentWizard'
import AgentOverview from './AgentOverview'
import AgentConfiguration from './AgentConfiguration'
import AgentPlayground from './AgentPlayground'
import AgentDeployments from './AgentDeployments'
import AgentAnalytics from './AgentAnalytics'
import AgentRunTrace from './AgentRunTrace'

const VIEW_LABEL = {
  dashboard: 'Agents',
  new: 'New agent',
  overview: 'Overview',
  configure: 'Configure',
  playground: 'Playground',
  deployments: 'Deployments',
  analytics: 'Analytics',
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

  // Breadcrumb trail: Agent Studio › [Agent name] › View
  const crumbs = [{ label: 'Agent Studio', onClick: () => go('dashboard', { agentId: null, runId: null }) }]
  if (agent && nav.view !== 'dashboard' && nav.view !== 'new') {
    crumbs.push({ label: agent.name, onClick: () => go('overview') })
  }
  if (nav.view === 'new') crumbs.push({ label: 'New agent' })
  else if (nav.view !== 'dashboard' && nav.view !== 'overview') crumbs.push({ label: VIEW_LABEL[nav.view] })

  let screen
  switch (nav.view) {
    case 'new':
      screen = <CreateAgentWizard initialTemplate={nav.template} onCancel={() => go('dashboard')} onCreated={(id) => go('overview', { agentId: id })} currentUserId={currentUserId} />
      break
    case 'overview':
      screen = <AgentOverview agentId={nav.agentId} go={go} />
      break
    case 'configure':
      screen = <AgentConfiguration agentId={nav.agentId} go={go} />
      break
    case 'playground':
      screen = <AgentPlayground agentId={nav.agentId} go={go} />
      break
    case 'deployments':
      screen = <AgentDeployments agentId={nav.agentId} go={go} />
      break
    case 'analytics':
      screen = <AgentAnalytics agentId={nav.agentId} go={go} />
      break
    case 'run-trace':
      screen = <AgentRunTrace runId={nav.runId} go={go} />
      break
    case 'dashboard':
    default:
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
            <MonoLabel>Governed AI agents · powered by your Org Brain</MonoLabel>
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
