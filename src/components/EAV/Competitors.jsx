/**
 * EAV — Competitors.
 *
 * Competitive share of recommendation (within the benchmark, not market share),
 * plus per-competitor presence drawn from the sampled observations and the
 * citation domains that support them.
 */

import { useMemo } from 'react'
import { COMPETITIVE_SHARE, PROMPT_OBSERVATIONS, CITATIONS, WORKSPACE } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, ScoreBar } from './shared'

export default function Competitors() {
  const presence = useMemo(() => {
    const map = {}
    for (const c of WORKSPACE.competitors) map[c.name] = { name: c.name, mentions: 0, prompts: new Set() }
    for (const o of PROMPT_OBSERVATIONS) {
      for (const c of o.competitors) {
        if (!map[c]) map[c] = { name: c, mentions: 0, prompts: new Set() }
        map[c].mentions += 1
        map[c].prompts.add(o.family)
      }
    }
    return Object.values(map).map(x => ({ ...x, clusters: x.prompts.size }))
  }, [])
  const competitorDomains = CITATIONS.filter(c => c.supports === 'competitor')

  return (
    <div className="space-y-5">
      <SectionHeading title="Competitors" subtitle="Share of recommendation within this benchmark — not market share." />

      <Card>
        <MonoLabel>Competitive share of recommendation</MonoLabel>
        <div className="mt-3 space-y-2.5">
          {COMPETITIVE_SHARE.map(c => (
            <div key={c.id} className="flex items-center gap-3">
              <span className={`text-[12px] w-56 shrink-0 truncate ${c.isOrg ? 'text-ocean font-semibold' : 'text-ink'}`}>{c.name}{c.isOrg && <span className="text-[10px] text-mist"> · you</span>}</span>
              <div className="flex-1"><ScoreBar value={c.share} color={c.isOrg ? 'ocean' : 'amber'} /></div>
              <span className="text-[11.5px] text-slate w-9 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.share}%</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Competitor presence (sampled)</p></div>
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Competitor', 'Mentions', 'Prompt clusters'].map(h => <th key={h} className="px-4 py-2 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
            <tbody>
              {presence.map(p => (
                <tr key={p.name} className="border-b border-rule/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-ink">{p.name}</td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.mentions}</td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.clusters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <MonoLabel>Citation domains supporting competitors</MonoLabel>
          <ul className="mt-2 space-y-1.5">
            {competitorDomains.map(c => (
              <li key={c.domain} className="text-[12px] text-slate flex items-center justify-between">
                <span>{c.domain} <span className="text-mist">· {c.type}</span></span>
                <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.uses} uses</span>
              </li>
            ))}
            {competitorDomains.length === 0 && <li className="text-[12px] text-mist">None in the sampled citations.</li>}
          </ul>
          <p className="text-[10.5px] text-mist mt-3">Evidence-backed hypothesis, not causal access to the provider’s internal ranking process.</p>
        </Card>
      </div>
    </div>
  )
}
