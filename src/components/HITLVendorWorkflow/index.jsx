/**
 * HITL Vendor Workflow — top-level container.
 *
 * Renders a fixed sidebar of sub-screens and switches between them.
 * RBAC is handled per-screen via service-layer calls; the sidebar
 * shows everything available to the demo current user.
 */

import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Users, FolderTree, ScrollText, Workflow, BadgeCheck,
  CheckSquare, ClipboardList, GraduationCap, Activity, ShieldCheck, FileSpreadsheet, X,
  UsersRound, Award, Trophy, Languages,
} from 'lucide-react'

import WorkflowOverview from './WorkflowOverview'
import VendorRegistry from './VendorRegistry'
import VendorPoolManager from './VendorPoolManager'
import SelectionPolicyBuilder from './SelectionPolicyBuilder'
import ProjectCockpit from './ProjectCockpit'
import VendorRecommendationPanel from './VendorRecommendationPanel'
import SecureVendorWorkspace from './SecureVendorWorkspace'
import TaskAssignment from './TaskAssignment'
import FinalSignOff from './FinalSignOff'
import RetrainingQueue from './RetrainingQueue'
import TrainerProfile from './TrainerProfile'
import AuditLogViewer from './AuditLogViewer'
import VendorAnalytics from './VendorAnalytics'
import EngagementHub from './EngagementHub'
import GlobalAdminSettings from './GlobalAdminSettings'
import SwiftBridge from './SwiftBridge'

const NAV = [
  { id: 'overview', label: 'Workflow Overview', icon: LayoutDashboard, group: 'Operations' },
  { id: 'projects', label: 'Project Cockpit', icon: ClipboardList, group: 'Operations' },
  { id: 'recommendation', label: 'Vendor Recommendation', icon: Workflow, group: 'Operations' },
  { id: 'assignments', label: 'Task Assignment', icon: UsersRound, group: 'Operations' },
  { id: 'workspace', label: 'Review Workspace', icon: CheckSquare, group: 'Operations' },
  { id: 'signoff', label: 'Final Sign-Off', icon: BadgeCheck, group: 'Operations' },
  { id: 'swiftbridge', label: 'SwiftBridge AI V2', icon: Languages, group: 'SwiftBridge Japan' },
  { id: 'retraining', label: 'Retraining Queue', icon: GraduationCap, group: 'Governance' },
  { id: 'trainer', label: 'Trainer Profile', icon: Award, group: 'Governance' },
  { id: 'audit', label: 'Audit Log', icon: ScrollText, group: 'Governance' },
  { id: 'analytics', label: 'Vendor Analytics', icon: Activity, group: 'Governance' },
  { id: 'engagement', label: 'Engagement Hub', icon: Trophy, group: 'Governance' },
  { id: 'vendors', label: 'Vendor Registry', icon: Users, group: 'Admin' },
  { id: 'pools', label: 'Vendor Pools', icon: FolderTree, group: 'Admin' },
  { id: 'policies', label: 'Selection Policies', icon: FileSpreadsheet, group: 'Admin' },
  { id: 'admin', label: 'Global Admin', icon: ShieldCheck, group: 'Admin' },
]

const SCREENS = {
  overview: WorkflowOverview,
  projects: ProjectCockpit,
  recommendation: VendorRecommendationPanel,
  assignments: TaskAssignment,
  workspace: SecureVendorWorkspace,
  signoff: FinalSignOff,
  swiftbridge: SwiftBridge,
  retraining: RetrainingQueue,
  trainer: TrainerProfile,
  audit: AuditLogViewer,
  analytics: VendorAnalytics,
  engagement: EngagementHub,
  vendors: VendorRegistry,
  pools: VendorPoolManager,
  policies: SelectionPolicyBuilder,
  admin: GlobalAdminSettings,
}

const GROUPS = ['Operations', 'SwiftBridge Japan', 'Governance', 'Admin']

export default function HITLVendorWorkflow({ currentUserId, onClose }) {
  const [active, setActive] = useState('overview')
  /* Cross-screen jump channel. Final Sign-Off sets this (e.g.
   * { segmentId } / { decision } / { flagCategory }) then navigates to
   * the workspace; SecureVendorWorkspace consumes it on mount, focuses
   * the matching segment, and clears it. */
  const [reviewFocus, setReviewFocus] = useState(null)
  const [activeProjectId, setActiveProjectId] = useState('hp-q3-ja-earnings')
  const Screen = SCREENS[active] || WorkflowOverview

  /* Review Mode = on the Review Workspace, the global app sidebar is
   * hidden so the reviewer can't bounce between projects, tasks, or
   * other governance screens mid-review. The only escape is the
   * explicit Exit Review control or Shift+E. */
  const inReviewMode = active === 'workspace'
  const exitReview = () => setActive('assignments')

  useEffect(() => {
    if (!inReviewMode) return
    function onKey(e) {
      if (e.key === 'E' && e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const tag = (e.target?.tagName || '').toUpperCase()
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return
        e.preventDefault(); exitReview()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [inReviewMode])

  return (
    <div className="fixed inset-0 z-40 bg-cream flex flex-col">
      {/* top bar */}
      <header className="h-14 shrink-0 border-b border-rule bg-white flex items-center px-6 justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="w-5 h-5 text-ocean" />
          <div>
            <p className="text-[14px] font-semibold text-ink leading-tight">
              {inReviewMode ? 'Review Mode' : 'HITL Vendor Workflow'}
            </p>
            <p className="text-[11px] text-mist leading-tight" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {inReviewMode
                ? 'arbitr · navigation hidden · Shift+E to exit'
                : 'arbitr · governed human-in-the-loop control plane'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Exit Review now lives inside the inner top task bar in
              QuickReviewWorkspace, so all task-level controls are in
              one horizontal band. Shift+E shortcut still active here. */}
          <button onClick={onClose} className="p-2 rounded-md hover:bg-pale text-slate cursor-pointer" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        {/* sidebar — hidden in Review Mode */}
        {!inReviewMode && (
        <aside className="w-64 shrink-0 border-r border-rule bg-white overflow-y-auto">
          <nav className="px-2 py-4 space-y-4">
            {GROUPS.map(group => (
              <div key={group}>
                <p className="px-3 mb-1 text-[10px] uppercase tracking-[0.18em] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{group}</p>
                <ul className="space-y-0.5">
                  {NAV.filter(n => n.group === group).map(n => {
                    const Icon = n.icon
                    const isActive = active === n.id
                    return (
                      <li key={n.id}>
                        <button
                          onClick={() => setActive(n.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-ocean text-white'
                              : 'text-ink hover:bg-pale'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{n.label}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        )}

        {/* content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className={inReviewMode ? 'max-w-[1480px] mx-auto px-6 py-6' : 'max-w-[1280px] mx-auto px-8 py-8'}>
            <Screen
              currentUserId={currentUserId}
              activeProjectId={activeProjectId}
              setActiveProjectId={setActiveProjectId}
              navigate={setActive}
              onExitReview={exitReview}
              onGoToSignoff={() => setActive('signoff')}
              reviewFocus={reviewFocus}
              setReviewFocus={setReviewFocus}
            />
          </div>
        </main>
      </div>
    </div>
  )
}
