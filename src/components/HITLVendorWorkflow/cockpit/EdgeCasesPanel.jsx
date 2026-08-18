/**
 * EdgeCasesPanel — detailed side-rail / overlay panel for the Edge
 * Cases detected on a segment. Shows: what was detected · why it
 * matters · affected text · suggested fix · blocks commit · escalation.
 */

import { useMemo } from 'react'
import { X, AlertTriangle, ShieldAlert } from 'lucide-react'
import { detectEdgeCases } from './EdgeCasesPill'

const EXPLANATIONS = {
  rtl: {
    why: 'Right-to-left script — UI must flip directionality; mirrored numerals and punctuation may render incorrectly.',
    fix: 'Confirm RTL container styles are applied; verify numerals follow target locale convention.',
  },
  bidi: {
    why: 'Mixed-script segment — bidirectional rendering can shuffle adjacent punctuation and brackets.',
    fix: 'Visually verify in the rendered target. Wrap LTR substrings in explicit BiDi controls if needed.',
  },
  expansion: {
    why: 'Target length differs from source by more than 20% — may break length-constrained layout (buttons, tooltips, dropdowns).',
    fix: 'If layout constraint is binding, shorten target. If not binding, document the expansion in the rationale.',
  },
  placeholder: {
    why: 'Placeholder tokens must appear verbatim in target. Losing a placeholder breaks variable substitution at runtime.',
    fix: 'Preserve every {placeholder}, %s, %d, and <$token> from the source exactly.',
  },
  markup: {
    why: 'Source and target have different markup-tag counts — XML/HTML structure has drifted.',
    fix: 'Reconstruct the markup tags around the target text to match the source structure.',
  },
  dnt: {
    why: 'Do-not-translate term must appear in the target verbatim. Translating it violates project policy.',
    fix: 'Replace the translated form with the source-language term unchanged.',
  },
  locale: {
    why: 'Locale-specific formatting expected for dates, numbers, and currency. Wrong format may signal an unprofessional output.',
    fix: 'Verify dates / decimal separators / currency symbols match the target locale convention.',
  },
}

export default function EdgeCasesPanel({ segment, open, onClose }) {
  const cases = useMemo(() => detectEdgeCases(segment), [segment])
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] bg-ink/40 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="w-full max-w-[560px] bg-white rounded-lg border border-rule overflow-hidden m-4" onClick={e => e.stopPropagation()}>
        <header className="px-5 py-3 border-b border-rule bg-cream/60 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#996800]" />
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Localisation edge cases</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-pale cursor-pointer">
            <X className="w-4 h-4 text-slate" />
          </button>
        </header>

        {cases.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-[13px] text-teal font-semibold">No edge cases detected on this segment.</p>
            <p className="text-[12px] text-mist mt-1">RTL · text expansion · placeholders · markup · DNT · locale formatting all clean.</p>
          </div>
        ) : (
          <ul className="divide-y divide-rule">
            {cases.map(c => {
              const info = EXPLANATIONS[c.id] || { why: '', fix: '' }
              const blocking = c.blocks
              return (
                <li key={c.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] ${
                        c.severity === 'high'   ? 'bg-error/10 text-error border border-error/30' :
                        c.severity === 'medium' ? 'bg-[#FFF7E6] text-[#996800] border border-[#FFB000]/40' :
                                                   'bg-ocean/10 text-ocean border border-ocean/30'
                      }`}>
                        <AlertTriangle className="w-3 h-3" />
                        {c.label}
                      </span>
                      {blocking && (
                        <span className="text-[10.5px] uppercase tracking-wider text-error" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Blocks commit</span>
                      )}
                    </div>
                  </div>
                  <p className="text-[12px] text-slate mt-2 leading-relaxed"><strong className="text-ink">Why it matters.</strong> {info.why}</p>
                  <p className="text-[12px] text-slate mt-1 leading-relaxed"><strong className="text-ink">Suggested fix.</strong> {info.fix}</p>
                  {c.id === 'placeholder' && (segment.placeholders || []).length > 0 && (
                    <p className="mt-1 text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Affected: {segment.placeholders.join(', ')}</p>
                  )}
                  {c.id === 'dnt' && (segment.dntTerms || []).length > 0 && (
                    <p className="mt-1 text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Affected: {segment.dntTerms.join(', ')}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <footer className="px-5 py-2 border-t border-rule text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Detected at extraction · checked again on commit
        </footer>
      </div>
    </div>
  )
}
