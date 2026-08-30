/**
 * SwiftBridge — New project wizard + workflow visualization.
 *
 * The wizard creates a project with an SLA derived from the document
 * type and a workflow built by the shared template (human gates
 * included by construction). The timeline renders every step with an
 * explicit agent / human-review / customer-action identity, live
 * status, the arbitr agent powering automated steps, retry on blocked
 * steps, note-gated ops override, and a deep link from human-review
 * steps into the real arbitr Review Workspace.
 *
 * All UI copy routes through the section language switch (i18n.jsx):
 * 'current' preserves the original mixed bilingual rendering.
 */

import { useMemo, useState } from 'react'
import {
  Upload, FileText, Bot, UserCheck, Hand, Clock, AlertTriangle,
  RefreshCw, CheckCircle2, ChevronRight, ArrowRight, Wrench,
} from 'lucide-react'
import {
  DOC_TYPES, SERVICE_TYPES, slaFor, slaCountdown, slaWithPrep,
  retryStep, overrideStep, marshallScan, PREP_CHOICES,
} from '../../../services/swiftbridge/swiftbridgeModel'
import {
  useSBLang, pickLabel, stepName, ownerLabel, fmtDateTime, fmtTime, JA_SERVICE_LABELS,
} from '../../../services/swiftbridge/i18n'
import { Card, MonoLabel } from '../shared'
import { SlaChip } from './index'
import { MarshallScan, SageChoice, TermEvidencePanel } from './FileMarshall'

/* ── New project wizard ──────────────────────────────────────── */

const SAMPLE_FILES = [
  { name: '2Q_tanshin_2026.pdf', size: '1.4 MB', docType: 'timely-disclosure' },
  { name: 'shihanki_hokoku_2Q.pdf', size: '2.2 MB', docType: 'quarterly-report' },
  { name: 'kessan_setsumei_2Q.pptx', size: '21.7 MB', docType: 'powerpoint' },
  { name: 'yukashoken_FY2026.pdf', size: '6.4 MB', docType: 'annual-securities' },
  { name: 'CEO_message_2Q.mp4', size: '412 MB', docType: 'media-dubbing' },
]

export function NewProjectWizard({ onCreate }) {
  const { lang, t } = useSBLang()
  // Standard path: 0 upload · 1 type · 2 services · 3 confirm
  // PPTX path:     0 upload · 'scan' File Marshall · 'sage' prep choice · 3 confirm
  const [stage, setStage] = useState(0)
  const [file, setFile] = useState(null)
  const [docType, setDocType] = useState(null)
  const [services, setServices] = useState(['translation', 'qa'])
  const [scan, setScan] = useState(null)
  const [prepChoice, setPrepChoice] = useState(null)

  const isPptx = Boolean(file?.name?.toLowerCase().endsWith('.pptx'))
  const sla = docType ? slaWithPrep(docType, isPptx ? prepChoice : null) : null
  const dueAt = sla ? new Date(Date.now() + sla.hours * 3600_000) : null

  const toggleService = (id) =>
    setServices(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const pickFile = (f) => {
    setFile(f)
    setDocType(f.docType)
    if (f.name.toLowerCase().endsWith('.pptx')) {
      // Decks route through File Marshall before anything else
      setServices(['translation', 'dtp', 'qa', 'glossary'])
      setScan(marshallScan(f.name))
      setStage('scan')
    } else {
      setStage(1)
    }
  }

  const stages = isPptx
    ? [[0, t('wiz.stage.upload')], ['scan', t('wiz.stage.scan')], ['sage', t('wiz.stage.sage')], [3, t('wiz.stage.confirm')]]
    : [[0, t('wiz.stage.upload')], [1, t('wiz.stage.docType')], [2, t('wiz.stage.services')], [3, t('wiz.stage.confirm')]]
  const stageIdx = stages.findIndex(([id]) => id === stage)

  const slaText = (s) => lang === 'ja' ? s.labelJa : s.label

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-2 flex-wrap">
        {stages.map(([id, s], i) => (
          <span key={s} className={`text-[11px] px-2.5 py-1 rounded-full border ${i === stageIdx ? 'bg-ocean text-white border-ocean' : i < stageIdx ? 'bg-teal/10 text-teal border-teal/30' : 'bg-white text-mist border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {i + 1}. {s}
          </span>
        ))}
      </div>

      {stage === 0 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">{t('wiz.uploadTitle')}</p></div>
          <div className="p-5">
            <div className="rounded-xl border-2 border-dashed border-rule bg-pale/30 p-8 text-center mb-4">
              <Upload className="w-6 h-6 text-mist mx-auto mb-2" />
              <p className="text-[13px] text-ink">{t('wiz.dropHint')}</p>
              <p className="text-[11px] text-mist mt-0.5">{t('wiz.dropTypes')}</p>
            </div>
            <MonoLabel>{t('wiz.samplePick')}</MonoLabel>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {SAMPLE_FILES.map(f => (
                <button key={f.name} onClick={() => pickFile(f)}
                  className={`text-left rounded-lg border px-3 py-2.5 cursor-pointer flex items-center gap-2.5 transition-colors ${file?.name === f.name ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
                  <FileText className="w-4 h-4 text-ocean shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12.5px] text-ink truncate">{f.name}</span>
                    <span className="block text-[10.5px] text-mist">{f.size}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>
      )}

      {stage === 'scan' && scan && (
        <MarshallScan scan={scan} onContinue={() => setStage('sage')} />
      )}

      {stage === 'sage' && scan && (
        <SageChoice scan={scan} choice={prepChoice} onChoose={setPrepChoice} onContinue={() => setStage(3)} />
      )}

      {stage === 1 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">{t('wiz.docTypeTitle')}</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {DOC_TYPES.map(d => {
              const s = slaFor(d.id)
              const active = docType === d.id
              return (
                <button key={d.id} onClick={() => setDocType(d.id)}
                  className={`text-left rounded-lg border p-4 cursor-pointer transition-colors ${active ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
                  <p className="text-[13px] font-semibold text-ink">{pickLabel(d, lang)}</p>
                  {lang === 'current' && <p className="text-[11px] text-mist">{d.labelJa}</p>}
                  <p className="text-[11px] mt-2 inline-flex items-center gap-1 text-ocean font-medium"><Clock className="w-3 h-3" /> {lang === 'current' ? `${s.label} · ${s.labelJa}` : slaText(s)}</p>
                </button>
              )
            })}
          </div>
          <WizardNav onBack={() => setStage(0)} onNext={() => setStage(2)} nextDisabled={!docType} />
        </Card>
      )}

      {stage === 2 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">{t('wiz.servicesTitle')}</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-5">
            {SERVICE_TYPES.map(s => {
              const on = services.includes(s.id)
              return (
                <button key={s.id} onClick={() => toggleService(s.id)}
                  className={`text-left rounded-lg border p-3.5 cursor-pointer transition-colors flex items-center gap-3 ${on ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-ocean border-ocean' : 'border-rule-strong'}`}>
                    {on && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-medium text-ink">{pickLabel(s, lang, JA_SERVICE_LABELS[s.id])}</span>
                    {lang === 'current' && <span className="block text-[10.5px] text-mist">{s.labelJa}</span>}
                  </span>
                </button>
              )
            })}
          </div>
          <WizardNav onBack={() => setStage(1)} onNext={() => setStage(3)} nextDisabled={services.length === 0} />
        </Card>
      )}

      {stage === 3 && (
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule"><p className="text-[13px] font-semibold text-ink">{t('wiz.confirmTitle')}</p></div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-[12.5px]">
            <Row k={t('row.file')} v={`${file?.name} · ${file?.size}`} />
            <Row k={t('row.docType')} v={lang === 'current'
              ? `${DOC_TYPES.find(d => d.id === docType)?.label}（${DOC_TYPES.find(d => d.id === docType)?.labelJa}）`
              : pickLabel(DOC_TYPES.find(d => d.id === docType), lang)} />
            <Row k={t('row.services')} v={services.map(id => pickLabel(SERVICE_TYPES.find(s => s.id === id), lang, JA_SERVICE_LABELS[id])).join(' · ')} />
            <Row k={t('row.langPair')} v="JA → EN" />
            {isPptx && prepChoice && (
              <Row k={t('row.sourcePrep')} v={prepChoice === 'self_fix' ? t('row.prep.self') : t('row.prep.dtp')} />
            )}
            <Row k={t('row.delivery')} v={`${lang === 'current' ? `${sla.label}（${sla.labelJa}）` : slaText(sla)}${isPptx && prepChoice ? ` — ${lang === 'ja' ? t(`prep.${prepChoice === 'self_fix' ? 'self' : 'dtp'}.note`) : PREP_CHOICES[prepChoice].note}` : ''}`} accent />
            <Row k={t('row.eta')} v={fmtDateTime(dueAt, lang)} accent />
          </div>
          <div className="px-5 pb-5 flex items-center justify-between">
            <button onClick={() => setStage(isPptx ? 'sage' : 2)} className="px-3 py-2 rounded-lg border border-rule text-[12px] text-slate hover:bg-pale cursor-pointer">{t('wiz.back')}</button>
            <button onClick={() => onCreate({ fileName: file.name, fileSize: file.size, docType, services, prepChoice: isPptx ? prepChoice : null, marshall: isPptx ? scan : null })}
              className="px-5 py-2.5 rounded-lg bg-ocean text-white text-[13px] font-semibold hover:bg-ocean/90 cursor-pointer inline-flex items-center gap-2">
              {t('wiz.submit')} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </Card>
      )}
    </div>
  )
}

function WizardNav({ onBack, onNext, nextDisabled }) {
  const { t } = useSBLang()
  return (
    <div className="px-5 pb-5 flex items-center justify-between">
      <button onClick={onBack} className="px-3 py-2 rounded-lg border border-rule text-[12px] text-slate hover:bg-pale cursor-pointer">{t('wiz.back')}</button>
      <button onClick={onNext} disabled={nextDisabled}
        className="px-4 py-2 rounded-lg bg-ocean text-white text-[12.5px] font-semibold hover:bg-ocean/90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
        {t('wiz.next')}
      </button>
    </div>
  )
}

function Row({ k, v, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 border-b border-rule/60">
      <span className="text-mist text-[10.5px] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{k}</span>
      <span className={accent ? 'text-ocean font-semibold' : 'text-ink'}>{v}</span>
    </div>
  )
}

/* ── Workflow timeline ───────────────────────────────────────── */

const KIND_META = {
  agent:           { icon: Bot,       tone: 'bg-ocean/10 text-ocean border-ocean/25' },
  human_review:    { icon: UserCheck, tone: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' },
  customer_action: { icon: Hand,      tone: 'bg-violet-50 text-violet-700 border-violet-200' },
}

const STATUS_TONE = {
  pending:      'bg-pale text-mist border-rule',
  in_progress:  'bg-ocean/10 text-ocean border-ocean/25',
  completed:    'bg-teal/10 text-teal border-teal/30',
  blocked:      'bg-error/10 text-error border-error/30',
  needs_review: 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40',
}

export function WorkflowTimeline({ projects, project, onSelect, onUpdateSteps, onOpenReview }) {
  const { lang, t } = useSBLang()
  const [overrideFor, setOverrideFor] = useState(null)
  const [overrideNote, setOverrideNote] = useState('')
  const [showEvidence, setShowEvidence] = useState(false)
  const c = useMemo(() => slaCountdown(project), [project])

  const doRetry = (stepId) => {
    onUpdateSteps(project.id, retryStep(project.steps, stepId), { type: 'swiftbridge.step.retried', reason: stepId })
  }
  const doOverride = (stepId) => {
    if (!overrideNote.trim()) return
    onUpdateSteps(project.id, overrideStep(project.steps, stepId, { note: overrideNote, actor: 'ops@swiftbridge' }), { type: 'swiftbridge.step.overridden', reason: overrideNote })
    setOverrideFor(null); setOverrideNote('')
  }

  return (
    <div className="space-y-4">
      {/* Project selector + SLA banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <select value={project.id} onChange={e => onSelect(e.target.value)}
          className="px-3 py-2 rounded-lg border border-rule bg-white text-[12.5px] text-ink cursor-pointer">
          {projects.map(p => <option key={p.id} value={p.id}>{p.id} · {p.name}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {lang === 'current' ? `${project.slaLabel} · ${project.slaLabelJa}` : lang === 'ja' ? project.slaLabelJa : project.slaLabel}
          </span>
          <SlaChip project={project} countdown={c} />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap text-[10.5px]">
        {Object.entries(KIND_META).map(([kind, k]) => {
          const Icon = k.icon
          return <span key={kind} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${k.tone}`}><Icon className="w-3 h-3" />{t(`kind.${kind}`)}</span>
        })}
        <span className="text-mist ml-auto" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('legend.agents')}</span>
      </div>

      {/* Timeline */}
      <Card padding="p-0">
        <ul className="divide-y divide-rule">
          {project.steps.map((s, i) => {
            const kind = KIND_META[s.kind]
            const KindIcon = kind.icon
            return (
              <li key={s.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${kind.tone}`}>
                    {s.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : <KindIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] text-mist tabular-nums" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-[13px] font-medium text-ink">
                        {stepName(s, lang)}
                        {lang === 'current' && <span className="text-mist font-normal"> · {s.nameJa}</span>}
                      </p>
                      <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${STATUS_TONE[s.status]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t(`status.${s.status}`)}</span>
                      {s.overridden && <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border bg-violet-50 text-violet-700 border-violet-200" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t('step.opsOverride')}</span>}
                    </div>
                    <p className="text-[11px] text-slate mt-0.5">
                      {s.agentId
                        ? <>{t('step.poweredByPrefix')}<span className="font-medium text-ocean">{s.agentId}</span> · {s.agentName} <span className="text-mist">{t('step.arbitrSuffix')}</span></>
                        : <>{t('step.owner', { o: ownerLabel(s.owner, lang) })}</>}
                      {s.completedAt && <span className="text-mist">{t('step.done', { t: fmtTime(s.completedAt, lang) })}</span>}
                      {s.retryCount > 0 && <span className="text-[#996800]">{s.retryCount === 1 && lang !== 'ja' ? t('step.retryOne') : t('step.retryMany', { n: s.retryCount })}</span>}
                    </p>
                    {s.notes && <p className="text-[11px] text-[#996800] mt-1 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 shrink-0" /> {s.notes}</p>}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-1.5">
                      {s.status === 'blocked' && (
                        <>
                          <button onClick={() => doRetry(s.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-ocean text-white text-[11px] font-semibold hover:bg-ocean/90 cursor-pointer">
                            <RefreshCw className="w-3 h-3" /> {t('btn.retry')}
                          </button>
                          <button onClick={() => setOverrideFor(overrideFor === s.id ? null : s.id)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-rule text-[11px] text-slate hover:bg-pale cursor-pointer">
                            <Wrench className="w-3 h-3" /> {t('btn.opsOverride')}
                          </button>
                        </>
                      )}
                      {s.kind === 'human_review' && s.status !== 'completed' && (
                        <button onClick={onOpenReview} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#FFB000]/40 bg-[#FFF7E6] text-[#996800] text-[11px] font-semibold hover:bg-[#FFEFD1] cursor-pointer">
                          {t('btn.openReview')} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                      {s.key === 'glossary-match' && s.status === 'completed' && project.termEvidence && (
                        <button onClick={() => setShowEvidence(v => !v)} aria-expanded={showEvidence}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-ocean/30 bg-ocean/5 text-ocean text-[11px] font-semibold hover:bg-ocean/10 cursor-pointer">
                          {showEvidence ? t('btn.hideEvidence') : t('btn.showEvidence')}
                          <ChevronRight className={`w-3 h-3 transition-transform ${showEvidence ? 'rotate-90' : ''}`} />
                        </button>
                      )}
                    </div>
                    {s.key === 'glossary-match' && s.status === 'completed' && project.termEvidence && showEvidence && (
                      <TermEvidencePanel evidence={project.termEvidence} />
                    )}
                    {overrideFor === s.id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input value={overrideNote} onChange={e => setOverrideNote(e.target.value)} placeholder={t('override.placeholder')}
                          className="flex-1 px-2.5 py-1.5 rounded-md border border-rule text-[11.5px] bg-white" />
                        <button onClick={() => doOverride(s.id)} disabled={!overrideNote.trim()}
                          className="px-3 py-1.5 rounded-md bg-ink text-white text-[11px] font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                          {t('btn.apply')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}
