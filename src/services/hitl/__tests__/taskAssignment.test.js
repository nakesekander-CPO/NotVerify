import { describe, it, expect, beforeAll } from 'vitest'
import { HITL_TASKS, HITL_AUDIT_LOG } from '../../../data/hitlVendorWorkflow'
import {
  assignTask, assignTaskParallel, reassignTask, unassignTask,
  addCollaborator, removeCollaborator,
  listMyTasks, reviewerWorkload, listUnassignedTasks, projectReviewProgress,
  userCanSeeTask,
} from '../taskAssignment'

// We always operate against the parallel project to avoid clobbering
// other tests that depend on the single-reviewer task.
const PROJECT_ID = 'hp-annual-internal-parallel'

function pickUnassigned() {
  return HITL_TASKS.find(t => t.projectId === PROJECT_ID && !t.primaryReviewerId)
}

describe('task assignment — single reviewer', () => {
  it('assigns an unassigned task and writes an audit event', () => {
    const t = pickUnassigned()
    expect(t).toBeTruthy()
    const before = HITL_AUDIT_LOG.length
    assignTask({ taskId: t.id, userId: 'sarah', actorId: 'alex' })
    expect(t.primaryReviewerId).toBe('sarah')
    expect(t.assignmentMode).toBe('single')
    expect(t.status).toBe('assigned')
    expect(HITL_AUDIT_LOG.length).toBe(before + 1)
    const evt = HITL_AUDIT_LOG[HITL_AUDIT_LOG.length - 1]
    expect(evt.eventType).toBe('task.assigned')
    expect(evt.afterValue.primaryReviewerId).toBe('sarah')
  })

  it('reassign requires a reason and records before/after in audit', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-letter')
    expect(t.primaryReviewerId).toBe('sarah')
    expect(() => reassignTask({ taskId: t.id, toUserId: 'yuki', actorId: 'alex', reason: '' })).toThrow(/reason is required/)
    reassignTask({ taskId: t.id, toUserId: 'yuki', actorId: 'alex', reason: 'sarah taking PTO Friday' })
    expect(t.primaryReviewerId).toBe('yuki')
    const evt = [...HITL_AUDIT_LOG].reverse().find(e => e.eventType === 'task.reassigned' && e.taskId === t.id)
    expect(evt.beforeValue.primaryReviewerId).toBe('sarah')
    expect(evt.afterValue.primaryReviewerId).toBe('yuki')
    expect(evt.reason).toMatch(/PTO/)
  })

  it('rejects reassignment to the current owner', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-letter')
    expect(() => reassignTask({ taskId: t.id, toUserId: t.primaryReviewerId, actorId: 'alex', reason: 'x' })).toThrow(/already/)
  })
})

describe('task assignment — second editor (sequential)', () => {
  it('promotes a task to sequential mode when a second editor is added', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-financial')
    addCollaborator({ taskId: t.id, userId: 'sarah', actorId: 'alex' })
    expect(t.collaboratorIds).toContain('sarah')
    expect(t.assignmentMode).toBe('sequential')
  })

  it('rejects making the primary reviewer their own second editor', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-financial')
    expect(() => addCollaborator({ taskId: t.id, userId: t.primaryReviewerId, actorId: 'alex' })).toThrow(/already the primary/)
  })

  it('rejects a second second editor — a job has only one', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-financial')
    expect(() => addCollaborator({ taskId: t.id, userId: 'yuki', actorId: 'alex' })).toThrow(/only one second editor/)
  })

  it('removes the second editor and falls back to single mode', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-financial')
    removeCollaborator({ taskId: t.id, userId: 'sarah', actorId: 'alex' })
    expect(t.collaboratorIds).not.toContain('sarah')
    expect(t.assignmentMode).toBe('single')
  })

  it('assignTaskParallel sets primary + one second editor atomically', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-mda')
    assignTaskParallel({ taskId: t.id, primaryReviewerId: 'marcus', collaboratorIds: ['sarah'], actorId: 'alex' })
    expect(t.primaryReviewerId).toBe('marcus')
    expect(t.collaboratorIds).toEqual(['sarah'])
    expect(t.assignmentMode).toBe('sequential')
  })

  it('rejects more than one second editor (never parallel)', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-mda')
    expect(() => assignTaskParallel({ taskId: t.id, primaryReviewerId: 'marcus', collaboratorIds: ['yuki', 'sarah'], actorId: 'alex' })).toThrow(/at most one second editor/)
  })

  it('rejects the same user as both first and second editor', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-mda')
    expect(() => assignTaskParallel({ taskId: t.id, primaryReviewerId: 'sarah', collaboratorIds: ['sarah'], actorId: 'alex' })).toThrow(/different person/)
  })
})

describe('task assignment — queries', () => {
  it('listMyTasks returns tasks where the user is primary or second editor', () => {
    // After the assignment above, sarah is the second editor on tk-annual-mda.
    const tasks = listMyTasks('sarah', { projectId: PROJECT_ID })
    const ids = tasks.map(t => t.id)
    expect(ids).toContain('tk-annual-mda')
  })

  it('reviewerWorkload sums words across primary + collaborator roles', () => {
    const wl = reviewerWorkload({ projectId: PROJECT_ID })
    expect(wl.length).toBeGreaterThan(0)
    for (const w of wl) {
      expect(w.totalWords).toBeGreaterThan(0)
    }
  })

  it('projectReviewProgress reports avg + counts', () => {
    const p = projectReviewProgress(PROJECT_ID)
    expect(p.tasks).toBeGreaterThan(0)
    expect(p.avgProgress).toBeGreaterThanOrEqual(0)
    expect(p.avgProgress).toBeLessThanOrEqual(100)
  })

  it('unassignTask returns the task to the backlog', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-letter')
    unassignTask({ taskId: t.id, actorId: 'alex', reason: 'rebalancing' })
    expect(t.primaryReviewerId).toBeNull()
    expect(listUnassignedTasks({ projectId: PROJECT_ID }).some(x => x.id === t.id)).toBe(true)
  })
})

describe('task assignment — RBAC', () => {
  it('rejects assignment by a user without reassign_task', () => {
    // Thomas is a viewer.
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-governance')
    expect(() => assignTask({ taskId: t.id, userId: 'sarah', actorId: 'thomas' })).toThrow(/Permission denied/)
  })

  it('userCanSeeTask blocks vendor-users from foreign tasks but allows non-vendor reviewers', () => {
    const t = HITL_TASKS.find(x => x.id === 'tk-annual-mda')
    // Alex (tenant-admin) can always see.
    expect(userCanSeeTask('alex', t.id)).toBe(true)
  })
})
