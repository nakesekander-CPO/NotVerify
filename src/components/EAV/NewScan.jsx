/**
 * AI Visibility — new scan (guided): scope → review → run.
 *
 * The run is simulated per provider; completion shows the language
 * regression and closes the loop — alert here, held change on the
 * governance queue, fact recorded in Cortex — with cross-links.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Radar, ChevronRight, Check, AlertTriangle, Brain, Scale, ArrowRight, ShieldCheck,
} from 'lucide-react'
import {
  SCAN_PROVIDERS, SCAN_LANGUAGES, SCAN_PROMPT_SET, scanObservations,
  SCAN_RESULT, scanEavi, LANGUAGE_FLAG, raiseLanguageFlag,
} from '../../data/eavScan'
import { BENCHMARK } from '../../data/eav'
import { Card, MonoLabel, SectionHeading, PrimaryButton, SecondaryButton } from './shared'
import { useToast } from '../ToastProvider'
import useReducedMotion from '../../hooks/useReducedMotion'

const STAGES = ['Scope', 'Review', 'Run']

export default function NewScan({ go, onNavigate }) {
  const { addToast } = useToast()
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0)
  const [langs, setLangs] = useState(() => new Set(SCAN_LANGUAGES.map(l => l.id)))
  const [progress, setProgress] = useState(null)   // {ChatGPT: 0..100, ...}
  const [done, setDone] = useState(false)
  const flagRaised = useRef(false)

  const obs = useMemo(() => scanObservations(langs.size), [langs])
  const toggleLang = (id) => setLangs(prev => {
    const next = new Set(prev)
    if (next.has(id)) { if (next.size > 1) next.delete(id) } else next.add(id)
    return next
  })

  const finish = () => {
    if (!flagRaised.current) {
      flagRaised.current = true
      raiseLanguageFlag()
      addToast('Scan complete — Cortex flagged new campaign language (held for Emma Ross)', 'info')
    }
    setDone(true)
  }

  /* Simulated run: provider bars fill on a ticker, then the loop fires. */
  useEffect(() => {
    if (stage !== 2 || done) return
    if (reduced) {
      const t = setTimeout(() => {
        setProgress(Object.fromEntries(SCAN_PROVIDERS.map(p => [p, 100])))
        finish()
      }, 0)
      return () => clearTimeout(t)
    }
    const seedT = setTimeout(() => setProgress(Object.fromEntries(SCAN_PROVIDERS.map(p => [p, 0]))), 0)
    const t = setInterval(() => {
      setProgress(prev => {
        const next = { ...prev }
        let allDone = true
        for (const [i, p] of SCAN_PROVIDERS.entries()) {
          next[p] = Math.min(100, (next[p] ?? 0) + 9 + i * 2)
          if (next[p] < 100) allDone = false
        }
        if (allDone) { clearInterval(t); setTimeout(finish, 400) }
        return next
      })
    }, 220)
    return () => { clearTimeout(seedT); clearInterval(t) }
  }, [stage]) // eslint-disable-line react-hooks/exhaustive-deps

  const prev = SCAN_RESULT.previous
  const curr = SCAN_RESULT.current
  const newEavi = scanEavi(curr)

  return (
    <div className="space-y-5">
      <SectionHeading
        title="New visibility scan"
        subtitle="Re-run the benchmark against the live assistant surface. Same prompt set, same methodology — comparable by construction."
        actions={<SecondaryButton onClick={() => go('overview')}>Cancel</SecondaryButton>}
      />

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STAGES.map((s, i) => (
          <span key={s} className={`text-[11px] px-2.5 py-1 rounded-full border ${i === stage ? 'bg-ocean text-white border-ocean' : i < stage ? 'bg-teal/10 text-teal border-teal/30' : 'bg-white text-mist border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {stage === 0 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Scope</p></div>
          <div className="p-5 space-y-4">
            <div>
              <MonoLabel>Assistants</MonoLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {SCAN_PROVIDERS.map(p => (
                  <span key={p} className="inline-flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border border-ocean/25 bg-ocean/5 text-ink">
                    <Check className="w-3 h-3 text-ocean" /> {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <MonoLabel>Languages</MonoLabel>
              <div className="flex flex-wrap gap-2 mt-2">
                {SCAN_LANGUAGES.map(l => {
                  const on = langs.has(l.id)
                  return (
                    <button key={l.id} onClick={() => toggleLang(l.id)} aria-pressed={on}
                      className={`text-[12px] px-3 py-1.5 rounded-lg border cursor-pointer ${on ? 'border-ocean/25 bg-ocean/5 text-ink' : 'border-rule text-mist hover:border-ocean/30'}`}>
                      {l.label}{l.ref ? ' · ref' : ''}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <MonoLabel>Prompt set</MonoLabel>
              <p className="text-[12.5px] text-slate mt-1">{SCAN_PROMPT_SET.name} · {SCAN_PROMPT_SET.prompts} buying questions · {SCAN_PROMPT_SET.repeats} repeats</p>
            </div>
          </div>
          <div className="px-5 pb-5 flex justify-end">
            <PrimaryButton onClick={() => setStage(1)}>Review scan <ChevronRight className="w-4 h-4" /></PrimaryButton>
          </div>
        </Card>
      )}

      {stage === 1 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Review</p></div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
            {[
              ['Benchmark', `${BENCHMARK.hash} · methodology ${BENCHMARK.methodologyVersion}`],
              ['Assistants', SCAN_PROVIDERS.join(' · ')],
              ['Languages', [...langs].map(id => SCAN_LANGUAGES.find(l => l.id === id).label).join(' · ')],
              ['Observations', `${obs.toLocaleString()} (${SCAN_PROMPT_SET.prompts} × ${SCAN_PROVIDERS.length} × ${SCAN_PROMPT_SET.repeats})`],
              ['Comparability', 'Same prompt set and weights as the last scan — deltas are attributable'],
              ['Credit estimate', `~${Math.round(obs / 25).toLocaleString()} Intelligence Credits`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-1 border-b border-rule/60">
                <span className="text-mist text-[10.5px] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{k}</span>
                <span className="text-ink text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="px-5 pb-5 flex items-center justify-between">
            <SecondaryButton onClick={() => setStage(0)}>← Back</SecondaryButton>
            <PrimaryButton onClick={() => setStage(2)}>Run scan <ChevronRight className="w-4 h-4" /></PrimaryButton>
          </div>
        </Card>
      )}

      {stage === 2 && (
        <>
          <Card padding="p-0">
            <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
              <Radar className={`w-4 h-4 text-ocean ${done || reduced ? '' : 'animate-pulse'}`} />
              <p className="text-[13px] font-semibold text-ink">{done ? 'Scan complete' : 'Scanning assistants…'}</p>
            </div>
            <div className="p-5 space-y-3">
              {SCAN_PROVIDERS.map(p => (
                <div key={p} className="flex items-center gap-3">
                  <span className="w-24 text-[12px] text-slate">{p}</span>
                  <div className="flex-1 h-2 bg-pale rounded-full overflow-hidden">
                    <div className="h-full bg-ocean rounded-full transition-all duration-200" style={{ width: `${progress?.[p] ?? 0}%` }} />
                  </div>
                  <span className="w-10 text-right text-[11px] text-mist tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{progress?.[p] ?? 0}%</span>
                </div>
              ))}
            </div>
          </Card>

          {done && (
            <>
              {/* Score movement */}
              <Card padding="p-5">
                <div className="flex items-baseline gap-4 flex-wrap">
                  <div>
                    <MonoLabel>EAVI</MonoLabel>
                    <p className="text-[34px] font-bold text-ink leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {newEavi}<span className="text-[16px] text-mist font-medium">/100</span>
                      <span className="text-[14px] text-error font-semibold ml-3">▼ {prev.eavi - newEavi} vs last scan</span>
                    </p>
                  </div>
                  <div className="flex gap-5 flex-wrap text-[12px]">
                    {[['Coverage', prev.coverage, curr.coverage], ['Prominence', prev.prominence, curr.prominence], ['Knowledge Accuracy', prev.accuracy, curr.accuracy], ['Freshness', prev.freshness, curr.freshness]].map(([label, a, b]) => (
                      <div key={label}>
                        <span className="text-mist">{label}</span>
                        <p className={`font-semibold tabular-nums ${b < a ? 'text-error' : b > a ? 'text-teal' : 'text-ink'}`}>{a} → {b}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* The flag — Cortex closes the loop */}
              <Card padding="p-0" className="border-[#FFB000]/40">
                <div className="px-5 py-3 border-b border-[#FFB000]/30 bg-[#FFF7E6] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#996800]" />
                  <p className="text-[13px] font-semibold text-[#996800]">Cortex flagged: {LANGUAGE_FLAG.title}</p>
                  <span className="ml-auto text-[10.5px] text-[#996800]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{LANGUAGE_FLAG.ruleId}</span>
                </div>
                <div className="p-5 space-y-3">
                  <p className="text-[13px] text-slate leading-relaxed">
                    <span className="line-through decoration-error/60 text-error/80">“{LANGUAGE_FLAG.phraseAfter}”</span>
                    <span className="text-mist"> replaced </span>
                    <span className="font-semibold text-ink">“{LANGUAGE_FLAG.phraseBefore}”</span>
                    <span className="text-mist"> on refreshed campaign pages.</span>
                  </p>
                  <p className="text-[12.5px] text-slate">{LANGUAGE_FLAG.finding}</p>
                  <ul className="space-y-1">
                    {LANGUAGE_FLAG.evidence.map(e => (
                      <li key={e} className="text-[12px] text-slate flex gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-ocean shrink-0 mt-0.5" />{e}</li>
                    ))}
                  </ul>
                  <p className="text-[11.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    Held for {LANGUAGE_FLAG.reviewer.name} ({LANGUAGE_FLAG.reviewer.role}) · written to Cortex
                  </p>
                  <div className="flex gap-2 flex-wrap pt-1">
                    <PrimaryButton onClick={() => onNavigate?.('dashboard')}><Scale className="w-3.5 h-3.5" /> View held change</PrimaryButton>
                    <SecondaryButton onClick={() => onNavigate?.('org-brain')}><Brain className="w-3.5 h-3.5" /> View in Cortex</SecondaryButton>
                    <SecondaryButton onClick={() => go('overview')}>Back to Overview <ArrowRight className="w-3.5 h-3.5" /></SecondaryButton>
                  </div>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}
