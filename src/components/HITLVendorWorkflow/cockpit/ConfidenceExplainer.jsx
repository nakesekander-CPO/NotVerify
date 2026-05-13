/**
 * ConfidenceExplainer — inline disclosure that decomposes a composite
 * pedigree score into its four weighted factors. Driven by
 * pedigree.componentScores. Toggle via `T` shortcut or click.
 */

import { useState } from 'react'
import { ChevronDown, Info } from 'lucide-react'
import { ScoreBar, MonoLabel } from '../shared'

const LABELS = {
  model:      'Model confidence',
  depth:      'Verification depth',
  domain:     'Domain pedigree',
  provenance: 'Provenance strength',
}

export default function ConfidenceExplainer({ pedigree, open: openProp, onToggle, label = 'Trust Score' }) {
  const [openLocal, setOpenLocal] = useState(false)
  const open = openProp != null ? openProp : openLocal
  const toggle = () => { onToggle ? onToggle(!open) : setOpenLocal(!open) }
  if (!pedigree) return null
  const cs = pedigree.componentScores || {}
  return (
    <div className="border border-rule rounded-md bg-white">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-pale/50"
      >
        <span className="inline-flex items-center gap-2 text-[12px] text-slate">
          <Info className="w-3.5 h-3.5 text-ocean" />
          <span>{label}</span>
          <span className="text-ink font-semibold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pedigree.composite}</span>
          <span className="text-mist">/ 100</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-mist transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-rule px-3 py-3 space-y-2.5">
          {Object.entries(cs).map(([k, v]) => (
            <div key={k}>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-ink">{LABELS[k] || k}</span>
                <span className="text-slate font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {v.score} · weight {(v.weight * 100).toFixed(0)}%
                </span>
              </div>
              <ScoreBar value={v.score} color={k === 'depth' ? 'teal' : k === 'domain' ? 'amber' : 'ocean'} />
              <p className="text-[10.5px] text-mist mt-1">{v.why}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
