/**
 * Video Dubbing — new-project walkthrough.
 *
 * Start a project → the governed pipeline runs live: agent stages advance
 * on their own; the three gates (script checks, likeness consent, human
 * review) pause and wait for a human. Output is a sample dubbed video —
 * the player reads /sample-dub.mp4 from public/ and falls back to a
 * placeholder stage until the real sample file is dropped in.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Film, Play, ShieldCheck, BookOpen, UserCheck, Download, CheckCircle2,
  ArrowLeft, ArrowRight, Loader2, FileCheck2,
} from 'lucide-react'
import {
  DUB_STAGES, CONSENT_RECORDS, SAMPLE_SOURCE, RUN_LANGS, RUN_SCRIPT_CHECKS,
  RUN_ORDER, isGate, nextRunStage,
} from '../../data/videoDubbing'
import { downloadText, downloadJson } from '../../utils/demoFiles'
import useReducedMotion from '../../hooks/useReducedMotion'
import { Card, MonoLabel, PrimaryButton, SecondaryButton } from '../HITLVendorWorkflow/shared'

const AGENT_STAGE_MS = 1400

export default function NewDubProject({ onComplete, onCancel }) {
  const reduced = useReducedMotion()
  const [step, setStep] = useState('setup')            // setup | run | done
  const [langs, setLangs] = useState([...RUN_LANGS])
  const [stage, setStage] = useState(null)             // current running stage id
  const [clearedGates, setClearedGates] = useState([])
  const [log, setLog] = useState([])                   // { stage, label, at }
  const consent = useMemo(() => CONSENT_RECORDS.find(c => c.id === SAMPLE_SOURCE.consentId), [])

  const stageIdx = RUN_ORDER.indexOf(stage)
  const record = (id, label) => setLog(l => [...l, { stage: id, label, at: new Date().toLocaleTimeString() }])

  // Agent stages auto-advance; gates wait for the human.
  useEffect(() => {
    if (step !== 'run' || !stage) return
    if (isGate(stage)) return
    const t = setTimeout(() => {
      record(stage, DUB_STAGES.find(s => s.id === stage)?.label)
      const next = nextRunStage(stage)
      if (next) setStage(next)
      else setStep('done')
    }, reduced ? 60 : AGENT_STAGE_MS)
    return () => clearTimeout(t)
  }, [step, stage, reduced])

  const start = () => { setStep('run'); setStage(RUN_ORDER[0]) }
  const clearGate = (id) => {
    setClearedGates(g => [...g, id])
    record(id, `${DUB_STAGES.find(s => s.id === id)?.label} — cleared`)
    const next = nextRunStage(id)
    if (next) setStage(next)
    else setStep('done')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-ink">New dubbing project</h2>
          <MonoLabel>One source video · every language · every frame governed</MonoLabel>
        </div>
        <SecondaryButton onClick={onCancel}><ArrowLeft className="w-3.5 h-3.5" /> Back to Video Dubbing</SecondaryButton>
      </div>

      {step === 'setup' && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">Source & languages</p></div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <MonoLabel>Source video</MonoLabel>
              <div className="mt-2 rounded-lg border border-ocean/30 bg-ocean/[0.04] p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-ocean/10 flex items-center justify-center"><Film className="w-5 h-5 text-ocean" /></div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-ink truncate">{SAMPLE_SOURCE.name}</p>
                  <p className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {SAMPLE_SOURCE.srcLang} · {SAMPLE_SOURCE.duration} · {SAMPLE_SOURCE.speaker}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-mist mt-2">Sample source for the demo — or drop your own file on the dashboard.</p>

              <MonoLabel className="block mt-4">Consent on file</MonoLabel>
              <div className="mt-2 rounded-lg border border-teal/30 bg-teal/5 px-3.5 py-2.5 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <div>
                  <p className="text-[12px] text-ink font-medium">{consent.speaker} — likeness & voice consent</p>
                  <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{consent.doc} · valid until {consent.validUntil}</p>
                </div>
              </div>
            </div>
            <div>
              <MonoLabel>Target languages</MonoLabel>
              <div className="mt-2 flex flex-wrap gap-2">
                {RUN_LANGS.map(l => {
                  const on = langs.includes(l)
                  return (
                    <button key={l} onClick={() => setLangs(cur => on ? cur.filter(x => x !== l) : [...cur, l])}
                      aria-pressed={on}
                      className={`px-3.5 py-2 rounded-lg border text-[12.5px] font-semibold cursor-pointer transition-colors ${on ? 'border-ocean bg-ocean text-white' : 'border-rule text-slate hover:border-ocean/40'}`}>
                      {l}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-slate mt-3 leading-relaxed">
                Script and terminology checks run <span className="font-semibold text-ink">before any voice is cloned</span>;
                the consent gate sits before lip sync. A held track is the product working.
              </p>
              <div className="mt-5">
                <PrimaryButton onClick={start} disabled={langs.length === 0}>
                  Start governed dub <ArrowRight className="w-4 h-4" />
                </PrimaryButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {step === 'run' && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
            <p className="text-[13px] font-semibold text-ink">{SAMPLE_SOURCE.name} → {langs.join(' · ')}</p>
            <MonoLabel>Stage {Math.max(1, stageIdx + 1)} of {RUN_ORDER.length}</MonoLabel>
          </div>
          <ul className="divide-y divide-rule/70">
            {DUB_STAGES.map(s => {
              const i = RUN_ORDER.indexOf(s.id)
              const done = i < stageIdx || (i === stageIdx && step === 'done')
              const active = s.id === stage
              return (
                <li key={s.id} className={`px-5 py-3.5 ${active ? 'bg-pale/40' : ''}`}>
                  <div className="flex items-start gap-3">
                    <span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${done ? 'bg-teal/10 border-teal/40 text-teal' : active ? 'bg-ocean/10 border-ocean/40 text-ocean' : 'bg-white border-rule text-mist'}`}>
                      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : active && !isGate(s.id) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isGate(s.id) ? <UserCheck className="w-3.5 h-3.5" /> : <Play className="w-3 h-3" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-ink">{s.label}
                        {isGate(s.id) && <span className="ml-2 text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>gate</span>}
                      </p>
                      <p className="text-[11px] text-slate mt-0.5">{s.detail}</p>
                      {s.engine && <p className="text-[10px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{s.engine}</p>}

                      {/* Gate: script checks */}
                      {active && s.id === 'script' && (
                        <div className="mt-3 rounded-lg border border-rule bg-white overflow-hidden">
                          <div className="px-3.5 py-2 border-b border-rule/60 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-ocean" />
                            <p className="text-[11.5px] font-semibold text-ink">Terminology checks — corrections applied before cloning</p>
                          </div>
                          <ul className="divide-y divide-rule/50">
                            {RUN_SCRIPT_CHECKS.filter(c => langs.includes(c.lang)).map(c => (
                              <li key={c.id} className="px-3.5 py-2 text-[12px] text-ink">
                                <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded border mr-2 ${c.action === 'applied' ? 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' : 'bg-teal/10 text-teal border-teal/30'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.action}</span>
                                <span className="font-medium">{c.term}</span> ({c.lang})
                                {c.action === 'applied' && <> → <span className="line-through text-error/70">{c.before}</span> → <span className="font-semibold">{c.after}</span></>}
                                <span className="text-mist text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}> · {c.source}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="px-3.5 py-2.5 border-t border-rule/60">
                            <PrimaryButton onClick={() => clearGate('script')}>Accept corrections & continue</PrimaryButton>
                          </div>
                        </div>
                      )}

                      {/* Gate: consent */}
                      {active && s.id === 'consent' && (
                        <div className="mt-3 rounded-lg border border-rule bg-white p-3.5">
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-[12px] text-ink font-medium">{consent.speaker}</p>
                              <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{consent.doc} · scope: {consent.scope} · valid until {consent.validUntil}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <PrimaryButton onClick={() => clearGate('consent')}>Consent verified — proceed to voice clone</PrimaryButton>
                          </div>
                        </div>
                      )}

                      {/* Gate: human review */}
                      {active && s.id === 'review' && (
                        <div className="mt-3 rounded-lg border border-rule bg-white p-3.5">
                          <p className="text-[12px] text-slate mb-2.5">Native-speaker spot check per track:</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {langs.map(l => (
                              <span key={l} className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-teal/10 text-teal border border-teal/30">
                                <CheckCircle2 className="w-3 h-3" /> {l} — lip-sync and terminology verified
                              </span>
                            ))}
                          </div>
                          <PrimaryButton onClick={() => clearGate('review')}>Approve all tracks for export</PrimaryButton>
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>
      )}

      {step === 'done' && (
        <DubOutput langs={langs} log={log} onComplete={onComplete} />
      )}
    </div>
  )
}

/* ── Output: the sample dubbed video ─────────────────────────────── */

function DubOutput({ langs, log, onComplete }) {
  const [activeLang, setActiveLang] = useState(langs[0])
  const [videoMissing, setVideoMissing] = useState(false)

  const evidence = {
    project: SAMPLE_SOURCE.name,
    tracks: langs,
    pipeline: log,
    consent: CONSENT_RECORDS.find(c => c.id === SAMPLE_SOURCE.consentId),
    note: 'arbitr governed dub — demo evidence trail',
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-ink inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal" /> Dub delivered — {SAMPLE_SOURCE.name.replace('.mp4', '')}
          </p>
          <div className="inline-flex items-center rounded-lg border border-rule overflow-hidden">
            {langs.map(l => (
              <button key={l} onClick={() => setActiveLang(l)} aria-pressed={activeLang === l}
                className={`px-3 py-1.5 text-[11.5px] font-semibold cursor-pointer ${activeLang === l ? 'bg-ocean text-white' : 'text-slate hover:bg-pale'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="p-5">
          {!videoMissing ? (
            <video
              key="sample-dub"
              controls
              className="w-full aspect-video rounded-lg border border-rule bg-midnight"
              src={`${import.meta.env.BASE_URL}sample-dub.mp4`}
              onError={() => setVideoMissing(true)}
              aria-label={`Dubbed sample video — ${activeLang} track`}
            />
          ) : (
            <div className="w-full aspect-video rounded-lg border border-rule bg-midnight flex flex-col items-center justify-center text-center px-8">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-3">
                <Play className="w-6 h-6 text-[#00F0FF] ml-0.5" />
              </div>
              <p className="text-[13px] font-semibold text-white">Sample output — {activeLang} track</p>
              <p className="text-[11px] text-white/60 mt-1 max-w-sm">
                The dubbed sample video plays here. Drop <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>sample-dub.mp4</span> into
                the app's <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>public/</span> folder and it appears automatically.
              </p>
            </div>
          )}
          <p className="text-[10.5px] text-mist mt-2.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {activeLang} track · voice cloned from source speaker · lip-sync engine: LipDub · consent {SAMPLE_SOURCE.consentId} on file
          </p>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <MonoLabel>Deliverables</MonoLabel>
          <div className="mt-2.5 space-y-2">
            <SecondaryButton className="w-full justify-center" onClick={() => downloadText(`captions-${activeLang.toLowerCase()}.srt`, `1\n00:00:00,000 --> 00:00:04,000\n[${activeLang}] To our shareholders and investors — thank you for your continued support.\n\n2\n00:00:04,000 --> 00:00:09,000\n[${activeLang}] Net revenue for the third quarter increased 12.4% year-over-year.`)}>
              <Download className="w-3.5 h-3.5" /> Captions ({activeLang}.srt)
            </SecondaryButton>
            <SecondaryButton className="w-full justify-center" onClick={() => downloadJson('dub-evidence-trail.json', evidence)}>
              <FileCheck2 className="w-3.5 h-3.5" /> Evidence trail (.json)
            </SecondaryButton>
          </div>
        </Card>
        <Card>
          <MonoLabel>Pipeline log</MonoLabel>
          <ul className="mt-2 space-y-1.5">
            {log.map((e, i) => (
              <li key={i} className="text-[11px] text-slate flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-teal shrink-0" />
                <span className="flex-1 truncate">{e.label}</span>
                <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{e.at}</span>
              </li>
            ))}
          </ul>
        </Card>
        <PrimaryButton className="w-full justify-center" onClick={onComplete}>
          Add to projects <ArrowRight className="w-4 h-4" />
        </PrimaryButton>
      </div>
    </div>
  )
}
