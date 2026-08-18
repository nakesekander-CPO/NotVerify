/**
 * Agent Studio — conversational builder.
 *
 * Ported from the standalone arbitr Agent Studio prototype: describe a job
 * in plain language, the builder plans first (job → shape → risks → an
 * honest verdict), then assembles the spec in the side panel, dry-tests it
 * against a real fixture, and only then allows deploy. This demo version
 * is fully scripted — no model calls — but the two choice points genuinely
 * mutate the spec, and all three gates (plan → test → deploy) are
 * structural, exactly as in the source project.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Bot, Send, Sparkles, ShieldCheck, FlaskConical, Rocket, Check,
  AlertTriangle, ClipboardList, Wrench, BookOpen, ListChecks, User, Clock,
} from 'lucide-react'
import {
  PLAN_STAGES, BASE_SPEC, SCRIPT, OPENERS,
  applySeverityChoice, applyOutputChoice, dryRunFor,
  planReady, testReady, deployReady,
} from '../../data/agentBuilder'
import { addAgent, createAgentFromTemplate, TEMPLATES, ACTIVE_CUSTOMER } from '../../data/agentStudio'
import { Card, MonoLabel, PrimaryButton } from './shared'
import { Tabs } from '../ui'
import { useToast } from '../ToastProvider'
import useReducedMotion from '../../hooks/useReducedMotion'

/* ── Chat pieces ───────────────────────────────────────────────── */

function Bubble({ who, children }) {
  const isBuilder = who === 'builder'
  return (
    <div className={`flex ${isBuilder ? 'items-start gap-2.5' : 'justify-end'}`}>
      {isBuilder && (
        <span className="w-7 h-7 rounded-full bg-ocean/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-ocean" />
        </span>
      )}
      <div className={`rounded-lg px-3.5 py-2.5 max-w-[86%] text-[13px] leading-relaxed whitespace-pre-wrap ${
        isBuilder ? 'bg-pale/60 border border-rule text-ink' : 'bg-ocean/[0.06] border border-ocean/15 text-ink'
      }`}>
        {children}
      </div>
    </div>
  )
}

// Minimal **bold** renderer for the scripted replies.
function rich(text) {
  return text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

function Thinking() {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-7 h-7 rounded-full bg-ocean/10 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-ocean" />
      </span>
      <div className="rounded-lg px-4 py-3 bg-pale/60 border border-rule">
        <span className="flex gap-1" aria-label="Builder is thinking">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-mist animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </span>
      </div>
    </div>
  )
}

/* ── Panel pieces ──────────────────────────────────────────────── */

function PlanPanel({ plan }) {
  if (!plan) return <p className="text-[12px] text-mist p-4">The plan fills in as you describe the job.</p>
  const row = (label, body) => body && (
    <div className="px-4 py-3 border-b border-rule/60">
      <MonoLabel>{label}</MonoLabel>
      <p className="text-[12.5px] text-slate leading-relaxed mt-1">{body}</p>
    </div>
  )
  return (
    <div>
      {row('The job today', plan.job_today)}
      {row('Understood as', plan.understood_as)}
      {row('Shape', plan.shape)}
      {plan.open_questions?.length > 0 && (
        <div className="px-4 py-3 border-b border-rule/60">
          <MonoLabel>Open questions</MonoLabel>
          <ul className="mt-1 space-y-1">
            {plan.open_questions.map(q => <li key={q} className="text-[12px] text-slate flex gap-1.5"><span className="text-mist">·</span>{q}</li>)}
          </ul>
        </div>
      )}
      {plan.risks?.length > 0 && (
        <div className="px-4 py-3 border-b border-rule/60">
          <MonoLabel>Risks</MonoLabel>
          <ul className="mt-1 space-y-1">
            {plan.risks.map(r => <li key={r} className="text-[12px] text-slate flex gap-1.5"><AlertTriangle className="w-3 h-3 text-[#996800] shrink-0 mt-0.5" />{r}</li>)}
          </ul>
        </div>
      )}
      {plan.verdict && (
        <div className="px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-teal bg-teal/10 border border-teal/30 rounded-full px-2.5 py-1">
            <Check className="w-3 h-3" /> Verdict: build the agent
          </span>
          <p className="text-[11.5px] text-mist mt-1.5">{plan.verdict_note}</p>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line no-unused-vars -- RowIcon is used as a JSX component below; this eslint config miscounts renamed component props
function Row({ icon: RowIcon, label, children }) {
  return (
    <div className="px-4 py-2.5 border-b border-rule/60 flex items-start gap-2.5">
      <RowIcon className="w-3.5 h-3.5 text-mist shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <MonoLabel>{label}</MonoLabel>
        <div className="text-[12px] text-slate leading-relaxed mt-0.5">{children}</div>
      </div>
    </div>
  )
}

function SpecPanel({ spec, dryRun }) {
  if (!spec) return <p className="text-[12px] text-mist p-4">The agent assembles here once the plan is approved.</p>
  return (
    <div>
      <div className="px-4 py-3 border-b border-rule/60">
        <p className="text-[13.5px] font-semibold text-ink">{spec.name}</p>
        <p className="text-[11.5px] text-slate mt-0.5">{spec.job_description}</p>
      </div>
      <Row icon={Clock} label="Trigger">{spec.trigger.detail}</Row>
      <Row icon={User} label="Owner · Autonomy">{spec.owner} · <span className="font-semibold text-ink">{spec.autonomy_level}</span> — drafts only, never acts alone</Row>
      <Row icon={Wrench} label="Tools">
        <span className="flex flex-wrap gap-1 mt-0.5">
          {spec.tools.map(t => <code key={t} className="text-[10.5px] bg-pale border border-rule rounded px-1.5 py-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t}</code>)}
        </span>
      </Row>
      <Row icon={BookOpen} label="Knowledge">
        <span className="flex flex-wrap gap-1 mt-0.5">
          {spec.knowledge.map(k => <code key={k} className="text-[10.5px] bg-pale border border-rule rounded px-1.5 py-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{k}</code>)}
        </span>
      </Row>
      <Row icon={ListChecks} label={`Steps · ${spec.severityScope || 'critical only'}`}>
        <ol className="mt-0.5 space-y-0.5 list-decimal list-inside">
          {spec.steps.map(s => <li key={s}>{s}</li>)}
        </ol>
      </Row>
      <Row icon={ShieldCheck} label="Guardrails">
        <ul className="mt-0.5 space-y-0.5">
          {spec.guardrails.map(g => <li key={g} className="flex gap-1.5"><ShieldCheck className="w-3 h-3 text-teal shrink-0 mt-0.5" />{g}</li>)}
        </ul>
      </Row>
      {spec.output && <Row icon={ClipboardList} label="Output">{spec.output.format}<br /><span className="text-mist">{spec.output.destination}</span></Row>}
      {dryRun && <DryRunPanel dryRun={dryRun} />}
    </div>
  )
}

function DryRunPanel({ dryRun }) {
  return (
    <div className="px-4 py-3 bg-pale/40 border-t border-rule">
      <MonoLabel>Dry run · {dryRun.fixture}</MonoLabel>
      <div className="mt-2 space-y-1.5 text-[12px] text-slate">
        <p className="flex gap-1.5"><Check className="w-3.5 h-3.5 text-teal shrink-0" /> Accessed: {dryRun.accessed.join(' · ')}</p>
        {dryRun.stoppedForHuman && (
          <p className="flex gap-1.5 text-[#996800]"><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Stopped for a human — “{dryRun.stopReason}” → {dryRun.handedTo}</p>
        )}
        <p className="bg-white border border-rule rounded-lg px-2.5 py-2 text-[11.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{dryRun.outputPreview}</p>
        <p className="flex items-center gap-1.5 text-teal font-medium"><FlaskConical className="w-3.5 h-3.5" /> Test passed — honest behaviour verified</p>
      </div>
    </div>
  )
}

/* ── Gate strip ────────────────────────────────────────────────── */

function GateStrip({ plan, spec, dryRun, deployed }) {
  const gates = [
    { label: 'Plan', ok: planReady(plan), icon: ClipboardList },
    { label: 'Build', ok: testReady(spec), icon: Wrench },
    { label: 'Test', ok: Boolean(dryRun?.passed), icon: FlaskConical },
    { label: 'Deploy', ok: deployed, icon: Rocket },
  ]
  return (
    <div className="flex items-center gap-1.5" aria-label="Build gates">
      {gates.map((g, i) => (
        <span key={g.label} className="flex items-center gap-1.5">
          {i > 0 && <span className="w-4 h-px bg-rule" />}
          <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border ${g.ok ? 'bg-teal/10 text-teal border-teal/30' : 'bg-white text-mist border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            <g.icon className="w-3 h-3" /> {g.label}
          </span>
        </span>
      ))}
    </div>
  )
}

/* ── The builder ───────────────────────────────────────────────── */

export default function ConversationalBuilder({ onCancel, onCreated }) {
  const { addToast } = useToast()
  const reduced = useReducedMotion()
  const [messages, setMessages] = useState([])   // {who, text}
  const [beatIdx, setBeatIdx] = useState(-1)     // -1 = awaiting opener
  const [thinking, setThinking] = useState(false)
  const [plan, setPlan] = useState(null)
  const [spec, setSpec] = useState(null)
  const [dryRun, setDryRun] = useState(null)
  const [deployed, setDeployed] = useState(false)
  const [resolvedChoices, setResolvedChoices] = useState(() => new Set())
  const [panelTab, setPanelTab] = useState('plan')
  const [input, setInput] = useState('')
  const scroller = useRef(null)
  const specRef = useRef(null)
  useEffect(() => { specRef.current = spec }, [spec])

  const scrollDown = () => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  useEffect(() => { scrollDown() }, [messages, thinking]) // eslint-disable-line react-hooks/exhaustive-deps

  const say = (who, text) => setMessages(m => [...m, { who, text }])

  const applyPanel = (events, currentSpec) => {
    let s = currentSpec
    for (const ev of events || []) {
      if (ev.type === 'plan') setPlan(PLAN_STAGES[ev.stage])
      if (ev.type === 'mode') setPanelTab('spec')
      if (ev.type === 'spec' && ev.apply === 'base') { s = { ...BASE_SPEC }; setSpec(s) }
      if (ev.type === 'dryrun') {
        const run = dryRunFor(s)
        setDryRun(run)
        s = { ...s, test_results: run.passedAt }
        setSpec(s)
      }
    }
    return s
  }

  /** Advance to the next beat: show the user's line, think, reply. */
  const advance = (userText, { choiceValue = null } = {}) => {
    if (thinking || deployed) return
    say('user', userText)
    setThinking(true)
    const delay = reduced ? 60 : 850

    setTimeout(() => {
      setThinking(false)
      let s = specRef.current
      const current = SCRIPT[beatIdx]

      // A pending choice on the CURRENT beat resolves in place: apply the
      // effect, acknowledge, and only auto-advance when the next beat is
      // another builder question (a choice) — action beats like the dry
      // run wait for the user's own chip.
      if (current?.choice && choiceValue !== null) {
        const opt = current.choice.options.find(o => o.value === choiceValue)
        if (current.choice.id === 'severity') s = applySeverityChoice(s, choiceValue)
        if (current.choice.id === 'output') s = applyOutputChoice(s, choiceValue)
        setSpec(s)
        say('builder', opt.ack)
        setResolvedChoices(prev => new Set(prev).add(current.id))
        const next = SCRIPT[beatIdx + 1]
        if (next?.choice) {
          setTimeout(() => {
            applyPanel(next.panel, s)
            say('builder', next.builder)
            setBeatIdx(i => i + 1)
          }, reduced ? 80 : 900)
        }
        return
      }

      // Normal advance.
      const nextIdx = beatIdx + 1
      const beat = SCRIPT[nextIdx]
      if (!beat) return
      s = applyPanel(beat.panel, s)

      if (beat.id === 'dry-run') {
        say('builder', beat.builder)
        const run = dryRunFor(s)
        setTimeout(() => {
          say('builder', `${run.stoppedForHuman
            ? 'It behaved correctly — and exposed the real design issue. It read the report, looked up the flagged term, then stopped and handed back rather than drafting: one lone critical flag isn’t a pattern, and it refused to pad the email out.'
            : 'It read the report, grouped the repeated “Drawdown” majors into a pattern with the approved term cited, and drafted the email — the single critical figure mismatch sits at the top in its own section.'}\n\n${run.insight}\n\nThe test gate is green. Deploy when ready.`)
        }, reduced ? 80 : 1100)
      } else if (beat.id === 'deploy') {
        say('builder', beat.deployedReply)
        setDeployed(true)
        const tpl = TEMPLATES.find(t => t.type === 'qa') || TEMPLATES[0]
        const agent = createAgentFromTemplate(tpl, { owner: 'Alex Chen', customer: ACTIVE_CUSTOMER })
        agent.name = s.name
        agent.description = s.job_description
        agent.status = 'active'
        agent.builderSpec = s
        addAgent(agent)
        addToast(`${s.name} deployed — drafts only, Mondays 07:30`, 'success')
        setTimeout(() => onCreated?.(agent.id), reduced ? 400 : 1800)
      } else {
        say('builder', beat.builder)
      }
      setBeatIdx(nextIdx)
    }, delay)
  }

  /* Current affordances */
  const currentBeat = SCRIPT[beatIdx]
  const nextBeat = SCRIPT[beatIdx + 1]
  const chips = useMemo(() => {
    if (deployed) return []
    if (beatIdx === -1) return OPENERS
    if (currentBeat?.choice && !resolvedChoices.has(currentBeat.id)) {
      return currentBeat.choice.options.map(o => ({ text: o.chip, choiceValue: o.value }))
    }
    return nextBeat?.chips || currentBeat?.chips || []
  }, [beatIdx, deployed, resolvedChoices]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = (text, choiceValue = null) => {
    const t = (text ?? input).trim()
    if (!t) return
    setInput('')
    // Structural gates: deploy only after a passed test.
    if (nextBeat?.id === 'deploy' && !deployReady(specRef.current, dryRun)) {
      say('user', t)
      say('builder', 'Not yet — the deploy gate needs a passed dry test first. Run the test and I’ll open it.')
      return
    }
    advance(t, { choiceValue })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5">
      {/* ── Chat ── */}
      <Card padding="p-0" className="flex flex-col h-[640px]">
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Agent Builder</p>
            <span className="text-[10px] text-mist uppercase tracking-[0.14em]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {panelTab === 'plan' && !spec ? 'Planning' : deployed ? 'Deployed' : 'Building'}
            </span>
          </div>
          <GateStrip plan={plan} spec={spec} dryRun={dryRun} deployed={deployed} />
        </div>

        <div ref={scroller} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <Bot className="w-8 h-8 text-mist mx-auto mb-2" />
              <p className="text-[13.5px] font-semibold text-ink">Describe a job you do by hand.</p>
              <p className="text-[12px] text-slate mt-1 max-w-sm mx-auto">The builder plans first — what the job really is, its risks, and whether it should be an agent at all — before anything gets configured.</p>
            </div>
          )}
          {messages.map((m, i) => <Bubble key={i} who={m.who}>{rich(m.text)}</Bubble>)}
          {thinking && <Thinking />}
        </div>

        {/* Chips + input */}
        <div className="border-t border-rule px-4 py-3 space-y-2">
          {chips.length > 0 && !thinking && (
            <div className="flex flex-wrap gap-1.5">
              {chips.map(c => {
                const text = typeof c === 'string' ? c : c.text
                const cv = typeof c === 'string' ? null : c.choiceValue
                return (
                  <button key={text} onClick={() => send(text, cv)}
                    className="text-left text-[11.5px] text-ocean bg-ocean/[0.05] border border-ocean/20 hover:bg-ocean/10 rounded-lg px-2.5 py-1.5 cursor-pointer max-w-full">
                    {text}
                  </button>
                )
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') send() }}
              placeholder={deployed ? 'Deployed — head to the dashboard to see it live' : 'Describe the job in your own words…'}
              aria-label="Message the agent builder"
              disabled={deployed}
              className="flex-1 text-[13px] border border-rule rounded-lg px-3 py-2 focus:outline-none focus:border-ocean/50 disabled:bg-pale/40"
            />
            <button onClick={() => send()} disabled={deployed || !input.trim()} aria-label="Send"
              className="w-9 h-9 rounded-lg bg-amber hover:bg-amber-deep text-white flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button onClick={onCancel} className="text-[11px] text-mist hover:text-slate cursor-pointer">Cancel and return to the dashboard</button>
        </div>
      </Card>

      {/* ── Panel ── */}
      <Card padding="p-0" className="h-[640px] overflow-y-auto">
        <div className="px-4 pt-3 border-b border-rule">
          <Tabs
            ariaLabel="Builder panel"
            tabs={[{ id: 'plan', label: 'Plan' }, { id: 'spec', label: 'Agent' }]}
            active={panelTab}
            onChange={setPanelTab}
          />
        </div>
        {panelTab === 'plan' ? <PlanPanel plan={plan} /> : <SpecPanel spec={spec} dryRun={dryRun} />}
        {deployed && (
          <div className="px-4 py-3 bg-teal/5 border-t border-teal/20">
            <p className="text-[12px] text-teal font-semibold flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> Live — owned by Alex Chen, drafts only, Mondays 07:30</p>
          </div>
        )}
      </Card>
    </div>
  )
}
