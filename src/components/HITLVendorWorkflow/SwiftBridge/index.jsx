/**
 * SwiftBridge AI V2 — Japan relaunch experience.
 *
 * SwiftBridge is the customer-facing brand; the orchestration engine
 * underneath is arbitr (アビタAI). This shell hosts the tabbed
 * sub-product: Dashboard · New project · Workflow · AI Dubbing ·
 * Glossary & Agents · QA · Delivery. Automated workflow steps run on
 * real arbitr marketplace agents, human-review steps deep-link into
 * the existing HITL Review Workspace, and actions write to the
 * shared audit log.
 *
 * The header carries a section-scoped language toggle (Current / EN /
 * 日本語 — see services/swiftbridge/i18n.jsx). "Current" preserves the
 * pre-toggle mixed bilingual UI verbatim as the localisation "before"
 * state; EN and JA are the clean single-language states.
 */

import { useMemo, useState } from 'react'
import {
  LayoutDashboard, FilePlus2, Workflow as WorkflowIcon, Mic, BookOpen,
  Stethoscope, PackageCheck, Clock, AlertTriangle, CheckCircle2,
  Languages, Sparkles, Bird, Landmark, Eye, Star, Download, ChevronRight,
} from 'lucide-react'
import {
  getSwiftBridgeDemo, slaCountdown, slaWithPrep, buildWorkflow, buildTermEvidence,
} from '../../../services/swiftbridge/swiftbridgeModel'
import {
  SBLangProvider, useSBLang, LangToggle, JA_TAB_LABELS, JA_V2_FEATURES, fmtDateTime,
} from '../../../services/swiftbridge/i18n'
import { appendAuditEvent } from '../../../services/hitl/auditLog'
import { downloadText } from '../../../utils/demoFiles'
import { SectionHeading, Card, MonoLabel, StatusBadge } from '../shared'
import { Tabs } from '../../ui'
import { NewProjectWizard, WorkflowTimeline } from './ProjectWorkflow'
import { DubbingStudio, GlossaryPanel, QAPanel } from './Studio'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', labelJa: 'ダッシュボード', icon: LayoutDashboard },
  { id: 'new',       label: 'New project', labelJa: '新規案件', icon: FilePlus2 },
  { id: 'workflow',  label: 'Workflow', labelJa: 'ワークフロー', icon: WorkflowIcon },
  { id: 'dubbing',   label: 'AI Dubbing', labelJa: 'AI吹替', icon: Mic },
  { id: 'glossary',  label: 'Glossary & Agents', labelJa: '用語集', icon: BookOpen },
  { id: 'qa',        label: 'QA & Validation', labelJa: 'QA・検証', icon: Stethoscope },
  { id: 'delivery',  label: 'Delivery', labelJa: '納品', icon: PackageCheck },
]

const MASCOTS = [
  { id: 'kakehashi', name: 'Kakehashi', nameJa: '架け橋', icon: Landmark, tone: 'from-[#2B0FAF] to-[#3D16FA]', desc: 'The bridge keeper — calm, dependable, guides customers across the workflow.' },
  { id: 'tsuru',     name: 'Tsuru',     nameJa: '鶴',     icon: Bird,     tone: 'from-teal-600 to-emerald-400', desc: 'The origami crane — precision and craft; folds complexity into clean delivery.' },
  { id: 'fukuro',    name: 'Fukurō',   nameJa: '梟',     icon: Eye,      tone: 'from-slate-600 to-slate-400', desc: 'The night owl — vigilant QA; nothing ships unseen.' },
]

const V2_EVOLUTION = [
  'Reliability & execution stability',
  'Scalable AI workflow automation',
  'AI Dubbing',
  'Customer-managed glossary & custom agents',
  'Transparent workflows with human review',
]

export default function SwiftBridge(props) {
  return (
    <SBLangProvider>
      <SwiftBridgeShell {...props} />
    </SBLangProvider>
  )
}

function SwiftBridgeShell({ currentUserId, navigate, onBack }) {
  const { lang, t } = useSBLang()
  const demo = useMemo(() => getSwiftBridgeDemo(), [])
  const [projects, setProjects] = useState(demo.projects)
  const [tab, setTab] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(demo.projects[0].id)
  const [mascot] = useState('tsuru') // Tsuru kept for the Delivery empty state

  const selected = projects.find(p => p.id === selectedId) || projects[0]

  // Tab labels per language state: current keeps the two-line gloss,
  // en drops the JA sub-line, ja is single-line Japanese (AI Dubbing
  // stays English per the keep-English list).
  const tabs = useMemo(() => TABS.map(({ id, label, labelJa, icon }) => (
    lang === 'current' ? { id, label, labelJa, icon }
      : lang === 'ja' ? { id, label: JA_TAB_LABELS[id] ?? labelJa, icon }
        : { id, label, icon }
  )), [lang])

  const audit = (eventType, projectId, reason) => {
    try {
      appendAuditEvent({ actorId: currentUserId || 'demo-user', actorRole: 'swiftbridge', eventType, projectId, reason, sessionMeta: { surface: 'swiftbridge-v2' } })
    } catch { /* best-effort in prototype */ }
  }

  const createProject = ({ fileName, fileSize, docType, services, prepChoice = null, marshall = null }) => {
    const sla = slaWithPrep(docType, prepChoice)
    // First pending step goes live (Marshall-path scans arrive already completed)
    let started = false
    const steps = buildWorkflow(docType, services, { prepChoice }).map(s => {
      if (!started && s.status === 'pending') { started = true; return { ...s, status: 'in_progress', startedAt: new Date().toISOString() } }
      return s
    })
    const p = {
      id: `SB-2026-${Math.floor(Math.random() * 900) + 100}`,
      name: fileName.replace(/\.[a-z]+$/i, ''), nameJa: null,
      docType, services, langPair: 'JA → EN',
      slaHours: sla.hours, slaLabel: sla.label, slaLabelJa: sla.labelJa,
      createdAt: new Date().toISOString(), deliveredAt: null,
      status: 'in_progress',
      steps,
      files: [{ name: fileName, size: fileSize }],
      ...(prepChoice ? { prepChoice, marshall, termEvidence: buildTermEvidence(demo.glossary) } : {}),
    }
    setProjects(ps => [p, ...ps])
    setSelectedId(p.id)
    setTab('workflow')
    audit('swiftbridge.project.created', p.id, `${docType} · ${sla.label}`)
    if (marshall) audit('swiftbridge.marshall.scan', p.id, `${marshall.slides} slides · ${marshall.issues.length} issues`)
    if (prepChoice) audit('swiftbridge.prep.choice', p.id, prepChoice === 'self_fix' ? 'Customer self-fix · 72h clock on re-upload' : 'DTP pre-flight · 96h commitment')
  }

  const updateSteps = (projectId, steps, note) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, steps, status: steps.some(s => s.status === 'blocked') ? 'blocked' : p.status === 'delivered' ? 'delivered' : 'in_progress' } : p))
    if (note) audit(note.type, projectId, note.reason)
  }

  return (
    <div className="space-y-5">
      {/* ── Brand header ─────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-rule bg-gradient-to-r from-[#0D092A] via-[#1A1640] to-[#3D16FA] text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <Languages className="w-5 h-5" />
              <h2 className="text-[20px] font-bold tracking-tight">SwiftBridge AI</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30">V2</span>
            </div>
            <p className="text-[12px] text-white/80 mt-1">{t('header.tagline')}</p>
          </div>
          <div className="flex items-center gap-4">
            <LangToggle />
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">{t('header.poweredBy')}</p>
              <p className="text-[13px] font-semibold">
                {lang === 'current'
                  ? <>arbitr <span className="text-white/70">·</span> アビタAI</>
                  : t('header.platformLockup')}
              </p>
            </div>
            {onBack && (
              <button onClick={onBack} aria-label="Go back"
                className="px-3 py-2 rounded-lg border border-white/25 text-[12.5px] font-medium text-white/85 hover:bg-white/10 cursor-pointer">
                {t('header.back')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <Tabs ariaLabel="SwiftBridge sections" tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'dashboard' && (
        <Dashboard projects={projects}
          onOpen={(id) => { setSelectedId(id); setTab('workflow') }}
          onNew={() => setTab('new')} />
      )}
      {tab === 'new' && <NewProjectWizard onCreate={createProject} />}
      {tab === 'workflow' && (
        <WorkflowTimeline
          projects={projects} project={selected} onSelect={setSelectedId}
          onUpdateSteps={updateSteps}
          onOpenReview={() => navigate?.('workspace')}
        />
      )}
      {tab === 'dubbing' && <DubbingStudio job={demo.dubbingJob} />}
      {tab === 'glossary' && <GlossaryPanel glossary={demo.glossary} customAgent={demo.customAgent} />}
      {tab === 'qa' && <QAPanel results={demo.qaResults} projects={projects} />}
      {tab === 'delivery' && <DeliveryPanel projects={projects} mascot={MASCOTS.find(m => m.id === mascot)} />}

      {/* ── Legal footer (placeholder copy per brief) ────────── */}
      <footer className="pt-2 border-t border-rule flex items-center justify-between text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <span>{t('footer.copyright')}</span>
        <span className="flex gap-4">
          <button onClick={() => downloadText('swiftbridge-terms.txt', 'SwiftBridge 利用規約 / Terms of Service — placeholder legal copy.')} className="hover:text-slate cursor-pointer underline underline-offset-2">{t('footer.terms')}</button>
          <button onClick={() => downloadText('swiftbridge-privacy.txt', 'SwiftBridge プライバシーポリシー / Privacy Policy — placeholder legal copy.')} className="hover:text-slate cursor-pointer underline underline-offset-2">{t('footer.privacy')}</button>
        </span>
      </footer>
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────── */

function Dashboard({ projects, onOpen, onNew }) {
  const { lang, t } = useSBLang()
  const active = projects.filter(p => p.status !== 'delivered')
  const delivered = projects.filter(p => p.status === 'delivered')
  const pendingReviews = projects.flatMap(p => p.steps.filter(s => (s.kind === 'human_review' || s.kind === 'customer_action') && ['in_progress', 'needs_review'].includes(s.status)))
  const blocked = projects.filter(p => p.status === 'blocked')
  const nextDue = active.map(p => ({ p, c: slaCountdown(p) })).sort((a, b) => a.c.dueAt - b.c.dueAt)[0]

  const v2Features = lang === 'ja' ? JA_V2_FEATURES : V2_EVOLUTION
  const slaText = (p) => lang === 'ja' ? p.slaLabelJa : p.slaLabel

  return (
    <div className="space-y-5">
      <SectionHeading
        title={t('dash.title')}
        subtitle={t('dash.subtitle')}
        actions={<button onClick={onNew} className="px-4 py-2 rounded-lg bg-ocean text-white text-[13px] font-semibold hover:bg-ocean/90 cursor-pointer">{t('dash.newProject')}</button>}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label={t('stat.active')} value={active.length} sub={blocked.length ? t('stat.active.subBlocked', { n: blocked.length }) : t('stat.active.subOk')} tone={blocked.length ? 'amber' : 'ok'} />
        <Stat label={t('stat.nextSla')} value={nextDue ? `${nextDue.c.remainingHours}h` : '—'} sub={nextDue ? `${nextDue.p.name} · ${slaText(nextDue.p)}` : t('stat.nextSla.subNone')} tone={nextDue && nextDue.c.remainingHours < 6 ? 'amber' : 'ok'} />
        <Stat label={t('stat.pending')} value={pendingReviews.length} sub={t('stat.pending.sub')} tone={pendingReviews.length ? 'info' : 'ok'} />
        <Stat label={t('stat.delivered')} value={delivered.length} sub={t('stat.delivered.sub')} tone="ok" />
      </div>

      {/* V2 evolution strip */}
      <Card padding="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ocean shrink-0">
            <Sparkles className="w-3.5 h-3.5" /> {t('v2.newIn')}
          </span>
          {v2Features.map(f => (
            <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-pale text-ink border border-rule">{f}</span>
          ))}
        </div>
      </Card>

      {/* Project list */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">{t('projects.header')}</p>
          <MonoLabel>{t('projects.slaTracked')}</MonoLabel>
        </div>
        <ul className="divide-y divide-rule">
          {projects.map(p => {
            const c = slaCountdown(p)
            return (
              <li key={p.id}>
                <button onClick={() => onOpen(p.id)} className="w-full text-left px-5 py-3 hover:bg-pale/40 cursor-pointer grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink truncate">{p.name}{p.nameJa && <span className="text-mist font-normal"> · {p.nameJa}</span>}</p>
                    <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.id} · {p.langPair} · {p.files[0]?.name}</p>
                  </div>
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-ocean/10 text-ocean border border-ocean/20 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{slaText(p)}</span>
                  <SlaChip project={p} countdown={c} />
                  <StatusBadge status={p.status === 'delivered' ? 'signed-off' : p.status === 'blocked' ? 'needs-rework' : 'in-progress'}>
                    {p.status === 'delivered' ? t('badge.delivered') : p.status === 'blocked' ? t('badge.blocked') : t('badge.inProgress')}
                  </StatusBadge>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

    </div>
  )
}

function Stat({ label, value, sub, tone }) {
  const tones = { ok: 'text-teal', amber: 'text-[#996800]', info: 'text-ocean' }
  return (
    <Card padding="p-4">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className="text-[26px] font-bold text-ink mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className={`text-[11px] mt-0.5 ${tones[tone] || 'text-slate'}`}>{sub}</p>
    </Card>
  )
}

export function SlaChip({ project, countdown }) {
  const { t } = useSBLang()
  const c = countdown || slaCountdown(project)
  if (c.delivered) {
    return <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${c.met ? 'bg-teal/10 text-teal border-teal/30' : 'bg-error/10 text-error border-error/30'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <CheckCircle2 className="w-3 h-3" /> {c.met ? t('sla.met') : t('sla.missed')}
    </span>
  }
  if (c.breached) {
    return <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/30 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}><AlertTriangle className="w-3 h-3" /> {t('sla.breached')}</span>
  }
  const low = c.remainingHours <= 6
  return <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${low ? 'bg-[#FFF7E6] text-[#996800] border-[#FFB000]/40' : 'bg-pale text-slate border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
    <Clock className="w-3 h-3" /> {t('sla.left', { h: c.remainingHours })}
  </span>
}

/* ── Delivery ────────────────────────────────────────────────── */

function DeliveryPanel({ projects, mascot }) {
  const { lang, t } = useSBLang()
  const delivered = projects.filter(p => p.status === 'delivered')
  const [stars, setStars] = useState(0)
  const MascotIcon = mascot?.icon || Bird
  const mascotName = lang === 'ja' ? (mascot?.nameJa || mascot?.name) : mascot?.name

  if (delivered.length === 0) {
    return (
      <Card padding="p-10">
        <div className="text-center max-w-sm mx-auto">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${mascot?.tone || 'from-teal-600 to-emerald-400'} flex items-center justify-center mx-auto mb-3`}>
            <MascotIcon className="w-7 h-7 text-white" />
          </div>
          <p className="text-[14px] font-semibold text-ink">{t('delivery.emptyTitle', { name: mascotName })}</p>
          <p className="text-[12px] text-slate mt-1">{t('delivery.emptyBody')}</p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {delivered.map(p => {
        const c = slaCountdown(p)
        return (
          <Card key={p.id} padding="p-0">
            <div className="px-5 py-3 border-b border-rule flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[14px] font-semibold text-ink">{p.name} <span className="text-mist font-normal">· {p.nameJa}</span></p>
                <p className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {t('delivery.deliveredAt', { dt: fmtDateTime(p.deliveredAt, lang), sla: lang === 'ja' ? p.slaLabelJa : p.slaLabel })}
                </p>
              </div>
              <SlaChip project={p} countdown={c} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5">
              <div>
                <MonoLabel>{t('delivery.deliverables')}</MonoLabel>
                <ul className="mt-2 space-y-1.5">
                  {[`${p.name} (EN).pdf`, 'QA report.pdf', 'Glossary compliance memo.pdf'].map(f => (
                    <li key={f} className="flex items-center justify-between text-[12px] text-ink">
                      <span className="truncate">{f}</span>
                      <button onClick={() => downloadText(f.replace(/\.(pdf|docx)$/i, '.txt'), `${f}\nDelivered by arbitr · SwiftBridge — demo deliverable stub.\nProject: ${p.name} (${p.id})`)} aria-label={`Download ${f}`} className="text-ocean hover:text-ocean/80 cursor-pointer inline-flex items-center gap-1 text-[11px] shrink-0 ml-3"><Download className="w-3 h-3" /> {t('delivery.download')}</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <MonoLabel>{t('delivery.versionHistory')}</MonoLabel>
                <ul className="mt-2 space-y-1.5 text-[12px]">
                  <li className="flex items-center gap-2 text-ink"><span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v2</span> {t('delivery.v2Line')} <ChevronRight className="w-3 h-3 text-mist" /></li>
                  <li className="flex items-center gap-2 text-slate"><span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v1</span> {t('delivery.v1Line')}</li>
                </ul>
                <p className="text-[11px] text-slate mt-3"><span className="text-mist">{t('delivery.reviewNoteLabel')}</span> {t('delivery.reviewNote')}</p>
              </div>
              <div>
                <MonoLabel>{t('delivery.feedback')}</MonoLabel>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`} className="cursor-pointer">
                      <Star className={`w-5 h-5 ${n <= stars ? 'text-[#FFBD59] fill-[#FFBD59]' : 'text-rule'}`} />
                    </button>
                  ))}
                </div>
                {stars > 0 && <p className="text-[11px] text-teal mt-1.5">{t('delivery.thanks')}</p>}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
