/**
 * Governance dashboard — the unified home surface ("actions start here").
 *
 * Operator-first bento layout:
 *   1. Decision strip — reconciling stat chips (three filter the queue),
 *      the single most urgent hold with the page's one primary CTA, and
 *      a compact check-a-document drop target.
 *   2. Offerings rail — every product surface as a compact live tile,
 *      ranked so tiles with open work sort first.
 *   3. Triage queue — split-pane: dense row list + docked decision
 *      panel; the pane owns its height so the page never grows.
 *   4. Cortex band — the compounding-memory story, kept legible.
 * Frontend-only simulation, DS v2 Split Frame tokens throughout.
 */

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  Bot, Radar, Pen, Layers, Brain, Languages, Clapperboard,
} from 'lucide-react'
import { applyDecision, getDashboardState, isOpen, triageOrder, PRELOADED_ENTRIES } from '../../data/governanceDashboard'
import { METRICS } from '../../data/cortex'
import { EAVI, ALERTS } from '../../data/eav'
import { AGENTS } from '../../data/agentStudio'
import { ENSEMBLE_TEMPLATES } from '../../data/campaignModel'
import { dubbingSummary, DUB_PROJECTS } from '../../data/videoDubbing'
import { getSwiftBridgeDemo, slaCountdown } from '../../services/swiftbridge/swiftbridgeModel'
import { Card } from '../HITLVendorWorkflow/shared'
import { useToast } from '../ToastProvider'
import DecisionStrip from './DecisionStrip'
import OfferingTile from './OfferingTile'
import TriageQueue from './TriageQueue'
import MiniConstellation from './MiniConstellation'

const ACCEPTED_EXTENSIONS = '.docx, .pdf, .pptx, .xlsx, .mp4'

export default function GovernanceDashboard({
  onFileAccepted,
  onStartCampaign,
  onCreateContent,
  onOpenCortex,
  onOpenAgentStudio,
  onOpenAIVisibility,
  onOpenSwiftBridge,
  onOpenVideoDubbing,
}) {
  const { addToast } = useToast()
  const [liveState, setLiveState] = useState(() => getDashboardState(1))
  const [filter, setFilter] = useState(null)
  const [selectedHoldId, setSelectedHoldId] = useState(() => triageOrder(getDashboardState(1).heldChanges)[0]?.id ?? null)

  const { mode, stats, heldChanges } = liveState

  /* Decisions are computed off the current state, never inside a state
     updater — an updater can run twice, which would double-toast. */
  const handleDecide = useCallback((id, decision, reason) => {
    const change = liveState.heldChanges.find(c => c.id === id)
    const next = applyDecision(liveState, id, decision, reason)
    if (next !== liveState) {
      setLiveState(next)
      addToast(
        decision === 'approved'
          ? `Approved — ${change.title} published.`
          : `Sent back — ${change.title} returned to the author.`,
        decision === 'approved' ? 'success' : 'info',
      )
      // Triage flow: after deciding, move the operator to the next open hold.
      const nextOpen = triageOrder(next.heldChanges).find(c => isOpen(c) && c.id !== id)
      setSelectedHoldId(nextOpen ? nextOpen.id : id)
    }
  }, [liveState, addToast])

  const queueRef = useRef(null)
  /* The strip's Review button and the chips land the operator on the
     triage pane itself — no separate drawer surface to learn. */
  const handleOpenDetail = useCallback((id) => {
    setSelectedHoldId(id)
    queueRef.current?.scrollIntoView({ block: 'start' })
  }, [])

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

  /* ── The offerings, each with its live work state ─────────────
     `urgency` ranks the grid: cards with open work sort first, ties
     keep the declaration order below. All numbers come from the same
     seeded models the module pages themselves render — one story. */
  const offerings = useMemo(() => {
    const sb = getSwiftBridgeDemo()
    const sbActive = sb.projects.filter(p => p.status !== 'delivered')
    const sbBlocked = sbActive.filter(p => p.status === 'blocked')
    const sbNext = sbActive
      .map(p => ({ p, c: slaCountdown(p) }))
      .sort((a, b) => a.c.dueAt - b.c.dueAt)[0]

    const dub = dubbingSummary()
    const heldTrack = DUB_PROJECTS.flatMap(p => p.tracks).find(t => t.status === 'held' && t.stage === 'consent')

    const visAlerts = ALERTS.filter(a => !a.ack).length
    const activeAgents = AGENTS.filter(a => a.status === 'active')
    const agentIssues = activeAgents.reduce((n, a) => n + (a.openIssues || 0), 0)

    return [
      {
        key: 'swiftbridge', icon: Languages, iconClass: 'bg-straker-900 text-lens',
        label: 'SwiftBridge · Japan IR', mono: 'SLA-committed delivery',
        headline: sbActive.length, headlineSuffix: 'active',
        attention: sbBlocked.length
          ? `${sbBlocked.length} blocked — action needed`
          : (sbNext ? `next SLA ${sbNext.c.remainingHours}h` : null),
        allClear: 'on schedule',
        urgency: sbBlocked.length,
        onClick: onOpenSwiftBridge,
      },
      {
        key: 'video-dubbing', icon: Clapperboard,
        label: 'Video Dubbing', mono: 'one source video · every language',
        headline: dub.tracks, headlineSuffix: 'tracks',
        attention: dub.held ? `${dub.held} held — consent gate holding ${heldTrack ? heldTrack.lang : 'a track'}` : null,
        allClear: 'all cleared',
        urgency: dub.held,
        onClick: onOpenVideoDubbing,
      },
      {
        key: 'ai-visibility', icon: Radar,
        label: 'AI Visibility', mono: 'how AI answers speak about you',
        headline: EAVI.display, headlineSuffix: `/100 ▲${EAVI.trend90d}`,
        attention: visAlerts ? `${visAlerts} open alerts` : null,
        allClear: 'no open alerts',
        urgency: visAlerts,
        onClick: onOpenAIVisibility,
      },
      {
        key: 'agent-studio', icon: Bot,
        label: 'Agent Studio', mono: 'governed agents on your Cortex',
        headline: activeAgents.length, headlineSuffix: 'agents',
        attention: agentIssues ? `${agentIssues} open issues across agents` : null,
        allClear: 'all healthy',
        urgency: agentIssues,
        onClick: onOpenAgentStudio,
      },
      {
        key: 'create', icon: Pen,
        label: 'Create with Cortex', mono: 'reports & disclosures from verified memory',
        headline: METRICS.verifiedEntries.toLocaleString(), headlineSuffix: 'entries',
        attention: null,
        allClear: 'ready to draft',
        urgency: 0,
        onClick: onCreateContent,
      },
      {
        key: 'batch', icon: Layers,
        label: 'Check a batch', mono: 'multi-document run · risk heatmap',
        headline: ENSEMBLE_TEMPLATES.length, headlineSuffix: 'ensembles',
        attention: null,
        allClear: 'drop files to start',
        urgency: 0,
        onClick: onStartCampaign,
      },
    ].sort((a, b) => b.urgency - a.urgency)
  }, [onOpenSwiftBridge, onOpenVideoDubbing, onOpenAIVisibility, onOpenAgentStudio, onCreateContent, onStartCampaign])

  return (
    <div className="w-full max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 space-y-5">
      <input
        ref={fileInputRef} type="file" accept={ACCEPTED_EXTENSIONS}
        onChange={handleFileInputChange} className="hidden" aria-hidden="true" tabIndex={-1}
      />

      {/* ── 1 · Decision strip ── */}
      <DecisionStrip
        stats={stats} mode={mode}
        heldChanges={heldChanges} onOpenDetail={handleOpenDetail}
        onJumpToQueue={() => queueRef.current?.scrollIntoView({ block: 'start' })}
        dropRef={dropRef} isDragOver={isDragOver} openFilePicker={openFilePicker}
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
      />

      {/* ── 2 · Offerings rail ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {offerings.map(({ key, ...tile }) => (
          <OfferingTile key={key} {...tile} />
        ))}
      </div>

      {/* ── 3 · Triage queue ── */}
      <div ref={queueRef}>
        <TriageQueue
          heldChanges={heldChanges}
          mode={mode}
          filter={filter}
          onFilterChange={setFilter}
          selectedId={selectedHoldId}
          onSelect={setSelectedHoldId}
          onDecide={handleDecide}
        />
      </div>

      {/* ── 4 · Cortex band ── */}
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
