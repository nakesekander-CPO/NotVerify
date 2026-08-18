/**
 * EAV — Recommendations.
 *
 * Evidence-backed opportunities (not generic content tips). List + detail: each
 * links to the affected prompt cluster, competitor evidence, missing/approved
 * claims, proposed action, affected EAVI dimensions, expected direction (never
 * fabricated uplift), confidence/effort/risk, and a path to a grounded draft.
 */

import { useState } from 'react'
import { ArrowRight, Target, TriangleAlert, FileText } from 'lucide-react'
import { RECOMMENDATIONS, CLAIMS, EAVI_DIMENSION_META, HYPOTHESIS_LABEL } from '../../data/eav'
import { SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton } from './shared'

const RISK_TONE = { low: 'text-teal', medium: 'text-[#996800]', high: 'text-error' }
const dimLabel = (k) => EAVI_DIMENSION_META.find(d => d.key === k)?.label || k
const claimText = (id) => { const c = CLAIMS.find(x => x.id === id); return c ? `${c.subject} ${c.predicate} ${c.object}` : id }

export default function Recommendations({ go, ctx }) {
  const [openId, setOpenId] = useState(ctx?.recId || null)
  const rec = openId ? RECOMMENDATIONS.find(r => r.id === openId) : null

  if (rec) return <RecDetail rec={rec} go={go} onBack={() => setOpenId(null)} />

  return (
    <div className="space-y-5">
      <SectionHeading title="Recommendations" subtitle="Evidence-backed opportunities to improve how AI assistants represent Northstar." />
      <div className="space-y-3">
        {RECOMMENDATIONS.map(r => (
          <button key={r.id} onClick={() => setOpenId(r.id)} className="w-full text-left">
            <Card className="hover:border-ocean/40 transition-colors cursor-pointer">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{r.title}</p>
                  <p className="text-[12px] text-slate mt-1 line-clamp-2">{r.problem}</p>
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pale text-slate border border-rule" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.promptCluster}</span>
                    {r.dimensionsAffected.map(d => <span key={d} className="text-[10px] px-1.5 py-0.5 rounded-full bg-ocean/10 text-ocean border border-ocean/25">{dimLabel(d)}</span>)}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[11px] font-medium ${RISK_TONE[r.risk]}`}>{r.risk} risk</span>
                  <span className="block text-[10.5px] text-mist mt-0.5">{r.effort} effort · {r.confidence} conf.</span>
                  <ArrowRight className="w-4 h-4 text-mist inline mt-1" />
                </div>
              </div>
            </Card>
          </button>
        ))}
      </div>
      <p className="text-[10.5px] text-mist">{HYPOTHESIS_LABEL}</p>
    </div>
  )
}

function RecDetail({ rec, go, onBack }) {
  return (
    <div className="space-y-5">
      <SectionHeading title={rec.title} subtitle={rec.problem} actions={<SecondaryButton onClick={onBack}>All recommendations</SecondaryButton>} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><Target className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Proposed action</MonoLabel></div>
            <p className="text-[13px] text-ink">{rec.action}</p>
          </Card>

          {rec.competitorEvidence && (
            <Card>
              <div className="flex items-center gap-1.5 mb-1.5"><TriangleAlert className="w-3.5 h-3.5 text-[#996800]" /><MonoLabel>Competitor evidence</MonoLabel></div>
              <p className="text-[12.5px] text-slate">{rec.competitorEvidence}</p>
              <p className="text-[10px] text-mist mt-1.5">{HYPOTHESIS_LABEL}</p>
            </Card>
          )}

          <Card>
            <MonoLabel>Approved claims to use</MonoLabel>
            <ul className="mt-2 space-y-1 text-[12.5px] text-slate list-disc pl-4">{rec.approvedClaims.map(id => <li key={id}><span className="text-ink">{claimText(id)}</span> <span className="text-mist">({id})</span></li>)}</ul>
            {rec.missingClaims.length > 0 && (
              <>
                <MonoLabel className="mt-3">Missing / needs-review claims</MonoLabel>
                <ul className="mt-2 space-y-1 text-[12.5px] text-[#996800] list-disc pl-4">{rec.missingClaims.map(id => <li key={id}>{claimText(id)} <span className="text-mist">({id})</span></li>)}</ul>
              </>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-1.5 mb-1.5"><FileText className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Grounded draft</MonoLabel></div>
            {rec.hasDraft ? (
              <>
                <p className="text-[12.5px] text-slate">A grounded, source-cited draft is ready for this recommendation.</p>
                <div className="mt-3"><PrimaryButton onClick={() => go('content', { recId: rec.id })}>Open draft in Content &amp; Approvals</PrimaryButton></div>
              </>
            ) : (
              <>
                <p className="text-[12.5px] text-slate">Generate a draft grounded exclusively in the approved claims above.</p>
                <div className="mt-3"><PrimaryButton onClick={() => go('content', { recId: rec.id })}>Generate grounded draft</PrimaryButton></div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <MonoLabel>Impact</MonoLabel>
            <div className="mt-2 space-y-1.5 text-[12.5px]">
              <Row k="Affects" v={rec.dimensionsAffected.map(dimLabel).join(', ')} />
              <Row k="Direction" v={<span className="text-teal">{rec.expectedDirection === 'up' ? '▲ improve (not guaranteed)' : rec.expectedDirection}</span>} />
              <Row k="Confidence" v={rec.confidence} />
              <Row k="Effort" v={rec.effort} />
              <Row k="Risk" v={<span className={RISK_TONE[rec.risk]}>{rec.risk}</span>} />
              <Row k="Owner" v={rec.owner} />
            </div>
          </Card>
          <Card>
            <MonoLabel>Scope</MonoLabel>
            <div className="mt-2 space-y-1.5 text-[12.5px]">
              <Row k="Prompt cluster" v={rec.promptCluster} />
              <Row k="Providers" v={rec.providers.join(', ')} />
              <Row k="Locales" v={rec.locales.join(', ').toUpperCase()} />
            </div>
            <div className="mt-3"><SecondaryButton onClick={() => go('experiments')}>Plan an experiment</SecondaryButton></div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-rule/60 pb-1.5">
      <span className="text-mist text-[10.5px] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{k}</span>
      <span className="text-ink text-right">{v}</span>
    </div>
  )
}
