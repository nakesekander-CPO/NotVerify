/**
 * Agent Studio — test playground.
 *
 * 3-pane: task input | agent answer | evidence & diagnostics rail. Responses
 * are simulated deterministically from the agent's config (simulateAgentRun),
 * so the trust-first surfaces behave correctly — sources, confidence, tool
 * calls, guardrail checks, QA warnings, credit estimate, runtime trace, and a
 * suggested status (Verified / Need Review / Not Verified / Requires Approval).
 */

import { useState } from 'react'
import {
  Play, ThumbsUp, ThumbsDown, Save, Sparkles, Check, X, AlertTriangle, Lock,
  BookOpen, Wrench, ShieldCheck, Coins, ListChecks, Rocket,
} from 'lucide-react'
import {
  getAgentById, activeVersion, simulateAgentRun, SAMPLE_TASKS, publishAgent,
} from '../../data/agentStudio'
import {
  SectionHeading, Card, MonoLabel, PrimaryButton, SecondaryButton,
  OutputStatusBadge, ConfidenceBadge,
} from './shared'

export default function AgentPlayground({ agentId, go }) {
  const agent = getAgentById(agentId)
  const v = agent ? activeVersion(agent) : null
  const [input, setInput] = useState(agent ? (SAMPLE_TASKS[agent.type] || '') : '')
  const [result, setResult] = useState(null)
  const [rating, setRating] = useState(null)
  const [tests, setTests] = useState([])

  const run = () => {
    if (!input.trim()) return
    setResult(simulateAgentRun(v, input.trim()))
    setRating(null)
  }
  const saveTest = () => {
    if (!result) return
    setTests(t => [{ id: `T${t.length + 1}`, input, status: result.outputStatus, rating }, ...t])
  }

  if (!agent) return <Card><p className="text-[13px] text-mist">Agent not found.</p></Card>

  return (
    <div className="space-y-4">
      <SectionHeading
        title={`Playground · ${agent.name}`}
        subtitle="Test with real or sample context before publishing. Every answer shows its sources, confidence, and suggested status."
        actions={agent.draftVersionId
          ? <PrimaryButton onClick={() => { publishAgent(agent.id); go('overview') }}><Rocket className="w-3.5 h-3.5" /> Publish (tests pass)</PrimaryButton>
          : <SecondaryButton onClick={() => go('overview')}>Back to overview</SecondaryButton>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr_1fr] gap-4 items-start">
        {/* Left: input */}
        <Card padding="p-0">
          <div className="px-4 py-2.5 border-b border-rule"><MonoLabel>Task input</MonoLabel></div>
          <div className="p-4 space-y-3">
            <textarea rows={6} value={input} onChange={e => setInput(e.target.value)} placeholder="Ask the agent to do something…"
              className="w-full text-[13px] border border-rule rounded-md p-2.5 focus:outline-none focus:border-ocean/50 leading-relaxed" />
            <div className="flex items-center gap-2">
              <PrimaryButton onClick={run} disabled={!input.trim()}><Play className="w-3.5 h-3.5" /> Run test</PrimaryButton>
              <SecondaryButton onClick={() => setInput(SAMPLE_TASKS[agent.type] || '')}><Sparkles className="w-3.5 h-3.5" /> Sample</SecondaryButton>
            </div>
            {tests.length > 0 && (
              <div className="pt-2 border-t border-rule">
                <MonoLabel>Saved test cases ({tests.length})</MonoLabel>
                <ul className="mt-2 space-y-1.5">
                  {tests.map(t => (
                    <li key={t.id} className="flex items-center gap-2 text-[11.5px]">
                      <OutputStatusBadge status={t.status} />
                      <span className="text-slate truncate flex-1">{t.input}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Card>

        {/* Center: answer */}
        <Card padding="p-0">
          <div className="px-4 py-2.5 border-b border-rule flex items-center justify-between">
            <MonoLabel>Agent answer</MonoLabel>
            {result && <OutputStatusBadge status={result.outputStatus} />}
          </div>
          <div className="p-4">
            {!result ? (
              <p className="text-[13px] text-mist py-10 text-center">Run a test to see the answer, its sources, and a suggested status.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <ConfidenceBadge value={result.confidence} size="lg" />
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate"><Coins className="w-3 h-3 text-[#996800]" /> ~{result.creditEstimate} credits</span>
                </div>
                <p className="text-[13px] text-ink leading-relaxed">{result.output}</p>
                {result.sourcesUsed.length > 0 && (
                  <div className="pt-2 border-t border-rule">
                    <MonoLabel>Citations</MonoLabel>
                    <ul className="mt-1.5 space-y-1">
                      {result.sourcesUsed.map((s, i) => (
                        <li key={i} className="text-[11.5px] text-slate flex items-start gap-1.5">
                          <BookOpen className="w-3 h-3 text-ocean mt-0.5 shrink-0" /> <span><span className="text-ink font-medium">{s.name}</span> — {s.snippet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center gap-2 pt-2 border-t border-rule">
                  <span className="text-[11px] text-mist">Rate this run:</span>
                  <button onClick={() => setRating('up')} className={`p-1.5 rounded-md border cursor-pointer ${rating === 'up' ? 'border-teal bg-teal/10 text-teal' : 'border-rule text-slate hover:bg-pale'}`}><ThumbsUp className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setRating('down')} className={`p-1.5 rounded-md border cursor-pointer ${rating === 'down' ? 'border-error bg-error/10 text-error' : 'border-rule text-slate hover:bg-pale'}`}><ThumbsDown className="w-3.5 h-3.5" /></button>
                  <SecondaryButton onClick={saveTest} className="ml-auto"><Save className="w-3.5 h-3.5" /> Save test case</SecondaryButton>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Right: evidence rail */}
        <EvidenceRail result={result} version={v} />
      </div>
    </div>
  )
}

function EvidenceRail({ result, version }) {
  const knCount = version?.knowledgeScope?.length || 0
  // Demo-first: show the three signals that matter (status, sources, guardrails);
  // the deeper diagnostics live behind one toggle.
  const [showDiagnostics, setShowDiagnostics] = useState(false)
  return (
    <Card padding="p-0">
      <div className="px-4 py-2.5 border-b border-rule flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-ocean" /><MonoLabel>Evidence</MonoLabel></div>
      {!result ? (
        <p className="text-[12px] text-mist p-4">Run a test to see the answer’s sources, guardrail checks, and suggested status.</p>
      ) : (
        <div className="p-4 space-y-4 text-[12px]">
          <RailBlock icon={ListChecks} label="Suggested status">
            <div className="flex items-center gap-2"><OutputStatusBadge status={result.outputStatus} /><ConfidenceBadge value={result.confidence} /></div>
          </RailBlock>

          <RailBlock icon={BookOpen} label={`Sources (${result.sourcesUsed.length}/${knCount})`}>
            {result.sourcesUsed.length === 0 ? <Muted>No approved source matched → Need Review.</Muted> : (
              <ul className="space-y-1">{result.sourcesUsed.map((s, i) => <li key={i} className="text-slate">{s.name} {s.cites && <span className="text-[9px] text-teal bg-teal/10 px-1 rounded">cites</span>}</li>)}</ul>
            )}
          </RailBlock>

          <RailBlock icon={ShieldCheck} label="Guardrail checks">
            <ul className="space-y-1">{result.guardrailResults.map((r, i) => (
              <li key={i} className="flex items-center gap-1.5 text-slate">
                {r.pass ? <Check className="w-3 h-3 text-teal" /> : <X className="w-3 h-3 text-error" />} {r.label}
              </li>
            ))}</ul>
          </RailBlock>

          <button
            type="button"
            onClick={() => setShowDiagnostics(o => !o)}
            className="text-[11.5px] text-ocean hover:text-ocean/80 cursor-pointer"
          >
            {showDiagnostics ? 'Hide diagnostics' : 'Show diagnostics'}
          </button>

          {showDiagnostics && (
            <>
              <RailBlock icon={BookOpen} label="Knowledge matches">
                <div className="flex flex-wrap gap-2 text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <span>Cortex: {result.orgBrainHits}</span><span>Terminology: {result.termMatches}</span><span>TM: {result.tmMatches}</span>
                </div>
              </RailBlock>

              <RailBlock icon={Wrench} label={`Tool calls (${result.toolCalls.length})`}>
                {result.toolCalls.length === 0 ? <Muted>None</Muted> : (
                  <ul className="space-y-1">{result.toolCalls.map((t, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-slate">
                      {t.requiresApproval ? <Lock className="w-3 h-3 text-[#996800]" /> : <Check className="w-3 h-3 text-teal" />}
                      {t.label} {t.requiresApproval && <span className="text-[9px] text-[#996800] bg-[#FFF7E6] px-1 rounded">awaiting approval</span>}
                    </li>
                  ))}</ul>
                )}
              </RailBlock>

              {result.qaIssues.length > 0 && (
                <RailBlock icon={AlertTriangle} label="QA warnings">
                  <ul className="space-y-1">{result.qaIssues.map((q, i) => (
                    <li key={i} className="text-[#996800] flex items-start gap-1.5"><AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" /> {q.text}</li>
                  ))}</ul>
                </RailBlock>
              )}

              <RailBlock icon={Coins} label="Credit estimate">
                <span className="text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>~{result.creditEstimate} Intelligence Credits</span>
              </RailBlock>

              <RailBlock icon={ListChecks} label="Runtime trace">
                <ol className="space-y-1">{result.trace.map((s, i) => (
                  <li key={i} className="text-slate"><span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{i + 1}.</span> <span className="text-ink">{s.step}</span> — {s.detail}</li>
                ))}</ol>
              </RailBlock>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function RailBlock({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1"><Icon className="w-3 h-3 text-mist" /><MonoLabel>{label}</MonoLabel></div>
      {children}
    </div>
  )
}
function Muted({ children }) { return <p className="text-mist">{children}</p> }
