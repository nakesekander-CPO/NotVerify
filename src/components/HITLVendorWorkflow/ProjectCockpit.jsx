import { useState, useMemo } from 'react'
import { Calendar, Layers, Shield, Brain, Users, Search, X } from 'lucide-react'
import { HITL_PROJECTS, HITL_TASKS, VENDOR_ASSIGNMENTS, getVendorById } from '../../data/hitlVendorWorkflow'
import { USERS } from '../../data/rbacModel'
import { projectReviewProgress } from '../../services/hitl/taskAssignment'
import { SectionHeading, Card, MonoLabel, KeyValueRow, StatusBadge, PrimaryButton, SecondaryButton, ScoreBar } from './shared'

export default function ProjectCockpit({ activeProjectId, setActiveProjectId, navigate }) {
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || HITL_PROJECTS[0]
  const projectAssignments = VENDOR_ASSIGNMENTS.filter(a => a.projectId === project.id)

  return (
    <div>
      <SectionHeading
        title="Project Cockpit"
        subtitle="Single view of each governed project — requirements, agent risk pre-assessment, vendor assignment, and the workflow agents monitoring SLA and quality."
        actions={<PrimaryButton onClick={() => navigate('recommendation')}>Re-run vendor selection</PrimaryButton>}
      />

      <div className="flex gap-5 items-start">
        <ProjectNavigator
          activeProjectId={project.id}
          onSelect={setActiveProjectId}
        />

        <div className="flex-1 min-w-0">
      <div className="grid grid-cols-3 gap-5">
        <Card>
          <MonoLabel>Project</MonoLabel>
          <p className="mt-2 text-[16px] font-semibold text-ink">{project.name}</p>
          <p className="text-[12px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{project.id}</p>
          <div className="mt-3"><StatusBadge status={project.status} /></div>
          <div className="mt-4">
            <KeyValueRow label="Client tenant" value={project.clientTenantId} />
            <KeyValueRow label="Words" value={project.estimatedWordCount.toLocaleString()} mono />
            <KeyValueRow label="Deadline" value={new Date(project.requirements.deadline).toLocaleString()} />
            <KeyValueRow label="Budget" value={`$${project.requirements.budget.toLocaleString()}`} mono />
          </div>
        </Card>

        <Card>
          <MonoLabel>Requirements</MonoLabel>
          <div className="mt-3">
            <KeyValueRow label="Language" value={`${project.requirements.sourceLanguage} → ${project.requirements.targetLanguages.join(', ')}`} />
            <KeyValueRow label="Domain" value={project.requirements.domain} />
            <KeyValueRow label="Content" value={project.requirements.contentType} />
            <KeyValueRow label="Service" value={project.requirements.serviceRequired} />
            <KeyValueRow label="Required pool" value={project.requirements.requiredVendorPool} />
            <KeyValueRow label="Quality threshold" value={`${project.requirements.qualityThreshold}%`} mono />
            <KeyValueRow label="Security" value={project.requirements.securityClassification} />
            <KeyValueRow label="Data residency" value={project.requirements.dataResidency} />
            <KeyValueRow label="Sign-off role" value={project.requirements.requiredSignoffRole} />
          </div>
        </Card>

        <Card>
          <MonoLabel>Agent pre-assessment</MonoLabel>
          <div className="flex items-center gap-2 mt-2">
            <Brain className="w-4 h-4 text-amber" />
            <span className="text-[13px] font-semibold text-ink">{project.riskAssessment.generatedBy}</span>
          </div>
          <div className="mt-3">
            <KeyValueRow label="Risk level" value={project.riskAssessment.riskLevel} />
            <KeyValueRow label="Confidence" value={`${(project.riskAssessment.confidenceScore * 100).toFixed(0)}%`} mono />
            <KeyValueRow label="Regulatory" value={project.riskAssessment.regulatoryRisk} />
            <KeyValueRow label="Legal" value={project.riskAssessment.legalRisk} />
            <KeyValueRow label="Terminology" value={project.riskAssessment.terminologyRisk} />
            <KeyValueRow label="Language" value={project.riskAssessment.languageDifficulty} />
          </div>
          <p className="mt-3 text-[12px] text-slate leading-relaxed">{project.riskAssessment.explanation}</p>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-6">
        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <Layers className="w-4 h-4 text-ocean" />
            <p className="text-[13px] font-semibold text-ink">Vendor assignments</p>
          </div>
          <ul className="px-5 py-3">
            {projectAssignments.length === 0 && <li className="text-[12px] text-mist py-2">No assignments yet.</li>}
            {projectAssignments.map(a => {
              const v = getVendorById(a.vendorId)
              return (
                <li key={a.id} className="py-3 border-b border-rule last:border-b-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink">{v?.name}</p>
                      <p className="text-[11px] text-mist">{a.id} · est ${a.estimatedCost} · {a.estimatedTurnaroundHours}h</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  {a.overrideReason && <p className="mt-1 text-[11px] text-amber-deep italic">Override: {a.overrideReason}</p>}
                </li>
              )
            })}
          </ul>
        </Card>

        <Card padding="p-0">
          <div className="px-5 py-3 border-b border-rule flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal" />
            <p className="text-[13px] font-semibold text-ink">Governance flags</p>
          </div>
          <ul className="px-5 py-3 text-[12.5px] space-y-2">
            <li className="flex items-center justify-between"><span>Retraining allowed</span><span className={project.requirements.retrainingAllowed ? 'text-teal' : 'text-error'}>{project.requirements.retrainingAllowed ? 'Yes' : 'No'}</span></li>
            <li className="flex items-center justify-between"><span>Org Brain feed</span><span className={project.requirements.orgBrainAllowed ? 'text-teal' : 'text-error'}>{project.requirements.orgBrainAllowed ? 'Yes' : 'No'}</span></li>
            <li className="flex items-center justify-between"><span>Model suggestions</span><span className={project.requirements.modelSuggestionsAllowed ? 'text-teal' : 'text-error'}>{project.requirements.modelSuggestionsAllowed ? 'Yes' : 'No'}</span></li>
            <li className="flex items-center justify-between"><span>Auto-publish threshold</span><span>{project.requirements.autoPublishThreshold}%</span></li>
            <li className="flex items-center justify-between"><span>Review level</span><span>{project.requirements.requiredReviewLevel}</span></li>
          </ul>
        </Card>
      </div>

      {/* Task / reviewer breakdown — visible for every review mode */}
      <TaskBreakdown projectId={project.id} navigate={navigate} />

      <div className="mt-6 flex items-center gap-3">
        <PrimaryButton onClick={() => navigate('workspace')}>Open review workspace →</PrimaryButton>
        <SecondaryButton onClick={() => navigate('assignments')}>Manage assignments</SecondaryButton>
        <SecondaryButton onClick={() => navigate('signoff')}>Go to sign-off</SecondaryButton>
        <SecondaryButton onClick={() => navigate('audit')}>View audit log</SecondaryButton>
      </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Project navigator — scalable searchable master list ─────────
 * Replaces the horizontal pill row, which broke down past a handful
 * of projects. Search by name / id / domain / language / status,
 * filter by status, and scan each project's status + key facts +
 * review progress in a scrollable list that scales to any count. */
function ProjectNavigator({ activeProjectId, onSelect }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const statuses = useMemo(() => {
    const set = new Set(HITL_PROJECTS.map(p => p.status).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [])

  const rows = useMemo(() => {
    return HITL_PROJECTS.map(p => {
      let progress = { avgProgress: 0, tasks: 0, complete: 0 }
      try { progress = projectReviewProgress(p.id) } catch {}
      return { p, progress }
    })
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(({ p }) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (!q) return true
      const hay = [
        p.name, p.id, p.status, p.requirements?.domain,
        p.requirements?.sourceLanguage,
        ...(p.requirements?.targetLanguages || []),
        p.clientTenantId,
      ].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })
  }, [rows, query, statusFilter])

  return (
    <aside className="w-[320px] shrink-0 bg-white border border-rule rounded-lg overflow-hidden self-stretch flex flex-col max-h-[78vh]">
      <div className="px-3 py-2.5 border-b border-rule">
        <div className="flex items-center justify-between mb-2">
          <MonoLabel>Projects</MonoLabel>
          <span className="text-[11px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {filtered.length}/{HITL_PROJECTS.length}
          </span>
        </div>
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-mist absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, domain, language…"
            className="w-full text-[12.5px] border border-rule rounded-md pl-8 pr-7 py-1.5 focus:outline-none focus:border-ocean/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-pale text-mist cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {statuses.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2 py-0.5 rounded-full text-[10.5px] border cursor-pointer transition-colors ${
                statusFilter === s
                  ? 'bg-ocean text-white border-ocean'
                  : 'bg-white border-rule text-slate hover:border-ocean/40'
              }`}
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      <ul className="overflow-y-auto flex-1">
        {filtered.length === 0 && (
          <li className="px-3 py-6 text-center text-[12px] text-mist">No projects match.</li>
        )}
        {filtered.map(({ p, progress }) => {
          const isActive = p.id === activeProjectId
          const tgt = (p.requirements?.targetLanguages || []).join(', ')
          return (
            <li key={p.id}>
              <button
                onClick={() => onSelect(p.id)}
                className={`w-full text-left px-3 py-2.5 cursor-pointer border-l-2 transition-colors ${
                  isActive
                    ? 'border-l-ocean bg-ocean/5'
                    : 'border-l-transparent hover:bg-pale/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-[12.5px] leading-snug ${isActive ? 'font-semibold text-ink' : 'text-ink'}`}>{p.name}</p>
                  <StatusBadge status={p.status} />
                </div>
                <p className="text-[10px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {p.requirements?.sourceLanguage} → {tgt} · {p.requirements?.domain}
                </p>
                <div className="flex items-center justify-between mt-1.5 gap-2">
                  <span className="text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {p.estimatedWordCount?.toLocaleString()}w · due {new Date(p.requirements?.deadline).toLocaleDateString()}
                  </span>
                  {progress.tasks > 0 && (
                    <span className="text-[10px] text-slate shrink-0" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                      {progress.avgProgress}%
                    </span>
                  )}
                </div>
                {progress.tasks > 0 && (
                  <div className="mt-1.5">
                    <ScoreBar value={progress.avgProgress} color="teal" />
                  </div>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

function TaskBreakdown({ projectId, navigate }) {
  const tasks = HITL_TASKS.filter(t => t.projectId === projectId)
  const progress = projectReviewProgress(projectId)
  if (tasks.length === 0) return null
  return (
    <Card padding="p-0" className="mt-6">
      <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-ocean" />
          <p className="text-[13px] font-semibold text-ink">Tasks & reviewer assignments</p>
        </div>
        <div className="flex items-center gap-4 text-[11.5px] text-slate">
          <span><strong className="text-ink">{progress.assigned}</strong>/{progress.tasks} assigned</span>
          <span><strong className="text-ink">{progress.complete}</strong> complete</span>
          <span><strong className="text-ink">{progress.avgProgress}%</strong> avg progress</span>
          {progress.unassigned > 0 && <span className="text-amber-deep font-semibold">{progress.unassigned} unassigned</span>}
        </div>
      </div>
      <ul className="px-5 py-2">
        {tasks.map(t => {
          const primary = USERS.find(u => u.id === t.primaryReviewerId)
          const collabs = (t.collaboratorIds || []).map(id => USERS.find(u => u.id === id)).filter(Boolean)
          return (
            <li key={t.id} className="py-3 border-b border-rule last:border-b-0 grid grid-cols-[2fr_1.5fr_1fr_auto] gap-3 items-center">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">{t.title}</p>
                <p className="text-[10.5px] text-mist mt-0.5">{t.wordCount.toLocaleString()}w · due {new Date(t.dueAt).toLocaleDateString()} · <span className="font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{(t.assignmentMode || 'single').toUpperCase()}</span></p>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {primary ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-ocean/10 border border-ocean/30 text-[11px] text-ocean">
                      <span className="w-4.5 h-4.5 rounded-full bg-ocean text-white text-[9px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{primary.initials}</span>
                      {primary.name}
                    </span>
                    {collabs.map(c => (
                      <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pale border border-rule text-[10.5px] text-ocean">
                        <span className="w-4 h-4 rounded-full bg-mist text-white text-[9px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{c.initials}</span>
                        {c.initials}
                      </span>
                    ))}
                  </>
                ) : (
                  <span className="text-[11.5px] text-amber-deep italic">Unassigned</span>
                )}
              </div>
              <div>
                <ScoreBar value={t.progressPct || 0} color="teal" />
                <p className="text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.progressPct || 0}%</p>
              </div>
              <StatusBadge status={t.status} />
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
