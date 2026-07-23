/**
 * EAV — Overview dashboard.
 *
 * The governed EAVI headline for the seeded Northstar workspace: score +
 * confidence interval + trend, the 7 weighted dimensions, sample composition,
 * model coverage, prompt performance, competitive share of recommendation,
 * language performance, top opportunities, and recent alerts. Every card links
 * into the underlying section.
 */

import {
  EAVI, EAVI_DIMENSION_META, BENCHMARK, MODEL_COVERAGE, PROMPT_PERFORMANCE,
  COMPETITIVE_SHARE, LANGUAGE_COVERAGE, RECOMMENDATIONS, ALERTS, METHODOLOGY_VERSION,
} from '../../data/eav'
import {
  SectionHeading, Card, MonoLabel, EAVIScore, DimensionBar, ScoreBar, SeverityBadge,
} from './shared'
import { ArrowRight, ChevronRight } from 'lucide-react'

export default function Overview({ go }) {
  const openRecs = RECOMMENDATIONS.filter(r => r.status === 'open')
  const openAlerts = ALERTS.filter(a => !a.ack)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Overview"
        subtitle="How selected AI assistants currently represent Northstar Business School across the benchmark."
      />

      {/* EAVI headline */}
      <Card>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MonoLabel>Enterprise AI Visibility Index</MonoLabel>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-ocean/10 text-ocean border border-ocean/25">Standard</span>
            </div>
            <EAVIScore score={EAVI.display} interval={EAVI.confidenceInterval} trend={EAVI.trend90d} />
            <p className="text-[11px] text-mist mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {METHODOLOGY_VERSION} · benchmark {BENCHMARK.hash} · updated {new Date(BENCHMARK.lastUpdated).toLocaleDateString()}
            </p>
          </div>
          <div className="text-right">
            <MonoLabel>Sample composition</MonoLabel>
            <div className="mt-1.5 text-[11.5px] text-slate space-y-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <p>{BENCHMARK.uniquePrompts} prompts · {BENCHMARK.observations} obs</p>
              <p>{BENCHMARK.providerFamilies} providers · {BENCHMARK.repetitions} repeats</p>
              <p>{BENCHMARK.locales} locales · {BENCHMARK.observationPeriod}</p>
            </div>
          </div>
        </div>

        {/* Dimensions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 mt-5 pt-4 border-t border-rule">
          {EAVI_DIMENSION_META.map(d => (
            <DimensionBar key={d.key} label={d.label} value={EAVI.dimensions[d.key]} weight={d.weight} />
          ))}
        </div>
      </Card>

      {/* Model coverage + prompt performance */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between">
            <MonoLabel>Model coverage</MonoLabel>
            <LinkOut label="Explorer" onClick={() => go('explorer')} />
          </div>
          <div className="mt-3 space-y-2.5">
            {MODEL_COVERAGE.map(m => (
              <div key={m.provider} className="flex items-center gap-3">
                <span className="text-[12px] text-ink w-24 shrink-0">{m.provider}</span>
                <div className="flex-1"><ScoreBar value={m.coverage} color={m.coverage >= 75 ? 'teal' : m.coverage >= 60 ? 'amber' : 'error'} /></div>
                <span className="text-[11.5px] text-slate w-9 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{m.coverage}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <MonoLabel>Prompt performance</MonoLabel>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Stat label="Buying questions tested" value={PROMPT_PERFORMANCE.tested} />
            <Stat label="Mentioned in" value={PROMPT_PERFORMANCE.mentionedIn} tone="teal" />
            <Stat label="First recommendation in" value={PROMPT_PERFORMANCE.firstRecommendationIn} tone="teal" />
            <Stat label="Never mentioned in" value={PROMPT_PERFORMANCE.neverMentionedIn} tone="error" />
          </div>
        </Card>
      </div>

      {/* Competitive share + languages */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card>
          <div className="flex items-center justify-between">
            <MonoLabel>Competitive share of recommendation</MonoLabel>
            <LinkOut label="Competitors" onClick={() => go('competitors')} />
          </div>
          <p className="text-[10.5px] text-mist mt-1">Share within this benchmark — not market share.</p>
          <div className="mt-3 space-y-2.5">
            {COMPETITIVE_SHARE.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <span className={`text-[12px] w-56 shrink-0 truncate ${c.isOrg ? 'text-ocean font-semibold' : 'text-ink'}`}>{c.name}</span>
                <div className="flex-1"><ScoreBar value={c.share} color={c.isOrg ? 'ocean' : 'amber'} /></div>
                <span className="text-[11.5px] text-slate w-9 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.share}%</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <MonoLabel>Language performance (coverage)</MonoLabel>
            <LinkOut label="Languages" onClick={() => go('languages')} />
          </div>
          <div className="mt-3 space-y-2.5">
            {LANGUAGE_COVERAGE.map(l => (
              <div key={l.code} className="flex items-center gap-3">
                <span className="text-[12px] text-ink w-24 shrink-0">{l.name}{l.reference && <span className="text-mist text-[10px]"> · ref</span>}</span>
                <div className="flex-1"><ScoreBar value={l.coverage} color={l.coverage >= 60 ? 'teal' : l.coverage >= 25 ? 'amber' : 'error'} /></div>
                <span className="text-[11.5px] text-slate w-9 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{l.coverage}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Top opportunities + alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Top opportunities</p>
            <LinkOut label="All recommendations" onClick={() => go('recommendations')} />
          </div>
          <ul className="divide-y divide-rule">
            {openRecs.slice(0, 3).map(r => (
              <li key={r.id}>
                <button onClick={() => go('recommendations', { recId: r.id })} className="w-full text-left px-5 py-3 hover:bg-pale/40 cursor-pointer flex items-start gap-2">
                  <span className="flex-1 min-w-0">
                    <span className="text-[12.5px] text-ink font-medium line-clamp-2">{r.title}</span>
                    <span className="block text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.promptCluster} · {r.dimensionsAffected.join(', ')}</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-mist shrink-0 mt-0.5" />
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">Recent alerts</p>
            <LinkOut label="All alerts" onClick={() => go('alerts')} />
          </div>
          <ul className="divide-y divide-rule">
            {openAlerts.map(a => (
              <li key={a.id} className="px-5 py-3 flex items-start gap-2.5">
                <SeverityBadge severity={a.severity} />
                <span className="flex-1 min-w-0">
                  <span className="text-[12.5px] text-ink">{a.reason}</span>
                  <span className="block text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{a.scope}</span>
                </span>
              </li>
            ))}
            {openAlerts.length === 0 && <li className="px-5 py-4 text-[12px] text-mist">No open alerts.</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }) {
  const tones = { teal: 'text-teal', error: 'text-error' }
  return (
    <div className="rounded-lg border border-rule p-3">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className={`text-[22px] font-bold mt-0.5 ${tones[tone] || 'text-ink'}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </div>
  )
}

function LinkOut({ label, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean/80 cursor-pointer">
      {label} <ArrowRight className="w-3 h-3" />
    </button>
  )
}
