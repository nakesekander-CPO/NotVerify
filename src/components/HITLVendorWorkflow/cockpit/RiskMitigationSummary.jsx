/**
 * RiskMitigationSummary — the headline block at the top of Final
 * Sign-Off. Translates the workflow's structured flag categories into
 * the line the client puts in front of an auditor.
 */

import { ShieldCheck, AlertTriangle, Check, ArrowRight } from 'lucide-react'
import { FLAG_CATEGORIES } from '../../../data/hitlVendorWorkflow'
import { documentRiskSummary } from '../../../services/hitl/cockpit'
import { MonoLabel } from '../shared'

export default function RiskMitigationSummary({ projectId, onPick }) {
  const summary = documentRiskSummary(projectId)
  if (!summary) return null
  // Categories that actually appear in this document.
  const appearing = Object.entries(summary.tally).filter(([, n]) => n > 0)
  if (appearing.length === 0) {
    return (
      <div className="bg-teal/5 border border-teal/30 rounded-md p-4">
        <p className="text-[11px] uppercase tracking-wider text-teal" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Risk mitigation</p>
        <p className="text-[13px] text-ink mt-1">No risk categories were triggered on this document.</p>
      </div>
    )
  }
  return (
    <div className="bg-white border border-rule rounded-md p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-teal" />
        <MonoLabel>Risk mitigation · what arbitr caught</MonoLabel>
      </div>
      <ul className="space-y-0.5">
        {appearing.map(([key, total]) => {
          const meta = FLAG_CATEGORIES[key]
          if (!meta) return null
          const caught = summary.caught[key] || 0
          const open   = summary.open[key]   || 0
          const allCaught = open === 0
          return (
            <li key={key}>
              <button
                type="button"
                onClick={() => onPick?.(key, { open })}
                title={open > 0
                  ? `${open} segment${open === 1 ? '' : 's'} still open — jump to the first to resolve`
                  : `Reviewed — jump to the first ${meta.label} segment in the document`}
                className="group w-full flex items-center justify-between gap-3 text-[12.5px] rounded-md px-2 py-1.5 -mx-2 cursor-pointer hover:bg-pale/70 focus:outline-none focus:ring-2 focus:ring-ocean/30 transition-colors"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  {allCaught
                    ? <Check className="w-3.5 h-3.5 text-teal shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 text-[#996800] shrink-0" />}
                  <span className="text-ink truncate">{caught} of {total} · {meta.label}</span>
                </span>
                <span className="inline-flex items-center gap-2 shrink-0">
                  {open > 0
                    ? <span className="text-[#996800] text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{open} OPEN</span>
                    : <span className="text-teal text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>CLEARED</span>}
                  <span className="inline-flex items-center gap-1 text-[10.5px] text-ocean opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {open > 0 ? 'Resolve' : 'Review'} <ArrowRight className="w-3 h-3" />
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="mt-2 pt-2 border-t border-rule text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        Click any line to open that finding in the review workspace.
      </p>
    </div>
  )
}
