/**
 * Quick Review Workspace — reviewer-first cockpit.
 *
 * Replaces the dense Audit Review cockpit with a radically simplified
 * surface optimised for fast in-language editing:
 *
 *   - source segment rendered with inline glossary highlights
 *   - editable target field with autofocus, no Posture lock, no Refine
 *     button, no Accept-as-is panel: directly editable from first paint
 *   - one recommended translation (the highest-confidence agent), with
 *     a single "Regenerate suggestion" affordance — no panel of agents,
 *     no divergence map, no confidence bars
 *   - Live QA recomputes on every keystroke (debounced) and offers
 *     one-click fixes for glossary mismatches
 *   - inline Context strip (prev/next single lines) replaces the
 *     surrounding-segments duplicate of the left nav
 *   - reason note collapsed by default and never blocks Save
 *   - back-translation hidden by default for vendor; collapsible for
 *     client reviewers via the same "Show details" disclosure
 *   - Show details opens the existing Audit Review cockpit in a side
 *     sheet for the rare moment a reviewer needs the full picture
 *
 * Audit / training plumbing is unchanged: commit funnels through the
 * existing decideSegment() so retraining gates, audit logs, and
 * pedigree all behave identically to Audit Review.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Check, RotateCcw, ChevronDown, ChevronRight, ChevronLeft, AlertTriangle,
  RefreshCcw, BookOpen, ArrowRight, Search,
} from 'lucide-react'
import {
  HITL_SEGMENTS, ORG_BRAIN_UPDATES,
} from '../../data/hitlVendorWorkflow'
import { decideSegment } from '../../services/hitl/review'
import { qaDiff } from '../../services/hitl/cockpit'
import { MonoLabel } from './shared'

/* ─── Glossary matching (shared helper) ─────────────────────────
 * For each Org Brain entry in the project's domain whose source
 * fragment overlaps the current segment's source text, return:
 *   { id, term, approved, start, end, definition }
 * `start`/`end` are character offsets into the source string.
 * ───────────────────────────────────────────────────────────── */
function findGlossaryHits(source, project) {
  if (!source || !project) return []
  const lower = source.toLowerCase()
  const hits = []
  const seen = new Set()
  for (const o of ORG_BRAIN_UPDATES) {
    if (o.domain !== project.requirements.domain) continue
    if (!o.sourceFragment) continue
    // Heuristic: pick the first 4 words of the Org Brain source fragment
    // and look for it in the segment source. Crude but adequate for demo.
    const head = o.sourceFragment.split(/\s+/).slice(0, 4).join(' ').toLowerCase()
    if (head.length < 6) continue
    const idx = lower.indexOf(head)
    if (idx === -1) continue
    const key = `${idx}-${head}`
    if (seen.has(key)) continue
    seen.add(key)
    hits.push({
      id: o.id,
      term: source.slice(idx, idx + head.length),
      approved: o.approvedFragment.slice(0, 80),
      start: idx,
      end: idx + head.length,
      definition: o.sourceFragment.slice(0, 200),
    })
  }
  hits.sort((a, b) => a.start - b.start)
  return hits
}

/* Render a string with glossary hits highlighted. */
function HighlightedSource({ source, hits, onHoverHit }) {
  if (!hits.length) return <p className="text-[15px] leading-relaxed text-ink">{source}</p>
  const parts = []
  let cursor = 0
  hits.forEach((h, i) => {
    if (h.start > cursor) parts.push({ kind: 'plain', text: source.slice(cursor, h.start) })
    parts.push({ kind: 'hit', text: source.slice(h.start, h.end), hit: h, key: i })
    cursor = h.end
  })
  if (cursor < source.length) parts.push({ kind: 'plain', text: source.slice(cursor) })
  return (
    <p className="text-[15px] leading-relaxed text-ink">
      {parts.map((p, i) =>
        p.kind === 'plain'
          ? <span key={i}>{p.text}</span>
          : (
            <span
              key={i}
              onMouseEnter={() => onHoverHit?.(p.hit.id)}
              onMouseLeave={() => onHoverHit?.(null)}
              className="bg-amber/15 border-b border-amber-deep/50 cursor-help"
              title={`Glossary · ${p.hit.approved}`}
            >
              {p.text}
            </span>
          )
      )}
    </p>
  )
}

/* ─── Component ────────────────────────────────────────────────── */

export default function QuickReviewWorkspace({
  project, task, segments, activeIdx, setActiveIdx,
  currentUserId, currentUserRole = 'vendor-user',
  onOpenAudit,           // toggles parent to Audit Review mode
}) {
  const activeSeg = segments[activeIdx]
  const recommended = useMemo(() => {
    if (!activeSeg?.agentCandidates?.length) return activeSeg?.target || ''
    const top = [...activeSeg.agentCandidates].sort((a, b) => b.confidence - a.confidence)[0]
    return top?.text || activeSeg.target || ''
  }, [activeSeg?.id])

  const [target, setTarget] = useState(activeSeg?.editedTarget || recommended)
  const [note, setNote] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [showBackTranslation, setShowBackTranslation] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const dwellStart = useRef(Date.now())
  const taRef = useRef(null)

  // Reset state when active segment changes.
  useEffect(() => {
    setTarget(activeSeg?.editedTarget || recommended)
    setNote('')
    setNoteOpen(false)
    setShowBackTranslation(false)
    setSavedAt(null)
    dwellStart.current = Date.now()
    // Focus the target field on segment switch.
    requestAnimationFrame(() => taRef.current?.focus())
  }, [activeSeg?.id])

  const glossaryHits = useMemo(
    () => findGlossaryHits(activeSeg?.source || '', project),
    [activeSeg?.id, project?.id]
  )

  /* Live QA — uses the existing service. Augment with a glossary check
   * that fires when source has an approved term that's missing in the
   * current target text. */
  const qa = useMemo(() => {
    if (!activeSeg) return []
    const rows = qaDiff(activeSeg.source, target, { dntTerms: activeSeg.dntTerms || [] })
    const failing = rows.filter(r => !r.ok)
    // Glossary check: each hit whose approved form is missing in target
    // becomes an actionable issue with a one-click apply.
    for (const h of glossaryHits) {
      const approvedHead = h.approved.slice(0, Math.max(8, Math.min(20, h.approved.length)))
      if (!target.includes(approvedHead)) {
        failing.push({
          id: `glossary-${h.id}`,
          label: 'Terminology issue',
          detail: `Approved rendering "${h.approved}" not found in target. Click Apply to splice it in.`,
          ok: false,
          glossary: h,
        })
      }
    }
    return failing
  }, [activeSeg?.id, target, glossaryHits])

  const isDirty = activeSeg && target !== (activeSeg.editedTarget || recommended)
  const isAccepted = activeSeg && target === recommended && !activeSeg.editedTarget

  /* Commit path. Always funnels through decideSegment so audit + retraining
   * gates behave identically to Audit Review. Posture inferred:
   *   - unchanged from recommendation → 'accept' / action='verified'
   *   - edited                        → 'refine' / action='edited'
   * No rationale tags by default (display-only training). Reviewer can
   * add a note in the optional collapsed field; the note is stored
   * verbatim on the decision and does NOT feed training. */
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
        reasonNote: note || null,
        reason: note || null,
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
  }, [activeSeg, target, note, isAccepted, segments, activeIdx, currentUserId, setActiveIdx])

  const acceptRecommended = () => {
    setTarget(recommended)
    requestAnimationFrame(() => commit({ advance: true }))
  }

  const reset = () => setTarget(recommended)

  const regenerate = () => {
    // Pick the second-highest candidate as the "alt"; if none, keep recommended.
    const sorted = [...(activeSeg?.agentCandidates || [])].sort((a, b) => b.confidence - a.confidence)
    const alt = sorted[1] || sorted[0]
    if (alt) setTarget(alt.text)
  }

  const next = () => {
    if (activeIdx < segments.length - 1) setActiveIdx(activeIdx + 1)
  }
  const prev = () => {
    if (activeIdx > 0) setActiveIdx(activeIdx - 1)
  }

  const applyGlossaryFix = (hit) => {
    // Cheap demo behaviour: append the approved term at the end if it's missing.
    const approvedHead = hit.approved.slice(0, Math.max(8, Math.min(20, hit.approved.length)))
    if (target.includes(approvedHead)) return
    // Try to splice at the position of the source hit; otherwise append.
    setTarget(prev => `${prev}${prev.endsWith('。') || prev.endsWith('.') ? ' ' : '。'}${hit.approved}`)
    requestAnimationFrame(() => taRef.current?.focus())
  }

  /* Keyboard: Cmd/Ctrl+Enter commits + advances, even from the textarea. */
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); commit({ advance: true })
      } else if (e.key === 'Escape') {
        e.currentTarget?.blur?.()
      }
    }
    const el = taRef.current
    if (!el) return
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [commit])

  // Progress
  const totalSeg = segments.length
  const doneSeg = segments.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length
  const openIssues = segments.filter(s => qaDiff(s.source, s.editedTarget || s.target).some(r => !r.ok)).length

  return (
    <div className="grid grid-cols-[240px_1fr_300px] gap-6 items-start">
      {/* ── Left nav: clean segment list ─────────────────────────── */}
      <aside className="bg-white border border-rule rounded-lg overflow-hidden">
        <div className="px-3 py-2 border-b border-rule flex items-center justify-between">
          <MonoLabel>Tasks</MonoLabel>
          <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{doneSeg}/{totalSeg}</span>
        </div>
        <ul className="max-h-[640px] overflow-y-auto">
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
      </aside>

      {/* ── Main editor: wide, calm ─────────────────────────────── */}
      <main className="bg-white border border-rule rounded-lg p-7">
        {/* Lightweight header */}
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
            {/* Source */}
            <section className="mb-6">
              <MonoLabel>Source · {project?.requirements.sourceLanguage?.toUpperCase()}</MonoLabel>
              <div className="mt-2">
                <HighlightedSource source={activeSeg.source} hits={glossaryHits} />
              </div>
            </section>

            {/* Target — editable, autofocus, no mode */}
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
              <textarea
                ref={taRef}
                value={target}
                onChange={e => setTarget(e.target.value)}
                disabled={activeSeg.locked}
                rows={Math.max(3, Math.min(8, Math.ceil(target.length / 60)))}
                placeholder="Type or paste the translation here. Press ⌘↩ to save & continue."
                className="w-full text-[15px] leading-relaxed text-ink border border-rule rounded-md p-3 focus:border-ocean/50 focus:outline-none"
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

            {/* Inline context — collapsed by default to one line per side */}
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

            {/* Optional note — collapsed by default, never blocks save */}
            <section className="mb-5">
              <button
                onClick={() => setNoteOpen(o => !o)}
                className="inline-flex items-center gap-1 text-[12px] text-slate hover:text-ink cursor-pointer"
              >
                {noteOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Add note (optional)
              </button>
              {noteOpen && (
                <input
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Context for the next reviewer. Does not feed training."
                  className="mt-2 w-full text-[13px] border border-rule rounded-md p-2"
                />
              )}
            </section>

            {/* Primary action row */}
            <div className="flex items-center gap-2 pt-4 border-t border-rule">
              <button
                onClick={() => commit({ advance: true })}
                disabled={activeSeg.locked || (!isDirty && !isAccepted)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors bg-amber hover:bg-amber-deep text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Save & Next <kbd className="ml-1 px-1 py-0.5 bg-white/20 rounded text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>⌘↩</kbd>
              </button>
              <button
                onClick={acceptRecommended}
                disabled={activeSeg.locked}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-rule-strong bg-white hover:bg-pale text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Check className="w-3.5 h-3.5" /> Accept suggestion
              </button>
              <button
                onClick={reset}
                disabled={!isDirty}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-rule-strong bg-white hover:bg-pale text-ink cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to suggestion
              </button>
              <button
                onClick={next}
                disabled={activeIdx === totalSeg - 1}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] text-slate hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Skip · Next <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* ── Right aide: Live QA + Glossary ──────────────────────── */}
      <aside className="space-y-3">
        {/* Live QA */}
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

        {/* Glossary terms in this segment */}
        {glossaryHits.length > 0 && (
          <div className="bg-white border border-rule rounded-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-rule">
              <MonoLabel>Glossary · {glossaryHits.length} term{glossaryHits.length === 1 ? '' : 's'}</MonoLabel>
            </div>
            <ul className="divide-y divide-rule">
              {glossaryHits.map(h => (
                <li key={h.id} className="px-3 py-2.5 text-[12px]">
                  <p className="text-ink"><BookOpen className="inline w-3 h-3 mr-1 text-amber-deep" />{h.term}</p>
                  <p className="text-mist mt-0.5 text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>→ {h.approved}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Client-only: optional back-translation, collapsed */}
        {currentUserRole === 'client-reviewer' && (
          <details className="bg-white border border-rule rounded-lg">
            <summary className="px-3 py-2 cursor-pointer text-[12px] text-slate hover:text-ink list-none flex items-center justify-between">
              <span><MonoLabel>Back-translation (optional)</MonoLabel></span>
              <ChevronDown className="w-3.5 h-3.5 text-mist" />
            </summary>
            <p className="px-3 pb-3 text-[12px] text-slate">Round-trip translation of the current target. Comprehension aid only; not a verification.</p>
          </details>
        )}

        {/* Show details → Audit Review */}
        <button
          onClick={onOpenAudit}
          className="w-full text-left bg-cream border border-rule rounded-lg px-3 py-2.5 hover:border-ocean/30 cursor-pointer"
        >
          <p className="text-[12px] text-ink font-semibold">Show details</p>
          <p className="text-[11px] text-mist mt-0.5">Open Audit Review for agent panel, trust score, pedigree, posture history.</p>
        </button>

        {/* Progress hint */}
        <div className="px-3 py-2 text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {doneSeg}/{totalSeg} done · {openIssues} segment{openIssues === 1 ? '' : 's'} with open issues
        </div>
      </aside>
    </div>
  )
}
