/**
 * EAV — Reports.
 *
 * Executive report preview: EAVI + CI + trend, benchmark composition, the seven
 * dimensions, competitive share, highest-risk false claims, top opportunities,
 * limitations, methodology + benchmark hash + disclaimer. Export as
 * printable/PDF/CSV/JSON (demo).
 */

import {
  EAVI, EAVI_DIMENSION_META, BENCHMARK, COMPETITIVE_SHARE, RECOMMENDATIONS,
  CLAIMS, METHODOLOGY_VERSION, EAVI_DISCLAIMER, WORKSPACE,
} from '../../data/eav'
import { SectionHeading, Card, MonoLabel, EAVIScore, DimensionBar, SecondaryButton } from './shared'
import { FileDown, Printer } from 'lucide-react'
import { downloadHtml, downloadCsv } from '../../utils/demoFiles'

export default function Reports() {
  const riskyClaims = CLAIMS.filter(c => ['disputed', 'expired'].includes(c.state))
  const topOpps = RECOMMENDATIONS.slice(0, 3)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Reports"
        subtitle={`Executive report · ${WORKSPACE.organisation} · ${BENCHMARK.observationPeriod}`}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => window.print()}><Printer className="w-3.5 h-3.5" /> Print</SecondaryButton>
            <SecondaryButton onClick={() => downloadHtml('eav-executive-report.html', `AI Visibility — Executive Report · ${WORKSPACE.organisation}`, '<p>EAVI score, competitor deltas, and recommendations snapshot (demo artifact — open and print to PDF).</p>')}><FileDown className="w-3.5 h-3.5" /> PDF</SecondaryButton>
            <SecondaryButton onClick={() => downloadCsv('eav-report.csv', [{ metric: 'EAVI', value: 74 }, { metric: 'Observation period', value: BENCHMARK.observationPeriod }])}><FileDown className="w-3.5 h-3.5" /> CSV</SecondaryButton>
          </div>
        }
      />

      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <MonoLabel>Enterprise AI Visibility Index</MonoLabel>
            <EAVIScore score={EAVI.display} interval={EAVI.confidenceInterval} trend={EAVI.trend90d} size="sm" />
          </div>
          <div className="text-right text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <p>{METHODOLOGY_VERSION} · {BENCHMARK.hash}</p>
            <p>{BENCHMARK.uniquePrompts} prompts · {BENCHMARK.providerFamilies} providers · {BENCHMARK.locales} locales</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-4 pt-4 border-t border-rule">
          {EAVI_DIMENSION_META.map(d => <DimensionBar key={d.key} label={d.label} value={EAVI.dimensions[d.key]} weight={d.weight} />)}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <MonoLabel>Highest-risk claims</MonoLabel>
          <ul className="mt-2 space-y-1.5 text-[12.5px]">
            {riskyClaims.map(c => (
              <li key={c.id} className="text-slate flex items-start gap-1.5">
                <span className="text-error">•</span> <span><span className="text-ink">{c.subject} {c.predicate} {c.object}</span> <span className="text-mist">({c.state})</span></span>
              </li>
            ))}
            {riskyClaims.length === 0 && <li className="text-teal">No high-risk claims.</li>}
          </ul>
        </Card>
        <Card>
          <MonoLabel>Top opportunities</MonoLabel>
          <ul className="mt-2 space-y-1.5 text-[12.5px] text-slate list-disc pl-4">
            {topOpps.map(r => <li key={r.id}>{r.title}</li>)}
          </ul>
        </Card>
      </div>

      <Card>
        <MonoLabel>Competitive share of recommendation</MonoLabel>
        <p className="text-[10.5px] text-mist mt-0.5">Within this benchmark — not market share.</p>
        <div className="mt-2 flex flex-wrap gap-3 text-[12.5px]">
          {COMPETITIVE_SHARE.map(c => <span key={c.id} className={c.isOrg ? 'text-ocean font-semibold' : 'text-slate'}>{c.name}: {c.share}%</span>)}
        </div>
      </Card>

      <Card>
        <MonoLabel>Limitations &amp; methodology</MonoLabel>
        <p className="text-[12px] text-slate mt-1.5 leading-relaxed">{EAVI_DISCLAIMER}</p>
        <p className="text-[11px] text-mist mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Methodology {METHODOLOGY_VERSION} · benchmark {BENCHMARK.hash} · fixture/demo data.</p>
      </Card>
    </div>
  )
}
