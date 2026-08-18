/**
 * EAV — Visibility Explorer.
 *
 * Prompt-level observation table: the exact prompt, provider/model, locale,
 * whether the org was mentioned, the recommendation band, citations, accuracy
 * vs approved claims, competitors present, and confidence. Click a row to open
 * the raw response drawer with a manual-correction affordance (entity match /
 * analysis label) — the human-in-the-loop correction path.
 */

import { useMemo, useState } from 'react'
import { X, PencilLine, ExternalLink } from 'lucide-react'
import { PROMPT_OBSERVATIONS, WORKSPACE } from '../../data/eav'
import {
  SectionHeading, Card, MonoLabel, ProminenceBadge, AccuracyBadge, ProvenanceBadge,
} from './shared'
import { ConfidenceBadge } from '../AgentStudio/shared'

export default function VisibilityExplorer() {
  const [provider, setProvider] = useState('all')
  const [locale, setLocale] = useState('all')
  const [band, setBand] = useState('all')
  const [openId, setOpenId] = useState(null)

  const rows = useMemo(() => PROMPT_OBSERVATIONS.filter(o =>
    (provider === 'all' || o.provider === provider) &&
    (locale === 'all' || o.locale === locale) &&
    (band === 'all' || o.band === band),
  ), [provider, locale, band])

  const open = openId ? PROMPT_OBSERVATIONS.find(o => o.id === openId) : null
  const providers = [...new Set(PROMPT_OBSERVATIONS.map(o => o.provider))]

  return (
    <div className="space-y-5">
      <SectionHeading title="Visibility Explorer" subtitle="Exact assistant responses for each benchmark prompt. Inspect and correct." />

      <div className="flex items-center gap-2 flex-wrap">
        <Select value={provider} onChange={setProvider} options={[['all', 'All providers'], ...providers.map(p => [p, p])]} />
        <Select value={locale} onChange={setLocale} options={[['all', 'All locales'], ...WORKSPACE.locales.map(l => [l.code, l.name])]} />
        <Select value={band} onChange={setBand} options={[['all', 'All bands'], ['first', 'First'], ['top_three', 'Top-three'], ['mention_only', 'Mention only'], ['absent', 'Absent']]} />
        <span className="text-[11px] text-mist ml-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{rows.length} observations</span>
      </div>

      <Card padding="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-pale/50 border-b border-rule text-left">
                {['Prompt', 'Provider · model', 'Locale', 'Mention', 'Prominence', 'Cites', 'Accuracy', 'Confidence', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(o => (
                <tr key={o.id} onClick={() => setOpenId(o.id)} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/40 cursor-pointer">
                  <td className="px-4 py-2.5 text-ink max-w-[320px]"><span className="line-clamp-2">{o.prompt}</span></td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{o.provider} · {o.model}</td>
                  <td className="px-4 py-2.5 text-slate uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.locale}</td>
                  <td className="px-4 py-2.5">{o.mentioned ? <span className="text-teal text-[11px]">Yes</span> : <span className="text-error text-[11px]">No</span>}</td>
                  <td className="px-4 py-2.5"><ProminenceBadge band={o.band} /></td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{o.citations}</td>
                  <td className="px-4 py-2.5"><AccuracyBadge status={o.accuracy} /></td>
                  <td className="px-4 py-2.5"><ConfidenceBadge value={o.confidence} /></td>
                  <td className="px-4 py-2.5 text-mist">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {open && <ResponseDrawer obs={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

function ResponseDrawer({ obs, onClose }) {
  const [corrected, setCorrected] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[560px] h-full bg-cream shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-cream border-b border-rule px-5 py-3 flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">Observation · {obs.id}</p>
          <button onClick={onClose} className="text-mist hover:text-ink cursor-pointer"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <ProminenceBadge band={obs.band} /><AccuracyBadge status={obs.accuracy} /><ProvenanceBadge provenance="fixture" />
          </div>
          <div>
            <MonoLabel>Prompt</MonoLabel>
            <p className="text-[13px] text-ink mt-1">{obs.prompt}</p>
            <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{obs.provider} · {obs.model} · {obs.locale.toUpperCase()}/{obs.region} · {obs.persona} · {obs.intent}</p>
          </div>
          <div>
            <MonoLabel>Raw assistant response</MonoLabel>
            <p className="text-[12.5px] text-slate leading-relaxed mt-1 whitespace-pre-wrap bg-white border border-rule rounded-md p-3">{obs.response}</p>
          </div>
          {obs.competitors.length > 0 && (
            <div>
              <MonoLabel>Competitors present</MonoLabel>
              <div className="flex flex-wrap gap-1.5 mt-1.5">{obs.competitors.map(c => <span key={c} className="text-[11px] px-2 py-0.5 rounded-full bg-[#FFF7E6] text-[#996800] border border-[#FFB000]/40">{c}</span>)}</div>
            </div>
          )}
          <div className="pt-3 border-t border-rule">
            <MonoLabel>Human correction</MonoLabel>
            <p className="text-[11px] text-mist mt-1">Correct a false entity match or analysis label — re-derives metrics for this observation.</p>
            {corrected ? (
              <p className="text-[12px] text-teal mt-2">✓ Correction recorded (demo). Analysis will re-run.</p>
            ) : (
              <button onClick={() => setCorrected(true)} className="mt-2 inline-flex items-center gap-1.5 text-[12px] border border-rule rounded-md px-3 py-1.5 text-slate hover:bg-pale cursor-pointer">
                <PencilLine className="w-3.5 h-3.5" /> Correct match / label
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Select({ value, onChange, options }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="text-[12.5px] border border-rule rounded-lg px-2.5 py-2 bg-white cursor-pointer text-slate">
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  )
}
