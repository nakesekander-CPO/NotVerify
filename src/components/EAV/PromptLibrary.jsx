/**
 * EAV — Prompt Library.
 *
 * The benchmark is a versioned measurement instrument, not an arbitrary list.
 * Shows the sampled prompts with their metadata (family, locale, persona,
 * intent, stage), the benchmark hash + methodology version, and the two
 * weighting views (Standard vs Strategic). Holdout/control prompts and
 * neutrality are called out.
 */

import { PROMPT_OBSERVATIONS, BENCHMARK, METHODOLOGY_VERSION } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, KeyValueRow } from './shared'

// One canonical row per prompt family from the sampled observations.
const FAMILIES = Object.values(PROMPT_OBSERVATIONS.reduce((acc, o) => {
  if (!acc[o.family]) acc[o.family] = o
  return acc
}, {}))

export default function PromptLibrary() {
  return (
    <div className="space-y-5">
      <SectionHeading title="Prompt Library" subtitle="The versioned benchmark of customer & stakeholder questions." />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Prompt families (sample)</p>
            <MonoLabel>{BENCHMARK.uniquePrompts} prompts in benchmark</MonoLabel>
          </div>
          <ul className="divide-y divide-rule">
            {FAMILIES.map(o => (
              <li key={o.family} className="px-5 py-3">
                <p className="text-[13px] text-ink">{o.prompt}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {[o.family, o.locale.toUpperCase(), o.persona, o.intent, o.stage, o.topic].map((t, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-pale text-slate border border-rule" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t}</span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <MonoLabel>Benchmark version</MonoLabel>
            <div className="mt-2 text-[12.5px]">
              <KeyValueRow label="Methodology" value={METHODOLOGY_VERSION} mono />
              <KeyValueRow label="Benchmark hash" value={BENCHMARK.hash} mono />
              <KeyValueRow label="Unique prompts" value={BENCHMARK.uniquePrompts} mono />
              <KeyValueRow label="Locales" value={BENCHMARK.locales} mono />
              <KeyValueRow label="Period" value={BENCHMARK.observationPeriod} />
            </div>
            <p className="text-[10.5px] text-mist mt-2">Trends are only directly comparable when the benchmark hash is unchanged.</p>
          </Card>
          <Card>
            <MonoLabel>Weighting views</MonoLabel>
            <p className="text-[12px] text-slate mt-1.5"><strong className="text-ink">Standard EAVI</strong> — fixed, transparent weights for longitudinal consistency.</p>
            <p className="text-[12px] text-slate mt-1.5"><strong className="text-ink">Strategic EAVI</strong> — customer business-priority weights; labelled, never comparable across organisations.</p>
          </Card>
          <Card>
            <MonoLabel>Integrity</MonoLabel>
            <ul className="mt-1.5 space-y-1 text-[12px] text-slate list-disc pl-4">
              <li>Neutral, non-leading prompts (no brand priming).</li>
              <li>Holdout + control prompts maintained.</li>
              <li>Locale-adapted, not just translated.</li>
              <li>Additions/removals recorded; versions locked per reporting period.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  )
}
