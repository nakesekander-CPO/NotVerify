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
  Clock, Pause, BookOpen, FileText, Stethoscope, ChevronDown, Keyboard, X,
  LogOut, Flag, Sparkles, Search, Replace, Eye, EyeOff, BadgeCheck,
} from 'lucide-react'
import { ORG_BRAIN_UPDATES, FLAG_CATEGORIES } from '../../data/hitlVendorWorkflow'
import { decideSegment } from '../../services/hitl/review'
import { qaDiff } from '../../services/hitl/cockpit'
import { findTMMatches } from '../../services/hitl/tm'
import { MonoLabel } from './shared'
import CommandPalette from './CommandPalette'

/* Roles that see compliance metadata (J-GAAP / TSE / ASBJ) by default. */
const COMPLIANCE_VISIBLE_ROLES = new Set([
  'final-validator', 'compliance-reviewer', 'legal-reviewer', 'internal-reviewer',
  'project-manager', 'org-admin', 'tenant-admin', 'arbitr-global-admin',
])

/* Heuristic: does a QA / glossary item carry regulatory weight that
 * should be hidden from non-compliance roles by default? */
function isComplianceItem(item) {
  if (!item) return false
  if (item.glossary?.sourceTermbase && /j-gaap|tse|asbj|compliance|legal/i.test(item.glossary.sourceTermbase)) return true
  if (item.label && /regulator|compliance|j-gaap|asbj|tse|filing/i.test(item.label)) return true
  if (item.detail && /j-gaap|asbj|tse|filing/i.test(item.detail)) return true
  return false
}

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
    const status = o.status || 'preferred'
    // "Required missing" promotes the source-side mark to the required tone
    // when the approved rendering is absent from the target.
    const renderedStatus =
      status === 'required' && tIdx === -1 ? 'required' : status
    hits.push({
      id: o.id,
      term: source.slice(sIdx, sIdx + srcHead.length),
      approved: o.approvedFragment.slice(0, 120),
      definition: o.sourceFragment.slice(0, 200),
      usage: `${o.domain} · ${o.language}`,
      sourceTermbase: o.sourceTermbase || null,
      usageNote: o.usageNote || null,
      status: renderedStatus,
      sourceStart: sIdx, sourceEnd: sIdx + srcHead.length,
      targetStart: tIdx === -1 ? null : tIdx,
      targetEnd:   tIdx === -1 ? null : tIdx + tHeadLen,
    })
  }
  hits.sort((a, b) => a.sourceStart - b.sourceStart)
  return hits
}

/* Pretty label for a glossary status. */
function glossStatusLabel(status) {
  switch (status) {
    case 'required':  return 'Required'
    case 'forbidden': return 'Forbidden'
    case 'dnt':       return 'Do not translate'
    case 'preferred': return 'Preferred'
    default:          return 'Optional'
  }
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
    const stateClass = iv.status ? `gloss-${iv.status}` : 'gloss-preferred'
    out += `<span class="gloss-mark ${stateClass}" data-gloss-id="${iv.glossId}" data-gloss-status="${iv.status || 'preferred'}" title="${escapeHtml(iv.title)}">${escapeHtml(text.slice(iv.start, iv.end))}</span>`
    cursor = iv.end
  }
  out += escapeHtml(text.slice(cursor))
  return out
}
function tooltipFor(hit) {
  const status = glossStatusLabel(hit.status)
  const tb = hit.sourceTermbase ? ` · ${hit.sourceTermbase}` : ''
  const note = hit.usageNote ? `\n${hit.usageNote}` : ''
  return `[${status}${tb}]\nApproved: ${hit.approved}\n${hit.definition}${note}`
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
function HighlightedEditable({
  initialValue, intervals, onChange, locked, autoFocus,
  editorRef, composingRef, onEditorKeyDown,
}) {
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
      onKeyDown={onEditorKeyDown}
      onCompositionStart={() => { if (composingRef) composingRef.current = true }}
      onCompositionEnd={() => {
        if (composingRef) composingRef.current = false
        // Mirror the post-composition text upstream so React state catches up.
        onChange?.(ref.current?.innerText || '')
      }}
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
      ['Ctrl+↓', 'Next segment'],
      ['Ctrl+↑', 'Previous segment'],
      ['Ctrl+⇧↓', 'Next flagged segment'],
      ['Ctrl+⇧↑', 'Previous flagged segment'],
      ['[ · ]', 'Prev / Next (alt)'],
      ['J · K', 'Prev / Next (alt, outside editor)'],
    ]},
    { name: 'Editing', items: [
      ['↩',           'Confirm and move to next flagged'],
      ['⌘↩ · Ctrl↩',  'Confirm and move to next segment'],
      ['⇧↩',          'Insert line break'],
      ['Esc',         'Revert unsaved edit · release focus'],
      ['⌘Z · Ctrl+Z', 'Undo'],
      ['⌘⇧U · Ctrl⇧U','Copy source to target'],
      ['A',           'Accept suggestion (when target is untouched)'],
    ]},
    { name: 'Live TM', items: [
      ['T',        'Apply top TM match'],
      ['⇧T',       'Focus TM panel to browse'],
      ['J / K · ↓ / ↑', 'Move within TM panel'],
      ['Enter',    'Apply selected TM match'],
    ]},
    { name: 'Glossary', items: [
      ['G',        'Focus glossary panel'],
      ['⇧G',       'Jump caret to next glossary term'],
      ['⌘1..9',    'Apply glossary term 1–9'],
      ['Enter',    'Apply approved rendering'],
    ]},
    { name: 'Live QA', items: [
      ['Q',        'Focus QA panel'],
      ['J / K',    'Move between issues'],
      ['Enter',    'Jump to issue · apply fix'],
      ['A',        'Accept suggested fix'],
      ['R',        'Toggle compliance items (role-gated)'],
    ]},
    { name: 'Search & tools', items: [
      ['⌘F · Ctrl+F', 'Find & Replace'],
      ['/',           'Command palette'],
      ['?',           'Open / close shortcuts'],
      ['⇧E',          'Exit Review Mode'],
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

/* ─── Document reading view ───────────────────────────────────────
 *
 * A target-only continuous-reading mode for non-translator final review
 * (PMs, signoff stakeholders, regional leads doing a flow read).
 * Translation chrome (TM, glossary, QA) is hidden by default. Each
 * paragraph is clickable: a popover surfaces source + segment metadata,
 * and "Open in editor" jumps the reviewer back into Quick mode at that
 * segment. Keyboard: J/K navigates paragraphs, Enter opens, / focuses
 * the source-toggle. Source can be revealed inline (parallel) for
 * bilingual readers without leaving the view. */
function DocumentReadingView({ project, segments, activeIdx, onJump }) {
  const [openIdx, setOpenIdx] = useState(null)
  const [showSource, setShowSource] = useState(false)
  const targetLang = project?.requirements?.targetLanguages?.[0]?.toUpperCase() || 'TARGET'
  const sourceLang = project?.requirements?.sourceLanguage?.toUpperCase() || 'SOURCE'
  // Group consecutive segments into "paragraphs" — split on segments
  // whose source ends with a hard line break or is a heading.
  return (
    <div className="grid grid-cols-[1fr_280px] gap-4 items-start">
      <main className="bg-white border border-rule rounded-lg p-8 max-h-[78vh] overflow-y-auto">
        <header className="mb-6 pb-4 border-b border-rule flex items-center justify-between gap-3">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-mist mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {targetLang} · target document · continuous reading
            </p>
            <p className="text-[18px] font-semibold text-ink">{project?.name || 'Document'}</p>
          </div>
          <button
            onClick={() => setShowSource(v => !v)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11.5px] cursor-pointer ${
              showSource ? 'border-ocean text-ocean bg-ocean/5' : 'border-rule text-slate hover:bg-pale'
            }`}
            title="Show source paragraphs inline"
          >
            {showSource ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {showSource ? `Hide ${sourceLang}` : `Show ${sourceLang}`}
          </button>
        </header>
        <article className="space-y-4 text-[15.5px] leading-[1.85] text-ink" style={{ fontFamily: 'inherit' }}>
          {segments.map((s, i) => {
            const isActive = i === activeIdx
            const isOpen = i === openIdx
            const display = s.editedTarget || s.target || s.source
            const decision = s.decision || 'pending'
            const dotClass =
              decision === 'verified' || decision === 'accepted' || decision === 'edited' ? 'bg-teal'
              : decision === 'rejected' || decision === 'not-verified' ? 'bg-error'
              : decision === 'needs-rework' ? 'bg-amber-deep'
              : 'bg-mist'
            return (
              <div key={s.id} className="group">
                {showSource && (
                  <p className="text-[12.5px] text-mist italic mb-1.5 leading-relaxed">{s.source}</p>
                )}
                <p
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className={`relative cursor-pointer rounded-md transition-colors px-2 -mx-2 ${
                    isOpen ? 'bg-ocean/5 ring-1 ring-ocean/30' : isActive ? 'bg-amber/5' : 'hover:bg-pale/60'
                  }`}
                >
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle ${dotClass}`} />
                  {display}
                </p>
                {isOpen && (
                  <div className="mt-1 ml-4 p-3 rounded-md border border-rule bg-cream/60 text-[12.5px] text-slate">
                    <div className="flex items-center justify-between mb-2 text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      <span>SEG-{String(i + 1).padStart(3, '0')} · {decision}</span>
                      {s.flagCategories?.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-deep">
                          <Flag className="w-3 h-3" /> {s.flagCategories.join(' · ')}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-mist mb-2"><span className="uppercase tracking-wider mr-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{sourceLang}</span>{s.source}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); onJump?.(i) }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-ocean text-white text-[11.5px] cursor-pointer hover:bg-ocean/90"
                    >
                      <Check className="w-3 h-3" /> Open in editor
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </article>
      </main>
      <aside className="bg-white border border-rule rounded-lg p-4 sticky top-2">
        <p className="text-[10.5px] uppercase tracking-[0.18em] text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Reading mode
        </p>
        <p className="text-[12.5px] text-slate leading-relaxed mb-3">
          Continuous read of the target document. Click any paragraph to
          inspect source context. Translation chrome is hidden — switch
          to <span className="font-semibold text-ink">Quick</span> to edit.
        </p>
        <ul className="text-[11.5px] text-slate space-y-1.5">
          <li className="flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-teal" /> Verified / accepted</li>
          <li className="flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-deep" /> Needs rework</li>
          <li className="flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-error" /> Rejected / not verified</li>
          <li className="flex items-center gap-2"><span className="inline-block w-1.5 h-1.5 rounded-full bg-mist" /> Pending</li>
        </ul>
        <div className="border-t border-rule mt-4 pt-3 text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {segments.length} paragraphs · {sourceLang} → {targetLang}
        </div>
      </aside>
    </div>
  )
}

/* ─── Component ────────────────────────────────────────────────── */

export default function QuickReviewWorkspace({
  project, task, segments, activeIdx, setActiveIdx,
  currentUserId, currentUserRole = 'vendor-user',
  cockpitMode, setCockpitMode,
  onExitReview, onGoToSignoff,
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
  const [showPalette, setShowPalette] = useState(false)
  const [showFind, setShowFind] = useState(false)
  const [showSage, setShowSage] = useState(false)
  const [revealCompliance, setRevealCompliance] = useState(false)
  const [escArmed, setEscArmed] = useState(false)
  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const editorRef = useRef(null)
  const composingRef = useRef(false)
  const escTimerRef = useRef(null)

  /* Focused-panel state machine — null when editor is focused */
  const [focusedPanel, setFocusedPanel] = useState(null) // null | 'tm' | 'tb' | 'qa'
  const [focusedIdx, setFocusedIdx] = useState(0)

  useEffect(() => {
    setTarget(activeSeg?.editedTarget || recommended)
    setSavedAt(null)
    setFocusedPanel(null); setFocusedIdx(0)
    setEscArmed(false)
    if (escTimerRef.current) { clearTimeout(escTimerRef.current); escTimerRef.current = null }
  }, [activeSeg?.id])

  /* Compliance visibility — defaults from role; reviewer can override per-session with R. */
  const complianceDefault = COMPLIANCE_VISIBLE_ROLES.has(currentUserRole)
  const showCompliance = complianceDefault || revealCompliance

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
    start: h.sourceStart, end: h.sourceEnd, glossId: h.id, status: h.status, title: tooltipFor(h),
  })), [hits])
  const targetIntervals = useMemo(() => hits
    .filter(h => h.targetStart != null)
    .map(h => ({
      start: h.targetStart, end: h.targetEnd, glossId: h.id,
      // In the target, "required" loses its missing-cue (the term *is* present),
      // so we render with the preferred tone unless the term is forbidden / DNT.
      status: h.status === 'required' ? 'preferred' : h.status,
      title: tooltipFor(h),
    })),
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

  /* Flagged-segment helpers — a flagged segment is one with at least one
   * flagCategories entry that the reviewer has not yet verified/edited. */
  const isFlaggedAndOpen = (s) =>
    (s?.flagCategories?.length > 0) &&
    !['verified', 'edited', 'accepted'].includes(s?.decision)

  const findNextOpenFlagged = (from, dir = 1) => {
    const n = segments.length
    if (n === 0) return -1
    let i = from + dir
    while (i >= 0 && i < n) {
      if (isFlaggedAndOpen(segments[i]) && !segments[i].locked) return i
      i += dir
    }
    return -1
  }

  const commit = useCallback(({ advance = 'any' } = {}) => {
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
        let nextIdx = -1
        if (advance === 'flagged') {
          nextIdx = findNextOpenFlagged(activeIdx, +1)
        }
        if (nextIdx === -1) {
          // Fall through to next unlocked segment.
          nextIdx = segments.findIndex((_, i) => i > activeIdx && !segments[i].locked)
        }
        if (nextIdx !== -1) setActiveIdx(nextIdx)
      }
    } catch (e) { window.alert(`Save failed: ${e.message}`) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSeg, target, isAccepted, segments, activeIdx, currentUserId, setActiveIdx])

  const acceptRecommended = () => {
    setTarget(recommended)
    requestAnimationFrame(() => commit({ advance: 'flagged' }))
  }
  const reset = () => setTarget(recommended)
  const regenerate = () => {
    const sorted = [...(activeSeg?.agentCandidates || [])].sort((a, b) => b.confidence - a.confidence)
    const alt = sorted[1] || sorted[0]
    if (alt) setTarget(alt.text)
  }
  const next = () => { if (activeIdx < segments.length - 1) setActiveIdx(activeIdx + 1) }
  const prev = () => { if (activeIdx > 0) setActiveIdx(activeIdx - 1) }
  const jumpFlagged = (dir = 1) => {
    const idx = findNextOpenFlagged(activeIdx, dir)
    if (idx !== -1) setActiveIdx(idx)
  }
  const copySourceToTarget = () => {
    if (!activeSeg?.source) return
    setTarget(activeSeg.source)
    requestAnimationFrame(() => editorRef.current?.focus())
  }

  const applyTM = (entry) => { if (entry?.target) setTarget(entry.target) }
  const applyGlossaryFix = (hit) => {
    const approvedHead = hit.approved.slice(0, Math.max(8, Math.min(20, hit.approved.length)))
    if (target.includes(approvedHead)) return
    const trailer = target.match(/[。．\.\s]$/) ? '' : (project?.requirements?.targetLanguages?.[0] === 'ja' ? '。' : '. ')
    setTarget(prev => `${prev}${trailer}${hit.approved}`)
  }
  const applyGlossaryByIndex = (n) => {
    const hit = hits[n]
    if (hit) applyGlossaryFix(hit)
  }
  /* Move the caret in the editor to the start of the next glossary span
   * after (or wrapping around past) the current selection. Used by Shift+G. */
  const jumpToNextGlossaryInTarget = () => {
    const editor = editorRef.current
    if (!editor) return
    const marks = Array.from(editor.querySelectorAll('.gloss-mark'))
    if (marks.length === 0) return
    editor.focus()
    const sel = window.getSelection()
    let cursorOffsetTop = -Infinity
    if (sel?.rangeCount) {
      const r = sel.getRangeAt(0)
      const node = r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement
      cursorOffsetTop = node?.getBoundingClientRect?.().top ?? -Infinity
    }
    const target = marks.find(m => m.getBoundingClientRect().top > cursorOffsetTop) || marks[0]
    const range = document.createRange()
    range.selectNodeContents(target)
    range.collapse(true)
    sel?.removeAllRanges(); sel?.addRange(range)
    target.classList.add('gloss-active')
    setTimeout(() => target.classList.remove('gloss-active'), 1200)
  }

  /* Editor-local key handling — runs before the document handler.
   * Enter (no modifier, no IME): confirm + jump to next flagged.
   * Cmd/Ctrl+Enter:              confirm + advance to next segment (any).
   * Shift+Enter:                  default contenteditable behavior (line break).
   * Esc:                          dirty → press twice to discard. Clean → release focus.
   */
  const onEditorKeyDown = (e) => {
    // Cmd/Ctrl+Enter is also wired at the doc level, but handle here too
    // so we can early-exit while the IME is composing.
    if (e.key === 'Enter') {
      if (composingRef.current) return                  // IME safety
      if (e.shiftKey) return                            // line break
      if (e.metaKey || e.ctrlKey) {
        e.preventDefault(); commit({ advance: 'any' }); return
      }
      e.preventDefault(); commit({ advance: 'flagged' }); return
    }
    if (e.key === 'Escape') {
      if (!isDirty) { e.preventDefault(); editorRef.current?.blur(); return }
      if (escArmed) {
        // Second Esc within 2s — discard.
        e.preventDefault()
        setTarget(activeSeg?.editedTarget || recommended)
        setEscArmed(false)
        if (escTimerRef.current) { clearTimeout(escTimerRef.current); escTimerRef.current = null }
        return
      }
      // First Esc — arm discard for 2s.
      e.preventDefault()
      setEscArmed(true)
      if (escTimerRef.current) clearTimeout(escTimerRef.current)
      escTimerRef.current = setTimeout(() => setEscArmed(false), 2000)
    }
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

  /* Keyboard layer
   *
   * Three execution zones:
   *   1. Modal overlays (palette, find, shortcuts) — handle Esc.
   *   2. Inside the editor (contenteditable / input / textarea) — only
   *      "global" shortcuts run. Plain letter keys are reserved for typing.
   *      The editor's own onKeyDown handles Enter / Cmd+Enter / Cmd+Shift+U
   *      with IME-composition awareness.
   *   3. Outside text fields — full keyboard model is active.
   *
   * Always-on shortcuts work in any zone:
   *   Ctrl+↓ / Ctrl+↑       — segment nav
   *   Ctrl+⇧↓ / Ctrl+⇧↑     — flagged-segment nav
   *   Cmd/Ctrl+F            — find & replace
   *   Cmd/Ctrl+Enter        — confirm and advance to next segment
   *   ? · /                 — overlays (only when not in a text field)
   */
  useEffect(() => {
    function isTextField(el) {
      if (!el) return false
      const tag = (el.tagName || '').toUpperCase()
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
      if (el.isContentEditable) return true
      // Belt-and-suspenders: some editors / browsers fail to set
      // isContentEditable on descendants. Walk up looking for the attr.
      const ce = el.closest?.('[contenteditable="true"], [contenteditable=""], [role="textbox"]')
      return !!ce
    }
    function onKey(e) {
      // ── IME safeguard (highest priority) ──────────────────────
      // Never fire shortcuts while a composition (IME) session is
      // active. Critical for JA/ZH reviewers — Enter during IME
      // composition must commit the candidate, not the segment.
      if (e.isComposing || e.keyCode === 229 || composingRef.current) return

      // ── Always-on shortcuts (work in any zone) ────────────────
      // Cmd/Ctrl+Enter — confirm & advance to next segment (any).
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); commit({ advance: 'any' }); return
      }
      // Cmd/Ctrl+F — find & replace
      if ((e.metaKey || e.ctrlKey) && (e.key === 'f' || e.key === 'F') && !e.shiftKey && !e.altKey) {
        e.preventDefault(); setShowFind(true); return
      }
      // Ctrl+arrow segment nav (works inside editor too).
      if (e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          if (e.shiftKey) jumpFlagged(+1); else next()
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          if (e.shiftKey) jumpFlagged(-1); else prev()
          return
        }
      }
      // Cmd/Ctrl+Shift+U — copy source to target (any zone).
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault(); copySourceToTarget(); return
      }
      // Cmd/Ctrl+1..9 — apply glossary term n
      if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key) && !e.shiftKey && !e.altKey) {
        const n = parseInt(e.key, 10) - 1
        if (hits[n]) { e.preventDefault(); applyGlossaryByIndex(n); return }
      }

      // ── Modal-aware Esc / overlay opens ───────────────────────
      if (e.key === 'Escape') {
        if (showPalette)   { e.preventDefault(); setShowPalette(false); return }
        if (showFind)      { e.preventDefault(); setShowFind(false); return }
        if (showShortcuts) { e.preventDefault(); setShowShortcuts(false); return }
        if (focusedPanel)  { e.preventDefault(); setFocusedPanel(null); editorRef.current?.focus(); return }
      }
      const inText = isTextField(e.target)
      if (e.key === '?' && !inText) {
        e.preventDefault(); setShowShortcuts(true); return
      }
      if (e.key === '/' && !inText) {
        e.preventDefault(); setShowPalette(true); return
      }

      // ── Editor zone — let plain typing through ────────────────
      if (inText) return

      // ── Panel-focus mode: J/K/Enter act on the focused panel ──
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
        if ((e.key === 'a' || e.key === 'A') && focusedPanel === 'qa') {
          e.preventDefault()
          const issue = qa[focusedIdx]
          if (issue?.glossary) applyGlossaryFix(issue.glossary)
          return
        }
      }

      switch (e.key) {
        case '[':
          e.preventDefault(); prev(); return
        case ']':
          e.preventDefault(); next(); return
        case 'ArrowLeft':
          e.preventDefault(); prev(); return
        case 'ArrowRight':
          e.preventDefault(); next(); return
        case 'j': case 'J': case 'ArrowDown':
          e.preventDefault(); next(); return
        case 'k': case 'K': case 'ArrowUp':
          e.preventDefault(); prev(); return
        case 'a': case 'A':
          if (isAccepted) { e.preventDefault(); acceptRecommended() }
          return
        case 't': case 'T':
          // T plain → apply top TM match. Shift+T → focus panel for browsing.
          if (e.shiftKey) {
            setFocusedPanel('tm'); setFocusedIdx(0)
          } else if (tmMatches[0]) {
            applyTM(tmMatches[0])
          }
          e.preventDefault(); return
        case 'g': case 'G':
          // G focus glossary. Shift+G jump caret to next glossary in target.
          if (e.shiftKey) {
            jumpToNextGlossaryInTarget()
          } else {
            setFocusedPanel('tb'); setFocusedIdx(0)
          }
          e.preventDefault(); return
        case 'b': case 'B':
          // Legacy alias for G — keeps existing muscle memory.
          setFocusedPanel('tb'); setFocusedIdx(0); e.preventDefault(); return
        case 'q': case 'Q':
          setFocusedPanel('qa'); setFocusedIdx(0); e.preventDefault(); return
        case 'r': case 'R':
          // Toggle compliance items visibility (only meaningful when role hides them).
          if (!complianceDefault) { setRevealCompliance(v => !v); e.preventDefault() }
          return
        default: return
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [commit, next, prev, isAccepted, tmMatches, hits, qa, focusedPanel, focusedIdx, showShortcuts, showPalette, showFind, complianceDefault])

  /* Document context: ±5 segments */
  const contextWindow = useMemo(() => {
    const start = Math.max(0, activeIdx - 5)
    const end = Math.min(segments.length, activeIdx + 6)
    return segments.slice(start, end).map((s, i) => ({ s, i: start + i }))
  }, [segments, activeIdx])

  const totalSeg = segments.length
  const doneSeg = segments.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length
  /* Flagged-segment counts for the compact progress + flag strip. */
  const flaggedAll = useMemo(
    () => segments.filter(s => s.flagCategories?.length > 0),
    [segments]
  )
  const totalFlagged = flaggedAll.length
  const flaggedDone = flaggedAll.filter(s => ['verified', 'edited', 'accepted'].includes(s.decision)).length

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
              {project?.requirements.sourceLanguage?.toUpperCase()} → {project?.requirements.targetLanguages?.[0]?.toUpperCase()}
              {totalFlagged > 0 && <> · <span className={flaggedDone === totalFlagged ? 'text-teal' : 'text-amber-deep'}>{flaggedDone} of {totalFlagged} flagged resolved</span></>}
              {' · '}{doneSeg}/{totalSeg} verified
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

        {/* Mode toggle — Quick (segment-edit) / Doc (target-only reading) /
            Audit (full evidentiary cockpit). Routed by SecureVendorWorkspace:
            'quick' and 'doc' both render through this component (this body
            switches on cockpitMode); 'audit' renders the full audit body. */}
        {setCockpitMode && (
          <div className="inline-flex items-center rounded-full border border-rule bg-white overflow-hidden text-[11.5px]">
            <button
              onClick={() => setCockpitMode('quick')}
              title="Segment-by-segment editing"
              className={`px-2.5 py-1 cursor-pointer ${cockpitMode === 'quick' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
            >Quick</button>
            <button
              onClick={() => setCockpitMode('doc')}
              title="Target document — continuous reading"
              className={`px-2.5 py-1 cursor-pointer ${cockpitMode === 'doc' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
            >Doc</button>
            <button
              onClick={() => setCockpitMode('audit')}
              title="Full evidentiary cockpit"
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

        <button
          onClick={() => setShowShortcuts(true)}
          title="Show keyboard shortcuts (?)"
          className="px-2 py-1 rounded-md border border-rule bg-white text-[11px] text-slate hover:border-ocean/30 cursor-pointer"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >?</button>

        {/* Signoff — workflow-forward action. Distinct from Exit Review:
            "Exit" leaves the workspace; "Signoff" advances the task to
            the sign-off screen with current context preserved. Disabled
            until every flagged segment is resolved so reviewers can't
            sign off on incomplete work. */}
        {onGoToSignoff && (() => {
          const blockedBy = totalFlagged - flaggedDone
          const ready = blockedBy === 0
          const label = ready
            ? 'Go to Signoff'
            : `Resolve ${blockedBy} flagged ${blockedBy === 1 ? 'segment' : 'segments'} before signoff`
          return (
            <button
              onClick={() => {
                if (!ready) return
                if (savedAt === false || (target && target !== (activeSeg?.editedTarget || recommended))) {
                  // Unsaved edit — offer a quick save before navigating.
                  if (confirm('You have unsaved edits in the active segment. Save before continuing to Signoff?')) {
                    commit({ advance: 'none' })
                  }
                }
                onGoToSignoff()
              }}
              disabled={!ready}
              title={label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[12px] cursor-pointer transition-colors ${
                ready
                  ? 'bg-ocean text-white border border-ocean hover:bg-ocean/90'
                  : 'bg-pale text-mist border border-rule cursor-not-allowed'
              }`}
            >
              <BadgeCheck className="w-3.5 h-3.5" />
              Signoff
              {!ready && <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-white/20 text-[9.5px] font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{blockedBy}</span>}
            </button>
          )
        })()}

        {/* Exit Review — relocated from the outer HITL header into the
            single top task bar so every task-level control lives in
            one horizontal band. Shift+E shortcut is registered by the
            parent HITLVendorWorkflow. */}
        {onExitReview && (
          <button
            onClick={onExitReview}
            title="Exit Review (Shift+E)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rule-strong bg-white hover:bg-pale text-[12px] text-ink cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Exit Review
            <Kbd>⇧E</Kbd>
          </button>
        )}
      </header>


      {/* ── FIND & REPLACE ───────────────────────────────────── */}
      {showFind && (
        <FindReplaceBar
          segments={segments}
          currentUserRole={currentUserRole}
          onClose={() => setShowFind(false)}
        />
      )}

      {/* ── BODY ──────────────────────────────────────────────── */}
      {cockpitMode === 'doc' ? (
        <DocumentReadingView
          project={project}
          segments={segments}
          activeIdx={activeIdx}
          onJump={(i) => { setActiveIdx(i); setCockpitMode?.('quick') }}
        />
      ) : (
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
                  composingRef={composingRef}
                  onEditorKeyDown={onEditorKeyDown}
                />
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <p className="text-[11px] text-mist">
                    {escArmed
                      ? <span className="text-amber-deep">Press Esc again to discard edits</span>
                      : qa.length > 0
                        ? <><span className="text-amber-deep">{qa.length} issue{qa.length === 1 ? '' : 's'}</span> · see Live QA →</>
                        : isDirty
                          ? <>Edited · ↩ save flagged · ⌘↩ save next</>
                          : <>No issues detected · accept to confirm</>}
                  </p>
                  {savedAt && <p className="text-[11px] text-teal">Saved · advancing</p>}
                </div>
              </section>

              <div className="flex items-center gap-3 pt-4 mt-4 border-t border-rule">
                <button
                  onClick={() => commit({ advance: 'flagged' })}
                  disabled={activeSeg.locked || !target.trim() || (!isDirty && !isAccepted)}
                  title={!target.trim() ? 'Target is empty' : 'Save and jump to next flagged segment (Enter)'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13.5px] font-semibold transition-colors bg-amber hover:bg-amber-deep text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                >
                  Save & Next flagged
                  <Kbd className="!bg-white/20 !border-white/20 !text-white">↩</Kbd>
                </button>
                <button
                  onClick={() => commit({ advance: 'any' })}
                  disabled={activeSeg.locked || !target.trim() || (!isDirty && !isAccepted)}
                  title="Save and move to next segment regardless of flag (⌘↩)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-[12.5px] text-slate hover:text-ink hover:bg-pale cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Save & Next
                  <Kbd>⌘↩</Kbd>
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
            shortcut={<><Kbd>T</Kbd> apply top · <Kbd>⇧T</Kbd> browse</>}
            isFocused={focusedPanel === 'tm'}
            empty="No translation memory matches above 15%."
            footerHint="J/K to move · Enter to apply · Esc to release"
          >
            {tmMatches.map((m, i) => (
              <PanelRow key={m.id} active={focusedPanel === 'tm' && i === focusedIdx} onClick={() => applyTM(m)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${m.matchRatio >= 0.75 ? 'bg-teal/10 text-teal' : m.matchRatio >= 0.4 ? 'bg-ocean/10 text-ocean' : 'bg-amber/10 text-amber-deep'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {(m.matchRatio * 100).toFixed(0)}%
                    </span>
                    {i === 0 && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-ocean text-white font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        Top · T
                      </span>
                    )}
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
            shortcut={<><Kbd>G</Kbd> focus · <Kbd>⇧G</Kbd> next · <Kbd>⌘1..9</Kbd> apply</>}
            isFocused={focusedPanel === 'tb'}
            empty="No glossary terms in this segment."
            footerHint="J/K to move · Enter to apply · Esc to release"
          >
            {hits.map((h, i) => {
              const inTarget = target.includes(h.approved.slice(0, 8))
              return (
                <PanelRow key={h.id} active={focusedPanel === 'tb' && i === focusedIdx} onClick={() => applyGlossaryFix(h)}>
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-semibold ${glossPillClass(h.status)}`}
                      style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {glossStatusLabel(h.status)}
                    </span>
                    <span className="text-[10px] text-mist font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {h.sourceTermbase || h.usage} · ⌘{i + 1}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-slate leading-snug"><span className={`gloss-mark gloss-${h.status} inline-block`}>{h.term}</span></p>
                  <p className="text-[12px] text-ink leading-snug mt-1 font-medium">→ {h.approved}</p>
                  {h.usageNote && (
                    <p className="text-[10.5px] text-mist mt-1 italic">{h.usageNote}</p>
                  )}
                  <p className={`text-[10.5px] mt-1 ${inTarget ? 'text-teal' : 'text-amber-deep'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {inTarget ? 'in target' : 'not yet in target'}
                  </p>
                </PanelRow>
              )
            })}
          </Panel>

          {/* Live QA — compliance items hidden by default for non-compliance roles. */}
          {(() => {
            const visibleQa = showCompliance ? qa : qa.filter(i => !isComplianceItem(i))
            const hiddenCount = qa.length - visibleQa.length
            return (
              <Panel
                id="qa"
                icon={Stethoscope}
                iconClass="text-error"
                title={`Live QA · ${qa.length} issue${qa.length === 1 ? '' : 's'}`}
                shortcut={<><Kbd>Q</Kbd> focus · <Kbd>A</Kbd> accept</>}
                isFocused={focusedPanel === 'qa'}
                empty={<span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal" /> No issues detected.</span>}
                footerHint="J/K move · Enter jump · A accept · Esc release"
              >
                {visibleQa.map((issue, i) => (
                  <PanelRow key={issue.id} active={focusedPanel === 'qa' && i === focusedIdx} onClick={() => { if (issue.glossary) applyGlossaryFix(issue.glossary); else editorRef.current?.focus() }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-deep shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-ink">{issue.label}</p>
                        <p className="text-[11.5px] text-slate mt-0.5 leading-relaxed">{issue.detail}</p>
                        {issue.glossary?.sourceTermbase && (
                          <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                            {issue.glossary.sourceTermbase}
                          </p>
                        )}
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
                {hiddenCount > 0 && (
                  <li className="px-3 py-2 border-t border-rule bg-pale/40 text-[11px] text-slate flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <EyeOff className="w-3.5 h-3.5 text-mist" />
                      Compliance · {hiddenCount} item{hiddenCount === 1 ? '' : 's'} hidden
                    </span>
                    <button
                      onClick={() => setRevealCompliance(true)}
                      className="inline-flex items-center gap-1 text-ocean hover:text-ocean-deep cursor-pointer"
                    >
                      <Eye className="w-3 h-3" /> Reveal <Kbd>R</Kbd>
                    </button>
                  </li>
                )}
                {hiddenCount === 0 && !complianceDefault && qa.some(isComplianceItem) && (
                  <li className="px-3 py-1.5 border-t border-rule bg-pale/40 text-[10.5px] text-mist flex items-center justify-between gap-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    <span>Compliance items revealed for this session</span>
                    <button
                      onClick={() => setRevealCompliance(false)}
                      className="text-slate hover:text-ink cursor-pointer"
                    >
                      Hide <Kbd>R</Kbd>
                    </button>
                  </li>
                )}
              </Panel>
            )
          })()}

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
      )}

      {showShortcuts && <ShortcutOverlay onClose={() => setShowShortcuts(false)} />}
      {showPalette && (
        <CommandPalette
          onClose={() => setShowPalette(false)}
          onAction={(id) => {
            switch (id) {
              case 'find-in-document':
              case 'find-in-corpus':
                setShowFind(true); return
              case 'open-glossary':
                setFocusedPanel('tb'); setFocusedIdx(0); return
              case 'open-tm-search':
                setFocusedPanel('tm'); setFocusedIdx(0); return
              case 'show-shortcuts':
                setShowShortcuts(true); return
              case 'ask-sage':
                setShowSage(true); return
              case 'intelligence-search':
              case 'knowledge-graph':
                // Demo stubs — surface a hint via the savedAt slot.
                setSavedAt(Date.now())
                setTimeout(() => setSavedAt(null), 1500)
                return
              default: return
            }
          }}
        />
      )}
      {/* Sage FAB — always present, never default-open, never steals focus. */}
      <SageFab open={showSage} onOpen={() => setShowSage(true)} onClose={() => setShowSage(false)} />
    </div>
  )
}

/* ─── Find & Replace — slide-down toolbar, Cmd+F ───────────────── */
function FindReplaceBar({ segments, currentUserRole, onClose }) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [scope, setScope] = useState('document')         // 'document' | 'corpus'
  const [includeVerified, setIncludeVerified] = useState(false)
  const findRef = useRef(null)
  useEffect(() => { findRef.current?.focus() }, [])

  // Vendor-user is gated out of overwriting verified work.
  const canOverwriteVerified =
    !['vendor-user', 'client-reviewer'].includes(currentUserRole)

  const matches = useMemo(() => {
    if (!find) return { count: 0, segs: 0 }
    const list = segments.filter(s => includeVerified || !['verified', 'edited', 'accepted'].includes(s.decision))
    let count = 0, segs = 0
    for (const s of list) {
      const hay = (s.editedTarget || s.target || '')
      const c = hay.split(find).length - 1
      if (c > 0) { count += c; segs += 1 }
    }
    return { count, segs }
  }, [find, segments, includeVerified])

  return (
    <section className="bg-white border border-rule rounded-lg px-3 py-2 flex items-center gap-2 flex-wrap">
      <Search className="w-4 h-4 text-mist shrink-0" />
      <input
        ref={findRef}
        value={find}
        onChange={e => setFind(e.target.value)}
        placeholder="Find"
        className="flex-1 min-w-[160px] text-[13px] text-ink placeholder:text-mist border border-rule rounded px-2 py-1 focus:outline-none focus:border-ocean/50"
        spellCheck={false}
      />
      <Replace className="w-4 h-4 text-mist shrink-0" />
      <input
        value={replace}
        onChange={e => setReplace(e.target.value)}
        placeholder="Replace"
        className="flex-1 min-w-[160px] text-[13px] text-ink placeholder:text-mist border border-rule rounded px-2 py-1 focus:outline-none focus:border-ocean/50"
        spellCheck={false}
      />
      <div className="inline-flex items-center rounded-full border border-rule bg-white overflow-hidden text-[11px] shrink-0">
        <button
          onClick={() => setScope('document')}
          className={`px-2.5 py-1 cursor-pointer ${scope === 'document' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
        >This document</button>
        <button
          onClick={() => setScope('corpus')}
          className={`px-2.5 py-1 cursor-pointer ${scope === 'corpus' ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
        >Entire corpus</button>
      </div>
      <label className="inline-flex items-center gap-1.5 text-[11.5px] text-slate cursor-pointer shrink-0" title={canOverwriteVerified ? 'Include already-verified segments' : 'Locked — your role cannot overwrite verified segments'}>
        <input
          type="checkbox"
          checked={includeVerified}
          disabled={!canOverwriteVerified}
          onChange={e => setIncludeVerified(e.target.checked)}
          className="accent-ocean"
        />
        Include verified
      </label>
      <span className="text-[11px] text-mist shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {find ? `${matches.count} occurrence${matches.count === 1 ? '' : 's'} in ${matches.segs} segment${matches.segs === 1 ? '' : 's'}` : '—'}
      </span>
      <button
        onClick={onClose}
        title="Close (Esc)"
        className="p-1 rounded-md hover:bg-pale text-slate cursor-pointer shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </section>
  )
}

/* ─── Sage FAB — small floating button, never default-open ─────── */
function SageFab({ open, onOpen, onClose }) {
  return (
    <>
      {!open && (
        <button
          onClick={onOpen}
          title="Ask Sage — optional assistant"
          aria-label="Open Sage assistant"
          className="fixed bottom-5 right-5 z-30 w-11 h-11 rounded-full bg-white border border-rule-strong shadow-lg flex items-center justify-center hover:border-ocean cursor-pointer"
        >
          <Sparkles className="w-5 h-5 text-ocean" />
        </button>
      )}
      {open && (
        <div className="fixed bottom-5 right-5 z-30 w-[320px] bg-white border border-rule rounded-lg shadow-xl overflow-hidden">
          <header className="px-3 py-2 border-b border-rule flex items-center justify-between bg-cream/60">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink">
              <Sparkles className="w-4 h-4 text-ocean" /> Sage
            </span>
            <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-pale cursor-pointer">
              <X className="w-3.5 h-3.5 text-slate" />
            </button>
          </header>
          <div className="px-3 py-3 text-[12px] text-slate space-y-2">
            <p>Optional assistant. Ask about a segment, a glossary term, or a compliance rule.</p>
            <p className="text-mist text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Sage never edits the target on its own. Your decisions stay yours.
            </p>
          </div>
        </div>
      )}
    </>
  )
}

/* ─── Glossary status pill colors ──────────────────────────────── */
function glossPillClass(status) {
  switch (status) {
    case 'forbidden': return 'bg-error/10 text-error border border-error/30'
    case 'required':  return 'bg-amber/15 text-amber-deep border border-amber/40'
    case 'dnt':       return 'bg-slate/10 text-slate border border-slate/30'
    case 'preferred': return 'bg-ocean/10 text-ocean border border-ocean/30'
    default:          return 'bg-pale text-mist border border-rule'
  }
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
