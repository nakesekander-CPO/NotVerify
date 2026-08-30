/**
 * SwiftBridge Studio — AI Dubbing, Glossary & custom agents, QA.
 *
 * Dubbing walks the staged pipeline (human gates at script review and
 * approval). The glossary is customer-managed with an approval state
 * for new terms, and the live compliance checker runs the same
 * checkGlossaryCompliance the QA pipeline uses. QA findings are
 * structured (severity / category / location) with reviewer actions.
 *
 * All UI copy routes through the section language switch (i18n.jsx);
 * glossary terms, transcripts, and QA finding data are content, not
 * chrome, and render identically in every language state.
 */

import { useMemo, useState } from 'react'
import {
  Mic, Play, UserCheck, Bot, Hand, CheckCircle2, AlertTriangle, Plus,
  Upload, BookOpen, Sparkles, ShieldCheck, X, MessageSquare,
} from 'lucide-react'
import {
  DUBBING_STAGES, VOICE_OPTIONS, checkGlossaryCompliance, summarizeQa,
} from '../../../services/swiftbridge/swiftbridgeModel'
import { useSBLang, pickLabel, JA_VOICES } from '../../../services/swiftbridge/i18n'
import { Card, MonoLabel } from '../shared'
import { downloadText } from '../../../utils/demoFiles'

/* ── AI Dubbing ──────────────────────────────────────────────── */

export function DubbingStudio({ job }) {
  const { lang, t } = useSBLang()
  const startIdx = DUBBING_STAGES.findIndex(s => s.id === job.stage)
  const [stageIdx, setStageIdx] = useState(startIdx)
  const [playing, setPlaying] = useState(false)
  const [transcript, setTranscript] = useState(job.transcript)
  const [voiceId, setVoiceId] = useState(job.voiceId)
  const stage = DUBBING_STAGES[stageIdx]

  const advance = () => setStageIdx(i => Math.min(DUBBING_STAGES.length - 1, i + 1))
  const voiceMeta = (v) => lang === 'ja' ? { ...v, ...JA_VOICES[v.id] } : v

  return (
    <div className="space-y-4">
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[14px] font-semibold text-ink inline-flex items-center gap-2"><Mic className="w-4 h-4 text-ocean" /> {job.name}</p>
            <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{job.id} · {job.sourceLang} → {job.targetLang} · {Math.floor(job.durationSec / 60)}:{String(job.durationSec % 60).padStart(2, '0')} · {t('dub.poweredBy')}</p>
          </div>
        </div>

        {/* Stage stepper — human gates visibly marked */}
        <div className="px-5 py-3 border-b border-rule flex items-center gap-1.5 flex-wrap">
          {DUBBING_STAGES.map((s, i) => {
            const Icon = s.kind === 'human_review' ? UserCheck : s.kind === 'customer_action' ? Hand : Bot
            const state = i < stageIdx ? 'done' : i === stageIdx ? 'now' : 'todo'
            return (
              <span key={s.id} className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-1 rounded-full border ${
                state === 'now' ? 'bg-ocean text-white border-ocean' : state === 'done' ? 'bg-teal/10 text-teal border-teal/30' : 'bg-white text-mist border-rule'
              }`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {state === 'done' ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                {lang === 'current' ? <>{s.label} {s.labelJa}</> : pickLabel(s, lang)}
              </span>
            )
          })}
        </div>

        <div className="p-5 space-y-4">
          {stage.id === 'script_review' && (
            <>
              <p className="text-[12px] text-[#996800] inline-flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> {t('dub.scriptGate')}</p>
              <div className="rounded-lg border border-rule overflow-hidden">
                {transcript.map((row, i) => (
                  <div key={row.t} className="grid grid-cols-[56px_1fr_1fr] gap-3 px-4 py-3 border-b border-rule/60 last:border-b-0">
                    <span className="text-[11px] text-mist tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{row.t}</span>
                    <p className="text-[12.5px] text-slate leading-relaxed">{row.ja}</p>
                    <textarea
                      value={row.en} rows={2}
                      onChange={e => setTranscript(tr => tr.map((r, j) => j === i ? { ...r, en: e.target.value } : r))}
                      className="text-[12.5px] text-ink border border-rule rounded-md p-2 focus:outline-none focus:border-ocean/50 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
              <button onClick={advance} className="px-4 py-2 rounded-lg bg-ocean text-white text-[12.5px] font-semibold hover:bg-ocean/90 cursor-pointer">{t('dub.approveScript')}</button>
            </>
          )}

          {stage.id === 'voice_selection' && (
            <>
              <MonoLabel>{t('dub.voiceTone')}</MonoLabel>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {VOICE_OPTIONS.map(v => {
                  const vm = voiceMeta(v)
                  return (
                    <button key={v.id} onClick={() => setVoiceId(v.id)}
                      className={`text-left rounded-lg border p-4 cursor-pointer transition-colors ${voiceId === v.id ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
                      <p className="text-[13px] font-semibold text-ink">{v.name} <span className="text-[10px] text-mist font-normal">({v.lang})</span></p>
                      <p className="text-[11px] text-ocean font-medium mt-0.5">{vm.tone}</p>
                      <p className="text-[11px] text-slate mt-1">{vm.desc}</p>
                    </button>
                  )
                })}
              </div>
              <button onClick={advance} disabled={!voiceId} className="px-4 py-2 rounded-lg bg-ocean text-white text-[12.5px] font-semibold hover:bg-ocean/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">{t('dub.generatePreview')}</button>
            </>
          )}

          {stage.id === 'preview' && (
            <>
              <MonoLabel>{t('dub.previewLabel')}</MonoLabel>
              <div className="rounded-lg border border-rule p-4 flex items-center gap-3">
                <button onClick={() => { setPlaying(v => !v) }} className="w-10 h-10 rounded-full bg-ocean text-white flex items-center justify-center cursor-pointer hover:bg-ocean/90" aria-label={playing ? 'Pause preview' : 'Play preview'}>{playing ? <span className="flex gap-[3px]" aria-hidden><span className="w-[3px] h-3.5 bg-white rounded-sm" /><span className="w-[3px] h-3.5 bg-white rounded-sm" /></span> : <Play className="w-4 h-4 ml-0.5" />}</button>
                <div className="flex-1 flex items-end gap-[3px] h-10" aria-hidden>
                  {Array.from({ length: 48 }, (_, i) => (
                    <span key={i} className="flex-1 rounded-sm bg-ocean/40" style={{ height: `${20 + Math.abs(((i * 37) % 60) - 30)}%` }} />
                  ))}
                </div>
                <span className="text-[11px] text-mist tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{playing ? '0:07' : '0:00'} / 3:04 {playing && t('dub.playing')}</span>
              </div>
              <p className="text-[11px] text-slate">{t('dub.voiceLine', { name: VOICE_OPTIONS.find(v => v.id === voiceId)?.name, tone: voiceMeta(VOICE_OPTIONS.find(v => v.id === voiceId) || {}).tone })}</p>
              <button onClick={advance} className="px-4 py-2 rounded-lg bg-ocean text-white text-[12.5px] font-semibold hover:bg-ocean/90 cursor-pointer">{t('dub.sendApproval')}</button>
            </>
          )}

          {stage.id === 'approval' && (
            <>
              <p className="text-[12px] text-[#996800] inline-flex items-center gap-1.5"><UserCheck className="w-3.5 h-3.5" /> {t('dub.finalGate')}</p>
              <button onClick={advance} className="px-4 py-2 rounded-lg bg-teal text-white text-[12.5px] font-semibold hover:bg-teal/90 cursor-pointer inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> {t('dub.approveExport')}</button>
            </>
          )}

          {stage.id === 'export' && (
            <p className="text-[13px] text-teal inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {t('dub.exported', { name: job.name })}</p>
          )}

          {['upload', 'transcript'].includes(stage.id) && (
            <p className="text-[12px] text-slate inline-flex items-center gap-1.5"><Bot className="w-3.5 h-3.5 text-ocean" /> {t('dub.automated')}</p>
          )}
        </div>
      </Card>
    </div>
  )
}

/* ── Glossary & custom agents ────────────────────────────────── */

const STATUS_TONE = {
  approved: 'bg-teal/10 text-teal border-teal/30',
  pending: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40',
  forbidden: 'bg-error/10 text-error border-error/30',
}

const SAMPLE_OUTPUT = 'A goodwill premium of ¥4.2bn was recorded; のれん impairment is under review. We maintain full-year guidance.'

export function GlossaryPanel({ glossary, customAgent }) {
  const { t } = useSBLang()
  const [terms, setTerms] = useState(glossary.terms)
  const [draft, setDraft] = useState({ ja: '', en: '' })
  const [sample, setSample] = useState(SAMPLE_OUTPUT)

  const compliance = useMemo(() => checkGlossaryCompliance(sample, terms).filter(r => r.verdict !== 'not-present'), [sample, terms])

  const approve = (id) => setTerms(ts => ts.map(t2 => t2.id === id ? { ...t2, status: 'approved' } : t2))
  const addTerm = () => {
    if (!draft.ja.trim() || !draft.en.trim()) return
    setTerms(ts => [...ts, { id: `g${Date.now()}`, ja: draft.ja.trim(), en: draft.en.trim(), status: 'pending', note: 'Awaiting approval' }])
    setDraft({ ja: '', en: '' })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-4 items-start">
      {/* Term table */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">{glossary.name}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pale border border-rule text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{glossary.version} · {t('gl.clientSpecific')}</span>
          </div>
          <button onClick={() => downloadText('glossary-import-template.csv', 'ja,en,status,note\nのれん,Goodwill,approved,Never グッドウィル')} className="inline-flex items-center gap-1.5 text-[11px] text-slate border border-rule px-3 py-1.5 rounded-lg hover:bg-pale cursor-pointer"><Upload className="w-3 h-3" /> {t('gl.csvTemplate')}</button>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-pale/50 border-b border-rule text-left">
              {['gl.th.ja', 'gl.th.en', 'gl.th.status', 'gl.th.note'].map(h => (
                <th key={h} className="px-4 py-2 text-[10px] uppercase tracking-wider text-mist font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {terms.map(term => (
              <tr key={term.id} className="border-b border-rule/60 last:border-b-0 hover:bg-pale/30">
                <td className="px-4 py-2 text-ink">{term.ja}</td>
                <td className="px-4 py-2 text-ink">{term.en}</td>
                <td className="px-4 py-2"><span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_TONE[term.status]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t(`term.${term.status}`)}</span></td>
                <td className="px-4 py-2 text-slate">
                  {term.status === 'pending'
                    ? <button onClick={() => approve(term.id)} className="text-[11px] text-ocean hover:text-ocean/80 cursor-pointer font-medium">{t('gl.approveTerm')}</button>
                    : <span className="text-[11px]">{term.note || '—'}</span>}
                </td>
              </tr>
            ))}
            <tr className="bg-pale/30">
              <td className="px-4 py-2"><input value={draft.ja} onChange={e => setDraft(d => ({ ...d, ja: e.target.value }))} placeholder={t('gl.newTermPh')} className="w-full px-2 py-1 rounded border border-rule text-[12px] bg-white" /></td>
              <td className="px-4 py-2"><input value={draft.en} onChange={e => setDraft(d => ({ ...d, en: e.target.value }))} placeholder={t('gl.enRenderPh')} className="w-full px-2 py-1 rounded border border-rule text-[12px] bg-white" /></td>
              <td className="px-4 py-2 text-[10.5px] text-mist" colSpan={2}>
                <button onClick={addTerm} className="inline-flex items-center gap-1 text-[11px] text-ocean hover:text-ocean/80 cursor-pointer font-medium"><Plus className="w-3 h-3" /> {t('gl.add')}</button>
              </td>
            </tr>
          </tbody>
        </table>
      </Card>

      <div className="space-y-4">
        {/* Custom agent */}
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">{t('agent.title')}</p>
          </div>
          <div className="p-5 space-y-2 text-[12px]">
            <p className="text-[13px] font-semibold text-ink">{customAgent.name}</p>
            <p className="text-slate">{t('agent.base')} <span className="text-ocean font-medium">{customAgent.baseAgentId}</span> · {customAgent.baseAgentName} <span className="text-mist">{t('agent.marketplace')}</span></p>
            <p className="text-slate">{t('agent.glossaryLabel')} <span className="text-ink font-medium">{glossary.name} {glossary.version}</span></p>
            <div>
              <MonoLabel>{t('agent.styleRules')}</MonoLabel>
              <ul className="mt-1 space-y-1">
                {customAgent.styleRules.map(r => <li key={r} className="flex items-start gap-1.5 text-slate"><CheckCircle2 className="w-3 h-3 text-teal mt-0.5 shrink-0" />{r}</li>)}
              </ul>
            </div>
            <p className="text-[11px] text-mist pt-1 border-t border-rule/60">{t('agent.validationLabel')}<span className="text-teal font-medium">{t('agent.enabled')}</span>{t('agent.validationRest')}</p>
          </div>
        </Card>

        {/* Live compliance check */}
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal" />
            <p className="text-[13px] font-semibold text-ink">{t('live.title')}</p>
          </div>
          <div className="p-5 space-y-3">
            <textarea value={sample} onChange={e => setSample(e.target.value)} rows={3}
              className="w-full text-[12px] border border-rule rounded-md p-2.5 focus:outline-none focus:border-ocean/50 leading-relaxed" />
            <ul className="space-y-1.5">
              {compliance.map(({ term, verdict }) => (
                <li key={term.id} className="flex items-center gap-2 text-[12px]">
                  {verdict === 'pass'
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-teal shrink-0" />
                    : verdict === 'violation'
                      ? <X className="w-3.5 h-3.5 text-error shrink-0" />
                      : <AlertTriangle className="w-3.5 h-3.5 text-[#996800] shrink-0" />}
                  <span className="text-ink">{term.ja} → {term.en}</span>
                  <span className={`ml-auto text-[10px] uppercase tracking-wider ${verdict === 'pass' ? 'text-teal' : verdict === 'violation' ? 'text-error' : 'text-[#996800]'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {t(`verdict.${verdict}`)}
                  </span>
                </li>
              ))}
              {compliance.length === 0 && <li className="text-[12px] text-mist">{t('live.none')}</li>}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}

/* ── QA & validation ─────────────────────────────────────────── */

const SEV_TONE = {
  critical: 'bg-error/10 text-error border-error/30',
  major: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40',
  minor: 'bg-pale text-slate border-rule',
}

export function QAPanel({ results: initial, projects }) {
  const { t } = useSBLang()
  const [results, setResults] = useState(initial)
  const [commentFor, setCommentFor] = useState(null)
  const [comment, setComment] = useState('')
  const s = summarizeQa(results)
  const project = projects.find(p => p.id === results[0]?.projectId)

  const resolve = (id, resolution, note) =>
    setResults(rs => rs.map(r => r.id === id ? { ...r, resolution, comment: note ?? r.comment } : r))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[13px] font-semibold text-ink mr-2">{t('qa.results', { name: project?.name })}</p>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${SEV_TONE.critical}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('qa.critical', { n: s.critical })}</span>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${SEV_TONE.major}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('qa.major', { n: s.major })}</span>
        <span className={`text-[10.5px] px-2 py-0.5 rounded-full border ${SEV_TONE.minor}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('qa.minor', { n: s.minor })}</span>
        <span className="text-[10.5px] text-mist ml-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('qa.openLine', { n: s.open })}</span>
      </div>

      <Card padding="p-0">
        <ul className="divide-y divide-rule">
          {results.map(r => (
            <li key={r.id} className="px-5 py-3.5">
              <div className="flex items-start gap-3">
                <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${SEV_TONE[r.severity]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t(`sev.${r.severity}`)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-ink">{r.description}</p>
                  <p className="text-[10.5px] text-mist mt-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{r.category} · {r.location}</p>
                  {r.comment && <p className="text-[11.5px] text-slate mt-1 inline-flex items-center gap-1.5"><MessageSquare className="w-3 h-3 text-mist" /> {r.comment}</p>}
                  {commentFor === r.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <input value={comment} onChange={e => setComment(e.target.value)} placeholder={t('qa.commentPh')}
                        className="flex-1 px-2.5 py-1.5 rounded-md border border-rule text-[11.5px] bg-white" />
                      <button onClick={() => { resolve(r.id, r.resolution, comment); setCommentFor(null); setComment('') }}
                        className="px-3 py-1.5 rounded-md bg-ink text-white text-[11px] font-semibold cursor-pointer">{t('qa.save')}</button>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {r.resolution === 'open' ? (
                    <>
                      <button onClick={() => resolve(r.id, 'approved')} className="px-2.5 py-1 rounded-md bg-teal text-white text-[11px] font-semibold hover:bg-teal/90 cursor-pointer">{t('qa.approveFix')}</button>
                      <button onClick={() => resolve(r.id, 'rejected')} className="px-2.5 py-1 rounded-md border border-rule text-[11px] text-slate hover:bg-pale cursor-pointer">{t('qa.reject')}</button>
                      <button onClick={() => setCommentFor(commentFor === r.id ? null : r.id)} aria-label="Comment" className="p-1.5 rounded-md border border-rule text-slate hover:bg-pale cursor-pointer"><MessageSquare className="w-3.5 h-3.5" /></button>
                    </>
                  ) : (
                    <span className={`text-[10.5px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${r.resolution === 'approved' ? 'bg-teal/10 text-teal border-teal/30' : 'bg-error/10 text-error border-error/30'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t(`res.${r.resolution}`)}</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
