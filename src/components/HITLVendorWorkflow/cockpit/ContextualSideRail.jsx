/**
 * ContextualSideRail — six collapsible reference panels.
 *
 * The rail is READ-ONLY. The only writes happen in the centre column.
 * Each panel can be expanded/collapsed independently. In Reviewer Mode
 * the rail collapses to a vertical glyph strip on the right edge.
 */

import { useState } from 'react'
import {
  Layers, FileText, BookOpen, FileCheck2, ArrowLeftRight, Stethoscope, ChevronRight, ChevronDown,
  EyeOff,
} from 'lucide-react'
import { HITL_SEGMENTS, ORG_BRAIN_UPDATES, getProjectById } from '../../../data/hitlVendorWorkflow'
import { qaDiff, backTranslate, backTranslationDrift } from '../../../services/hitl/cockpit'
import { isRole } from '../../../services/hitl/rbac'
import { MonoLabel } from '../shared'
import { downloadText } from '../../../utils/demoFiles'

/**
 * Visibility tiers for side-rail content. The rail is the same in every
 * cockpit; what each panel SHOWS is gated by role.
 *
 *   restricted  — vendor-user: redacted glossary, no contributor metadata,
 *                 policy labels only, no internal lineage
 *   standard    — internal-reviewer / project-manager: full glossary
 *                 source text, contributor names, policy detail
 *   admin       — final-validator / arbitr-global-admin / org-admin:
 *                 plus prior rulings, training eligibility, raw audit
 */
function visibilityFor(currentUserId) {
  if (!currentUserId) return 'restricted'
  if (isRole(currentUserId, 'arbitr-global-admin', 'org-admin', 'tenant-admin', 'final-validator')) return 'admin'
  if (isRole(currentUserId, 'vendor-user', 'vendor-admin')) return 'restricted'
  return 'standard'
}

const PANELS = [
  { id: 'surrounding',  icon: Layers,         label: 'Surrounding segments' },
  { id: 'source',       icon: FileText,       label: 'Source anchor preview' },
  { id: 'orgbrain',     icon: BookOpen,       label: 'Cortex matches' },
  { id: 'policy',       icon: FileCheck2,     label: 'Policy citations' },
  { id: 'back',         icon: ArrowLeftRight, label: 'Back-translation' },
  { id: 'qa',           icon: Stethoscope,    label: 'QA diff' },
]

export default function ContextualSideRail({
  segment, project, segments, activeIdx, onJumpToSegment,
  collapsed = false,
  forceOpen,           // optional Set<string> of panel ids to force-open (from keyboard shortcuts)
  defaultOpen = ['orgbrain', 'qa'],
  currentUserId,
}) {
  const visibility = visibilityFor(currentUserId)
  const [openIds, setOpenIds] = useState(new Set(defaultOpen))
  const effectiveOpen = forceOpen ? new Set([...openIds, ...forceOpen]) : openIds
  const toggle = (id) => setOpenIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  if (collapsed) {
    return (
      <aside className="w-12 shrink-0 border-l border-rule bg-cream/40 flex flex-col items-center py-3 gap-2">
        {PANELS.map(p => {
          const Icon = p.icon
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`p-2 rounded-md cursor-pointer ${effectiveOpen.has(p.id) ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}
              title={p.label}
            >
              <Icon className="w-4 h-4" />
            </button>
          )
        })}
      </aside>
    )
  }

  return (
    <aside className="w-[320px] shrink-0 border-l border-rule bg-cream/40 overflow-y-auto">
      <div className="px-3 py-3 space-y-2">
        {PANELS.map(p => {
          const Icon = p.icon
          const isOpen = effectiveOpen.has(p.id)
          return (
            <section key={p.id} className="bg-white border border-rule rounded-md">
              <button
                onClick={() => toggle(p.id)}
                className="w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-pale/40"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5 text-ocean" />
                  <span className="text-[12px] font-semibold text-ink">{p.label}</span>
                </span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-mist" /> : <ChevronRight className="w-3.5 h-3.5 text-mist" />}
              </button>
              {isOpen && (
                <div className="px-3 pb-3 pt-1 border-t border-rule">
                  <PanelBody id={p.id} segment={segment} project={project} segments={segments} activeIdx={activeIdx} onJumpToSegment={onJumpToSegment} visibility={visibility} />
                </div>
              )}
            </section>
          )
        })}
      </div>
    </aside>
  )
}

function PanelBody({ id, segment, project, segments, activeIdx, onJumpToSegment, visibility }) {
  if (id === 'surrounding') return <Surrounding segments={segments} activeIdx={activeIdx} onJumpToSegment={onJumpToSegment} />
  if (id === 'source')      return <SourceAnchor segment={segment} />
  if (id === 'orgbrain')    return <OrgBrainMatches segment={segment} project={project} visibility={visibility} />
  if (id === 'policy')      return <PolicyCitations project={project} segment={segment} visibility={visibility} />
  if (id === 'back')        return <BackTranslation segment={segment} />
  if (id === 'qa')          return <QADiff segment={segment} />
  return null
}

/* RBAC visibility badge — small lock chip rendered when content is redacted. */
function RedactionNote({ kind }) {
  return (
    <div className="mt-2 inline-flex items-center gap-1 text-[10.5px] text-mist bg-rule/50 border border-rule rounded-full px-2 py-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <EyeOff className="w-2.5 h-2.5" />
      {kind === 'orgbrain' && 'Source text redacted · vendor scope'}
      {kind === 'policy' && 'Policy configuration redacted · vendor scope'}
      {kind === 'contributor' && 'Contributor metadata redacted'}
    </div>
  )
}

/* ─── Panel: Surrounding segments ─────────────────────────────── */
function Surrounding({ segments, activeIdx, onJumpToSegment }) {
  const window = []
  for (let off = -2; off <= 2; off++) {
    const i = activeIdx + off
    if (i < 0 || i >= segments.length) continue
    window.push({ seg: segments[i], i, isActive: off === 0 })
  }
  return (
    <ul className="space-y-1.5">
      {window.map(({ seg, i, isActive }) => (
        <li key={seg.id}>
          <button
            onClick={() => !isActive && onJumpToSegment?.(i)}
            className={`w-full text-left px-2 py-1.5 rounded text-[11.5px] ${isActive ? 'bg-ocean/10 border border-ocean/30 text-ink cursor-default' : 'text-slate hover:bg-pale cursor-pointer'}`}
          >
            <span className="font-mono text-mist mr-1.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{seg.segmentNumber}.</span>
            {seg.source.slice(0, 90)}{seg.source.length > 90 ? '…' : ''}
          </button>
        </li>
      ))}
    </ul>
  )
}

/* ─── Panel: Source anchor preview ────────────────────────────── */
function SourceAnchor({ segment }) {
  if (!segment?.sourceAnchor) return <p className="text-[11.5px] text-mist">No source anchor available for this segment.</p>
  const { page, bbox, snippet } = segment.sourceAnchor
  return (
    <div>
      <div className="mb-2 aspect-[3/2] rounded border border-rule bg-pale flex items-center justify-center text-mist">
        {/* Faux PDF thumbnail; in production this is a rendered page crop. */}
        <div className="w-3/4 h-3/4 bg-white border border-rule rounded shadow-sm flex flex-col p-1.5 text-[7px] leading-tight text-mist overflow-hidden" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <span className="font-semibold text-[8px]">page {page}</span>
          <p className="mt-1">{snippet}…</p>
        </div>
      </div>
      <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>p.{page} · bbox [{bbox.join(', ')}]</p>
      <button onClick={() => downloadText('source-excerpt.txt', `Source document excerpt (p.${page})\n\n${snippet}\n\n— arbitr evidence trail`)} className="mt-1 text-[11px] text-ocean hover:text-ocean-deep cursor-pointer">Open full source ↗</button>
    </div>
  )
}

/* ─── Panel: Cortex matches (RBAC-redacted) ──────────────────
 * Vendor-scope visibility:
 *   - approvedFragment shown as approved-glossary term only
 *   - sourceFragment / contributor / approval-history redacted
 * Internal visibility:
 *   - full source + target fragments
 *   - domain / language / approval date
 * Admin visibility:
 *   - plus contributor footprint (approvedBy)
 */
function OrgBrainMatches({ segment, project, visibility = 'standard' }) {
  if (!segment || !project) return null
  const lower = segment.source.toLowerCase()
  const matches = ORG_BRAIN_UPDATES
    .filter(o => o.domain === project.requirements.domain)
    .filter(o => {
      const frag = (o.sourceFragment || '').toLowerCase().slice(0, 20)
      return frag && lower.includes(frag)
    })
    .slice(0, 3)
  if (matches.length === 0) {
    return <p className="text-[11.5px] text-mist italic">No Cortex matches in this domain yet.</p>
  }
  const isRestricted = visibility === 'restricted'
  return (
    <>
      <ul className="space-y-2">
        {matches.map(m => (
          <li key={m.id} className="bg-pale/60 rounded p-2 text-[11.5px]">
            {/* Approved fragment is safe to show; vendors see only this. */}
            <p className="text-ink leading-relaxed">{m.approvedFragment.slice(0, 100)}…</p>
            <p className="text-mist mt-1 text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {m.domain} · {m.language}
              {!isRestricted && <> · approved {new Date(m.approvedAt).toLocaleDateString()}</>}
              {visibility === 'admin' && m.approvedBy && <> · by {m.approvedBy}</>}
            </p>
            {!isRestricted && m.sourceFragment && (
              <p className="text-slate text-[10.5px] mt-1 italic">Source: "{m.sourceFragment.slice(0, 80)}…"</p>
            )}
          </li>
        ))}
      </ul>
      {isRestricted && <RedactionNote kind="orgbrain" />}
    </>
  )
}

/* ─── Panel: Policy citations (RBAC-redacted) ───────────────────
 * Vendor-scope: label only (e.g. "JFSA").
 * Internal / admin: label + one-line blurb.
 */
function PolicyCitations({ project, visibility = 'standard' }) {
  const tags = project?.requirements?.complianceTags || []
  if (!tags.length) return <p className="text-[11.5px] text-mist italic">No compliance citations on this project.</p>
  const isRestricted = visibility === 'restricted'
  return (
    <>
      <ul className="space-y-1.5">
        {tags.map(t => (
          <li key={t} className="text-[11.5px] text-ink border-l-2 border-ocean/30 pl-2">
            <p className="font-semibold">{t}</p>
            {!isRestricted && (
              <p className="text-mist text-[10.5px] mt-0.5">{POLICY_BLURBS[t] || 'Policy reference applies to this domain.'}</p>
            )}
          </li>
        ))}
      </ul>
      {isRestricted && <RedactionNote kind="policy" />}
    </>
  )
}

const POLICY_BLURBS = {
  'JFSA': 'Japan Financial Services Agency — disclosure phrasing rules.',
  'J-GAAP': 'Japanese Generally Accepted Accounting Principles — terminology canonical.',
  'TSE': 'Tokyo Stock Exchange — listed-company disclosure conventions.',
  'BaFin': 'Bundesanstalt für Finanzdienstleistungsaufsicht — German regulatory style.',
  'MiFID-II': 'Markets in Financial Instruments Directive II — disclosure granularity.',
  'EU-GDPR': 'EU General Data Protection Regulation — privacy phrasing constraints.',
}

/* ─── Panel: Back-translation ─────────────────────────────────── */
function BackTranslation({ segment }) {
  if (!segment) return null
  const bt = backTranslate(segment.id, segment.target)
  const drift = backTranslationDrift(segment.id, segment.source, segment.target)
  const driftPct = (drift * 100).toFixed(0)
  const warn = drift > 0.35
  return (
    <div>
      <p className="text-[12px] text-ink leading-relaxed">{bt.text}</p>
      <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{bt.provider} · not a verification</p>
      {warn && (
        <p className="mt-2 text-[11px] text-[#996800] bg-[#FFF7E6] border border-[#FFB000]/40 rounded p-2">
          ⚠ Back-translation drift {driftPct}% — {driftPct}% of source tokens unaccounted for. Read carefully before committing.
        </p>
      )}
    </div>
  )
}

/* ─── Panel: QA diff ──────────────────────────────────────────── */
function QADiff({ segment }) {
  if (!segment) return null
  const rows = qaDiff(segment.source, segment.target, { dntTerms: segment.dntTerms || [] })
  return (
    <ul className="space-y-1.5">
      {rows.map(r => (
        <li key={r.id} className="flex items-start gap-2 text-[11.5px]">
          <span className={`shrink-0 w-3 h-3 rounded-full flex items-center justify-center text-white text-[8px] mt-0.5 ${r.ok ? 'bg-teal' : 'bg-error'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {r.ok ? '✓' : '✕'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-ink">{r.label}</p>
            <p className="text-mist text-[10.5px]">{r.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  )
}
