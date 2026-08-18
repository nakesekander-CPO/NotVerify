import { useMemo, useState } from 'react'
import { Users, UserPlus, ArrowRightLeft, X, Plus, Clock, CheckCircle2 } from 'lucide-react'
import {
  HITL_PROJECTS, HITL_TASKS, getVendorById,
} from '../../data/hitlVendorWorkflow'
import { USERS } from '../../data/rbacModel'
import {
  assignTask, assignTaskParallel, reassignTask, unassignTask,
  addCollaborator, removeCollaborator,
  reviewerWorkload, listUnassignedTasks, projectReviewProgress,
} from '../../services/hitl/taskAssignment'
import {
  SectionHeading, Card, MonoLabel, StatusBadge,
  PrimaryButton, SecondaryButton, DangerButton, EmptyState, ScoreBar,
} from './shared'
import { WorkflowTabLegend } from './cockpit'

export default function TaskAssignment({ activeProjectId, setActiveProjectId, currentUserId }) {
  const internalProjects = HITL_PROJECTS.filter(p => ['internal-single', 'internal-parallel'].includes(p.requirements.reviewMode))
  const externalProjects = HITL_PROJECTS.filter(p => p.requirements.reviewMode === 'external-vendor')
  const project = HITL_PROJECTS.find(p => p.id === activeProjectId) || internalProjects[0] || externalProjects[0]
  const tasks = HITL_TASKS.filter(t => t.projectId === project.id)

  const [, force] = useState(0)
  const refresh = () => force(n => n + 1)
  const [status, setStatus] = useState(null)

  const reviewerPool = useMemo(() => {
    // Internal projects pick from internal users; vendor projects pick
    // from vendor.assignedUsers. Both render the same UI.
    if (project.requirements.reviewMode === 'external-vendor') {
      const v = tasks[0]?.assignedVendorId ? getVendorById(tasks[0].assignedVendorId) : null
      return (v?.assignedUsers || []).map(id => USERS.find(u => u.id === id)).filter(Boolean)
    }
    const internal = getVendorById('v-internal-reviewers')
    return (internal?.assignedUsers || []).map(id => USERS.find(u => u.id === id)).filter(Boolean)
  }, [project.id, tasks.length])

  const workload = useMemo(() => reviewerWorkload({ projectId: project.id }), [project.id, tasks.length, status])
  const unassigned = listUnassignedTasks({ projectId: project.id })
  const progress = projectReviewProgress(project.id)

  const callService = (fn) => {
    try { fn(); refresh(); setStatus(null) }
    catch (e) { setStatus({ kind: 'err', text: e.message }) }
  }

  return (
    <div>
      <SectionHeading
        title="Task Assignment"
        subtitle="Assign internal reviewers (or vendor users) to specific tasks. Use single-reviewer for one file / one owner. Use parallel-reviewer co-assignment for four-eyes review or to split a large project across multiple reviewers working simultaneously."
      />

      <div className="mb-2"><WorkflowTabLegend /></div>
      {/* project picker */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[...internalProjects, ...externalProjects].map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProjectId(p.id)}
            className={`px-3.5 py-2 rounded-md border text-[12.5px] transition-colors cursor-pointer ${project.id === p.id ? 'bg-ocean text-white border-ocean' : 'bg-white border-rule text-ink hover:border-ocean/40'}`}
          >
            <span className="text-[10px] uppercase tracking-wider mr-2 opacity-70" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {labelForMode(p.requirements.reviewMode)}
            </span>
            {p.name}
          </button>
        ))}
      </div>

      {/* project progress strip */}
      <Card padding="p-4" className="mb-6">
        <div className="flex items-center gap-6">
          <ProgressStat label="Tasks" value={progress.tasks} />
          <ProgressStat label="Assigned" value={`${progress.assigned} / ${progress.tasks}`} />
          <ProgressStat label="Unassigned" value={progress.unassigned} accent={progress.unassigned > 0 ? 'amber' : 'teal'} />
          <ProgressStat label="Complete" value={progress.complete} accent="teal" />
          <div className="flex-1 max-w-md">
            <div className="flex items-center justify-between text-[11px] text-mist mb-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              <span>AVERAGE PROGRESS</span><span>{progress.avgProgress}%</span>
            </div>
            <ScoreBar value={progress.avgProgress} color="ocean" />
          </div>
          <div className="ml-auto px-3 py-1.5 rounded-full bg-cream border border-rule text-[11px] text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            mode: {project.requirements.reviewMode}
          </div>
        </div>
      </Card>

      {status && (
        <div className={`mb-3 text-[12.5px] ${status.kind === 'err' ? 'text-error' : 'text-teal'}`}>{status.text}</div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Tasks board */}
        <div className="col-span-2">
          <MonoLabel>Tasks</MonoLabel>
          {tasks.length === 0 ? (
            <EmptyState title="No tasks on this project yet." />
          ) : (
            <ul className="mt-3 space-y-3">
              {tasks.map(t => (
                <TaskRow
                  key={t.id}
                  task={t}
                  reviewers={reviewerPool}
                  onAssign={(userId) => callService(() => assignTask({ taskId: t.id, userId, actorId: currentUserId }))}
                  onAddCollab={(userId) => callService(() => addCollaborator({ taskId: t.id, userId, actorId: currentUserId }))}
                  onRemoveCollab={(userId) => callService(() => removeCollaborator({ taskId: t.id, userId, actorId: currentUserId }))}
                  onReassign={(toUserId) => {
                    const reason = window.prompt('Reason for reassignment?')
                    if (!reason) return
                    callService(() => reassignTask({ taskId: t.id, toUserId, actorId: currentUserId, reason }))
                  }}
                  onUnassign={() => {
                    const reason = window.prompt('Reason for unassigning? (optional)') || ''
                    callService(() => unassignTask({ taskId: t.id, actorId: currentUserId, reason }))
                  }}
                />
              ))}
            </ul>
          )}
        </div>

        {/* Workload */}
        <div>
          <MonoLabel>Reviewer workload</MonoLabel>
          {workload.length === 0 ? (
            <p className="text-[12px] text-mist mt-3">No reviewers assigned yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {workload.map(w => {
                const u = USERS.find(x => x.id === w.userId)
                const maxWords = Math.max(...workload.map(x => x.totalWords), 1)
                return (
                  <li key={w.userId} className="bg-white border border-rule rounded-md p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar user={u} />
                        <p className="text-[12.5px] font-semibold text-ink">{u?.name || w.userId}</p>
                      </div>
                      <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{w.totalWords.toLocaleString()}w</span>
                    </div>
                    <p className="text-[10.5px] text-mist mt-1">
                      {w.isPrimaryCount} primary · {w.isCollaboratorCount} co-reviewer
                    </p>
                    <div className="mt-2"><ScoreBar value={(w.totalWords / maxWords) * 100} color="amber" /></div>
                  </li>
                )
              })}
            </ul>
          )}

          {unassigned.length > 0 && (
            <div className="mt-5 bg-[#FFF7E6] border border-[#FFB000]/40 rounded-md p-3">
              <p className="text-[12.5px] font-semibold text-[#996800]">{unassigned.length} unassigned task{unassigned.length === 1 ? '' : 's'}</p>
              <ul className="mt-2 space-y-1 text-[11.5px] text-slate">
                {unassigned.map(t => (
                  <li key={t.id} className="flex items-center justify-between">
                    <span className="truncate">{t.title}</span>
                    <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.wordCount.toLocaleString()}w</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function labelForMode(mode) {
  if (mode === 'internal-single') return 'INT/SINGLE'
  if (mode === 'internal-parallel') return 'INT/PARALLEL'
  return 'EXT'
}

function ProgressStat({ label, value, accent }) {
  const palette = { teal: 'text-teal', amber: 'text-[#996800]' }
  return (
    <div>
      <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</p>
      <p className={`text-[22px] font-semibold ${palette[accent] || 'text-ink'} leading-none mt-1`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</p>
    </div>
  )
}

function Avatar({ user }) {
  if (!user) return null
  return (
    <span className="w-6 h-6 rounded-full bg-ocean text-white text-[10.5px] font-semibold flex items-center justify-center" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {user.initials}
    </span>
  )
}

function TaskRow({ task, reviewers, onAssign, onAddCollab, onRemoveCollab, onReassign, onUnassign }) {
  const [showPicker, setShowPicker] = useState(false)
  const [showCollab, setShowCollab] = useState(false)
  const primary = reviewers.find(r => r.id === task.primaryReviewerId)
  const collabs = task.collaboratorIds.map(id => reviewers.find(r => r.id === id)).filter(Boolean)
  const eligibleForCollab = reviewers.filter(r => r.id !== task.primaryReviewerId && !task.collaboratorIds.includes(r.id))

  return (
    <li className="bg-white border border-rule rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13.5px] font-semibold text-ink">{task.title}</p>
            <StatusBadge status={task.status} />
            <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {task.assignmentMode === 'parallel' ? 'PARALLEL' : 'SINGLE'} · {task.wordCount.toLocaleString()}w
            </span>
          </div>
          <p className="text-[11px] text-mist mt-1">
            <Clock className="inline w-3 h-3 mr-1" />due {new Date(task.dueAt).toLocaleString()}
            {task.assignedBy && <> · assigned by <strong className="text-slate">{task.assignedBy}</strong></>}
          </p>
          <div className="mt-2"><ScoreBar value={task.progressPct || 0} color="teal" /></div>
        </div>

        <div className="shrink-0 text-right">
          <div className="flex items-center justify-end gap-1.5 mb-2">
            {primary ? (
              <button
                onClick={() => setShowPicker(p => !p)}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-ocean/10 border border-ocean/30 text-[11.5px] text-ocean cursor-pointer"
              >
                <Avatar user={primary} />
                <span className="font-medium">{primary.name}</span>
                <ArrowRightLeft className="w-3 h-3" />
              </button>
            ) : (
              <button
                onClick={() => setShowPicker(p => !p)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7E6] border border-[#FFB000]/40 text-[11.5px] text-[#996800] cursor-pointer"
              >
                <UserPlus className="w-3 h-3" /> Assign
              </button>
            )}
          </div>
          {primary && (
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              {collabs.map(c => (
                <span key={c.id} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-pale border border-rule text-[10.5px] text-ocean">
                  <Avatar user={c} /> {c.initials}
                  <button onClick={() => onRemoveCollab(c.id)} className="ml-0.5 text-mist hover:text-error cursor-pointer"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
              <button
                onClick={() => setShowCollab(p => !p)}
                disabled={eligibleForCollab.length === 0}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-rule-strong text-[10.5px] text-slate hover:border-ocean/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-2.5 h-2.5" /> co-reviewer
              </button>
            </div>
          )}
        </div>
      </div>

      {showPicker && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="text-[11px] text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{primary ? 'REASSIGN TO' : 'ASSIGN TO'}</p>
          <div className="flex flex-wrap gap-2">
            {reviewers.filter(r => r.id !== task.primaryReviewerId).map(r => (
              <button
                key={r.id}
                onClick={() => { primary ? onReassign(r.id) : onAssign(r.id); setShowPicker(false) }}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-rule bg-white hover:border-ocean/40 text-[12px] text-ink cursor-pointer"
              >
                <Avatar user={r} /> {r.name}
              </button>
            ))}
            {primary && (
              <SecondaryButton onClick={() => { onUnassign(); setShowPicker(false) }}>Unassign</SecondaryButton>
            )}
          </div>
        </div>
      )}

      {showCollab && (
        <div className="mt-3 border-t border-rule pt-3">
          <p className="text-[11px] text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>ADD CO-REVIEWER</p>
          <div className="flex flex-wrap gap-2">
            {eligibleForCollab.map(r => (
              <button
                key={r.id}
                onClick={() => { onAddCollab(r.id); setShowCollab(false) }}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-rule bg-white hover:border-ocean/40 text-[12px] text-ink cursor-pointer"
              >
                <Avatar user={r} /> {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  )
}
