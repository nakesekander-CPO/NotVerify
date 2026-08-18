/**
 * EAV — Settings.
 *
 * Workspace configuration: providers/models (with provenance), locales,
 * competitors, and the benchmark hash + methodology version that make trends
 * comparable. Fixture providers are labelled so they're never read as live.
 */

import {
  PROVIDERS, WORKSPACE, BENCHMARK, METHODOLOGY_VERSION,
} from '../../data/eav'
import { SectionHeading, Card, MonoLabel, KeyValueRow, ProvenanceBadge } from './shared'
import { Check } from 'lucide-react'

export default function Settings() {
  return (
    <div className="space-y-5">
      <SectionHeading title="Settings" subtitle="Providers, locales, competitors, and benchmark versioning." />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Provider adapters</p></div>
          <table className="w-full text-[12.5px]">
            <thead><tr className="bg-pale/50 border-b border-rule text-left">{['Provider', 'Official API', 'Citations', 'Provenance', 'Enabled'].map(h => <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>)}</tr></thead>
            <tbody>
              {PROVIDERS.map(p => (
                <tr key={p.id} className="border-b border-rule/60 last:border-b-0">
                  <td className="px-4 py-2.5 text-ink">{p.name}</td>
                  <td className="px-4 py-2.5">{p.official ? <Check className="w-3.5 h-3.5 text-teal" /> : <span className="text-mist">—</span>}</td>
                  <td className="px-4 py-2.5">{p.citations ? <Check className="w-3.5 h-3.5 text-teal" /> : <span className="text-mist">—</span>}</td>
                  <td className="px-4 py-2.5"><ProvenanceBadge provenance={p.provenance} /></td>
                  <td className="px-4 py-2.5">{p.enabled ? <span className="text-teal text-[11px]">on</span> : <span className="text-mist text-[11px]">off</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10.5px] text-mist px-4 py-2.5 border-t border-rule">All providers are fixture adapters in this demo. Live official adapters activate only with credentials + sanctioned access.</p>
        </Card>

        <div className="space-y-4">
          <Card>
            <MonoLabel>Benchmark &amp; methodology</MonoLabel>
            <div className="mt-2 text-[12.5px]">
              <KeyValueRow label="Methodology" value={METHODOLOGY_VERSION} mono />
              <KeyValueRow label="Benchmark hash" value={BENCHMARK.hash} mono />
              <KeyValueRow label="Unique prompts" value={BENCHMARK.uniquePrompts} mono />
              <KeyValueRow label="Repetitions" value={BENCHMARK.repetitions} mono />
              <KeyValueRow label="Reference locale" value={WORKSPACE.referenceLocale.toUpperCase()} mono />
            </div>
          </Card>
          <Card>
            <MonoLabel>Target locales</MonoLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {WORKSPACE.locales.map(l => <span key={l.code} className="text-[11.5px] px-2 py-0.5 rounded-full bg-pale text-slate border border-rule">{l.name}{l.reference && ' · ref'}</span>)}
            </div>
          </Card>
          <Card>
            <MonoLabel>Competitors</MonoLabel>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {WORKSPACE.competitors.map(c => <span key={c.id} className="text-[11.5px] px-2 py-0.5 rounded-full bg-[#FFF7E6] text-[#996800] border border-[#FFB000]/40">{c.name}</span>)}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
