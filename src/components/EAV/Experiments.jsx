/**
 * EAV — Experiments.
 *
 * Structured before/after tests tied to an intervention, with a baseline,
 * holdout prompts, and honest result labels ("Associated improvement",
 * "Inconclusive" …) — "caused" is only used when the design supports it.
 */

import { EXPERIMENTS, RECOMMENDATIONS, EAVI_DIMENSION_META } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, KeyValueRow } from './shared'

const RESULT_TONE = {
  'Observed improvement': 'text-teal bg-teal/10 border-teal/30',
  'Associated improvement': 'text-teal bg-teal/10 border-teal/30',
  'Statistically distinguishable benchmark change': 'text-teal bg-teal/10 border-teal/30',
  Inconclusive: 'text-amber-deep bg-amber/15 border-amber/30',
  'No measured change': 'text-mist bg-rule/60 border-rule-strong',
  'Negative movement': 'text-error bg-error/10 border-error/30',
}
const dimLabel = (k) => EAVI_DIMENSION_META.find(d => d.key === k)?.label || k
const recTitle = (id) => RECOMMENDATIONS.find(r => r.id === id)?.title || id

export default function Experiments() {
  return (
    <div className="space-y-5">
      <SectionHeading title="Experiments" subtitle="Tie an intervention to a baseline and a holdout — with honest result labels." />
      <div className="space-y-3">
        {EXPERIMENTS.map(e => (
          <Card key={e.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold text-ink">{e.hypothesis}</p>
                <p className="text-[11.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.id} · {e.status}</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full border shrink-0 ${RESULT_TONE[e.result] || RESULT_TONE.Inconclusive}`}>{e.result}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1 mt-3 text-[12.5px]">
              <KeyValueRow label="Intervention" value={recTitle(e.intervention)} />
              <KeyValueRow label="Primary metric" value={dimLabel(e.primaryMetric)} />
              <KeyValueRow label="Baseline window" value={e.baselineWindow} />
              <KeyValueRow label="Holdout" value={e.holdout} />
              <KeyValueRow label="Providers" value={e.providers.join(', ')} />
              <KeyValueRow label="Locales" value={e.locales.join(', ').toUpperCase()} />
            </div>
          </Card>
        ))}
      </div>
      <p className="text-[10.5px] text-mist">Result labels distinguish observed / associated / statistically-distinguishable change from correlation. “Caused” is reserved for designs that support a causal inference.</p>
    </div>
  )
}
