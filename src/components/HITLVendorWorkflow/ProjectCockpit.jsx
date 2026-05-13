import { useState } from 'react'
import { Calendar, Layers, Shield, Brain, Users } from 'lucide-react'
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

      <div className="flex gap-3 mb-5">
        {HITL_PROJECTS.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProjectId(p.id)}
            className={`px-3.5 py-2 rounded-md border text-[12.5px] transition-colors cursor-pointer ${project.id === p.id ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-ink hover:border-ocean/40'}`}
          >
            {p.name}
          </button>
        ))}
      </div>

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
