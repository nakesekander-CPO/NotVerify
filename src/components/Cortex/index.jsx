/**
 * Cortex — page shell (full replacement of the old Org Brain page).
 *
 * The Living Knowledge Mesh command center: header + Sage Lens + trust chips
 * over the curated hub-and-node Graph (every node is a human-verified fact)
 * with the Node Inspector provenance drawer, plus a "Memory at work" receipt
 * strip below. Mounted as the `org-brain` phase (id kept for deep-link
 * stability; visible name is Cortex). The starfield Constellation view was
 * replaced by the Graph view 2026-08-18 per Nake — curated nodes over raw
 * dot count. The Flow learning-loop view was removed the same day.
 *
 * All numbers on this page (Trust Score, per-agent framing, etc.) are static
 * design-mockup content — not wired to a live scoring backend. Per the
 * 2026-08-10 positioning ruling, trust scoring and agent consensus are not
 * real, demonstrable product features and must not be presented as such
 * outside this kind of concept page.
 */

import { useEffect, useRef, useState } from 'react'
import { Brain, Search, Pen, ShieldCheck, TrendingUp, BadgeCheck } from 'lucide-react'
import { PageHeader } from '../ui'
import { Card } from '../HITLVendorWorkflow/shared'
import { METRICS, WORKSPACE_LINE, MEMORY_AT_WORK, FACTS } from '../../data/cortex'
import { CORTEX_FLAGS } from '../../data/eavScan'
import GraphView from './GraphView'
import NodeInspector from './NodeInspector'

// Matches Cortex/GraphView.jsx's KIND ring colors — a 3-hue categorical
// palette (validated with the dataviz skill's checker) plus the amber
// status overlay for flagged/held, never a 4th identity color.
const LEGEND_NODES = [
  { label: 'rules & policies', color: '#7263B3' },
  { label: 'terms & memory', color: '#00805A' },
  { label: 'agents', color: '#0066CC' },
  { label: 'flagged', color: '#996800' },
]

export default function Cortex({ onClose, onNavigateBack, onCreateContent }) {
  const [lens, setLens] = useState('')
  const [fact, setFact] = useState(null)
  const onDrawerCloseRef = useRef(null)

  const openInspector = (f, onDrawerClose) => {
    setFact(f)
    onDrawerCloseRef.current = onDrawerClose || null
  }
  const closeInspector = () => {
    setFact(null)
    if (onDrawerCloseRef.current) { onDrawerCloseRef.current(); onDrawerCloseRef.current = null }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') closeInspector() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* ── Header ── */}
      <div className="px-6 pt-6 pb-4 border-b border-rule">
        <PageHeader
          icon={Brain}
          title="Cortex"
          subtitle={WORKSPACE_LINE}
          onBack={onNavigateBack || onClose}
          actions={
            <button
              onClick={() => onCreateContent?.()}
              aria-label="Create with Cortex"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-pale border border-rule text-[13px] font-medium text-slate hover:text-ink transition-colors cursor-pointer"
            >
              <Pen className="w-3.5 h-3.5" /> Create
            </button>
          }
        />

        {/* Sage Lens + trust chips */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-[260px] max-w-[420px]">
            <Search className="w-3.5 h-3.5 text-mist absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={lens}
              onChange={e => setLens(e.target.value)}
              placeholder="Sage Lens — filter the mesh (try “polic” or “terminology”)"
              aria-label="Sage Lens filter"
              className="w-full text-[12.5px] border border-rule rounded-full pl-8.5 pr-3 py-2 bg-white focus:outline-none focus:border-ocean/50"
            />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal/10 border border-teal/25 text-[11.5px]">
            <ShieldCheck className="w-3.5 h-3.5 text-teal" />
            <span className="font-bold text-teal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{METRICS.trustScore}%</span>
            <span className="text-slate font-medium">Trust Score</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FFBD59]/15 border border-[#FFBD59]/40 text-[11.5px]">
            <TrendingUp className="w-3.5 h-3.5 text-[#B3843E]" />
            <span className="font-bold text-[#B3843E]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>+{METRICS.compoundingPct}%</span>
            <span className="text-slate font-medium">Compounding Memory</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-rule text-[11.5px]">
            <span className="font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{METRICS.verifiedEntries.toLocaleString()}</span>
            <span className="text-slate font-medium">verified entries</span>
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-rule text-[11.5px]">
            <span className="font-bold text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{METRICS.caughtThisWeek}</span>
            <span className="text-slate font-medium">caught this week</span>
          </span>
        </div>
      </div>

      {/* ── Caption + recently flagged ── */}
      <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
        <p className="text-[12px] text-mist">
          Cortex is why arbitr's decisions are right — the human-verified memory behind every check, growing with every review.
        </p>
        {CORTEX_FLAGS.map(f => (
          <button key={f.sub} onClick={() => openInspector(f)}
            className="inline-flex items-center gap-1.5 text-[11px] text-[#996800] bg-[#FFF7E6] border border-[#FFB000]/40 rounded-full px-2.5 py-1 cursor-pointer hover:bg-[#FFEFD1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB000]" aria-hidden />
            Recently flagged: {f.t}
          </button>
        ))}
      </div>

      {/* ── Graph legend ── */}
      <div className="px-6 pt-2 flex items-center gap-4 flex-wrap text-[11px] text-slate">
        <span className="text-mist">Hubs carry the counts; edges mean something. Hover isolates a neighborhood, scroll to zoom in.</span>
        <span className="flex items-center gap-3 flex-wrap">
          {LEGEND_NODES.map(l => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: l.color }} aria-hidden />
              {l.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-mist">
            <span className="inline-block w-3 border-t border-slate" aria-hidden /> membership
          </span>
          <span className="inline-flex items-center gap-1.5 text-mist">
            <span className="inline-block w-3 border-t border-dashed border-slate" aria-hidden /> guides / learned-from
          </span>
        </span>
      </div>

      {/* ── Stage ── */}
      <div className="px-6 pt-3 pb-4">
        <div className="relative h-[560px] rounded-xl border border-rule overflow-hidden">
          <div className={`absolute inset-0 transition-[filter,opacity] duration-300 ${fact ? 'blur-[2px] opacity-60' : ''}`}>
            <GraphView lens={lens} onInspect={openInspector} onDeselect={closeInspector} />
          </div>
          <NodeInspector fact={fact} onClose={closeInspector} />
        </div>
      </div>

      {/* ── Memory at work ── */}
      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-semibold text-ink">Memory at work</h3>
          <span className="text-[11px] text-mist">every entry earns its place</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {MEMORY_AT_WORK.map(m => {
            const flagged = m.tone === 'flagged'
            return (
              <Card key={m.factKey} padding="p-4" className="cursor-pointer hover:border-rule-strong transition-colors" >
                <button onClick={() => openInspector(FACTS[m.factKey])} className="text-left w-full cursor-pointer">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${flagged ? 'text-[#996800]' : 'text-ocean'}`}
                    style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {flagged && <BadgeCheck className="w-3 h-3" />}
                    {m.tag}
                  </span>
                  <p className="text-[13.5px] font-medium text-ink mt-1.5 leading-snug">{m.title}</p>
                  <p className={`mt-2 text-[20px] font-bold ${flagged ? 'text-[#B3843E]' : 'text-teal'}`}>
                    {m.label ? `${m.value} ${m.label}` : m.value}
                  </p>
                  <p className="mt-1 text-[11px] text-mist leading-snug">{m.meta}</p>
                  <span className={`inline-block mt-2 text-[11px] font-medium ${flagged ? 'text-[#B3843E]' : 'text-ocean'}`}>
                    {flagged ? 'View the held change →' : 'View the checks →'}
                  </span>
                </button>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
