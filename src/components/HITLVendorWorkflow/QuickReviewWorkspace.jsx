/**
 * Quick Review Workspace — reviewer-first cockpit.
 *
 * Surfaces (this revision):
 *   - Source pane: read-only, inline glossary highlights using .gloss-mark
 *     spans. Native title tooltips show the approved rendering + definition.
 *   - Target pane: contenteditable div with the SAME .gloss-mark inline
 *     highlights. The user edits the target like a textarea; glossary
 *     terms render with a soft underline + tint and a hover tooltip.
 *     Highlights are computed at segment load and intentionally do not
 *     re-render on every keystroke so the cursor never jumps.
 *   - Left nav: project switcher + scope toggle + segment list, grouped
 *     under "Review Workspace". This replaces the canvas-top project /
 *     scope strips removed from the parent.
 *   - Right rail: Live QA only. The standalone Glossary card is gone —
 *     glossary compliance is now passively visible in both panes, plus
 *     mismatches surface as Live QA issues.
 *   - Audit / training plumbing unchanged: every commit funnels through
 *     decideSegment() with inferred posture (accept / refine).
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Check, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle,
  RefreshCcw, ArrowRight,
} from 'lucide-react'
import {
  HITL_PROJECTS, HITL_TASKS, ORG_BRAIN_UPDATES,
} from '../../data/hitlVendorWorkflow'
import { decideSegment } from '../../services/hitl/review'
import { qaDiff } from '../../services/hitl/cockpit'
import { listMyTasks } from '../../services/hitl/taskAssignment'
import { MonoLabel } from './shared'

/* ─── Glossary matching ─────────────────────────────────────────
 *
 * For each Org Brain entry whose domain matches the project AND whose
 * source-fragment head appears in the segment source, we get a "hit":
 *   { id, term, approved, definition, sourceStart, sourceEnd, targetStart, targetEnd }
 *
 * targetStart/targetEnd are computed by finding the approvedFragment
 * head in the current target text. If not found, target offsets are null.
 * ─────────────────────────────────────────────────────────────── */
function pickHead(text, words = 4, minLen = 6) {
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

    // For target match, try a few head lengths of the approved fragment.
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
      sourceStart: sIdx,
      sourceEnd: sIdx + srcHead.length,
      targetStart: tIdx === -1 ? null : tIdx,
      targetEnd:   tIdx === -1 ? null : tIdx + tHeadLen,
    })
  }
  hits.sort((a, b) => a.sourceStart - b.sourceStart)
  return hits
}

/* HTML rendering of a text string with inline glossary spans. The
 * spans carry data-gloss-id + native title attributes for hover. */
function escapeHtml(s) {
  return (s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildHTML(text, intervals) {
  // intervals: [{ start, end, glossId, title }, …] sorted by start
  if (!intervals?.length) return escapeHtml(text)
  let out = '', cursor = 0
  for (const iv of intervals) {
    if (iv.start == null || iv.end == null) continue
    if (iv.start < cursor) continue // skip overlap
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

/* Cross-pane pairing — when hovering a glossary span anywhere in the
 * cockpit, add `.gloss-active` to every other span with the same id.
 * Native DOM, no React re-render, no cursor disturbance. */
function pairHighlights(rootSelectorClass = 'gloss-mark') {
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest?.(`.${rootSelectorClass}`)
    if (!el || !el.dataset?.glossId) return
    document.querySelectorAll(`.${rootSelectorClass}[data-gloss-id="${el.dataset.glossId}"]`)
      .forEach(n => n.classList.add('gloss-active'))
  }, true)
  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest?.(`.${rootSelectorClass}`)
    if (!el || !el.dataset?.glossId) return
    document.querySelectorAll(`.${rootSelectorClass}[data-gloss-id="${el.dataset.glossId}"]`)
      .forEach(n => n.classList.remove('gloss-active'))
  }, true)
}
let _paired = false

/* ─── Contenteditable target with inline highlights ──────────────
 *
 * Caller MUST pass `key={segmentId}` so the component remounts per
 * segment. innerHTML is set exactly once on mount; user keystrokes
 * after that update parent state via onInput → onChange, but the
 * contenteditable DOM is left alone so the cursor never jumps.
 *
 * Glossary highlights therefore reflect the segment's starting state.
 * If the reviewer types in the approved rendering during editing, the
 * highlight refreshes on the next segment navigation. */
function HighlightedEditable({ initialValue, intervals, onChange, locked, autoFocus }) {
  const ref = useRef(null)
  // Capture the initial HTML once. Subsequent renders don't touch the DOM.
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
      sel?.removeAllRanges()
      sel?.addRange(range)
      ref.current.focus()
    }
    // Empty deps — runs once per mount; the parent uses key={segmentId}
    // to remount per segment.
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
      /* Suppress third-party writing / translation overlays inside this
       * secure editable surface. Grammarly, LanguageTool, and Google
       * Translate all watch for these attributes. */
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

/* ─── Read-only source with inline glossary highlights ───────── */
function HighlightedSource({ source, intervals }) {
  const html = useMemo(() => buildHTML(source, intervals), [source, intervals])
  return <p className="text-[15px] leading-relaxed text-ink" dangerouslySetInnerHTML={{ __html: html }} />
}

/* ─── Component ────────────────────────────────────────────────── */

export default function QuickReviewWorkspace({
  project, task, segments, activeIdx, setActiveIdx,
  currentUserId, currentUserRole = 'vendor-user',
  activeProjectId, setActiveProjectId,
  activeTaskId, setActiveTaskId,
  scope, setScope,
  onOpenAudit,
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
  const dwellStart = useRef(Date.now())

  // Reset state when active segment changes.
  useEffect(() => {
    setTarget(activeSeg?.editedTarget || recommended)
    setSavedAt(null)
    dwellStart.current = Date.now()
  }, [activeSeg?.id])

  // Set up cross-pane pairing once.
  useEffect(() => {
    if (_paired) return
    pairHighlights()
    _paired = true
  }, [])

  /* Compute hits for source + target on the FIRST paint of each segment.
   * We deliberately don't recompute on every keystroke so the cursor
   * stays put. Hits refresh whenever the segment changes. */
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

  /* Live QA — text-only issues. Reuses qaDiff and adds a glossary
   * mismatch issue when an approved rendering is missing in target. */
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
        reasonNote: null,
        reason: null,
        telemetry: {
          dwellMs: Date.now() - dwellStart.current,
          undoCount: 0, glossaryConsultations: 0, crossRefJumps: 0,
          candidateHoverSeq: [],
          posture: inferredPosture,
          postureTransitions: [{ from: null, to: inferredPosture, at: Date.now(), viaShortcut: false }],
          preferencePairs: [],
          summonedSecondOpinion: false,
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
    // Allow the editable to refresh with new initialValue, then commit.
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

  const applyGlossaryFix = (hit) => {
    const approvedHead = hit.approved.slice(0, Math.max(8, Math.min(20, hit.approved.length)))
    if (target.includes(approvedHead)) return
    const trailer = target.match(/[。．\.\s]$/) ? '' : (project?.requirements?.targetLanguages?.[0] === 'ja' ? '。' : '. ')
    setTarget(prev => `${prev}${trailer}${hit.approved}`)
  }

  /* Cmd/Ctrl+Enter commits + advances from anywhere. */
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); commit({ advance: true })
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commit])

  /* Counts for the left nav + progress chip. */
  const totalSeg = segments.length
  const doneSeg = segments.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length

  /* Left-nav project list */
  const allProjects = HITL_PROJECTS
  const allTasksForProject = HITL_TASKS.filter(t => t.projectId === project?.id)
  const myTaskIds = new Set(listMyTasks(currentUserId, { projectId: project?.id }).map(t => t.id))
  const scopedTasks = scope === 'mine' ? allTasksForProject.filter(t => myTaskIds.has(t.id)) : allTasksForProject

  return (
    <div className="grid grid-cols-[260px_1fr_300px] gap-6 items-start">
      {/* ── Left nav: projects → tasks → segments ──────────────── */}
      <aside className="space-y-3">
        <section className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-rule">
            <MonoLabel>Projects</MonoLabel>
          </div>
          <ul>
            {allProjects.map(p => (
              <li key={p.id}>
                <button
                  onClick={() => { setActiveProjectId?.(p.id); setActiveIdx(0) }}
                  className={`w-full text-left px-3 py-2 text-[12.5px] cursor-pointer ${
                    p.id === project?.id ? 'bg-ocean/10 text-ink' : 'hover:bg-pale/40 text-slate'
                  }`}
                >
                  <p className="truncate">{p.name}</p>
                  <p className="text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {p.requirements.reviewMode === 'external-vendor'  ? 'External Review' :
                     p.requirements.reviewMode === 'internal-single'  ? 'Internal Review 1' :
                                                                        'Internal Final Review'}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </section>

        {scopedTasks.length > 1 && (
          <section className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
              <MonoLabel>Tasks</MonoLabel>
              <div className="inline-flex items-center text-[10.5px] rounded-full border border-rule overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <button onClick={() => setScope?.('all')}  className={`px-2 py-0.5 cursor-pointer ${scope === 'all'  ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}>ALL</button>
                <button onClick={() => setScope?.('mine')} className={`px-2 py-0.5 cursor-pointer ${scope === 'mine' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}>MINE</button>
              </div>
            </div>
            <ul>
              {scopedTasks.map(t => (
                <li key={t.id}>
                  <button
                    onClick={() => { setActiveTaskId?.(t.id); setActiveIdx(0) }}
                    className={`w-full text-left px-3 py-1.5 text-[12px] cursor-pointer truncate ${
                      t.id === task?.id ? 'bg-ocean/10 text-ink' : 'hover:bg-pale/40 text-slate'
                    }`}
                  >
                    {t.title}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
            <MonoLabel>Segments</MonoLabel>
            <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doneSeg}/{totalSeg}</span>
          </div>
          <ul className="max-h-[520px] overflow-y-auto">
            {segments.map((s, i) => {
              const isActive = i === activeIdx
              const done = ['verified', 'edited', 'accepted'].includes(s.decision)
              const hasOpen = !done && qaDiff(s.source, s.editedTarget || s.target).some(r => !r.ok)
              return (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveIdx(i)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-[12.5px] cursor-pointer ${
                      isActive ? 'bg-ocean/10 text-ink' : 'hover:bg-pale/40 text-slate'
                    }`}
                  >
                    <span className="shrink-0 w-3.5 inline-flex justify-center">
                      {done && <Check className="w-3.5 h-3.5 text-teal" />}
                      {!done && hasOpen && <AlertTriangle className="w-3.5 h-3.5 text-amber-deep" />}
                    </span>
                    <span className="font-mono text-mist w-6 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}</span>
                    <span className="truncate">{s.source.slice(0, 60)}{s.source.length > 60 ? '…' : ''}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      </aside>

      {/* ── Main editor ─────────────────────────────────────────── */}
      <main className="bg-white border border-rule rounded-lg p-7">
        <div className="flex items-center justify-between mb-5">
          <div>
            <MonoLabel>Segment {activeIdx + 1} of {totalSeg}</MonoLabel>
            <p className="text-[11px] text-mist mt-0.5">
              {task?.title || project?.name} · {project?.requirements.sourceLanguage} → {project?.requirements.targetLanguages?.[0]}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prev} disabled={activeIdx === 0} className="p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" title="Previous">
              <ChevronLeft className="w-4 h-4 text-slate" />
            </button>
            <button onClick={next} disabled={activeIdx === totalSeg - 1} className="p-1.5 rounded-md border border-rule hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" title="Next">
              <ChevronRight className="w-4 h-4 text-slate" />
            </button>
          </div>
        </div>

        {!activeSeg ? (
          <p className="text-mist">No segment selected.</p>
        ) : (
          <>
            <section className="mb-6">
              <MonoLabel>Source · {project?.requirements.sourceLanguage?.toUpperCase()}</MonoLabel>
              <div className="mt-2">
                <HighlightedSource source={activeSeg.source} intervals={sourceIntervals} />
              </div>
            </section>

            <section className="mb-3">
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
                key={activeSeg.id /* force remount per segment so initialValue applies */}
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

            {/* Inline prev/next context */}
            <section className="mb-5 text-[12px] text-slate">
              {activeIdx > 0 && (
                <p className="truncate">
                  <span className="text-mist mr-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>↑ prev</span>
                  {segments[activeIdx - 1].source.slice(0, 100)}{segments[activeIdx - 1].source.length > 100 ? '…' : ''}
                </p>
              )}
              {activeIdx < totalSeg - 1 && (
                <p className="truncate">
                  <span className="text-mist mr-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>↓ next</span>
                  {segments[activeIdx + 1].source.slice(0, 100)}{segments[activeIdx + 1].source.length > 100 ? '…' : ''}
                </p>
              )}
            </section>

            {/* Action row — Save & Next is dominant. Contextual actions
                appear only when relevant. Skip is a quiet text link. */}
            <div className="flex items-center gap-3 pt-4 border-t border-rule">
              <button
                onClick={() => commit({ advance: true })}
                disabled={activeSeg.locked || !target.trim() || (!isDirty && !isAccepted)}
                title={!target.trim() ? 'Target is empty' : ''}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors bg-amber hover:bg-amber-deep text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                Save & Next
                <kbd className="ml-1 px-1.5 py-0.5 bg-white/20 rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>⌘↩</kbd>
              </button>

              {/* Untouched: offer one-click Accept */}
              {isAccepted && !activeSeg.locked && (
                <button
                  onClick={acceptRecommended}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Accept suggestion
                </button>
              )}

              {/* Edited: offer Reset */}
              {isDirty && !activeSeg.locked && (
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset to suggestion
                </button>
              )}

              {/* Empty target — explicit warning, no Accept (nothing to accept) */}
              {!target.trim() && (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-deep">
                  <AlertTriangle className="w-3.5 h-3.5" /> Target is empty
                </span>
              )}

              {/* Skip — quiet, always last */}
              <button
                onClick={next}
                disabled={activeIdx === totalSeg - 1}
                className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[12px] text-mist hover:text-slate cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Skip <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Right rail: Live QA only ────────────────────────────── */}
      <aside className="space-y-3">
        <div className="bg-white border border-rule rounded-lg overflow-hidden">
          <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
            <MonoLabel>Live QA · {qa.length} issue{qa.length === 1 ? '' : 's'}</MonoLabel>
            {qa.length === 0 && <Check className="w-3.5 h-3.5 text-teal" />}
          </div>
          {qa.length === 0 ? (
            <p className="px-3 py-3 text-[12px] text-mist">No issues detected.</p>
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
        </div>

        {currentUserRole === 'client-reviewer' && (
          <details className="bg-white border border-rule rounded-lg">
            <summary className="px-3 py-2 cursor-pointer text-[12px] text-slate hover:text-ink list-none flex items-center justify-between">
              <span><MonoLabel>Back-translation (optional)</MonoLabel></span>
              <ChevronDown className="w-3.5 h-3.5 text-mist" />
            </summary>
            <p className="px-3 pb-3 text-[12px] text-slate">Round-trip translation of the current target. Comprehension aid only; not a verification.</p>
          </details>
        )}

      </aside>
    </div>
  )
}
