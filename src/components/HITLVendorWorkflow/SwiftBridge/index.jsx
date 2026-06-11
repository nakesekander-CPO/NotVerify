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
 */

import { useMemo, useState } from 'react'
import {
  LayoutDashboard, FilePlus2, Workflow as WorkflowIcon, Mic, BookOpen,
  Stethoscope, PackageCheck, Clock, AlertTriangle, CheckCircle2,
  Languages, Sparkles, Bird, Landmark, Eye, Star, Download, ChevronRight,
} from 'lucide-react'
import {
  getSwiftBridgeDemo, slaCountdown, slaFor, buildWorkflow,
} from '../../../services/swiftbridge/swiftbridgeModel'
import { appendAuditEvent } from '../../../services/hitl/auditLog'
import { SectionHeading, Card, MonoLabel, StatusBadge } from '../shared'
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
  { id: 'kakehashi', name: 'Kakehashi', nameJa: '架け橋', icon: Landmark, tone: 'from-[#1B5E8F] to-[#009eda]', desc: 'The bridge keeper — calm, dependable, guides customers across the workflow.' },
  { id: 'tsuru',     name: 'Tsuru',     nameJa: '鶴',     icon: Bird,     tone: 'from-teal-600 to-emerald-400', desc: 'The origami crane — precision and craft; folds complexity into clean delivery.' },
  { id: 'fukuro',    name: 'Fukurō',   nameJa: '梟',     icon: Eye,      tone: 'from-slate-600 to-slate-400', desc: 'The night owl — vigilant QA; nothing ships unseen.' },
]

export default function SwiftBridge({ currentUserId, navigate }) {
  const demo = useMemo(() => getSwiftBridgeDemo(), [])
  const [projects, setProjects] = useState(demo.projects)
  const [tab, setTab] = useState('dashboard')
  const [selectedId, setSelectedId] = useState(demo.projects[0].id)
  const [mascot, setMascot] = useState('tsuru')

  const selected = projects.find(p => p.id === selectedId) || projects[0]

  const audit = (eventType, projectId, reason) => {
    try {
      appendAuditEvent({ actorId: currentUserId || 'demo-user', actorRole: 'swiftbridge', eventType, projectId, reason, sessionMeta: { surface: 'swiftbridge-v2' } })
    } catch { /* best-effort in prototype */ }
  }

  const createProject = ({ fileName, fileSize, docType, services }) => {
    const sla = slaFor(docType)
    const p = {
      id: `SB-2026-${Math.floor(Math.random() * 900) + 100}`,
      name: fileName.replace(/\.[a-z]+$/i, ''), nameJa: null,
      docType, services, langPair: 'JA → EN',
      slaHours: sla.hours, slaLabel: sla.label, slaLabelJa: sla.labelJa,
      createdAt: new Date().toISOString(), deliveredAt: null,
      status: 'in_progress',
      steps: buildWorkflow(docType, services).map((s, i) => i === 0 ? { ...s, status: 'in_progress', startedAt: new Date().toISOString() } : s),
      files: [{ name: fileName, size: fileSize }],
    }
    setProjects(ps => [p, ...ps])
    setSelectedId(p.id)
    setTab('workflow')
    audit('swiftbridge.project.created', p.id, `${docType} · ${sla.label}`)
  }

  const updateSteps = (projectId, steps, note) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, steps, status: steps.some(s => s.status === 'blocked') ? 'blocked' : p.status === 'delivered' ? 'delivered' : 'in_progress' } : p))
    if (note) audit(note.type, projectId, note.reason)
  }

  return (
    <div className="space-y-5">
      {/* ── Brand header ─────────────────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-rule bg-gradient-to-r from-[#0F1419] via-[#1B5E8F] to-[#009eda] text-white px-6 py-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2.5">
              <Languages className="w-5 h-5" />
              <h2 className="text-[20px] font-bold tracking-tight">SwiftBridge AI</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30">V2</span>
            </div>
            <p className="text-[12px] text-white/80 mt-1">
              スイフトブリッジAI — faster, more reliable AI-powered IR localization &amp; disclosure workflows
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/60">Powered by</p>
            <p className="text-[13px] font-semibold">arbitr <span className="text-white/70">·</span> アビタAI</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────── */}
      <nav className="flex items-center gap-1 border-b border-rule overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 -mb-px border-b-2 cursor-pointer whitespace-nowrap text-left transition-colors ${active ? 'border-ocean' : 'border-transparent hover:bg-pale/50'}`}>
              <span className={`flex items-center gap-1.5 text-[12.5px] ${active ? 'text-ocean font-semibold' : 'text-slate'}`}>
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </span>
              <span className="block text-[9.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.labelJa}</span>
            </button>
          )
        })}
      </nav>

      {tab === 'dashboard' && (
        <Dashboard projects={projects} mascot={mascot} setMascot={setMascot}
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
        <span>© 2026 SwiftBridge K.K. · Operated on the arbitr platform（アビタAI）</span>
        <span className="flex gap-4">
          <button className="hover:text-slate cursor-pointer underline underline-offset-2">利用規約 Terms</button>
          <button className="hover:text-slate cursor-pointer underline underline-offset-2">プライバシーポリシー Privacy</button>
        </span>
      </footer>
    </div>
  )
}

/* ── Dashboard ───────────────────────────────────────────────── */

const V2_EVOLUTION = [
  'Reliability & execution stability',
  'Scalable AI workflow automation',
  'AI Dubbing',
  'Customer-managed glossary & custom agents',
  'Transparent workflows with human review',
]

function Dashboard({ projects, mascot, setMascot, onOpen, onNew }) {
  const active = projects.filter(p => p.status !== 'delivered')
  const delivered = projects.filter(p => p.status === 'delivered')
  const pendingReviews = projects.flatMap(p => p.steps.filter(s => (s.kind === 'human_review' || s.kind === 'customer_action') && ['in_progress', 'needs_review'].includes(s.status)))
  const blocked = projects.filter(p => p.status === 'blocked')
  const nextDue = active.map(p => ({ p, c: slaCountdown(p) })).sort((a, b) => a.c.dueAt - b.c.dueAt)[0]

  return (
    <div className="space-y-5">
      <SectionHeading
        title="IR localization, on time — every time"
        subtitle="Upload a disclosure document, follow the AI-orchestrated workflow, review where it matters, and receive delivery within the committed SLA."
        actions={<button onClick={onNew} className="px-4 py-2 rounded-lg bg-ocean text-white text-[13px] font-semibold hover:bg-ocean/90 cursor-pointer">＋ New project 新規案件</button>}
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Active projects" labelJa="進行中" value={active.length} sub={blocked.length ? `${blocked.length} blocked — action needed` : 'All running normally'} tone={blocked.length ? 'amber' : 'ok'} />
        <Stat label="Next SLA deadline" labelJa="次の納期" value={nextDue ? `${nextDue.c.remainingHours}h` : '—'} sub={nextDue ? `${nextDue.p.name} · ${nextDue.p.slaLabel}` : 'No live deadlines'} tone={nextDue && nextDue.c.remainingHours < 6 ? 'amber' : 'ok'} />
        <Stat label="Pending reviews" labelJa="レビュー待ち" value={pendingReviews.length} sub="Human & customer gates" tone={pendingReviews.length ? 'info' : 'ok'} />
        <Stat label="Delivered" labelJa="納品済み" value={delivered.length} sub="100% on time this quarter" tone="ok" />
      </div>

      {/* V2 evolution strip */}
      <Card padding="p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ocean shrink-0">
            <Sparkles className="w-3.5 h-3.5" /> New in V2
          </span>
          {V2_EVOLUTION.map(f => (
            <span key={f} className="text-[11px] px-2.5 py-1 rounded-full bg-pale text-ink border border-rule">{f}</span>
          ))}
        </div>
      </Card>

      {/* Project list */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">Projects 案件一覧</p>
          <MonoLabel>SLA tracked by arbitr · アビタAI</MonoLabel>
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
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-ocean/10 text-ocean border border-ocean/20 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{p.slaLabel}</span>
                  <SlaChip project={p} countdown={c} />
                  <StatusBadge status={p.status === 'delivered' ? 'signed-off' : p.status === 'blocked' ? 'needs-rework' : 'in-progress'}>
                    {p.status === 'delivered' ? 'Delivered' : p.status === 'blocked' ? 'Blocked' : 'In progress'}
                  </StatusBadge>
                </button>
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Mascot exploration */}
      <Card padding="p-0">
        <div className="px-5 py-3 border-b border-rule">
          <p className="text-[13px] font-semibold text-ink">Character exploration · キャラクター案</p>
          <p className="text-[11.5px] text-slate mt-0.5">Three concepts for onboarding, guidance, and empty states. Professional and trustworthy — appropriate for corporate IR. Select one to preview it in empty states.</p>
        </div>
        <div className="grid grid-cols-3 gap-4 p-5">
          {MASCOTS.map(m => {
            const Icon = m.icon
            const activeM = mascot === m.id
            return (
              <button key={m.id} onClick={() => setMascot(m.id)}
                className={`text-left rounded-xl border p-4 cursor-pointer transition-colors ${activeM ? 'border-ocean bg-ocean/5' : 'border-rule hover:border-ocean/40'}`}>
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${m.tone} flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-[13px] font-semibold text-ink">{m.name} <span className="text-mist font-normal">{m.nameJa}</span></p>
                <p className="text-[11.5px] text-slate mt-1 leading-relaxed">{m.desc}</p>
                {activeM && <p className="text-[10px] text-ocean mt-2 font-semibold uppercase tracking-wider">Selected concept</p>}
              </button>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

function Stat({ label, labelJa, value, sub, tone }) {
  const tones = { ok: 'text-teal', amber: 'text-amber-deep', info: 'text-ocean' }
  return (
    <Card padding="p-4">
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label} · {labelJa}</p>
      <p className="text-[26px] font-bold text-ink mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
      <p className={`text-[11px] mt-0.5 ${tones[tone] || 'text-slate'}`}>{sub}</p>
    </Card>
  )
}

export function SlaChip({ project, countdown }) {
  const c = countdown || slaCountdown(project)
  if (c.delivered) {
    return <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${c.met ? 'bg-teal/10 text-teal border-teal/30' : 'bg-error/10 text-error border-error/30'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <CheckCircle2 className="w-3 h-3" /> {c.met ? 'SLA met' : 'SLA missed'}
    </span>
  }
  if (c.breached) {
    return <span className="inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/30 whitespace-nowrap" style={{ fontFamily: "'IBM Plex Mono', monospace" }}><AlertTriangle className="w-3 h-3" /> SLA breached</span>
  }
  const low = c.remainingHours <= 6
  return <span className={`inline-flex items-center gap-1 text-[10.5px] px-2 py-0.5 rounded-full border whitespace-nowrap ${low ? 'bg-amber/15 text-amber-deep border-amber/30' : 'bg-pale text-slate border-rule'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
    <Clock className="w-3 h-3" /> {c.remainingHours}h left
  </span>
}

/* ── Delivery ────────────────────────────────────────────────── */

function DeliveryPanel({ projects, mascot }) {
  const delivered = projects.filter(p => p.status === 'delivered')
  const [stars, setStars] = useState(0)
  const MascotIcon = mascot?.icon || Bird

  if (delivered.length === 0) {
    return (
      <Card padding="p-10">
        <div className="text-center max-w-sm mx-auto">
          <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${mascot?.tone || 'from-teal-600 to-emerald-400'} flex items-center justify-center mx-auto mb-3`}>
            <MascotIcon className="w-7 h-7 text-white" />
          </div>
          <p className="text-[14px] font-semibold text-ink">{mascot?.name} says: nothing delivered yet</p>
          <p className="text-[12px] text-slate mt-1">Your completed deliverables will appear here with SLA status and version history.</p>
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
                  Delivered {new Date(p.deliveredAt).toLocaleString()} · {p.slaLabel}
                </p>
              </div>
              <SlaChip project={p} countdown={c} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 p-5">
              <div>
                <MonoLabel>Deliverables 納品物</MonoLabel>
                <ul className="mt-2 space-y-1.5">
                  {[`${p.name} (EN).pdf`, 'QA report.pdf', 'Glossary compliance memo.pdf'].map(f => (
                    <li key={f} className="flex items-center justify-between text-[12px] text-ink">
                      <span className="truncate">{f}</span>
                      <button aria-label={`Download ${f}`} className="text-ocean hover:text-ocean/80 cursor-pointer inline-flex items-center gap-1 text-[11px] shrink-0 ml-3"><Download className="w-3 h-3" /> Download</button>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <MonoLabel>Version history</MonoLabel>
                <ul className="mt-2 space-y-1.5 text-[12px]">
                  <li className="flex items-center gap-2 text-ink"><span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v2</span> Final — human review + QA fixes applied <ChevronRight className="w-3 h-3 text-mist" /></li>
                  <li className="flex items-center gap-2 text-slate"><span className="font-mono text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>v1</span> AI draft (arbitr · アビタAI)</li>
                </ul>
                <p className="text-[11px] text-slate mt-3"><span className="text-mist">Review note:</span> Terminology aligned to Meridian IR Glossary v3. Footnote 7 retranslated.</p>
              </div>
              <div>
                <MonoLabel>Your feedback ご評価</MonoLabel>
                <div className="flex items-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setStars(n)} aria-label={`${n} stars`} className="cursor-pointer">
                      <Star className={`w-5 h-5 ${n <= stars ? 'text-amber fill-amber' : 'text-rule'}`} />
                    </button>
                  ))}
                </div>
                {stars > 0 && <p className="text-[11px] text-teal mt-1.5">ありがとうございます — feedback recorded.</p>}
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
