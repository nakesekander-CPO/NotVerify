/**
 * LocalizationGuardrails — inline strip under each segment's source
 * line. Glyphs surface only when relevant signals are present. Each
 * glyph is hover-explained.
 */

import { useState } from 'react'
import { ArrowLeftRight, ArrowUpRight, Code2, FileLock2, Calendar } from 'lucide-react'

function Glyph({ icon: Icon, label, value, tone = 'slate' }) {
  const [open, setOpen] = useState(false)
  const toneClass =
    tone === 'amber' ? 'text-[#996800] border-[#FFB000]/40 bg-[#FFF7E6]' :
    tone === 'ocean' ? 'text-ocean border-ocean/30 bg-pale' :
    'text-slate border-rule bg-white'
  return (
    <div className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] cursor-help ${toneClass}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <Icon className="w-3 h-3" />
        {value}
      </span>
      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 w-56 bg-white border border-rule rounded-md shadow-lg p-2 text-[11px] text-slate">
          <span className="font-semibold text-ink">{label}</span>
        </div>
      )}
    </div>
  )
}

export default function LocalizationGuardrails({ segment }) {
  if (!segment) return null
  const items = []

  if (segment.script === 'rtl' || segment.script === 'mixed') {
    items.push(<Glyph key="rtl" icon={ArrowLeftRight} label={segment.script === 'rtl' ? 'Right-to-left script' : 'Mixed-script segment — careful layout/punctuation handling required'} value={segment.script === 'rtl' ? 'RTL' : 'BIDI'} tone={segment.script === 'rtl' ? 'amber' : 'ocean'} />)
  }
  if (Math.abs(segment.expansionRisk || 0) > 0.2) {
    const ratio = ((segment.expansionRisk || 0) * 100)
    items.push(<Glyph key="exp" icon={ArrowUpRight} label={`Length expansion ${ratio > 0 ? '+' : ''}${ratio.toFixed(0)}% — may break length-constrained layout`} value={`${ratio > 0 ? '+' : ''}${ratio.toFixed(0)}%`} tone={Math.abs(ratio) > 30 ? 'amber' : 'ocean'} />)
  }
  if ((segment.placeholders || []).length > 0) {
    items.push(<Glyph key="ph" icon={Code2} label={`Placeholders to preserve: ${segment.placeholders.join(', ')}`} value={`${segment.placeholders.length} placeholders`} tone="amber" />)
  }
  if ((segment.markupCount?.source || 0) > 0) {
    items.push(<Glyph key="mk" icon={Code2} label={`${segment.markupCount.source} markup tag${segment.markupCount.source === 1 ? '' : 's'} in source`} value={`${segment.markupCount.source} markup`} tone="ocean" />)
  }
  if ((segment.dntTerms || []).length > 0) {
    items.push(<Glyph key="dnt" icon={FileLock2} label={`Do-not-translate terms: ${segment.dntTerms.join(', ')} — must appear verbatim in ruling`} value={`DNT ${segment.dntTerms.join(', ')}`} tone="amber" />)
  }
  if (segment.localeFormatting?.dateFormat) {
    items.push(<Glyph key="loc" icon={Calendar} label={`Locale formatting: dates as ${segment.localeFormatting.dateFormat}, decimal "${segment.localeFormatting.decimalSeparator}"`} value={segment.localeFormatting.dateFormat} tone="slate" />)
  }
  if (!items.length) return null
  return <div className="flex flex-wrap items-center gap-1.5 mt-2">{items}</div>
}
