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
import { Brain, Search, ArrowLeft, Pen, ShieldCheck, TrendingUp } from 'lucide-react'
import { METRICS, WORKSPACE_LINE } from '../../data/cortex'
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
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-ocean/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-ocean" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-ink">Cortex</h2>
              <p className="text-[11px] text-mist mt-0.5 uppercase tracking-[0.14em]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {WORKSPACE_LINE}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateContent?.()}
              aria-label="Create with Cortex"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-pale border border-rule text-[13px] font-medium text-slate hover:text-ink transition-colors cursor-pointer"
            >
              <Pen className="w-3.5 h-3.5" /> Create
            </button>
            <button
              onClick={onNavigateBack || onClose}
              aria-label="Go back"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-pale border border-rule text-[13px] font-medium text-slate hover:text-ink transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>

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

      {/* ── Caption ── */}
      <div className="px-6 pt-4">
        <p className="text-[12px] text-mist">How much Cortex knows — every light is a human-verified fact</p>
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
