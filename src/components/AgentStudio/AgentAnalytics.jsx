/**
 * Agent Studio — analytics.
 *
 * Usage, quality, feedback, and credit metrics derived from the agent's runs,
 * plus a recent-runs table that links into the run trace. All numbers come from
 * the mock run data so the shape matches what a real analytics API would serve.
 */

import { useMemo } from 'react'
import {
  Activity, Users, Gauge, ShieldAlert, Clock, Coins, ArrowRight, BookOpen,
} from 'lucide-react'
import {
  getAgentById, runsForAgent, KNOWLEDGE_CATALOG, activeVersion, DEPLOYMENT_SURFACES,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, ScoreBar, OutputStatusBadge, ConfidenceBadge, SecondaryButton,
} from './shared'

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0)
const surfaceName = (id) => DEPLOYMENT_SURFACES.find(s => s.id === id)?.label || id

export default function AgentAnalytics({ agentId, go }) {
  const agent = getAgentById(agentId)
  const runs = useMemo(() => runsForAgent(agentId), [agentId])

  const m = useMemo(() => {
    const total = runs.length
    const by = (s) => runs.filter(r => r.outputStatus === s).length
    const verified = by('verified')
    const needReview = by('need_review')
    const notVerified = by('not_verified')
    const requiresApproval = by('requires_approval')
    const avgConf = total ? Math.round(runs.reduce((a, r) => a + r.confidence, 0) / total) : 0
    const avgLatency = total ? Math.round(runs.reduce((a, r) => a + r.latencyMs, 0) / total) : 0
    const credits = runs.reduce((a, r) => a + r.creditsUsed, 0)
    const users = new Set(runs.map(r => r.userId)).size
    const escalation = needReview + requiresApproval
    // by surface
    const surfaceCounts = {}
    runs.forEach(r => { surfaceCounts[r.deploymentSurface] = (surfaceCounts[r.deploymentSurface] || 0) + 1 })
    return { total, verified, needReview, notVerified, requiresApproval, avgConf, avgLatency, credits, users, escalation, surfaceCounts }
  }, [runs])

  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>
  const v = activeVersion(agent)
  const topSources = (v?.knowledgeScope || []).slice(0, 4).map(id => KNOWLEDGE_CATALOG.find(k => k.id === id)?.name || id)
  const failureReasons = [
    { label: 'No supporting source', n: m.notVerified },
    { label: 'Low confidence', n: m.needReview },
    { label: 'Requires approval', n: m.requiresApproval },
  ].filter(f => f.n > 0)

  return (
    <div className="space-y-5">
      <SectionHeading
        title={`Analytics · ${agent.name}`}
        subtitle="Usage, quality, feedback, and credit consumption."
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Activity} label="Total runs" value={m.total} />
        <Kpi icon={Users} label="Active users" value={m.users} />
        <Kpi icon={Gauge} label="Avg confidence" value={`${m.avgConf}%`} tone={m.avgConf >= 85 ? 'teal' : 'amber'} />
        <Kpi icon={Clock} label="Avg response" value={`${(m.avgLatency / 1000).toFixed(1)}s`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Outcome breakdown */}
        <Card>
          <MonoLabel>Outcome rates</MonoLabel>
          <div className="mt-3 space-y-3">
            <Rate label="Verified" n={m.verified} d={m.total} color="teal" />
            <Rate label="Need Review" n={m.needReview} d={m.total} color="amber" />
            <Rate label="Not Verified" n={m.notVerified} d={m.total} color="error" />
            <Rate label="Requires Approval" n={m.requiresApproval} d={m.total} color="ocean" />
            <Rate label="Escalation rate" n={m.escalation} d={m.total} color="amber" />
          </div>
        </Card>

        {/* Credits + sources + failures */}
        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between">
              <MonoLabel>Credit consumption</MonoLabel>
              <span className="text-[13px] text-ink font-semibold inline-flex items-center gap-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}><Coins className="w-3.5 h-3.5 text-[#996800]" /> {m.credits.toLocaleString()}</span>
            </div>
            <p className="text-[11px] text-mist mt-1">Intelligence Credits across {m.total} runs</p>
          </Card>
          <Card>
            <MonoLabel>Top knowledge sources</MonoLabel>
            {topSources.length === 0 ? <p className="text-[12px] text-mist mt-2">No sources granted.</p> : (
              <ul className="mt-2 space-y-1.5">{topSources.map((s, i) => (
                <li key={i} className="text-[12px] text-slate flex items-center gap-1.5"><BookOpen className="w-3 h-3 text-ocean" /> {s}</li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <MonoLabel>Top failure reasons</MonoLabel>
            {failureReasons.length === 0 ? <p className="text-[12px] text-teal mt-2">No failures in this window.</p> : (
              <ul className="mt-2 space-y-1.5">{failureReasons.map((f, i) => (
                <li key={i} className="text-[12px] text-slate flex items-center justify-between"><span className="inline-flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-[#996800]" /> {f.label}</span><span className="text-mist">{f.n}</span></li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>

      {/* Runs by surface */}
      <Card>
        <MonoLabel>Runs by deployment surface</MonoLabel>
        <div className="mt-3 space-y-2">
          {Object.entries(m.surfaceCounts).map(([s, n]) => (
            <div key={s} className="flex items-center gap-3">
              <span className="text-[11.5px] text-slate w-40 shrink-0">{surfaceName(s)}</span>
              <div className="flex-1"><ScoreBar value={n} max={m.total} color="ocean" /></div>
              <span className="text-[11px] text-mist w-8 text-right">{n}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent runs table */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Recent runs</p></div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="bg-pale/50 border-b border-rule text-left">
                {['Run', 'User', 'Input', 'Status', 'Confidence', 'Credits', 'Feedback', 'When', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] uppercase tracking-wider text-mist font-semibold whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map(r => (
                <tr key={r.id} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/40">
                  <td className="px-4 py-2.5 text-mist whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.id}</td>
                  <td className="px-4 py-2.5 text-slate whitespace-nowrap">{r.userId}</td>
                  <td className="px-4 py-2.5 text-ink max-w-[280px] truncate">{r.input}</td>
                  <td className="px-4 py-2.5"><OutputStatusBadge status={r.outputStatus} /></td>
                  <td className="px-4 py-2.5"><ConfidenceBadge value={r.confidence} /></td>
                  <td className="px-4 py-2.5 text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.creditsUsed}</td>
                  <td className="px-4 py-2.5">{r.feedbackRating === 'up' ? '👍' : r.feedbackRating === 'down' ? '👎' : <span className="text-mist">—</span>}</td>
                  <td className="px-4 py-2.5 text-mist whitespace-nowrap">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5"><button onClick={() => go('run-trace', { runId: r.id })} className="text-ocean hover:text-ocean/80 cursor-pointer inline-flex items-center gap-1 text-[11.5px]">Trace <ArrowRight className="w-3 h-3" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Kpi({ icon: Icon, label, value, tone }) {
  const t = tone === 'teal' ? 'text-teal' : tone === 'amber' ? 'text-[#996800]' : 'text-ink'
  return (
    <Card padding="p-4">
      <div className="flex items-center gap-1.5 text-mist"><Icon className="w-3.5 h-3.5" /><MonoLabel>{label}</MonoLabel></div>
      <p className={`text-[26px] font-bold mt-1 ${t}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </Card>
  )
}

function Rate({ label, n, d, color }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-slate w-32 shrink-0">{label}</span>
      <div className="flex-1"><ScoreBar value={n} max={d} color={color} /></div>
      <span className="text-[11px] text-mist w-14 text-right" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{pct(n, d)}% ({n})</span>
    </div>
  )
}
