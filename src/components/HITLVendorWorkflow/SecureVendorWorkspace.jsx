import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { Lock, MessageSquare, ChevronLeft, ChevronRight, AlertTriangle, Shield, Users, Sparkles, Book, Mic, Brain, Gauge, Plus } from 'lucide-react'
import {
  HITL_PROJECTS, HITL_TASKS, HITL_SEGMENTS, getVendorById,
  rationaleChipsForDomain, divergenceScore, divergenceMap,
  RULING_POSTURES, POSITIVE_CALIBRATION_CHIPS,
} from '../../data/hitlVendorWorkflow'
import { USERS } from '../../data/rbacModel'
import { decideSegment, addSegmentComment } from '../../services/hitl/review'
import { listMyTasks } from '../../services/hitl/taskAssignment'
import { segmentPedigree, contributorLifetimeImpact } from '../../services/hitl/pedigree'
import { SectionHeading, Card, MonoLabel, StatusBadge, PrimaryButton, SecondaryButton, DangerButton, ScoreBar } from './shared'
import { SegmentPedigreeCard } from './PedigreeCard'
import {
  EmptyStateStat, ConfidenceExplainer, WhyThisSegmentChips, JumpToFlagControl,
  KeyboardShortcutOverlay, ReviewerModeToggle, ContextualSideRail,
  AgentTrackRecordBadge, LocalizationGuardrails, WorkflowTabLegend,
  EdgeCasesPill, EdgeCasesPanel,
  ShortcutHintFooter, ReviewerModeCoachmark,
} from './cockpit'
import { isRole } from '../../services/hitl/rbac'
import QuickReviewWorkspace from './QuickReviewWorkspace'

export default function SecureVendorWorkspace({ activeProjectId, setActiveProjectId, currentUserId, onExitReview, onGoToSignoff }) {
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || HITL_PROJECTS[0]
  const [scope, setScope] = useState('all') // 'all' | 'mine'
  const allTasks = HITL_TASKS.filter(t => t.projectId === project.id)
  const myTaskIds = useMemo(() => new Set(listMyTasks(currentUserId, { projectId: project.id }).map(t => t.id)), [currentUserId, project.id, scope])
  const tasks = scope === 'mine' ? allTasks.filter(t => myTaskIds.has(t.id)) : allTasks
  const [activeTaskId, setActiveTaskId] = useState(tasks[0]?.id)
  // Re-sync active task if it disappears when switching scope.
  const effectiveTaskId = tasks.find(t => t.id === activeTaskId)?.id || tasks[0]?.id
  const segments = HITL_SEGMENTS.filter(s => s.taskId === effectiveTaskId)
  const activeTask = HITL_TASKS.find(t => t.id === effectiveTaskId)
  const [activeIdx, setActiveIdx] = useState(0)
  const [editing, setEditing] = useState('')
  const [reason, setReason] = useState('')
  const [comment, setComment] = useState('')
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  const activeSeg = segments[activeIdx]
  const vendor = getVendorById(activeTask?.assignedVendorId)
  const primaryReviewer = activeTask?.primaryReviewerId ? USERS.find(u => u.id === activeTask.primaryReviewerId) : null
  const collaborators = (activeTask?.collaboratorIds || []).map(id => USERS.find(u => u.id === id)).filter(Boolean)
  const isMine = activeTask && (activeTask.primaryReviewerId === currentUserId || activeTask.collaboratorIds.includes(currentUserId))

  const tally = useMemo(() => ({
    total: segments.length,
    verified: segments.filter(s => ['verified','accepted','edited'].includes(s.decision)).length,
    notVerified: segments.filter(s => ['not-verified','rejected'].includes(s.decision)).length,
    pending: segments.filter(s => s.decision === 'pending').length,
    needsRework: segments.filter(s => s.decision === 'needs-rework').length,
  }), [segments, activeSeg?.decision])

  /* ─── Triangulated review state ──────────────────────────────── */
  // posture            — null | 'accept' | 'refine' | 'reject'.
  //                      The Ruling field is LOCKED until posture is set.
  // chosenCandidateId  — which agent proposal is anchor of the ruling
  // authoredText       — validator's authored output (only used in refine/reject)
  // tags               — selected RATIONALE_CHIPS ids
  // reasonNote         — optional free-text annotation
  // calibrationChips   — Positive-Calibration selections (Accept path only)
  const [posture, setPosture] = useState(null)
  const [chosenCandidateId, setChosenCandidateId] = useState(null)
  const [authoredText, setAuthoredText] = useState('')
  const [tags, setTags] = useState([])
  const [reasonNote, setReasonNote] = useState('')
  const [calibrationChips, setCalibrationChips] = useState([])

  // Per-segment + per-candidate telemetry.
  const dwellStart = useRef(Date.now())
  const hoverStart = useRef({}) // { candidateId: timestamp when hover began }
  const telemetry = useRef({
    undoCount: 0,
    glossaryConsultations: 0,
    candidateHoverSeq: [],
    dwellPerCandidate: {},   // accumulated ms per candidateId
    postureTransitions: [],
    preferencePairs: [],
    summonedSecondOpinion: false,
  })

  useEffect(() => {
    setPosture(null)
    setChosenCandidateId(null)
    setAuthoredText('')
    setTags([])
    setReasonNote('')
    setCalibrationChips([])
    dwellStart.current = Date.now()
    hoverStart.current = {}
    telemetry.current = {
      undoCount: 0, glossaryConsultations: 0, candidateHoverSeq: [],
      dwellPerCandidate: {}, postureTransitions: [],
      preferencePairs: [], summonedSecondOpinion: false,
    }
  }, [activeSeg?.id])

  /* ─── Cockpit-level mode: Quick Review (default), Document view, vs Audit Review ── */
  const [cockpitMode, setCockpitMode] = useState('quick') // 'quick' | 'doc' | 'audit'
  /* ─── Audit-cockpit sub-mode: Reviewer Mode vs Compact View ────── */
  const [mode, setMode] = useState('reviewer')      // 'reviewer' (default) | 'compact'
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [forceOpenPanel, setForceOpenPanel] = useState(null)
  const [confidenceOpen, setConfidenceOpen] = useState(false)
  const [edgeCasesOpen, setEdgeCasesOpen] = useState(false)
  const isCompact = mode === 'compact'
  const isReviewer = !isCompact  // for legacy reference sites below
  // 'doc' (target-only reading view) routes through the QuickReviewWorkspace
  // shell — the workspace component switches its body based on cockpitMode
  // so the top task bar, flag strip, and right rail stay consistent.
  const isQuick = cockpitMode === 'quick' || cockpitMode === 'doc'

  // Helper: record a posture transition (audit-grade telemetry).
  const setPostureWithTrace = (next) => {
    const prev = posture
    if (prev !== next) {
      telemetry.current.postureTransitions.push({ from: prev, to: next, at: Date.now() })
    }
    setPosture(next)
  }

  // Helper: when the user picks B over A, record the preference pair.
  const recordPreference = (chosenId) => {
    if (!chosenId || !candidates?.length) return
    for (const c of candidates) {
      if (c.id !== chosenId) telemetry.current.preferencePairs.push({ chosen: chosenId, rejected: c.id, atPosture: posture })
    }
  }

  // Calibration auto-flash: hides itself after 2.5s on Accept-as-is.
  const [showCalibrationFlash, setShowCalibrationFlash] = useState(false)
  const flashTimer = useRef(null)

  // Local "summoned" candidate state. A summon synthesises an extra
  // candidate (in production this would call another agent). For demo we
  // produce a temperature-shifted variant of the top proposal.
  const [summonedCandidate, setSummonedCandidate] = useState(null)
  useEffect(() => { setSummonedCandidate(null) }, [activeSeg?.id])

  const candidates = useMemo(() => {
    const list = [...(activeSeg?.agentCandidates || [])]
    if (summonedCandidate) list.push(summonedCandidate)
    return list.sort((a, b) => b.confidence - a.confidence)
  }, [activeSeg?.id, summonedCandidate])

  const divergence = useMemo(() => divergenceScore(candidates), [candidates])
  const divMap = useMemo(() => divergenceMap(candidates), [candidates])
  const chips = useMemo(() => rationaleChipsForDomain(project.requirements.domain), [project.requirements.domain])

  const summonSecondOpinion = () => {
    if (summonedCandidate || candidates.length === 0) return
    const top = candidates[0]
    telemetry.current.summonedSecondOpinion = true
    // Synthetic alt: a paraphrased version with a small confidence haircut.
    const alt = {
      id: 'summoned-' + Date.now(),
      agentId: 'jp-fin-3',
      agentName: 'JP-FIN-3 (T=0.8)',
      version: top.version,
      confidence: Math.max(0.5, top.confidence - 0.08),
      text: top.text.replace(/、/g, '，').replace(/。$/, '．'),
      pedigreeTags: top.pedigreeTags,
    }
    setSummonedCandidate(alt)
  }

  // Smart-Reply suggestion: pre-illuminate one chip based on errorCategory.
  const suggestedChipId = useMemo(() => {
    if (!activeSeg) return null
    const cat = activeSeg.errorCategory
    if (cat === 'terminology') return chips.find(c => c.id.startsWith('term-'))?.id || 'register'
    if (cat === 'regulatory') return chips.find(c => c.id.startsWith('reg-'))?.id || 'register'
    if (cat === 'brand-voice') return 'brand-voice'
    if (cat === 'accuracy') return 'source-drift'
    return null
  }, [activeSeg?.id, chips.length])

  const toggleTag = (id) => setTags(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  // Flush any open hover into dwellPerCandidate.
  const closeOpenHovers = () => {
    const now = Date.now()
    for (const [cid, started] of Object.entries(hoverStart.current)) {
      if (!started) continue
      telemetry.current.dwellPerCandidate[cid] = (telemetry.current.dwellPerCandidate[cid] || 0) + (now - started)
      hoverStart.current[cid] = null
    }
  }

  const buildTelemetry = () => {
    closeOpenHovers()
    return {
      dwellMs: Date.now() - dwellStart.current,
      dwellPerCandidate: telemetry.current.dwellPerCandidate,
      undoCount: telemetry.current.undoCount,
      glossaryConsultations: telemetry.current.glossaryConsultations,
      candidateHoverSeq: telemetry.current.candidateHoverSeq,
      crossRefJumps: 0,
      posture,
      postureTransitions: telemetry.current.postureTransitions,
      preferencePairs: telemetry.current.preferencePairs,
      summonedSecondOpinion: telemetry.current.summonedSecondOpinion,
      calibrationChips,
    }
  }

  // Per-candidate hover lifecycle.
  const onCandidateEnter = (cand) => {
    hoverStart.current[cand.id] = Date.now()
    const seq = telemetry.current.candidateHoverSeq
    if (seq[seq.length - 1] !== cand.id) seq.push(cand.id)
  }
  const onCandidateLeave = (cand) => {
    const started = hoverStart.current[cand.id]
    if (!started) return
    telemetry.current.dwellPerCandidate[cand.id] = (telemetry.current.dwellPerCandidate[cand.id] || 0) + (Date.now() - started)
    hoverStart.current[cand.id] = null
  }

  /* Posture → action map.
   *   accept → verified, with chosenCandidateId
   *   refine → edited, with newValue = authoredText (seeded from chosen)
   *   reject → not-verified, requires tags + reasonNote
   */
  const postureToAction = { accept: 'verified', refine: 'edited', reject: 'not-verified' }

  const commitRuling = () => {
    if (!activeSeg) return
    if (!posture) {
      window.alert('Choose a posture first: Accept as-is, Refine, or Reject.')
      return
    }
    if (posture === 'refine' && !authoredText.trim()) {
      window.alert('Refine requires an edited ruling.')
      return
    }
    if (posture === 'reject') {
      if (!authoredText.trim() && tags.length === 0 && !reasonNote.trim()) {
        window.alert('Reject requires either an alternative ruling, a rationale tag, or a reason note.')
        return
      }
    }
    // Record preference pair when posture commits with a chosen anchor.
    if (chosenCandidateId) recordPreference(chosenCandidateId)
    const action = postureToAction[posture]
    try {
      decideSegment({
        segmentId: activeSeg.id,
        actorId: currentUserId,
        action,
        newValue: posture === 'accept'
          ? null
          : authoredText.trim() || null,
        reason: reasonNote || tags.join(', ') || null,
        chosenCandidateId: posture === 'accept' ? chosenCandidateId : (posture === 'refine' ? chosenCandidateId : null),
        rejectedCandidateIds: candidates
          .filter(c => c.id !== chosenCandidateId)
          .map(c => c.id),
        rationaleTags: tags,
        reasonNote: reasonNote || null,
        telemetry: buildTelemetry(),
      })
      // Reset state, advance to the next segment if available.
      setPosture(null); setChosenCandidateId(null); setAuthoredText('')
      setTags([]); setReasonNote(''); setCalibrationChips([])
      setShowCalibrationFlash(false)
      refresh()
    } catch (e) {
      window.alert(`Action denied: ${e.message}`)
    }
  }

  // Lateral actions still available regardless of posture (rework, escalate, lock).
  const lateral = (action) => {
    if (!activeSeg) return
    if (tags.length === 0 && !reasonNote.trim()) {
      window.alert('A rationale tag or reason note is required for this action.')
      return
    }
    try {
      decideSegment({
        segmentId: activeSeg.id, actorId: currentUserId, action,
        reason: reasonNote || tags.join(', ') || null,
        chosenCandidateId, rejectedCandidateIds: candidates.filter(c => c.id !== chosenCandidateId).map(c => c.id),
        rationaleTags: tags, reasonNote: reasonNote || null,
        telemetry: buildTelemetry(),
      })
      setTags([]); setReasonNote('')
      refresh()
    } catch (e) { window.alert(`Action denied: ${e.message}`) }
  }

  // Posture click handlers — each one also pre-seeds the Ruling state.
  const pickAccept = (cand) => {
    setPostureWithTrace('accept')
    setChosenCandidateId(cand.id)
    setAuthoredText('') // Accept never carries authored text
    // Positive-Calibration 2.5s flash
    setShowCalibrationFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setShowCalibrationFlash(false), 2500)
  }
  const pickRefine = (cand) => {
    setPostureWithTrace('refine')
    setChosenCandidateId(cand?.id || candidates[0]?.id || null)
    setAuthoredText((cand || candidates[0])?.text || '')
  }
  const pickReject = () => {
    setPostureWithTrace('reject')
    setChosenCandidateId(null)
    setAuthoredText('')
  }

  const toggleCalibration = (id) => setCalibrationChips(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  /* ─── Keyboard shortcut layer ─────────────────────────────────
   * Single global key handler. Disabled when focus is in a text
   * input — except Cmd/Ctrl+Enter which always commits. Every
   * keyboard-driven decision records `viaShortcut: true` on its
   * posture transition.
   * ──────────────────────────────────────────────────────────── */
  const ensureCandidate = useCallback((n) => {
    const c = candidates[n - 1]
    if (c) telemetry.current.candidateHoverSeq.push(c.id)
    return c || null
  }, [candidates])

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target?.tagName || '').toUpperCase()
      const inText = (tag === 'TEXTAREA' || (tag === 'INPUT' && e.target.type === 'text')) && !(e.metaKey || e.ctrlKey)
      // Always-on: Cmd/Ctrl+Enter commits even from text fields.
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (posture) { e.preventDefault(); commitRuling() }
        return
      }
      if (inText) return
      // Numeric: select candidate N.
      if (/^[1-4]$/.test(e.key)) {
        const c = ensureCandidate(parseInt(e.key, 10))
        if (c) { setChosenCandidateId(c.id); e.preventDefault() }
        return
      }
      switch (e.key) {
        case 'a': case 'A': {
          const c = candidates.find(x => x.id === chosenCandidateId) || candidates[0]
          if (c) {
            pickAccept(c); e.preventDefault()
            if (isReviewer) setTimeout(() => commitRuling(), 0)
          }
          return
        }
        case 'r': case 'R': {
          const c = candidates.find(x => x.id === chosenCandidateId) || candidates[0]
          if (c) { pickRefine(c); e.preventDefault() }
          return
        }
        case 'x': case 'X': {
          pickReject(); e.preventDefault(); return
        }
        case 'j': case 'J': {
          if (activeIdx < segments.length - 1) setActiveIdx(activeIdx + 1)
          e.preventDefault(); return
        }
        case 'k': case 'K': {
          if (activeIdx > 0) setActiveIdx(activeIdx - 1)
          e.preventDefault(); return
        }
        case 'f': {
          const flaggedIdxs = segments.map((s, i) => ((s.flagCategories || []).length ? i : -1)).filter(i => i !== -1)
          if (!flaggedIdxs.length) return
          const nextIdx = flaggedIdxs.find(i => i > activeIdx)
          setActiveIdx(nextIdx != null ? nextIdx : flaggedIdxs[0])
          e.preventDefault(); return
        }
        case 'F': {
          const flaggedIdxs = segments.map((s, i) => ((s.flagCategories || []).length ? i : -1)).filter(i => i !== -1)
          if (!flaggedIdxs.length) return
          const prevIdx = [...flaggedIdxs].reverse().find(i => i < activeIdx)
          setActiveIdx(prevIdx != null ? prevIdx : flaggedIdxs[flaggedIdxs.length - 1])
          e.preventDefault(); return
        }
        case 'g': case 'G': setForceOpenPanel('orgbrain'); e.preventDefault(); return
        case 'b': case 'B': setForceOpenPanel('back');     e.preventDefault(); return
        case 'q': case 'Q': setForceOpenPanel('qa');       e.preventDefault(); return
        case 't': case 'T': setConfidenceOpen(o => !o);    e.preventDefault(); return
        case 'e': case 'E': setEdgeCasesOpen(o => !o);     e.preventDefault(); return
        case 'm': case 'M': setMode(m => m === 'compact' ? 'reviewer' : 'compact'); e.preventDefault(); return
        case 'Escape': setShowShortcuts(false); setForceOpenPanel(null); setEdgeCasesOpen(false); if (isCompact) setMode('reviewer'); return
        case '?': setShowShortcuts(true); e.preventDefault(); return
        default: return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [candidates, chosenCandidateId, posture, activeIdx, segments, isCompact, ensureCandidate])

  const handleComment = () => {
    if (!comment.trim() || !activeSeg) return
    try {
      addSegmentComment({ segmentId: activeSeg.id, actorId: currentUserId, text: comment.trim() })
      setComment('')
      refresh()
    } catch (e) {
      window.alert(`Comment denied: ${e.message}`)
    }
  }

  // Reviewer-facing decision label, by role.
  const decisionLabel = useMemo(() => {
    if (!currentUserId) return 'Your decision'
    if (isRole(currentUserId, 'final-validator')) return 'Final validation'
    if (isRole(currentUserId, 'auditor', 'arbitr-global-admin')) return "Validator's ruling"
    return 'Your decision'
  }, [currentUserId])

  // In Audit, show the Quick/Audit chip + Reviewer/Compact toggle.
  // In Quick, the Quick/Audit chip lives inside the QuickReview top bar
  // so all task-level controls are in one horizontal band — no
  // disconnected upper-right cluster.
  const headerActions = isQuick
    ? null
    : (
      <div className="inline-flex items-center gap-2">
        <CockpitModeChip mode={cockpitMode} onChange={setCockpitMode} />
        <ReviewerModeToggle mode={mode} onToggle={() => setMode(m => m === 'compact' ? 'reviewer' : 'compact')} onOpenShortcuts={() => setShowShortcuts(true)} />
      </div>
    )

  return (
    <div className="relative">
      {!isQuick && <ReviewerModeCoachmark />}
      {/* In Quick mode the top task bar in QuickReviewWorkspace is the
          page heading. In Audit mode we keep the full SectionHeading. */}
      {!isQuick && (
        <SectionHeading
          title="Triangulated Review Workspace"
          subtitle={`${labelForMode(project.requirements.reviewMode)}. The reviewer decides between agent proposals, captures a structured reason, and commits a decision that becomes training signal. Every keystroke is auditable.`}
          actions={headerActions}
        />
      )}

      {/* Project picker + legend + scope toggle + secure banner —
          AUDIT REVIEW ONLY. In Quick Review the project / scope / task
          switching lives in the left nav and the secure session
          collapses to a Lock icon next to the title. */}
      {!isQuick && (<>
      <div className="flex items-center gap-3 mb-2">
        <WorkflowTabLegend />
      </div>
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {HITL_PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => { setActiveProjectId?.(p.id); setActiveIdx(0) }}
            className={`px-3 py-1.5 rounded-md border text-[12px] transition-colors cursor-pointer ${project.id === p.id ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-ink hover:border-ocean/40'}`}
          >
            <span className={`text-[10px] uppercase tracking-wider mr-2 px-1.5 py-0.5 rounded-full ${
              p.requirements.reviewMode === 'external-vendor' ? 'bg-ocean/10 text-ocean'
              : p.requirements.reviewMode === 'internal-single' ? 'bg-teal/10 text-teal'
              : 'bg-amber/15 text-amber-deep'
            }`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{shortMode(p.requirements.reviewMode)}</span>
            {p.name}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setScope('all')}
          className={`px-3 py-1.5 rounded-md border text-[12px] cursor-pointer ${scope === 'all' ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-slate hover:border-ocean/30'}`}
        >All tasks ({allTasks.length})</button>
        <button
          onClick={() => setScope('mine')}
          className={`px-3 py-1.5 rounded-md border text-[12px] cursor-pointer ${scope === 'mine' ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-slate hover:border-ocean/30'}`}
        >My queue ({myTaskIds.size})</button>
      </div>

      <div className="bg-pale border border-ocean/20 rounded-md px-4 py-3 mb-5 flex items-center gap-3">
        <Shield className="w-4 h-4 text-ocean shrink-0" />
        <div className="flex-1 text-[12.5px] text-ink">
          <span className="font-semibold">Secure session:</span> watermarked view · downloads disabled · copy/paste restricted · expires when assignment closes.
        </div>
        <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SESSION-{currentUserId?.slice(0, 4) || 'demo'}</span>
      </div>
      </>)}

      {isQuick && (
        <QuickReviewWorkspace
          project={project}
          task={activeTask}
          segments={segments}
          activeIdx={activeIdx}
          setActiveIdx={setActiveIdx}
          currentUserId={currentUserId}
          currentUserRole={isRole(currentUserId, 'vendor-user', 'vendor-admin') ? 'vendor-user' : isRole(currentUserId, 'client-reviewer') ? 'client-reviewer' : 'internal-reviewer'}
          cockpitMode={cockpitMode}
          setCockpitMode={setCockpitMode}
          onExitReview={onExitReview}
          onGoToSignoff={onGoToSignoff}
        />
      )}

      {!isQuick && (
      <>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Verified" value={`${tally.verified} / ${tally.total}`} />
        <Stat label="Not verified" value={tally.notVerified} />
        <Stat label="Pending" value={tally.pending} />
      </div>

      <div className={isCompact ? 'grid grid-cols-[200px_1fr_64px] gap-3' : 'grid grid-cols-[1fr_2fr_320px] gap-4'}>
        {/* Task + segment list */}
        <div>
          <Card padding="p-3">
            <MonoLabel>Tasks</MonoLabel>
            <ul className="mt-2 space-y-1.5">
              {tasks.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => { setActiveTaskId(t.id); setActiveIdx(0) }}
                    className={`w-full text-left p-2.5 rounded-md border cursor-pointer transition-colors ${activeTaskId === t.id ? 'border-ocean bg-pale' : 'border-rule bg-white hover:border-ocean/30'}`}
                  >
                    <p className="text-[12.5px] font-semibold text-ink truncate">{t.title}</p>
                    <p className="text-[10.5px] text-mist">{t.wordCount.toLocaleString()} words · due {new Date(t.dueAt).toLocaleDateString()}</p>
                    <div className="mt-1.5"><StatusBadge status={t.status} /></div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          <Card padding="p-3" className="mt-3">
            <MonoLabel>Segments</MonoLabel>
            <ul className="mt-2 max-h-[420px] overflow-y-auto pr-1">
              {segments.map((s, i) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left px-2 py-1.5 rounded text-[12px] cursor-pointer flex items-center gap-2 ${i === activeIdx ? 'bg-pale text-ocean' : 'text-slate hover:bg-pale/50'}`}
                  >
                    <span className="text-mist w-6 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</span>
                    <span className="truncate flex-1">{s.source.slice(0, 60)}…</span>
                    {s.decision !== 'pending' && <StatusBadge status={s.decision} />}
                    {s.locked && <Lock className="w-3 h-3 text-slate" />}
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Segment editor */}
        <div>
          {!activeSeg ? (
            <Card><p className="text-mist">No segment selected.</p></Card>
          ) : (
            <Card padding="p-0">
              {/* Assignment context strip */}
              {activeTask && (
                <div className="px-5 py-3 border-b border-rule bg-cream/50 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[12px]">
                    <Users className="w-3.5 h-3.5 text-ocean" />
                    {primaryReviewer ? (
                      <>
                        <span className="text-slate">Primary</span>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ocean/10 border border-ocean/30 text-ocean">
                          <span className="w-5 h-5 rounded-full bg-ocean text-white text-[10px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{primaryReviewer.initials}</span>
                          {primaryReviewer.name}
                        </span>
                        {collaborators.length > 0 && (
                          <>
                            <span className="text-slate ml-2">Co</span>
                            {collaborators.map(c => (
                              <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pale border border-rule text-[10.5px] text-ocean">
                                <span className="w-4 h-4 rounded-full bg-mist text-white text-[9px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.initials}</span>
                                {c.initials}
                              </span>
                            ))}
                          </>
                        )}
                      </>
                    ) : (
                      <span className="text-amber-deep">Unassigned — assign a reviewer in Task Assignment</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{activeTask.assignmentMode?.toUpperCase() || 'SINGLE'}</span>
                    {!isMine && primaryReviewer && (
                      <span className="px-2 py-0.5 rounded-full bg-amber/10 text-amber-deep border border-amber/30">Viewing as observer</span>
                    )}
                  </div>
                </div>
              )}

              <div className="px-5 py-3 border-b border-rule">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <MonoLabel>Segment {activeIdx + 1} of {segments.length}</MonoLabel>
                    {activeSeg.riskFlags.length > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-deep"><AlertTriangle className="w-3 h-3" /> low confidence</span>
                    )}
                    {activeSeg.errorCategory && <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{activeSeg.errorCategory}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <EdgeCasesPill segment={activeSeg} onOpen={() => setEdgeCasesOpen(true)} />
                    <JumpToFlagControl segments={segments} activeIdx={activeIdx} onJump={(i) => setActiveIdx(i)} />
                    <button className="p-1.5 rounded hover:bg-pale cursor-pointer" disabled={activeIdx === 0} onClick={() => setActiveIdx(activeIdx - 1)} title="Previous (K)"><ChevronLeft className="w-4 h-4 text-slate" /></button>
                    <button className="p-1.5 rounded hover:bg-pale cursor-pointer" disabled={activeIdx === segments.length - 1} onClick={() => setActiveIdx(activeIdx + 1)} title="Next (J)"><ChevronRight className="w-4 h-4 text-slate" /></button>
                  </div>
                </div>
                <WhyThisSegmentChips
                  segment={activeSeg}
                  project={project}
                  candidates={candidates}
                  onShowEvidence={(panelId) => setForceOpenPanel(panelId)}
                />
                <LocalizationGuardrails segment={activeSeg} />
              </div>

              <div className="px-5 py-4 space-y-4">
                {/* ADJUDICATION HEADER */}
                <AdjudicationHeader
                  segment={activeSeg}
                  currentUserId={currentUserId}
                  segments={segments}
                  dwellStart={dwellStart}
                />

                {/* SOURCE ANCHOR */}
                <Field label="Source · the meaning to preserve">
                  <p className="text-[14px] text-ink leading-relaxed">{activeSeg.source}</p>
                </Field>

                {/* PANEL OF AGENTS */}
                <Field
                  label={`Panel of Agents · ${candidates.length} proposals`}
                  right={
                    <div className="flex items-center gap-3">
                      <DivergenceLegend />
                      <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        DIVERGENCE {divergence.toFixed(2)}
                      </span>
                    </div>
                  }
                >
                  <div className="space-y-2">
                    {candidates.map((c, idx) => {
                      const isChosen = chosenCandidateId === c.id
                      const segments = divMap.get(c.id) || [{ kind: 'shared', text: c.text }]
                      const isAnchor = idx === 0
                      return (
                        <div
                          key={c.id}
                          onMouseEnter={() => onCandidateEnter(c)}
                          onMouseLeave={() => onCandidateLeave(c)}
                          className={`rounded-md border p-3 transition-colors ${isChosen ? 'border-amber bg-amber/5' : 'border-rule bg-white hover:border-ocean/30'}`}
                        >
                          <div className="flex items-center justify-between mb-1.5 gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[11px] font-semibold text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.agentName}</span>
                              <span className="text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.version}</span>
                              {isAnchor && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-ocean text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>anchor</span>}
                              {c.pedigreeTags?.slice(0, 2).map(tag => (
                                <span key={tag} className="px-1.5 py-0.5 rounded-full bg-pale text-[10px] text-ocean" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{tag}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-20"><ScoreBar value={c.confidence * 100} color={c.confidence >= 0.85 ? 'teal' : c.confidence >= 0.7 ? 'ocean' : 'amber'} /></div>
                              <span className="text-[11px] font-mono text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(c.confidence * 100).toFixed(0)}%</span>
                            </div>
                          </div>
                          {/* Divergence-mapped text */}
                          <p className="text-[13px] leading-relaxed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {segments.map((s, k) => (
                              <span
                                key={k}
                                className={s.kind === 'diff'
                                  ? 'bg-amber/20 text-ink rounded px-0.5'
                                  : 'text-ink'}
                              >{s.text}</span>
                            ))}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10.5px] text-mist">model signature: <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.agentId}@{c.version}</span></span>
                              <AgentTrackRecordBadge agentId={c.agentId} domain={project.requirements.domain} />
                            </div>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => pickAccept(c)}
                                disabled={activeSeg.locked}
                                className="text-[11.5px] font-semibold text-teal hover:text-teal cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >Accept as-is →</button>
                              <button
                                onClick={() => pickRefine(c)}
                                disabled={activeSeg.locked}
                                className="text-[11.5px] font-semibold text-amber-deep hover:text-amber cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >Refine →</button>
                              {isChosen && <span className="text-[11px] text-amber-deep font-semibold flex items-center gap-1"><Sparkles className="w-3 h-3" /> CHOSEN</span>}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* + Summon second opinion */}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={summonSecondOpinion}
                      disabled={activeSeg.locked || !!summonedCandidate}
                      className="inline-flex items-center gap-1.5 text-[12px] text-ocean hover:text-ocean-deep cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-3.5 h-3.5" /> Summon second opinion
                    </button>
                    <button
                      onClick={pickReject}
                      disabled={activeSeg.locked}
                      className="text-[12px] text-error hover:text-error cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >Reject all proposals →</button>
                  </div>
                </Field>

                {/* DECISION FIELD — locked until you choose how to act */}
                <ValidatorsRulingPanel
                  decisionLabel={decisionLabel}
                  posture={posture}
                  candidates={candidates}
                  chosenCandidateId={chosenCandidateId}
                  authoredText={authoredText}
                  setAuthoredText={(v) => {
                    setAuthoredText(v)
                    // count keypresses that look like reconsiderations
                    if (v.length < authoredText.length - 4) telemetry.current.undoCount += 1
                  }}
                  showCalibrationFlash={showCalibrationFlash}
                  calibrationChips={calibrationChips}
                  toggleCalibration={toggleCalibration}
                  glossaryClick={() => { telemetry.current.glossaryConsultations += 1 }}
                  locked={activeSeg.locked}
                  resetPosture={() => setPostureWithTrace(null)}
                />

                {/* RATIONALE CHIPS — shown for refine + reject */}
                {posture && posture !== 'accept' && (
                  <div className="mb-3">
                    <MonoLabel>Reason · why this decision</MonoLabel>
                    <p className="text-[10.5px] text-mist mt-1">At least one tag is required for this decision to feed training. Untagged commits are stored for display only.</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {chips.map(chip => {
                        const isOn = tags.includes(chip.id)
                        const isSuggested = suggestedChipId === chip.id
                        return (
                          <button
                            key={chip.id}
                            onClick={() => toggleTag(chip.id)}
                            disabled={activeSeg.locked}
                            className={`px-2.5 py-1 rounded-full border text-[11px] cursor-pointer transition-colors ${
                              isOn
                                ? 'bg-ocean text-white border-ocean'
                                : isSuggested
                                  ? 'bg-amber/10 text-amber-deep border-amber/40 hover:bg-amber/20'
                                  : 'bg-white text-slate border-rule hover:border-ocean/30'
                            }`}
                          >
                            {chip.label}
                          </button>
                        )
                      })}
                    </div>
                    <Field label="Note · optional, does NOT feed training">
                      <input
                        value={reasonNote}
                        onChange={e => setReasonNote(e.target.value)}
                        disabled={activeSeg.locked}
                        placeholder="Optional context for downstream reviewers."
                        className="w-full text-[13px] border border-rule rounded-md p-2 mt-2"
                      />
                    </Field>
                  </div>
                )}

                {/* JUDICIAL ACTIONS */}
                <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-rule">
                  <PrimaryButton onClick={commitRuling} disabled={activeSeg.locked || !posture}>
                    Commit decision
                  </PrimaryButton>
                  <SecondaryButton onClick={() => lateral('needs-rework')} disabled={activeSeg.locked}>Return for rework</SecondaryButton>
                  <SecondaryButton onClick={() => lateral('escalated')} disabled={activeSeg.locked}>Escalate</SecondaryButton>
                  {!activeSeg.locked && <SecondaryButton onClick={() => lateral('locked')}>Lock</SecondaryButton>}
                </div>

                {/* TRUST-SCORE EXPLAINER (collapsible — press T) */}
                <ConfidenceExplainer
                  pedigree={segmentPedigree(activeSeg.id)}
                  open={confidenceOpen}
                  onToggle={setConfidenceOpen}
                  label="Trust Score"
                />

                {/* SEGMENT PEDIGREE CARD */}
                <SegmentPedigreeCard pedigree={segmentPedigree(activeSeg.id)} />
              </div>

              <div className="px-5 py-4 border-t border-rule">
                <MonoLabel>Comments</MonoLabel>
                <ul className="mt-2 space-y-2">
                  {activeSeg.comments.length === 0 && <li className="text-[12px] text-mist">No comments yet.</li>}
                  {activeSeg.comments.map(c => (
                    <li key={c.id} className="text-[12.5px] text-ink bg-cream p-2.5 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold">{c.actorId}</span>
                        <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p>{c.text}</p>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Add a comment for the next reviewer…"
                    className="flex-1 text-[13px] border border-rule rounded-md px-2 py-1.5"
                  />
                  <SecondaryButton onClick={handleComment}><MessageSquare className="w-3.5 h-3.5" /> Send</SecondaryButton>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Contextual side-rail — collapsed to glyphs in Reviewer Mode */}
        <ContextualSideRail
          segment={activeSeg}
          project={project}
          segments={segments}
          activeIdx={activeIdx}
          onJumpToSegment={(i) => setActiveIdx(i)}
          collapsed={isCompact}
          forceOpen={forceOpenPanel ? new Set([forceOpenPanel]) : null}
          currentUserId={currentUserId}
        />
      </div>
      </>
      )}

      {/* Keyboard cheat sheet */}
      {showShortcuts && <KeyboardShortcutOverlay onClose={() => setShowShortcuts(false)} />}

      {/* Edge Cases panel */}
      {!isQuick && <EdgeCasesPanel segment={activeSeg} open={edgeCasesOpen} onClose={() => setEdgeCasesOpen(false)} />}

      {/* Persistent shortcut hint footer — Audit Review only */}
      {!isQuick && <ShortcutHintFooter savedAgo={null} mode={mode} />}
    </div>
  )
}

function labelForMode(mode) {
  if (mode === 'internal-single') return 'Internal Review 1 · single reviewer'
  if (mode === 'internal-parallel') return 'Internal Final Review · parallel reviewers'
  return 'External Review · vendor cockpit'
}
/** Short readable label for cockpit chips (replaces cryptic INT/1, EXT, etc.). */
function shortMode(mode) {
  if (mode === 'internal-single') return 'Internal Review 1'
  if (mode === 'internal-parallel') return 'Internal Final Review'
  return 'External Review'
}

function Field({ label, children, right }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <MonoLabel>{label}</MonoLabel>
        {right}
      </div>
      {children}
    </div>
  )
}

/* Quick Review · Audit Review chip — the cockpit-level mode switch. */
function CockpitModeChip({ mode, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full border border-rule bg-white overflow-hidden text-[11.5px]">
      <button
        onClick={() => onChange('quick')}
        className={`px-3 py-1 cursor-pointer transition-colors ${mode === 'quick' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
        title="Quick Review · reviewer-first cockpit"
      >Quick Review</button>
      <button
        onClick={() => onChange('audit')}
        className={`px-3 py-1 cursor-pointer transition-colors ${mode === 'audit' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
        title="Audit Review · full triangulated cockpit with agent panel, pedigree, posture"
      >Audit Review</button>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-rule rounded-md p-3">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className="text-[20px] font-semibold text-ink mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </div>
  )
}

/* ─── Adjudication Header ─────────────────────────────────────────
 *
 * Shows: (a) the validator's Org Brain footprint (Trainer status), and
 * (b) live segment difficulty as a multiple of the segment-set's avg
 * dwell. "3.2× avg dwell" = this segment is taking 3.2× longer than the
 * mean, which is a real-time difficulty proxy that helps the validator
 * know when they're stuck and worth escalating.
 * ───────────────────────────────────────────────────────────────── */
function AdjudicationHeader({ segment, currentUserId, segments, dwellStart }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [segment?.id])

  const impact = useMemo(() => contributorLifetimeImpact(currentUserId), [currentUserId])

  // Approximate avg dwell from other segments' captured decisions.
  // For demo we use a fixed baseline (12s) when no signal exists yet.
  const baselineMs = 12000
  const elapsed = now - (dwellStart?.current || now)
  const ratio = elapsed / baselineMs
  const difficulty = ratio > 3 ? 'hard' : ratio > 1.5 ? 'medium' : 'normal'
  const diffTone = difficulty === 'hard' ? 'text-error' : difficulty === 'medium' ? 'text-amber-deep' : 'text-teal'

  return (
    <div className="rounded-md border border-rule bg-cream/40 px-3 py-2 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate">
          <Brain className="w-3.5 h-3.5 text-ocean" />
          <span><strong className="text-ink">{impact.memoryEntries}</strong> Org Brain entries · <strong className="text-ink">{impact.adjudicated + impact.authored}</strong> rulings</span>
        </span>
        <span className="text-mist">·</span>
        <span className="inline-flex items-center gap-1.5 text-[11.5px] text-slate">
          <Gauge className={`w-3.5 h-3.5 ${diffTone}`} />
          <span className={diffTone}>
            <strong>{ratio.toFixed(1)}×</strong> avg dwell ·{' '}
            <span className="capitalize">{difficulty}</span>
          </span>
        </span>
      </div>
      <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        STAKES · {segment.riskFlags?.includes('low-confidence') ? 'HIGH' : 'STANDARD'}
      </span>
    </div>
  )
}

/* ─── Divergence legend ───────────────────────────────────────── */
function DivergenceLegend() {
  return (
    <div className="flex items-center gap-2 text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-amber/20 inline-block" /> DIFF
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="w-2.5 h-2.5 rounded-sm bg-rule inline-block" /> SHARED
      </span>
    </div>
  )
}

/* ─── Validator's Ruling — Posture-locked ─────────────────────────
 *
 * THE KEY CONSTRAINT: the Ruling textarea defaults to EMPTY and is
 * INACCESSIBLE until a Posture is committed.
 *
 *   posture = null            → empty state, three Posture CTAs.
 *   posture = 'accept'        → accepted-ruling preview + 2.5s
 *                                Positive-Calibration chip flash.
 *   posture = 'refine'        → textarea unlocks, seeded from chosen.
 *   posture = 'reject'        → textarea unlocks empty; tags + note req.
 *
 * The textarea is GUARANTEED disabled when posture is null. There is no
 * code path that allows the validator to type into the Ruling field
 * before they have declared an adjudication posture.
 * ───────────────────────────────────────────────────────────────── */
function ValidatorsRulingPanel({
  posture, candidates, chosenCandidateId, authoredText, setAuthoredText,
  showCalibrationFlash, calibrationChips, toggleCalibration,
  glossaryClick, locked, resetPosture,
  decisionLabel = 'Your decision',
}) {
  const chosen = candidates.find(c => c.id === chosenCandidateId)

  return (
    <div className="border-t border-rule pt-4">
      <div className="flex items-center justify-between mb-2">
        <MonoLabel>{decisionLabel}</MonoLabel>
        <button
          onClick={glossaryClick}
          className="text-[11px] text-ocean hover:text-ocean-deep cursor-pointer inline-flex items-center gap-1"
        >
          <Book className="w-3 h-3" /> Consult Org Brain glossary
        </button>
      </div>

      {/* No posture → empty-state, the textarea is INACCESSIBLE */}
      {!posture && (
        <div className="border border-dashed border-rule-strong rounded-md p-5 text-center bg-white">
          <p className="text-[12.5px] text-mist">
            The decision field is locked until you choose how to act. Press <kbd className="px-1 bg-cream border border-rule rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>A</kbd> / <kbd className="px-1 bg-cream border border-rule rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>R</kbd> / <kbd className="px-1 bg-cream border border-rule rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>X</kbd> or click below:
          </p>
          <div className="mt-3 flex items-center justify-center gap-2 text-[11px]">
            <span className="px-2 py-0.5 rounded-full bg-teal/10 text-teal border border-teal/30">Accept as-is</span>
            <span className="text-mist">·</span>
            <span className="px-2 py-0.5 rounded-full bg-amber/10 text-amber-deep border border-amber/30">Refine</span>
            <span className="text-mist">·</span>
            <span className="px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/30">Reject all</span>
          </div>
        </div>
      )}

      {/* Accept-as-is → ruling preview + Positive-Calibration flash */}
      {posture === 'accept' && (
        <div className="space-y-3">
          <div className="bg-teal/5 border border-teal/30 rounded-md p-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] uppercase tracking-wider text-teal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Accepted ruling · verbatim</p>
              <button onClick={resetPosture} className="text-[10.5px] text-mist hover:text-slate cursor-pointer">Change posture</button>
            </div>
            <p className="text-[13px] text-ink leading-relaxed">{chosen?.text}</p>
          </div>
          {showCalibrationFlash && (
            <div className="bg-teal/10 border border-teal/40 rounded-md p-3 transition-opacity">
              <p className="text-[10.5px] uppercase tracking-wider text-teal mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Positive calibration · 2s tag</p>
              <div className="flex flex-wrap gap-1.5">
                {POSITIVE_CALIBRATION_CHIPS.map(c => {
                  const on = calibrationChips.includes(c.id)
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCalibration(c.id)}
                      disabled={locked}
                      className={`px-2 py-0.5 rounded-full text-[11px] border cursor-pointer transition-colors ${on ? 'bg-teal text-white border-teal' : 'bg-white text-teal border-teal/40 hover:bg-teal/5'}`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refine → seeded textarea unlocks */}
      {posture === 'refine' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] uppercase tracking-wider text-amber-deep" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Refining {chosen?.agentName}</p>
            <button onClick={resetPosture} className="text-[10.5px] text-mist hover:text-slate cursor-pointer">Change posture</button>
          </div>
          <textarea
            rows={3}
            value={authoredText}
            onChange={e => setAuthoredText(e.target.value)}
            disabled={locked}
            placeholder="Refine the anchor proposal. Diff-aware tags will surface based on the delta."
            className="w-full text-[13px] border border-rule rounded-md p-2.5"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      )}

      {/* Reject → empty textarea unlocks; chips + reason required */}
      {posture === 'reject' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] uppercase tracking-wider text-error" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Rejecting all proposals · author from source</p>
            <button onClick={resetPosture} className="text-[10.5px] text-mist hover:text-slate cursor-pointer">Change posture</button>
          </div>
          <textarea
            rows={3}
            value={authoredText}
            onChange={e => setAuthoredText(e.target.value)}
            disabled={locked}
            placeholder="Author the ruling from the source. A rationale tag or reason note is required to commit."
            className="w-full text-[13px] border border-rule rounded-md p-2.5"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          />
        </div>
      )}
    </div>
  )
}
