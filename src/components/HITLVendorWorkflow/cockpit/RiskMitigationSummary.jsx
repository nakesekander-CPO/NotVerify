/**
 * RiskMitigationSummary — the headline block at the top of Final
 * Sign-Off. Translates the workflow's structured flag categories into
 * the line the client puts in front of an auditor.
 */

import { ShieldCheck, AlertTriangle, Check } from 'lucide-react'
import { FLAG_CATEGORIES } from '../../../data/hitlVendorWorkflow'
import { documentRiskSummary } from '../../../services/hitl/cockpit'
import { MonoLabel } from '../shared'

export default function RiskMitigationSummary({ projectId }) {
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
      <ul className="space-y-1.5">
        {appearing.map(([key, total]) => {
          const meta = FLAG_CATEGORIES[key]
          if (!meta) return null
          const caught = summary.caught[key] || 0
          const open   = summary.open[key]   || 0
          const allCaught = open === 0
          return (
            <li key={key} className="flex items-center justify-between text-[12.5px]">
              <span className="inline-flex items-center gap-2">
                {allCaught
                  ? <Check className="w-3.5 h-3.5 text-teal" />
                  : <AlertTriangle className="w-3.5 h-3.5 text-amber-deep" />}
                <span className="text-ink">{caught} of {total} · {meta.label}</span>
              </span>
              {open > 0 && (
                <span className="text-amber-deep text-[11px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{open} OPEN</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
