/**
 * Enterprise AI Visibility (EAV) — module shell + internal left-nav router.
 *
 * Mounted as the `ai-visibility` phase (nav sibling of Cortex / Analytics).
 * 14 sections grouped by lifecycle (Measure · Improve · Monitor · Measure
 * Outcomes). Everything is FIXTURE data for the seeded Northstar workspace
 * (the header provenance chip was removed per ruling 2026-08-18).
 */

import { useState } from 'react'
import { Radar, ArrowLeft } from 'lucide-react'
import {
  EAV_NAV, EAV_NAV_GROUPS, WORKSPACE, METHODOLOGY_VERSION, BENCHMARK_HASH,
} from '../../data/eav'
import { MonoLabel, Card, SectionHeading, ProvenanceBadge } from './shared'
import { PageHeader } from '../ui'
import Overview from './Overview'
import VisibilityExplorer from './VisibilityExplorer'
import Competitors from './Competitors'
import Languages from './Languages'
import Citations from './Citations'
import PromptLibrary from './PromptLibrary'
import KnowledgeLayer from './KnowledgeLayer'
import Recommendations from './Recommendations'
import ContentApprovals from './ContentApprovals'
import Experiments from './Experiments'
import Outcomes from './Outcomes'
import Reports from './Reports'
import Alerts from './Alerts'
import Settings from './Settings'

const SCREENS = {
  overview: Overview,
  explorer: VisibilityExplorer,
  competitors: Competitors,
  languages: Languages,
  citations: Citations,
  prompts: PromptLibrary,
  knowledge: KnowledgeLayer,
  recommendations: Recommendations,
  content: ContentApprovals,
  experiments: Experiments,
  outcomes: Outcomes,
  reports: Reports,
  alerts: Alerts,
  settings: Settings,
}

export default function EnterpriseAIVisibility({ onBack }) {
  const [active, setActive] = useState('overview')
  const [ctx, setCtx] = useState({})          // cross-section jump payload (e.g. recId, promptId)
  const go = (view, extra = {}) => { setCtx(extra); setActive(view); if (typeof window !== 'undefined') window.scrollTo({ top: 0 }) }
  const Screen = SCREENS[active]
  const activeLabel = EAV_NAV.find(n => n.id === active)?.label || 'Section'

  return (
    <div className="w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-6">
      {/* Header */}
      <div className="mb-3">
        <PageHeader
          icon={Radar}
          title="Enterprise AI Visibility"
          subtitle={`${WORKSPACE.organisation} · ${METHODOLOGY_VERSION} · ${BENCHMARK_HASH}`}
          onBack={onBack}
          backLabel="Back to arbitr"
          actions={<ProvenanceBadge provenance="fixture" />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[210px_1fr] gap-6 items-start">
        {/* Left nav */}
        <nav className="lg:sticky lg:top-2 space-y-3" aria-label="AI Visibility sections">
          {EAV_NAV_GROUPS.map(group => {
            const items = EAV_NAV.filter(n => n.group === group)
            if (!items.length) return null
            return (
              <div key={group}>
                <p className="text-[10px] uppercase tracking-[0.16em] text-mist px-2 mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{group}</p>
                <div className="space-y-0.5">
                  {items.map(n => (
                    <button key={n.id} onClick={() => go(n.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-[12.5px] cursor-pointer transition-colors ${active === n.id ? 'bg-ocean/10 text-ocean font-medium' : 'text-slate hover:bg-pale'}`}>
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </nav>

        {/* Active section */}
        <div className="min-w-0">
          {Screen ? (
            <Screen go={go} ctx={ctx} />
          ) : (
            <div className="space-y-4">
              <SectionHeading title={activeLabel} subtitle="This section is part of the Enterprise AI Visibility module." />
              <Card><p className="text-[13px] text-mist">Coming up in this build.</p></Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* Shared placeholder for sections still being built out (kept until each ships). */
export function SectionPlaceholder({ title, note }) {
  return (
    <Card><p className="text-[13px] text-mist">{title}{note ? ` — ${note}` : ' — coming in this build.'}</p></Card>
  )
}
