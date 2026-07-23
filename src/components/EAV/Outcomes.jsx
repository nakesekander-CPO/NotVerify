/**
 * EAV — Outcomes.
 *
 * Commercial outcome events with attribution evidence levels A–D. Levels are
 * shown SEPARATELY — never summed into one misleading causal total — so
 * associated/unattributed events aren't presented as AI-caused revenue.
 */

import { useMemo } from 'react'
import { OUTCOME_EVENTS, ATTRIBUTION_LEVELS } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, AttributionBadge } from './shared'

export default function Outcomes() {
  const byLevel = useMemo(() => {
    const m = { A: 0, B: 0, C: 0, D: 0 }
    for (const e of OUTCOME_EVENTS) m[e.attribution] = (m[e.attribution] || 0) + 1
    return m
  }, [])

  return (
    <div className="space-y-5">
      <SectionHeading title="Outcomes" subtitle="Commercial events by attribution evidence level — associations are not causal revenue." />

      {/* Attribution level breakdown — kept separate on purpose */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Object.entries(ATTRIBUTION_LEVELS).map(([lvl, meta]) => (
          <Card key={lvl}>
            <div className="flex items-center justify-between">
              <AttributionBadge level={lvl} />
              <span className="text-[20px] font-bold text-ink" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{byLevel[lvl] || 0}</span>
            </div>
            <p className="text-[11px] text-mist mt-1.5">{meta.desc}</p>
          </Card>
        ))}
      </div>

      <div className="rounded-lg border border-amber/30 bg-amber/10 px-3.5 py-2">
        <p className="text-[11.5px] text-amber-deep">Levels A–D are reported separately. arbitr does not aggregate them into a single causal “AI revenue” total.</p>
      </div>

      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Outcome event timeline</p></div>
        <table className="w-full text-[12.5px]">
          <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Date', 'Event', 'Product', 'Locale', 'Value', 'Attribution', 'Source'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
          <tbody>
            {OUTCOME_EVENTS.map(e => (
              <tr key={e.id} className="border-b border-rule/60 last:border-b-0">
                <td className="px-4 py-2.5 text-mist whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.when}</td>
                <td className="px-4 py-2.5 text-ink capitalize">{e.type.replace('_', ' ')}</td>
                <td className="px-4 py-2.5 text-slate">{e.product}</td>
                <td className="px-4 py-2.5 text-slate uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.locale}</td>
                <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.value ? `A$${e.value.toLocaleString()}` : '—'}</td>
                <td className="px-4 py-2.5"><AttributionBadge level={e.attribution} /></td>
                <td className="px-4 py-2.5 text-mist">{e.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="text-[10.5px] text-mist">Ingest via the generic outcome-event API or CSV import (idempotent, deduplicated). CRM/analytics adapters are scaffolded, not live.</p>
    </div>
  )
}
