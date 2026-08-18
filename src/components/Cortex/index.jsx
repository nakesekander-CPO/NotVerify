/**
 * Cortex — page shell (full replacement of the old Org Brain page).
 *
 * The Living Knowledge Mesh command center: header + Sage Lens + trust chips
 * over the Constellation (every light is a human-verified fact) with the
 * Node Inspector provenance drawer. Mounted as the `org-brain` phase (id kept
 * for deep-link stability; visible name is Cortex). The Flow learning-loop
 * view was removed 2026-08-18 per Nake.
 */

import { useEffect, useRef, useState } from 'react'
import { Brain, Search, Pen, ShieldCheck, TrendingUp } from 'lucide-react'
import { PageHeader } from '../ui'
import { METRICS, WORKSPACE_LINE } from '../../data/cortex'
import { CORTEX_FLAGS } from '../../data/eavScan'
import ConstellationView from './ConstellationView'
import NodeInspector from './NodeInspector'

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
        </div>
      </div>

      {/* ── Caption + recently flagged ── */}
      <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
        <p className="text-[12px] text-mist">How much Cortex knows — every light is a human-verified fact</p>
        {CORTEX_FLAGS.map(f => (
          <button key={f.sub} onClick={() => openInspector(f)}
            className="inline-flex items-center gap-1.5 text-[11px] text-[#996800] bg-[#FFF7E6] border border-[#FFB000]/40 rounded-full px-2.5 py-1 cursor-pointer hover:bg-[#FFEFD1]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FFB000]" aria-hidden />
            Recently flagged: {f.t}
          </button>
        ))}
      </div>

      {/* ── Stage ── */}
      <div className="px-6 py-4 flex-1 min-h-0">
        <div className="relative h-[560px] rounded-xl border border-rule overflow-hidden">
          <div className={`absolute inset-0 transition-[filter,opacity] duration-300 ${fact ? 'blur-[2px] opacity-60' : ''}`}>
            <ConstellationView lens={lens} onInspect={openInspector} />
          </div>
          <NodeInspector fact={fact} onClose={closeInspector} />
        </div>
      </div>
    </div>
  )
}
