/**
 * Quick Review Workspace — keyboard-first reviewer cockpit.
 *
 * Layout
 *   ─────────────────────────────────────────────────────────────
 *   TOP BAR    Document name · ◀ Segment X of Y ▶ · ⏱ task timer
 *   ─────────────────────────────────────────────────────────────
 *   LEFT       CENTER                              RIGHT
 *   Document   Source                              Live TM
 *   context    Editable target                     Live TB (glossary)
 *   (±5 segs)  Issues line                         Live QA
 *              Save · Accept · Skip
 *   ─────────────────────────────────────────────────────────────
 *
 * Project + task switching are removed entirely. Switching happens on
 * the Project Cockpit / Task Assignment screens; the reviewer arrives
 * here with a fixed task and stays focused on it.
 *
 * Keyboard
 *   J / K / ↓ / ↑       prev / next segment (also Enter from center)
 *   ⌘↩ / Ctrl+↩          Save & Next (works inside the editable)
 *   A                   Accept suggestion (when target is untouched)
 *   T                   Apply best TM match
 *   B                   Focus glossary panel
 *   Q                   Focus QA panel
 *   ?                   Open shortcut sheet (parent)
 *
 * Task timer: persistent across segments, pauses after 2 minutes of
 * inactivity, pauses when the tab is hidden, resumes on activity.
 *
 * Audit + retraining plumbing unchanged: every commit still funnels
 * through decideSegment() with inferred posture (accept / refine).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Check, RotateCcw, ChevronLeft, ChevronRight, AlertTriangle, RefreshCcw,
  ArrowRight, Clock, BookOpen, FileText, Stethoscope, ChevronDown,
} from 'lucide-react'
import { ORG_BRAIN_UPDATES } from '../../data/hitlVendorWorkflow'
import { decideSegment } from '../../services/hitl/review'
import { qaDiff } from '../../services/hitl/cockpit'
import { findTMMatches } from '../../services/hitl/tm'
import { MonoLabel } from './shared'

/* ─── Glossary matching ─────────────────────────────────────────
 * (Unchanged from previous revision.) */
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

/* Cross-pane glossary pairing (DOM-level, no React). */
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

/* ─── Editable target with inline glossary spans ─────────────── */
function HighlightedEditable({ initialValue, intervals, onChange, locked, autoFocus }) {
  const ref = useRef(null)
  const initialHTMLRef = useRef(null)
  if (initialHTMLRef.current === null) {
    initialHTMLRef.current = buildHTML(initialValue || '', intervals)
  }
  useEffect(() => {
    if (!ref.current) return
    ref.current.innerHTML = initialHTMLRef.current
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

/* ─── Task timer hook ────────────────────────────────────────────
 * Persistent for the active task. Pauses on 2-min inactivity OR tab
 * hidden. Resumes on activity. Timer accumulates monotonically. */
function useTaskTimer(taskId) {
  const [elapsed, setElapsed] = useState(0)
  const [paused, setPaused] = useState(false)
  const lastActivity = useRef(Date.now())
  const lastTickWall = useRef(Date.now())
  const elapsedRef = useRef(0)

  // Reset accumulator when the task changes.
  useEffect(() => {
    elapsedRef.current = 0
    lastActivity.current = Date.now()
    lastTickWall.current = Date.now()
    setElapsed(0)
    setPaused(false)
  }, [taskId])

  useEffect(() => {
    function bumpActivity() { lastActivity.current = Date.now() }
    window.addEventListener('keydown', bumpActivity)
    window.addEventListener('mousedown', bumpActivity)
    window.addEventListener('scroll', bumpActivity, true)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) lastActivity.current = Date.now()
    })

    const tick = setInterval(() => {
      const now = Date.now()
      const idleMs = now - lastActivity.current
      const isPaused = idleMs > 2 * 60 * 1000 || document.hidden
      if (!isPaused) {
        // Add wall-clock delta since last tick (not always exactly 1s).
        const delta = Math.min(now - lastTickWall.current, 2000)
        elapsedRef.current += delta
        setElapsed(elapsedRef.current)
      }
      lastTickWall.current = now
      setPaused(isPaused)
    }, 1000)

    return () => {
      clearInterval(tick)
      window.removeEventListener('keydown', bumpActivity)
      window.removeEventListener('mousedown', bumpActivity)
      window.removeEventListener('scroll', bumpActivity, true)
    }
  }, [taskId])

  return { elapsed, paused }
}

function fmtTime(ms) {
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/* ─── Component ────────────────────────────────────────────────── */

export default function QuickReviewWorkspace({
  project, task, segments, activeIdx, setActiveIdx,
  currentUserId, currentUserRole = 'vendor-user',
}) {
  const activeSeg = segments[activeIdx]
  const recommended = useMemo(() => {
    if (!activeSeg?.agentCandidates?.length) return activeSeg?.target || ''
    const top = [...activeSeg.agentCandidates].sort((a, b) => b.confidence - a.confidence)[0]
    return top?.text || activeSeg.target || ''
  }, [activeSeg?.id])

  const [target, setTarget] = useState(activeSeg?.editedTarget || recommended)
  const [savedAt, setSavedAt] = useState(null)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)

  useEffect(() => {
    setTarget(activeSeg?.editedTarget || recommended)
    setSavedAt(null)
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

  /* Task timer */
  const { elapsed, paused } = useTaskTimer(task?.id)

  /* Commit path — unchanged audit/training plumbing */
  const commit = useCallback(({ advance = true } = {}) => {
    if (!activeSeg) return
    const inferredPosture = isAccepted ? 'accept' : 'refine'
    const action = isAccepted ? 'verified' : 'edited'
    const top = [...(activeSeg.agentCandidates || [])].sort((a, b) => b.confidence - a.confidence)[0]
    try {
      decideSegment({
        segmentId: activeSeg.id,
        actorId: currentUserId,
        action,
        newValue: isAccepted ? null : target,
        chosenCandidateId: top?.id || null,
        rejectedCandidateIds: (activeSeg.agentCandidates || []).filter(c => c.id !== top?.id).map(c => c.id),
        rationaleTags: [],
        reasonNote: null, reason: null,
        telemetry: {
          dwellMs: Date.now() - dwellStart.current,
          undoCount: 0, glossaryConsultations: 0, crossRefJumps: 0,
          candidateHoverSeq: [],
          posture: inferredPosture,
          postureTransitions: [{ from: null, to: inferredPosture, at: Date.now(), viaShortcut: false }],
          preferencePairs: [], summonedSecondOpinion: false,
          quickReview: true,
        },
      })
      setSavedAt(Date.now())
      refresh()
      if (advance) {
        const nextIdx = segments.findIndex((_, i) => i > activeIdx && !segments[i].locked)
        if (nextIdx !== -1) setActiveIdx(nextIdx)
      }
    } catch (e) {
      window.alert(`Save failed: ${e.message}`)
    }
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

  const applyTM = (entry) => {
    if (!entry?.target) return
    setTarget(entry.target)
  }
  const applyGlossaryFix = (hit) => {
    const approvedHead = hit.approved.slice(0, Math.max(8, Math.min(20, hit.approved.length)))
    if (target.includes(approvedHead)) return
    const trailer = target.match(/[。．\.\s]$/) ? '' : (project?.requirements?.targetLanguages?.[0] === 'ja' ? '。' : '. ')
    setTarget(prev => `${prev}${trailer}${hit.approved}`)
  }

  /* Keyboard layer — Quick Review native shortcuts */
  const tmRef = useRef(null), tbRef = useRef(null), qaRef = useRef(null)

  useEffect(() => {
    function isTextField(el) {
      if (!el) return false
      const tag = (el.tagName || '').toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA') return true
      return el.isContentEditable
    }
    function onKey(e) {
      const inText = isTextField(e.target)
      // Always-on:
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); commit({ advance: true }); return
      }
      // While inside the editor we still allow ⌘/Ctrl+Enter (above) but
      // suppress single-letter shortcuts.
      if (inText) return

      switch (e.key) {
        case 'j': case 'J': case 'ArrowDown':
          e.preventDefault(); next(); return
        case 'k': case 'K': case 'ArrowUp':
          e.preventDefault(); prev(); return
        case 'a': case 'A':
          if (isAccepted) { e.preventDefault(); acceptRecommended() }
          return
        case 't': case 'T':
          if (tmMatches[0]) { e.preventDefault(); applyTM(tmMatches[0]) }
          return
        case 'b': case 'B':
          tbRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); e.preventDefault(); return
        case 'q': case 'Q':
          qaRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' }); e.preventDefault(); return
        default: return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commit, next, prev, isAccepted, tmMatches])

  /* Document context: ±5 segments around the active one */
  const contextWindow = useMemo(() => {
    const start = Math.max(0, activeIdx - 5)
    const end = Math.min(segments.length, activeIdx + 6)
    return segments.slice(start, end).map((s, i) => ({ s, i: start + i }))
  }, [segments, activeIdx])

  const totalSeg = segments.length
  const doneSeg = segments.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length

  return (
    <div className="space-y-4">
      {/* ── TOP BAR: doc + segment nav + timer ────────────────── */}
      <header className="bg-white border border-rule rounded-lg px-4 py-2.5 flex items-center justify-between gap-4">
        <div className="min-w-0 flex items-center gap-3">
          <FileText className="w-4 h-4 text-ocean shrink-0" />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate">{task?.title || project?.name}</p>
            <p className="text-[10.5px] text-mist truncate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {project?.requirements.sourceLanguage?.toUpperCase()} → {project?.requirements.targetLanguages?.[0]?.toUpperCase()} · {doneSeg}/{totalSeg} done
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={prev}
            disabled={activeIdx === 0}
            title="Previous segment (K · ↑)"
            className="p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4 text-slate" />
          </button>
          <span className="text-[12.5px] text-ink min-w-[110px] text-center font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Segment {activeIdx + 1} of {totalSeg}
          </span>
          <button
            onClick={next}
            disabled={activeIdx === totalSeg - 1}
            title="Next segment (J · ↓)"
            className="p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4 text-slate" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[12px] ${paused ? 'border-mist text-mist bg-rule/40' : 'border-teal/30 text-teal bg-teal/5'}`}
            title={paused ? 'Timer paused — no activity for 2 minutes or tab hidden' : 'Task timer running'}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{fmtTime(elapsed)}</span>
            {paused && <span className="text-[10px] uppercase tracking-wider">paused</span>}
          </div>
        </div>
      </header>

      {/* ── 3-COLUMN BODY: doc / editor / live panels ─────────── */}
      <div className="grid grid-cols-[260px_1fr_320px] gap-4 items-start">

        {/* LEFT: Document context (±5 segments around active) */}
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

        {/* CENTER: focused editor */}
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

              {/* Action row */}
              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-rule">
                <button
                  onClick={() => commit({ advance: true })}
                  disabled={activeSeg.locked || !target.trim() || (!isDirty && !isAccepted)}
                  title={!target.trim() ? 'Target is empty' : ''}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors bg-amber hover:bg-amber-deep text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Save & Next
                  <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>⌘↩</kbd>
                </button>
                {isAccepted && !activeSeg.locked && (
                  <button
                    onClick={acceptRecommended}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer"
                    title="Accept (A)"
                  >
                    <Check className="w-3.5 h-3.5" /> Accept suggestion
                    <kbd className="ml-1 px-1 py-0.5 bg-rule/60 rounded text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>A</kbd>
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
                  title="Skip (J)"
                >
                  Skip <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </main>

        {/* RIGHT: Live TM / TB / QA stack */}
        <aside className="space-y-3">
          {/* Live TM */}
          <section className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-ocean" />
                <MonoLabel>Live TM · {tmMatches.length} match{tmMatches.length === 1 ? '' : 'es'}</MonoLabel>
              </span>
              {tmMatches[0] && (
                <button
                  onClick={() => applyTM(tmMatches[0])}
                  className="inline-flex items-center gap-1 text-[10.5px] text-ocean hover:text-ocean-deep cursor-pointer"
                  title="Apply best match (T)"
                >
                  Apply <kbd className="px-1 py-0.5 bg-cream border border-rule rounded text-[9px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>T</kbd>
                </button>
              )}
            </div>
            {tmMatches.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-mist">No translation memory matches above 15%.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {tmMatches.map((m, i) => (
                  <li key={m.id} className="px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${m.matchRatio >= 0.75 ? 'bg-teal/10 text-teal' : m.matchRatio >= 0.4 ? 'bg-ocean/10 text-ocean' : 'bg-amber/10 text-amber-deep'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        {(m.matchRatio * 100).toFixed(0)}%
                      </span>
                      <button
                        onClick={() => applyTM(m)}
                        className="text-[10.5px] text-ocean hover:text-ocean-deep cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    <p className="text-[11.5px] text-slate leading-snug">{m.source}</p>
                    <p className="text-[12px] text-ink leading-snug mt-1 font-medium">{m.target}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Live TB (Glossary) */}
          <section ref={tbRef} className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-deep" />
                <MonoLabel>Live TB · {hits.length} term{hits.length === 1 ? '' : 's'}</MonoLabel>
              </span>
              <kbd className="px-1 py-0.5 bg-cream border border-rule rounded text-[9px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>B</kbd>
            </div>
            {hits.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-mist">No glossary terms in this segment.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {hits.map(h => (
                  <li key={h.id} className="px-3 py-2.5">
                    <p className="text-[11.5px] text-slate leading-snug"><span className="gloss-mark inline-block">{h.term}</span></p>
                    <p className="text-[12px] text-ink leading-snug mt-1 font-medium">→ {h.approved}</p>
                    <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {h.usage} · {target.includes(h.approved.slice(0, 8)) ? 'in target' : 'not yet in target'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Live QA */}
          <section ref={qaRef} className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-error" />
                <MonoLabel>Live QA · {qa.length} issue{qa.length === 1 ? '' : 's'}</MonoLabel>
              </span>
              <kbd className="px-1 py-0.5 bg-cream border border-rule rounded text-[9px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Q</kbd>
            </div>
            {qa.length === 0 ? (
              <p className="px-3 py-3 text-[12px] text-mist inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal" /> No issues detected.</p>
            ) : (
              <ul className="divide-y divide-rule">
                {qa.map(issue => (
                  <li key={issue.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-deep shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-ink">{issue.label}</p>
                        <p className="text-[11.5px] text-slate mt-0.5 leading-relaxed">{issue.detail}</p>
                        {issue.glossary && (
                          <button
                            onClick={() => applyGlossaryFix(issue.glossary)}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean-deep cursor-pointer"
                          >
                            <Check className="w-3 h-3" /> Apply approved rendering
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

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
    </div>
  )
}
