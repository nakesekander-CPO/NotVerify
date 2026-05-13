/**
 * EdgeCasesPill — single segment-header pill summarising detected
 * localisation / formatting edge cases (RTL, expansion, placeholders,
 * markup, DNT, locale formatting). Distinct from the Flag Reason chips
 * (which are about content / training risk).
 *
 * Click or press `E` to open the EdgeCasesPanel.
 */

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

export function detectEdgeCases(segment) {
  if (!segment) return []
  const out = []
  if (segment.script === 'rtl')   out.push({ id: 'rtl',          label: 'RTL',           blocks: false, severity: 'medium' })
  if (segment.script === 'mixed') out.push({ id: 'bidi',         label: 'Bidirectional', blocks: false, severity: 'low' })
  const exp = Math.abs(segment.expansionRisk || 0)
  if (exp >= 0.2)                 out.push({ id: 'expansion',    label: `Length ${(segment.expansionRisk * 100 >= 0 ? '+' : '')}${(segment.expansionRisk * 100).toFixed(0)}%`, blocks: exp >= 0.4, severity: exp >= 0.4 ? 'high' : 'medium' })
  if ((segment.placeholders || []).length > 0) out.push({ id: 'placeholder', label: `${segment.placeholders.length} placeholder${segment.placeholders.length === 1 ? '' : 's'}`, blocks: true, severity: 'high' })
  if ((segment.markupCount?.source || 0) !== (segment.markupCount?.target || 0)) out.push({ id: 'markup', label: 'Markup mismatch', blocks: true, severity: 'high' })
  if ((segment.dntTerms || []).length > 0) out.push({ id: 'dnt', label: `DNT ${segment.dntTerms.join(', ')}`, blocks: true, severity: 'high' })
  if (segment.localeFormatting?.dateFormat) out.push({ id: 'locale', label: segment.localeFormatting.dateFormat, blocks: false, severity: 'low' })
  return out
}

export default function EdgeCasesPill({ segment, onOpen }) {
  const cases = useMemo(() => detectEdgeCases(segment), [segment])
  if (!cases.length) return null
  const blocking = cases.filter(c => c.blocks)
  const highest = blocking.length ? 'high' : (cases.some(c => c.severity === 'medium') ? 'medium' : 'low')
  const tone =
    highest === 'high'   ? 'bg-error/10  text-error      border-error/40'   :
    highest === 'medium' ? 'bg-amber/10  text-amber-deep border-amber/40'   :
                           'bg-ocean/10  text-ocean      border-ocean/40'
  return (
    <button
      type="button"
      onClick={onOpen}
      title="Open Edge Cases panel (E)"
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10.5px] cursor-pointer ${tone}`}
    >
      <AlertTriangle className="w-3 h-3" />
      <span>Edge Cases:</span>
      <span className="font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {cases.slice(0, 3).map(c => c.label).join(' · ')}
      </span>
      {cases.length > 3 && <span className="opacity-70">+{cases.length - 3}</span>}
    </button>
  )
}
