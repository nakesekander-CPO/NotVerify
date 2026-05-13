/**
 * WhyThisSegmentChips — closed-taxonomy chips at the top of every
 * flagged segment. Each chip carries:
 *   - error category (taxonomy)
 *   - severity (Low/Medium/High/Critical)
 *   - the triggering agent
 *   - a one-line rationale
 *   - a "Show evidence" link that opens the relevant side-rail panel
 */

import { useState } from 'react'
import { AlertTriangle, ArrowUpRight } from 'lucide-react'
import { FLAG_CATEGORIES } from '../../../data/hitlVendorWorkflow'
import { explainFlagCategory } from '../../../services/hitl/cockpit'

const TONE = {
  amber: { bg: 'bg-amber/10', text: 'text-amber-deep', border: 'border-amber/40' },
  ocean: { bg: 'bg-ocean/10', text: 'text-ocean',      border: 'border-ocean/40' },
  error: { bg: 'bg-error/10', text: 'text-error',      border: 'border-error/40' },
  mist:  { bg: 'bg-rule',     text: 'text-slate',      border: 'border-rule-strong' },
}

const SEVERITY_TONE = {
  Low:      'text-mist',
  Medium:   'text-amber-deep',
  High:     'text-error',
  Critical: 'text-error',
}

/* Heuristic severity per category — in production this comes from the
 * Quality Risk Agent. Keys must mirror FLAG_CATEGORIES. */
const CATEGORY_SEVERITY = {
  'potential-hallucination': 'High',
  'numerical-inconsistency': 'High',
  'regulatory-sensitivity':  'High',
  'brand-voice-drift':       'Medium',
  'terminology-conflict':    'Medium',
  'agent-disagreement':      'Medium',
  'missing-org-brain':       'Low',
  'cultural-nuance':         'Medium',
  'low-provenance':          'Low',
  'length-formatting':       'Low',
}

/** Heuristic for "which agent flagged this category". In production the
 * Quality Risk Agent records the originator on segment.flagCategoriesMeta. */
function originatingAgent(key, candidates) {
  if (!candidates?.length) return 'Quality Risk Agent'
  if (key === 'brand-voice-drift') return candidates.find(c => /brand/i.test(c.agentName))?.agentName || 'Brand Voice Sentry'
  if (key === 'regulatory-sensitivity') return candidates.find(c => /compliance/i.test(c.agentName))?.agentName || 'Compliance Monitor'
  if (key === 'terminology-conflict')   return candidates.find(c => /jp-fin|fin|compliance/i.test(c.agentName))?.agentName || 'Compliance Monitor'
  if (key === 'agent-disagreement')     return 'Quality Risk Agent'
  return candidates[0].agentName
}

/* Which side-rail panel to open as evidence per category. */
const EVIDENCE_PANEL = {
  'terminology-conflict':    'orgbrain',
  'regulatory-sensitivity':  'policy',
  'cultural-nuance':         'orgbrain',
  'potential-hallucination': 'back',
  'numerical-inconsistency': 'qa',
  'brand-voice-drift':       'orgbrain',
  'missing-org-brain':       'orgbrain',
  'agent-disagreement':      'qa',
  'low-provenance':          'orgbrain',
  'length-formatting':       'qa',
}

export default function WhyThisSegmentChips({ segment, project, candidates, dense = false, onShowEvidence }) {
  const [openId, setOpenId] = useState(null)
  const cats = segment?.flagCategories || []
  if (!cats.length) return null
  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${dense ? '' : 'mt-2'}`}>
      <span className="text-[10.5px] uppercase tracking-wider text-mist inline-flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <AlertTriangle className="w-3 h-3 text-amber" /> Flag reason
      </span>
      {cats.map(key => {
        const meta = FLAG_CATEGORIES[key]
        if (!meta) return null
        const tone = TONE[meta.tone] || TONE.mist
        const severity = CATEGORY_SEVERITY[key] || 'Medium'
        const agent = originatingAgent(key, candidates)
        const evidencePanel = EVIDENCE_PANEL[key]
        const isOpen = openId === key
        return (
          <div key={key} className="relative">
            <button
              type="button"
              onMouseEnter={() => setOpenId(key)}
              onMouseLeave={() => setOpenId(null)}
              onClick={() => setOpenId(isOpen ? null : key)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10.5px] cursor-help ${tone.bg} ${tone.text} ${tone.border}`}
            >
              {meta.label}
              <span className={`${SEVERITY_TONE[severity]} font-mono`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>· {severity}</span>
            </button>
            {isOpen && (
              <div className="absolute z-20 top-full left-0 mt-1 w-80 bg-white border border-rule rounded-md shadow-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-ink">{meta.label}</p>
                  <span className={`text-[10px] uppercase tracking-wider ${SEVERITY_TONE[severity]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{severity}</span>
                </div>
                <p className="text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Triggered by {agent}</p>
                <p className="text-[11.5px] text-slate mt-2 leading-relaxed">{explainFlagCategory(key, segment, project, candidates)}</p>
                {evidencePanel && onShowEvidence && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onShowEvidence(evidencePanel); setOpenId(null) }}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean-deep cursor-pointer"
                  >
                    Show evidence in side-rail <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
