/**
 * Enterprise AI Visibility (EAV) — module shell + internal left-nav router.
 *
 * Mounted as the `ai-visibility` phase (nav sibling of Cortex / Analytics).
 * 14 sections grouped by lifecycle (Measure · Improve · Monitor · Measure
 * Outcomes). Everything is FIXTURE data for the seeded Northstar workspace —
 * a persistent "Demo data" banner makes that unmistakable.
 */

import { useState } from 'react'
import { Radar, ArrowLeft, Info } from 'lucide-react'
import {
  EAV_NAV, EAV_NAV_GROUPS, WORKSPACE, METHODOLOGY_VERSION, BENCHMARK_HASH, EAVI_DISCLAIMER,
} from '../../data/eav'
import { MonoLabel, Card, SectionHeading, ProvenanceBadge } from './shared'
import Overview from './Overview'

// Sections are registered here as each ships. Unregistered sections fall back
// to a titled placeholder so the nav never dead-ends.
const SCREENS = {
  overview: Overview,
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
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center"><Radar className="w-4.5 h-4.5 text-ocean" /></div>
          <div>
            <h1 className="text-[18px] font-bold text-ink leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Enterprise AI Visibility</h1>
            <MonoLabel>{WORKSPACE.organisation} · {METHODOLOGY_VERSION} · {BENCHMARK_HASH}</MonoLabel>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ProvenanceBadge provenance="fixture" />
          <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12px] text-slate hover:text-ink border border-rule rounded-lg px-3 py-1.5 cursor-pointer hover:bg-pale transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to arbitr
          </button>
        </div>
      </div>

      {/* Persistent demo + disclaimer banner */}
      <div className="mb-5 rounded-lg border border-amber/30 bg-amber/10 px-3.5 py-2 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-amber-deep shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-amber-deep leading-relaxed">
          <strong>Demo data.</strong> {EAVI_DISCLAIMER}
        </p>
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
