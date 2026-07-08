/**
 * Agent Studio — run trace.
 *
 * A single run, fully inspectable: input, output, version, the system prompt
 * used, knowledge retrieved, tool calls, guardrail checks, citations,
 * confidence, QA issues, credits, feedback, and a SAFE reasoning summary
 * (action/source trace — never raw chain-of-thought), plus timestamps.
 */

import {
  User, Bot, ShieldCheck, Wrench, BookOpen, Coins, ListChecks, AlertTriangle,
  Check, X, Lock, FileText,
} from 'lucide-react'
import { buildRunDetail, generateSystemPrompt, ACTIVE_CUSTOMER } from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, KeyValueRow, OutputStatusBadge, ConfidenceBadge, SecondaryButton,
} from './shared'

export default function AgentRunTrace({ runId, go }) {
  const d = runId ? buildRunDetail({ id: runId, ...findSeed(runId) }) : null
  if (!d || !d.agentId) return <Card><p className="text-[13px] text-mist">Run not found.</p></Card>
  const systemPrompt = d.version ? generateSystemPrompt(d.version, ACTIVE_CUSTOMER.name) : ''

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Run trace"
        subtitle={`${d.agentName} · ${d.id}`}
        actions={<SecondaryButton onClick={() => go('analytics')}>Back to analytics</SecondaryButton>}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <OutputStatusBadge status={d.outputStatus} />
        <ConfidenceBadge value={d.confidence} />
        <span className="text-[11px] text-slate inline-flex items-center gap-1"><Coins className="w-3 h-3 text-amber-deep" /> {d.creditsUsed ?? d.creditEstimate} credits</span>
        <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v{d.version?.versionNumber} · {d.userId} · {new Date(d.createdAt || Date.now()).toLocaleString()}</span>
        {d.feedbackRating && <span className="text-[11px]">{d.feedbackRating === 'up' ? '👍 helpful' : '👎 flagged'}</span>}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-5 items-start">
        <div className="space-y-4">
          <Card padding="p-0">
            <div className="px-4 py-2.5 border-b border-rule flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-ocean" /><MonoLabel>User input</MonoLabel></div>
            <p className="p-4 text-[13px] text-ink leading-relaxed">{d.input}</p>
          </Card>
          <Card padding="p-0">
            <div className="px-4 py-2.5 border-b border-rule flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Agent output</MonoLabel></span>
              <OutputStatusBadge status={d.outputStatus} />
            </div>
            <div className="p-4 space-y-3">
              <p className="text-[13px] text-ink leading-relaxed">{d.output}</p>
              {d.sourcesUsed.length > 0 && (
                <div className="pt-2 border-t border-rule">
                  <MonoLabel>Citations</MonoLabel>
                  <ul className="mt-1.5 space-y-1">{d.sourcesUsed.map((s, i) => (
                    <li key={i} className="text-[11.5px] text-slate flex items-start gap-1.5"><BookOpen className="w-3 h-3 text-ocean mt-0.5 shrink-0" /> <span className="text-ink">{s.name}</span> — {s.snippet}</li>
                  ))}</ul>
                </div>
              )}
            </div>
          </Card>

          {/* Safe reasoning summary — explicitly NOT raw chain-of-thought */}
          <Card>
            <div className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Reasoning summary</MonoLabel></div>
            <p className="text-[10.5px] text-mist mt-1">A safe summary of how the agent reached this answer — action + source trace, not private chain-of-thought.</p>
            <ul className="mt-2 space-y-1 text-[12.5px] text-slate list-disc pl-4">{d.reasoningSummary.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <div className="mt-3 pt-3 border-t border-rule">
              <MonoLabel>Action trace</MonoLabel>
              <ol className="mt-1.5 space-y-1 text-[12px] text-slate">{d.trace.map((s, i) => (
                <li key={i}><span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}.</span> <span className="text-ink">{s.step}</span> — {s.detail}</li>
              ))}</ol>
            </div>
          </Card>

          {/* System prompt used */}
          <Card padding="p-0">
            <div className="px-4 py-2.5 border-b border-rule flex items-center gap-1.5 bg-pale/40"><FileText className="w-3.5 h-3.5 text-ocean" /><MonoLabel>System instructions used (v{d.version?.versionNumber})</MonoLabel></div>
            <pre className="text-[11px] text-slate leading-relaxed p-4 whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{systemPrompt}</pre>
          </Card>
        </div>

        {/* Diagnostics rail */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center gap-1.5 mb-2"><Wrench className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Tool calls ({d.toolCalls.length})</MonoLabel></div>
            {d.toolCalls.length === 0 ? <p className="text-[12px] text-mist">None</p> : (
              <ul className="space-y-1 text-[12px]">{d.toolCalls.map((t, i) => (
                <li key={i} className="flex items-center gap-1.5 text-slate">{t.requiresApproval ? <Lock className="w-3 h-3 text-amber-deep" /> : <Check className="w-3 h-3 text-teal" />} {t.label}</li>
              ))}</ul>
            )}
          </Card>
          <Card>
            <div className="flex items-center gap-1.5 mb-2"><ShieldCheck className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Guardrail checks</MonoLabel></div>
            <ul className="space-y-1 text-[12px]">{d.guardrailResults.map((r, i) => (
              <li key={i} className="flex items-center gap-1.5 text-slate">{r.pass ? <Check className="w-3 h-3 text-teal" /> : <X className="w-3 h-3 text-error" />} {r.label}</li>
            ))}</ul>
          </Card>
          {d.qaIssues.length > 0 && (
            <Card>
              <div className="flex items-center gap-1.5 mb-2"><AlertTriangle className="w-3.5 h-3.5 text-amber-deep" /><MonoLabel>QA issues</MonoLabel></div>
              <ul className="space-y-1 text-[12px] text-amber-deep">{d.qaIssues.map((q, i) => <li key={i}>{q.text}</li>)}</ul>
            </Card>
          )}
          <Card>
            <MonoLabel>Details</MonoLabel>
            <div className="mt-2 text-[12.5px]">
              <KeyValueRow label="Agent" value={d.agentName} />
              <KeyValueRow label="Version" value={`v${d.version?.versionNumber}`} mono />
              <KeyValueRow label="Surface" value={d.deploymentSurface} />
              <KeyValueRow label="Confidence" value={`${d.confidence}%`} mono />
              <KeyValueRow label="Final status" value={d.outputStatus.replace(/_/g, ' ')} />
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Look up the seed run row for the given id (analytics/overview pass real ids).
import { RUNS } from '../../data/agentStudio'
function findSeed(runId) {
  const r = RUNS.find(x => x.id === runId)
  return r || {}
}
