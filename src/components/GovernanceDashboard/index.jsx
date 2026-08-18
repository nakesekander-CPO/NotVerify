/**
 * Governance dashboard — the unified home surface ("actions start here").
 *
 * Replaces both the old cold-start dashboard and the CommandSurface:
 * one component, two data states keyed off projectsCompleted. Anchored on
 * the held-changes queue under a Checks → Flags → Publishes stat row; the
 * right rail carries the entry actions (check a document, sample run,
 * module shortcuts); the Cortex mini-constellation closes the page.
 * Frontend-only simulation, DS v2 Split Frame tokens throughout.
 */

import { useCallback, useRef, useState } from 'react'
import {
  Upload, Bot, Radar, Pen, Layers, ChevronRight, Brain,
} from 'lucide-react'
import { getDashboardState, PRELOADED_ENTRIES } from '../../data/governanceDashboard'
import { METRICS } from '../../data/cortex'
import { Card, MonoLabel } from '../HITLVendorWorkflow/shared'
import MechanicStrip from './MechanicStrip'
import StatRow from './StatRow'
import HeldQueue from './HeldQueue'
import MiniConstellation from './MiniConstellation'
import SwiftBridgeCard from './SwiftBridgeCard'
import VideoDubbingCard from './VideoDubbingCard'

const ACCEPTED_EXTENSIONS = '.docx, .pdf, .pptx, .xlsx, .mp4'

export default function GovernanceDashboard({
  userName = 'Alex',
  companyName = 'Meridian Capital',
  projectsCompleted = 0,
  onFileAccepted,
  onStartCampaign,
  onCreateContent,
  onOpenCortex,
  onOpenAgentStudio,
  onOpenAIVisibility,
  onOpenSwiftBridge,
  onOpenVideoDubbing,
}) {
  const { mode, stats, heldChanges } = getDashboardState(projectsCompleted)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)
  const [isDragOver, setIsDragOver] = useState(false)

  /* file picker + drag & drop — contract to onFileAccepted unchanged */
  const openFilePicker = useCallback(() => { fileInputRef.current?.click() }, [])
  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file && onFileAccepted) onFileAccepted(file)
    e.target.value = ''
  }, [onFileAccepted])
  const handleDragOver = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback((e) => {
    e.preventDefault(); e.stopPropagation()
    if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) setIsDragOver(false)
  }, [])
  const handleDrop = useCallback((e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (file && onFileAccepted) onFileAccepted(file)
  }, [onFileAccepted])

  const shortcuts = [
    { icon: Bot, label: 'Agent Studio', desc: 'Governed agents on your Cortex', onClick: onOpenAgentStudio },
    { icon: Radar, label: 'AI Visibility', desc: 'How AI answers speak about you', onClick: onOpenAIVisibility },
    { icon: Pen, label: 'Create with Cortex', desc: 'Reports & disclosures from verified memory', onClick: onCreateContent },
    { icon: Layers, label: 'Check a batch', desc: 'Multi-document run with a risk heatmap', onClick: onStartCampaign },
  ]

  return (
    <div className="w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-5">
      <input
        ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileInputChange} className="hidden" aria-hidden="true" tabIndex={-1}
      />

      {/* ── Context line ── */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-bold text-ink tracking-tight">
            {mode === 'day0' ? `Welcome, ${userName}` : `Good morning, ${userName}`}
          </h1>
          <p className="text-[12.5px] text-slate mt-0.5">
            arbitr decides what's safe to publish — every change checked against {companyName}'s rules first.
          </p>
        </div>
        <MonoLabel>Checks → Flags → Publishes</MonoLabel>
      </div>

      {/* ── Mechanic strip ── */}
      <MechanicStrip />

      {/* ── Stats ── */}
      <StatRow stats={stats} mode={mode} />

      {/* ── Main zone: queue + action rail ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">
        <HeldQueue heldChanges={heldChanges} mode={mode} />

        <aside className="space-y-4 lg:sticky lg:top-[120px]">
          {/* Check a document */}
          <div
            ref={dropRef}
            role="button" tabIndex={0}
            onClick={openFilePicker}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker() } }}
            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
            aria-label="Check a document"
            className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors bg-white ${isDragOver ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}
          >
            <Upload className="w-5 h-5 text-ocean mx-auto mb-2" />
            <p className="text-[13px] font-semibold text-ink">Check a document</p>
            <p className="text-[11px] text-mist mt-0.5">Drop a file to run it through your rules · {ACCEPTED_EXTENSIONS}</p>
          </div>

          {/* Specific workflows, surfaced where actions start */}
          <SwiftBridgeCard onOpenSwiftBridge={onOpenSwiftBridge} />
          <VideoDubbingCard onOpenVideoDubbing={onOpenVideoDubbing} />

          {/* Module shortcuts */}
          <Card padding="p-0">
            <ul className="divide-y divide-rule">
              {shortcuts.map(s => {
                const Icon = s.icon
                return (
                  <li key={s.label}>
                    <button
                      onClick={() => s.onClick?.()}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-pale/60 transition-colors cursor-pointer"
                    >
                      <span className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-ocean" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-ink">{s.label}</span>
                        <span className="block text-[10.5px] text-mist truncate">{s.desc}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-mist shrink-0" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        </aside>
      </div>

      {/* ── Cortex ── */}
      <Card padding="p-0">
        <div className="px-5 py-3.5 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Brain className="w-4.5 h-4.5 text-ocean" />
            <p className="text-[14px] font-semibold text-ink">Your Cortex</p>
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/25">
              {mode === 'day0'
                ? `${PRELOADED_ENTRIES} entries pre-loaded`
                : `${METRICS.verifiedEntries.toLocaleString()} verified entries · +${METRICS.compoundingPct}% this quarter`}
            </span>
          </div>
          <p className="text-[11px] text-mist">
            {mode === 'day0'
              ? 'Industry rules pre-loaded from your configuration — every check adds more.'
              : 'Every review compounds into verified, customer-owned memory.'}
          </p>
        </div>
        <div className="p-4">
          <MiniConstellation onOpenCortex={onOpenCortex} />
        </div>
      </Card>
    </div>
  )
}
