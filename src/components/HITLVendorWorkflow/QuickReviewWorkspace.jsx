/**
 * Quick Review Workspace — keyboard-first reviewer cockpit.
 *
 * Layout
 *   ─────────────────────────────────────────────────────────────
 *   TOP TASK BAR  doc · ◀ [ Segment X of Y ] ▶ · mode · ⏱timer · ?
 *   ─────────────────────────────────────────────────────────────
 *   LEFT          CENTER                            RIGHT STACK
 *   Document      Source                            Live TM
 *   context       Editable target                   Live TB
 *   (±5 segs)     Action row                        Live QA
 *   ─────────────────────────────────────────────────────────────
 *
 * Project + task switching are not part of this screen — the global
 * sidebar is hidden by the parent (HITLVendorWorkflow) when active is
 * 'workspace'. The reviewer's only escape is "Exit Review" / Shift+E.
 *
 * Keyboard
 *   [ / ←     prev segment             T          apply top TM match,
 *   ] / →     next segment                        focus TM panel
 *   ⌘↩ / Ctrl+↩  Save & Next            B          focus Live TB panel
 *   A         accept (when untouched)   Q          focus Live QA panel
 *   ?         shortcut overlay         Esc         release panel focus
 *   In a focused panel: J/K (or ↓/↑) move, Enter applies, Esc releases.
 *
 * Task timer
 *   Persistent across segments. Pauses on tab-hidden OR after 2 min of
 *   inactivity. Visible state: running / paused-idle / paused-hidden /
 *   resumed (briefly flashes for 2s after pause→running transition).
 *   Activity = keydown · mousedown · scroll.
 *
 * Audit + retraining plumbing unchanged.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Check, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, RefreshCcw,
  ArrowRight, Clock, Pause, BookOpen, FileText, Stethoscope, ChevronDown, Keyboard, X,
} from 'lucide-react'
import { ORG_BRAIN_UPDATES } from '../../data/hitlVendorWorkflow'
import { decideSegment } from '../../services/hitl/review'
import { qaDiff } from '../../services/hitl/cockpit'
import { findTMMatches } from '../../services/hitl/tm'
import { MonoLabel } from './shared'

/* ─── Tiny key-cap visual ─────────────────────────────────────── */
function Kbd({ children, className = '' }) {
  return (
    <kbd
      className={`inline-flex items-center px-1.5 py-0.5 bg-cream border border-rule rounded text-[10px] text-mist ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {children}
    </kbd>
  )
}

/* ─── Glossary matching ─────────────────────────────────────── */
function pickHead(text, words = 4) {
  return (text || '').split(/\s+/).slice(0, words).join(' ').toLowerCase().trim()
}
function findGlossaryHits(source, target, project) {
  if (!source || !project) return []
  const lowerSrc = source.toLowerCase()
  const lowerTgt = (target || '').toLowerCase()
  const hits = []
  const seen = new Set()
  for (const o of ORG_BRAIN_UPDATES) {
    if (o.domain !== project.requirements.domain) continue
    if (!o.sourceFragment) continue
    const srcHead = pickHead(o.sourceFragment, 4)
    if (srcHead.length < 6) continue
    const sIdx = lowerSrc.indexOf(srcHead)
    if (sIdx === -1) continue
    const key = `${sIdx}-${srcHead}`
    if (seen.has(key)) continue
    seen.add(key)
    let tIdx = -1, tHeadLen = 0
    if (lowerTgt) {
      for (const headLen of [12, 8, 6]) {
        const tHead = o.approvedFragment.slice(0, headLen).toLowerCase()
        if (tHead.length < 4) continue
        const idx = lowerTgt.indexOf(tHead)
        if (idx !== -1) { tIdx = idx; tHeadLen = headLen; break }
      }
    }
    hits.push({
      id: o.id,
      term: source.slice(sIdx, sIdx + srcHead.length),
      approved: o.approvedFragment.slice(0, 120),
      definition: o.sourceFragment.slice(0, 200),
      usage: `${o.domain} · ${o.language}`,
      sourceStart: sIdx, sourceEnd: sIdx + srcHead.length,
      targetStart: tIdx === -1 ? null : tIdx,
      targetEnd:   tIdx === -1 ? null : tIdx + tHeadLen,
    })
  }
  hits.sort((a, b) => a.sourceStart - b.sourceStart)
  return hits
}

function escapeHtml(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function buildHTML(text, intervals) {
  if (!intervals?.length) return escapeHtml(text)
  let out = '', cursor = 0
  for (const iv of intervals) {
    if (iv.start == null || iv.end == null || iv.start < cursor) continue
    out += escapeHtml(text.slice(cursor, iv.start))
    out += `<span class="gloss-mark" data-gloss-id="${iv.glossId}" title="${escapeHtml(iv.title)}">${escapeHtml(text.slice(iv.start, iv.end))}</span>`
    cursor = iv.end
  }
  out += escapeHtml(text.slice(cursor))
  return out
}
function tooltipFor(hit) {
  return `Approved: ${hit.approved}\n${hit.definition}\nUsage: ${hit.usage}`
}

let _paired = false
function pairHighlights() {
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.('.gloss-mark')
    if (!el || !el.dataset?.glossId) return
    document.querySelectorAll(`.gloss-mark[data-gloss-id="${el.dataset.glossId}"]`)
      .forEach(n => n.classList.add('gloss-active'))
  }, true)
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest?.('.gloss-mark')
    if (!el || !el.dataset?.glossId) return
    document.querySelectorAll(`.gloss-mark[data-gloss-id="${el.dataset.glossId}"]`)
      .forEach(n => n.classList.remove('gloss-active'))
  }, true)
}

/* ─── Editable target ─────────────────────────────────────────── */
function HighlightedEditable({ initialValue, intervals, onChange, locked, autoFocus, editorRef }) {
  const ref = useRef(null)
  const initialHTMLRef = useRef(null)
  if (initialHTMLRef.current === null) {
    initialHTMLRef.current = buildHTML(initialValue || '', intervals)
  }
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = initialHTMLRef.current
    if (editorRef) editorRef.current = ref.current
    if (autoFocus) {
      const range = document.createRange()
      range.selectNodeContents(ref.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel?.removeAllRanges(); sel?.addRange(range)
      ref.current.focus()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div
      ref={ref}
      contentEditable={!locked}
      suppressContentEditableWarning
      onInput={() => onChange?.(ref.current?.innerText || '')}
      role="textbox"
      aria-multiline="true"
      spellCheck={false}
      translate="no"
      autoCorrect="off"
      autoCapitalize="off"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      data-lt-active="false"
      className="w-full text-[15px] leading-relaxed text-ink border border-rule rounded-md p-3 focus:outline-none focus:border-ocean/50 min-h-[120px] whitespace-pre-wrap notranslate"
      style={{ fontFamily: 'inherit' }}
    />
  )
}

function HighlightedSource({ source, intervals }) {
  const html = useMemo(() => buildHTML(source, intervals), [source, intervals])
  return <p className="text-[15px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: html }} />
}

/* ─── Task timer hook ────────────────────────────────────────── */
function useTaskTimer(taskId) {
  const [elapsed, setElapsed] = useState(0)
  const [pauseReason, setPauseReason] = useState(null)   // null | 'idle' | 'hidden'
  const [resumedAt, setResumedAt] = useState(null)
  const lastActivity = useRef(Date.now())
  const lastTickWall = useRef(Date.now())
  const elapsedRef = useRef(0)
  const prevPauseRef = useRef(null)

  useEffect(() => {
    elapsedRef.current = 0
    lastActivity.current = Date.now()
    lastTickWall.current = Date.now()
    prevPauseRef.current = null
    setElapsed(0); setPauseReason(null); setResumedAt(null)
  }, [taskId])

  useEffect(() => {
    function bumpActivity() { lastActivity.current = Date.now() }
    window.addEventListener('keydown', bumpActivity)
    window.addEventListener('mousedown', bumpActivity)
    window.addEventListener('scroll', bumpActivity, true)
    function onVisibility() { if (!document.hidden) lastActivity.current = Date.now() }
    document.addEventListener('visibilitychange', onVisibility)

    const tick = setInterval(() => {
      const now = Date.now()
      const idle = now - lastActivity.current > 2 * 60 * 1000
      const reason = document.hidden ? 'hidden' : (idle ? 'idle' : null)
      // Resumed transition: previous tick was paused, this tick is running.
      if (prevPauseRef.current && !reason) {
        setResumedAt(now)
        setTimeout(() => setResumedAt((rt) => rt === now ? null : rt), 2000)
      }
      prevPauseRef.current = reason
      if (!reason) {
        const delta = Math.min(now - lastTickWall.current, 2000)
        elapsedRef.current += delta
        setElapsed(elapsedRef.current)
      }
      lastTickWall.current = now
      setPauseReason(reason)
    }, 1000)

    return () => {
      clearInterval(tick)
      window.removeEventListener('keydown', bumpActivity)
      window.removeEventListener('mousedown', bumpActivity)
      window.removeEventListener('scroll', bumpActivity, true)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [taskId])

  return { elapsed, pauseReason, resumedAt }
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/* ─── Shortcut overlay ───────────────────────────────────────── */
function ShortcutOverlay({ onClose }) {
  const groups = [
    { name: 'Navigation', items: [
      ['[ · ←', 'Previous segment'], [`] · →`, 'Next segment'],
      ['J · ↓', 'Next segment (alt)'], ['K · ↑', 'Previous segment (alt)'],
    ]},
    { name: 'Editor', items: [
      ['⌘↩ · Ctrl↩', 'Save & Next (works inside the editable)'],
      ['A', 'Accept suggestion (when target is untouched)'],
    ]},
    { name: 'Live TM', items: [
      ['T', 'Apply top match · focus TM panel'],
      ['J / K · ↓ / ↑', 'Move within TM panel (after T)'],
      ['Enter', 'Apply selected TM match'],
      ['Esc', 'Release TM panel focus'],
    ]},
    { name: 'Live TB', items: [
      ['B', 'Focus glossary panel'],
      ['J / K', 'Move between terms'],
      ['Enter', 'Apply approved rendering'],
    ]},
    { name: 'Live QA', items: [
      ['Q', 'Focus QA panel'],
      ['J / K', 'Move between issues'],
      ['Enter', 'Jump to issue in target / apply fix'],
    ]},
    { name: 'Mode', items: [
      ['Shift+E', 'Exit Review Mode'],
      ['?', 'Show this overlay'],
    ]},
  ]
  return (
    <div className="fixed inset-0 z-[60] bg-ink/40 flex items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[640px] bg-white rounded-lg border border-rule overflow-hidden m-4" onClick={e => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-rule flex items-center justify-between bg-cream/60">
          <div className="inline-flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Quick Review · keyboard shortcuts</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-pale cursor-pointer">
            <X className="w-4 h-4 text-slate" />
          </button>
        </header>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
          {groups.map(g => (
            <div key={g.name}>
              <p className="text-[10.5px] uppercase tracking-wider text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{g.name}</p>
              <ul className="space-y-1.5">
                {g.items.map(([keys, desc]) => (
                  <li key={keys} className="flex items-center justify-between text-[12px]">
                    <span className="text-slate">{desc}</span>
                    <Kbd className="!text-ink">{keys}</Kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-5 py-2 border-t border-rule text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Shortcuts pause inside text fields, except Cmd/Ctrl+Enter.
        </div>
      </div>
    </div>
  )
}

/* ─── Component ────────────────────────────────────────────────── */

export default function QuickReviewWorkspace({
  project, task, segments, activeIdx, setActiveIdx,
  currentUserId, currentUserRole = 'vendor-user',
  cockpitMode, setCockpitMode,
}) {
  const activeSeg = segments[activeIdx]
  const recommended = useMemo(() => {
    if (!activeSeg?.agentCandidates?.length) return activeSeg?.target || ''
    const top = [...activeSeg.agentCandidates].sort((a, b) => b.confidence - a.confidence)[0]
    return top?.text || activeSeg.target || ''
  }, [activeSeg?.id])

  const [target, setTarget] = useState(activeSeg?.editedTarget || recommended)
  const [savedAt, setSavedAt] = useState(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const editorRef = useRef(null)

  /* Focused-panel state machine — null when editor is focused */
  const [focusedPanel, setFocusedPanel] = useState(null) // null | 'tm' | 'tb' | 'qa'
  const [focusedIdx, setFocusedIdx] = useState(0)

  useEffect(() => {
    setTarget(activeSeg?.editedTarget || recommended)
    setSavedAt(null)
    setFocusedPanel(null); setFocusedIdx(0)
  }, [activeSeg?.id])

  useEffect(() => {
    if (_paired) return
    pairHighlights(); _paired = true
  }, [])

  /* Glossary, TM, QA — recomputed per segment */
  const hits = useMemo(
    () => findGlossaryHits(activeSeg?.source || '', target || '', project),
    [activeSeg?.id]
  )
  const sourceIntervals = useMemo(() => hits.map(h => ({
    start: h.sourceStart, end: h.sourceEnd, glossId: h.id, title: tooltipFor(h),
  })), [hits])
  const targetIntervals = useMemo(() => hits
    .filter(h => h.targetStart != null)
    .map(h => ({ start: h.targetStart, end: h.targetEnd, glossId: h.id, title: tooltipFor(h) })),
    [hits])

  const tmMatches = useMemo(
    () => findTMMatches({ source: activeSeg?.source || '', project, max: 3, threshold: 0.15 }),
    [activeSeg?.id, project?.id]
  )

  const qa = useMemo(() => {
    if (!activeSeg) return []
    const rows = qaDiff(activeSeg.source, target, { dntTerms: activeSeg.dntTerms || [] })
    const failing = rows.filter(r => !r.ok)
    for (const h of hits) {
      const approvedHead = h.approved.slice(0, Math.max(8, Math.min(20, h.approved.length)))
      if (!target.includes(approvedHead)) {
        failing.push({
          id: `glossary-${h.id}`,
          label: 'Terminology issue',
          detail: `Source uses an approved term ("${h.term}") whose canonical rendering is missing in the target.`,
          ok: false,
          glossary: h,
        })
      }
    }
    return failing
  }, [activeSeg?.id, target, hits])

  const isDirty = activeSeg && target !== (activeSeg.editedTarget || recommended)
  const isAccepted = activeSeg && target === recommended && !activeSeg.editedTarget
  const dwellStart = useRef(Date.now())
  useEffect(() => { dwellStart.current = Date.now() }, [activeSeg?.id])

  const { elapsed, pauseReason, resumedAt } = useTaskTimer(task?.id)

  const commit = useCallback(({ advance = true } = {}) => {
    if (!activeSeg) return
    const inferredPosture = isAccepted ? 'accept' : 'refine'
    const action = isAccepted ? 'verified' : 'edited'
    const top = [...(activeSeg.agentCandidates || [])].sort((a, b) => b.confidence - a.confidence)[0]
    try {
      decideSegment({
        segmentId: activeSeg.id, actorId: currentUserId, action,
        newValue: isAccepted ? null : target,
        chosenCandidateId: top?.id || null,
        rejectedCandidateIds: (activeSeg.agentCandidates || []).filter(c => c.id !== top?.id).map(c => c.id),
        rationaleTags: [], reasonNote: null, reason: null,
        telemetry: {
          dwellMs: Date.now() - dwellStart.current,
          undoCount: 0, glossaryConsultations: 0, crossRefJumps: 0,
          candidateHoverSeq: [],
          posture: inferredPosture,
          postureTransitions: [{ from: null, to: inferredPosture, at: Date.now(), viaShortcut: false }],
          preferencePairs: [], summonedSecondOpinion: false, quickReview: true,
        },
      })
      setSavedAt(Date.now()); refresh()
      if (advance) {
        const nextIdx = segments.findIndex((_, i) => i > activeIdx && !segments[i].locked)
        if (nextIdx !== -1) setActiveIdx(nextIdx)
      }
    } catch (e) { window.alert(`Save failed: ${e.message}`) }
  }, [activeSeg, target, isAccepted, segments, activeIdx, currentUserId, setActiveIdx])

  const acceptRecommended = () => {
    setTarget(recommended)
    requestAnimationFrame(() => commit({ advance: true }))
  }
  const reset = () => setTarget(recommended)
  const regenerate = () => {
    const sorted = [...(activeSeg?.agentCandidates || [])].sort((a, b) => b.confidence - a.confidence)
    const alt = sorted[1] || sorted[0]
    if (alt) setTarget(alt.text)
  }
  const next = () => { if (activeIdx < segments.length - 1) setActiveIdx(activeIdx + 1) }
  const prev = () => { if (activeIdx > 0) setActiveIdx(activeIdx - 1) }

  const applyTM = (entry) => { if (entry?.target) setTarget(entry.target) }
  const applyGlossaryFix = (hit) => {
    const approvedHead = hit.approved.slice(0, Math.max(8, Math.min(20, hit.approved.length)))
    if (target.includes(approvedHead)) return
    const trailer = target.match(/[。．\.\s]$/) ? '' : (project?.requirements?.targetLanguages?.[0] === 'ja' ? '。' : '. ')
    setTarget(prev => `${prev}${trailer}${hit.approved}`)
  }

  /* Apply currently focused row when Enter pressed in panel-focus mode. */
  const applyFocusedRow = () => {
    if (focusedPanel === 'tm' && tmMatches[focusedIdx]) {
      applyTM(tmMatches[focusedIdx])
    } else if (focusedPanel === 'tb' && hits[focusedIdx]) {
      applyGlossaryFix(hits[focusedIdx])
    } else if (focusedPanel === 'qa' && qa[focusedIdx]) {
      const issue = qa[focusedIdx]
      if (issue.glossary) {
        applyGlossaryFix(issue.glossary)
      } else {
        // Other issues: return focus to the editor so the reviewer can fix.
        editorRef.current?.focus()
        setFocusedPanel(null)
      }
    }
  }

  /* Keyboard layer */
  useEffect(() => {
    function isTextField(el) {
      if (!el) return false
      const tag = (el.tagName || '').toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true
      return el.isContentEditable
    }
    function onKey(e) {
      // Always-on: Cmd/Ctrl+Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); commit({ advance: true }); return
      }
      // ? overlay always available
      if (e.key === '?' && !isTextField(e.target)) {
        e.preventDefault(); setShowShortcuts(true); return
      }
      // Esc — release panel focus, or close overlay
      if (e.key === 'Escape') {
        if (showShortcuts) { e.preventDefault(); setShowShortcuts(false); return }
        if (focusedPanel)  { e.preventDefault(); setFocusedPanel(null); editorRef.current?.focus(); return }
      }

      const inText = isTextField(e.target)
      // When inside the editor, only the always-on shortcuts apply.
      if (inText) return

      // Panel-focus mode: J/K/Enter/Esc act on the focused panel.
      if (focusedPanel) {
        if (e.key === 'j' || e.key === 'J' || e.key === 'ArrowDown') {
          const max = focusedPanel === 'tm' ? tmMatches.length : focusedPanel === 'tb' ? hits.length : qa.length
          if (max === 0) return
          setFocusedIdx(i => Math.min(max - 1, i + 1)); e.preventDefault(); return
        }
        if (e.key === 'k' || e.key === 'K' || e.key === 'ArrowUp') {
          setFocusedIdx(i => Math.max(0, i - 1)); e.preventDefault(); return
        }
        if (e.key === 'Enter') { e.preventDefault(); applyFocusedRow(); return }
      }

      switch (e.key) {
        case '[': case 'ArrowLeft':
          e.preventDefault(); prev(); return
        case ']': case 'ArrowRight':
          e.preventDefault(); next(); return
        case 'j': case 'J': case 'ArrowDown':
          e.preventDefault(); next(); return
        case 'k': case 'K': case 'ArrowUp':
          e.preventDefault(); prev(); return
        case 'a': case 'A':
          if (isAccepted) { e.preventDefault(); acceptRecommended() }
          return
        case 't': case 'T':
          // Apply top TM match immediately AND focus the panel so J/K/Enter work for others.
          if (tmMatches[0]) applyTM(tmMatches[0])
          setFocusedPanel('tm'); setFocusedIdx(0); e.preventDefault(); return
        case 'b': case 'B':
          setFocusedPanel('tb'); setFocusedIdx(0); e.preventDefault(); return
        case 'q': case 'Q':
          setFocusedPanel('qa'); setFocusedIdx(0); e.preventDefault(); return
        default: return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commit, next, prev, isAccepted, tmMatches, hits, qa, focusedPanel, focusedIdx, showShortcuts])

  /* Document context: ±5 segments */
  const contextWindow = useMemo(() => {
    const start = Math.max(0, activeIdx - 5)
    const end = Math.min(segments.length, activeIdx + 6)
    return segments.slice(start, end).map((s, i) => ({ s, i: start + i }))
  }, [segments, activeIdx])

  const totalSeg = segments.length
  const doneSeg = segments.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length

  /* Timer visuals */
  const timerPalette =
    pauseReason
      ? 'border-mist text-mist bg-rule/40'
      : (resumedAt ? 'border-teal/60 text-teal bg-teal/15 animate-pulse' : 'border-teal/30 text-teal bg-teal/5')
  const timerIcon = pauseReason ? Pause : Clock
  const TimerIcon = timerIcon
  const timerLabel = pauseReason === 'idle'
    ? 'Paused — idle'
    : pauseReason === 'hidden'
      ? 'Paused — tab hidden'
      : (resumedAt ? 'Resumed' : null)

  return (
    <div className="space-y-4">
      {/* ── TOP TASK BAR ──────────────────────────────────────── */}
      <header className="bg-white border border-rule rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex items-center gap-3">
          <FileText className="w-4 h-4 text-ocean shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">{task?.title || project?.name}</p>
            <p className="text-[10.5px] text-mist truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {project?.requirements.sourceLanguage?.toUpperCase()} → {project?.requirements.targetLanguages?.[0]?.toUpperCase()} · {doneSeg}/{totalSeg} done
            </p>
          </div>
        </div>

        {/* Segment nav with shortcut hints */}
        <div className="inline-flex items-center gap-2">
          <button
            onClick={prev}
            disabled={activeIdx === 0}
            title="Previous segment ([ · ←)"
            className="inline-flex items-center gap-1 p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-slate" />
            <Kbd>[</Kbd>
          </button>
          <span className="text-[12.5px] text-ink min-w-[110px] text-center font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Segment {activeIdx + 1} of {totalSeg}
          </span>
          <button
            onClick={next}
            disabled={activeIdx === totalSeg - 1}
            title="Next segment (] · →)"
            className="inline-flex items-center gap-1 p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Kbd>]</Kbd>
            <ChevronRight className="w-4 h-4 text-slate" />
          </button>
        </div>

        {/* Mode toggle (was top-right of section heading; now inline in the task bar) */}
        {setCockpitMode && (
          <div className="inline-flex items-center rounded-full border border-rule bg-white overflow-hidden text-[11.5px]">
            <button
              onClick={() => setCockpitMode('quick')}
              className={`px-2.5 py-1 cursor-pointer ${cockpitMode === 'quick' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
            >Quick</button>
            <button
              onClick={() => setCockpitMode('audit')}
              className={`px-2.5 py-1 cursor-pointer ${cockpitMode === 'audit' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
            >Audit</button>
          </div>
        )}

        {/* Timer */}
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] transition-colors ${timerPalette}`}
          title={pauseReason ? `Timer paused (${pauseReason})` : 'Task timer running'}
        >
          <TimerIcon className="w-3.5 h-3.5" />
          <span className="font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtTime(elapsed)}</span>
          {timerLabel && <span className="text-[10px] uppercase tracking-wider">{timerLabel}</span>}
        </div>

        {/* ? + (parent renders Exit Review in the outer header) */}
        <button
          onClick={() => setShowShortcuts(true)}
          title="Show keyboard shortcuts (?)"
          className="px-2 py-1 rounded-md border border-rule bg-white text-[11px] text-slate hover:border-ocean/30 cursor-pointer"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >?</button>
      </header>

      {/* ── 3-COLUMN BODY ─────────────────────────────────────── */}
      <div className="grid grid-cols-[260px_1fr_320px] gap-4 items-start">

        {/* LEFT: Document context */}
        <aside className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-rule">
            <MonoLabel>Document</MonoLabel>
          </div>
          <ul className="max-h-[640px] overflow-y-auto py-1">
            {contextWindow.map(({ s, i }) => {
              const isActive = i === activeIdx
              const done = ['verified', 'edited', 'accepted'].includes(s.decision)
              const hasOpen = !done && qaDiff(s.source, s.editedTarget || s.target).some(r => !r.ok)
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left px-3 py-2 text-[12.5px] cursor-pointer flex items-start gap-2 border-l-2 ${
                      isActive ? 'border-l-amber bg-amber/5 text-ink' : 'border-l-transparent hover:bg-pale/40 text-slate'
                    }`}
                  >
                    <span className="shrink-0 w-3.5 inline-flex justify-center mt-0.5">
                      {done && <Check className="w-3.5 h-3.5 text-teal" />}
                      {!done && hasOpen && <AlertTriangle className="w-3.5 h-3.5 text-amber-deep" />}
                    </span>
                    <span className="font-mono text-mist w-6 text-right shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</span>
                    <span className="leading-snug">{s.source.slice(0, 110)}{s.source.length > 110 ? '…' : ''}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* CENTER: editor */}
        <main className="bg-white border border-rule rounded-lg p-6">
          {!activeSeg ? (
            <p className="text-mist">No segment selected.</p>
          ) : (
            <>
              <section className="mb-5">
                <MonoLabel>Source · {project?.requirements.sourceLanguage?.toUpperCase()}</MonoLabel>
                <div className="mt-2">
                  <HighlightedSource source={activeSeg.source} intervals={sourceIntervals} />
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <MonoLabel>Target · {project?.requirements.targetLanguages?.[0]?.toUpperCase()}</MonoLabel>
                  <button
                    onClick={regenerate}
                    className="inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean-deep cursor-pointer"
                    title="Try another suggestion"
                  >
                    <RefreshCcw className="w-3 h-3" /> Regenerate suggestion
                  </button>
                </div>
                <HighlightedEditable
                  key={activeSeg.id}
                  initialValue={target}
                  intervals={targetIntervals}
                  onChange={setTarget}
                  locked={activeSeg.locked}
                  autoFocus
                  editorRef={editorRef}
                />
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-mist">
                    {qa.length > 0
                      ? <><span className="text-amber-deep">{qa.length} issue{qa.length === 1 ? '' : 's'}</span> · see Live QA →</>
                      : isDirty
                        ? <>Edited · ready to save (⌘↩)</>
                        : <>No issues detected · accept to confirm</>}
                  </p>
                  {savedAt && <p className="text-[11px] text-teal">Saved · advancing</p>}
                </div>
              </section>

              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-rule">
                <button
                  onClick={() => commit({ advance: true })}
                  disabled={activeSeg.locked || !target.trim() || (!isDirty && !isAccepted)}
                  title={!target.trim() ? 'Target is empty' : ''}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors bg-amber hover:bg-amber-deep text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Save & Next
                  <Kbd className="!bg-white/20 !border-white/20 !text-white">⌘↩</Kbd>
                </button>
                {isAccepted && !activeSeg.locked && (
                  <button
                    onClick={acceptRecommended}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer"
                    title="Accept (A)"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept suggestion
                    <Kbd>A</Kbd>
                  </button>
                )}
                {isDirty && !activeSeg.locked && (
                  <button
                    onClick={reset}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to suggestion
                  </button>
                )}
                {!target.trim() && (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-deep">
                    <AlertTriangle className="w-3.5 h-3.5" /> Target is empty
                  </span>
                )}
                <button
                  onClick={next}
                  disabled={activeIdx === totalSeg - 1}
                  className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[12px] text-mist hover:text-slate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Skip (])"
                >
                  Skip <Kbd>]</Kbd>
                </button>
              </div>
            </>
          )}
        </main>

        {/* RIGHT: Live TM / TB / QA */}
        <aside className="space-y-3">
          {/* Live TM */}
          <Panel
            id="tm"
            icon={FileText}
            iconClass="text-ocean"
            title={`Live TM · ${tmMatches.length} match${tmMatches.length === 1 ? '' : 'es'}`}
            shortcut={<><Kbd>T</Kbd> apply top match</>}
            isFocused={focusedPanel === 'tm'}
            empty="No translation memory matches above 15%."
            footerHint="J/K to move · Enter to apply · Esc to release"
          >
            {tmMatches.map((m, i) => (
              <PanelRow key={m.id} active={focusedPanel === 'tm' && i === focusedIdx} onClick={() => applyTM(m)}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${m.matchRatio >= 0.75 ? 'bg-teal/10 text-teal' : m.matchRatio >= 0.4 ? 'bg-ocean/10 text-ocean' : 'bg-amber/10 text-amber-deep'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {(m.matchRatio * 100).toFixed(0)}%
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); applyTM(m) }} className="text-[10.5px] text-ocean hover:text-ocean-deep cursor-pointer">Apply</button>
                </div>
                <p className="text-[11.5px] text-slate leading-snug">{m.source}</p>
                <p className="text-[12px] text-ink leading-snug mt-1 font-medium">{m.target}</p>
              </PanelRow>
            ))}
          </Panel>

          {/* Live TB */}
          <Panel
            id="tb"
            icon={BookOpen}
            iconClass="text-amber-deep"
            title={`Live TB · ${hits.length} term${hits.length === 1 ? '' : 's'}`}
            shortcut={<Kbd>B</Kbd>}
            isFocused={focusedPanel === 'tb'}
            empty="No glossary terms in this segment."
            footerHint="J/K to move · Enter to apply approved rendering · Esc to release"
          >
            {hits.map((h, i) => (
              <PanelRow key={h.id} active={focusedPanel === 'tb' && i === focusedIdx} onClick={() => applyGlossaryFix(h)}>
                <p className="text-[11.5px] text-slate leading-snug"><span className="gloss-mark inline-block">{h.term}</span></p>
                <p className="text-[12px] text-ink leading-snug mt-1 font-medium">→ {h.approved}</p>
                <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {h.usage} · {target.includes(h.approved.slice(0, 8)) ? 'in target' : 'not yet in target'}
                </p>
              </PanelRow>
            ))}
          </Panel>

          {/* Live QA */}
          <Panel
            id="qa"
            icon={Stethoscope}
            iconClass="text-error"
            title={`Live QA · ${qa.length} issue${qa.length === 1 ? '' : 's'}`}
            shortcut={<Kbd>Q</Kbd>}
            isFocused={focusedPanel === 'qa'}
            empty={<span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal" /> No issues detected.</span>}
            footerHint="J/K to move · Enter to jump or apply · Esc to release"
          >
            {qa.map((issue, i) => (
              <PanelRow key={issue.id} active={focusedPanel === 'qa' && i === focusedIdx} onClick={() => { if (issue.glossary) applyGlossaryFix(issue.glossary); else editorRef.current?.focus() }}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-deep shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-ink">{issue.label}</p>
                    <p className="text-[11.5px] text-slate mt-0.5 leading-relaxed">{issue.detail}</p>
                    {issue.glossary && (
                      <button
                        onClick={(e) => { e.stopPropagation(); applyGlossaryFix(issue.glossary) }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean-deep cursor-pointer"
                      >
                        <Check className="w-3 h-3" /> Apply approved rendering
                      </button>
                    )}
                  </div>
                </div>
              </PanelRow>
            ))}
          </Panel>

          {currentUserRole === 'client-reviewer' && (
            <details className="bg-white border border-rule rounded-lg">
              <summary className="px-3 py-2 cursor-pointer text-[12px] text-slate hover:text-ink list-none flex items-center justify-between">
                <span><MonoLabel>Back-translation (optional)</MonoLabel></span>
                <ChevronDown className="w-3.5 h-3.5 text-mist" />
              </summary>
              <p className="px-3 pb-3 text-[12px] text-slate">Round-trip translation of the current target. Comprehension aid only.</p>
            </details>
          )}
        </aside>
      </div>

      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}

/* ─── Panel + PanelRow primitives — keyboard-focus-aware ───────── */
function Panel({ icon: Icon, iconClass, title, shortcut, isFocused, empty, footerHint, children }) {
  const items = Array.isArray(children) ? children : (children ? [children] : [])
  return (
    <section className={`bg-white rounded-lg overflow-hidden border ${isFocused ? 'border-ocean' : 'border-rule'}`}>
      <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
          <MonoLabel>{title}</MonoLabel>
        </span>
        <span className="text-[11px] text-slate inline-flex items-center gap-1">{shortcut}</span>
      </div>
      {items.length === 0 ? (
        <p className="px-3 py-3 text-[12px] text-mist">{empty}</p>
      ) : (
        <ul className="divide-y divide-rule">{items}</ul>
      )}
      {isFocused && items.length > 0 && (
        <div className="px-3 py-1.5 border-t border-rule bg-pale/40 text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {footerHint}
        </div>
      )}
    </section>
  )
}

function PanelRow({ active, onClick, children }) {
  return (
    <li
      onClick={onClick}
      className={`px-3 py-2.5 cursor-pointer border-l-2 ${active ? 'border-l-ocean bg-ocean/5' : 'border-l-transparent hover:bg-pale/40'}`}
    >
      {children}
    </li>
  )
}
