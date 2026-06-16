/**
 * Task Assignment service
 *
 * Internal-review patterns:
 *   - internal-single    : one task on a project, one primary reviewer.
 *   - internal-parallel  : multiple tasks on a project, each assigned to
 *                          one primary reviewer. Project Manager / Org
 *                          Admin / arbitr Global Admin can assign,
 *                          reassign, and unassign. Every change is
 *                          audit-logged.
 *
 * Second edit (the old "four-eyes"):
 *   - It is the CLIENT'S choice, made before the job is sent. Straker
 *     never adds or removes it on its own.
 *   - A job has AT MOST ONE second editor.
 *   - It runs SEQUENTIALLY: the second editor can only start once the
 *     first editor has finished. The two editors never touch the same
 *     segments at the same time.
 *   The single second editor is stored in `collaboratorIds` (length ≤ 1)
 *   and `assignmentMode === 'sequential'`.
 *
 * The same primitives also handle vendor task assignment within a vendor
 * organisation — assignedVendorId stays the same, but primaryReviewerId
 * is set to a vendor-user.
 */

import { HITL_TASKS, HITL_SEGMENTS, getProjectById, getVendorById } from '../../data/hitlVendorWorkflow';
import { USERS } from '../../data/rbacModel';
import { requirePermission, getUserRoles, isRole } from './rbac';
import { appendAuditEvent } from './auditLog';

function _findTask(taskId) {
  const t = HITL_TASKS.find(x => x.id === taskId);
  if (!t) throw new Error(`task not found: ${taskId}`);
  return t;
}

function _user(id) {
  return USERS.find(u => u.id === id) || null;
}

/* ─── single-reviewer assignment ──────────────────────────────── */

export function assignTask({ taskId, userId, actorId, note }) {
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  if (!_user(userId)) throw new Error(`reviewer not found: ${userId}`);

  const before = { primaryReviewerId: t.primaryReviewerId, collaboratorIds: [...t.collaboratorIds] };
  t.primaryReviewerId = userId;
  t.assignmentMode = 'single';
  t.collaboratorIds = [];
  t.assignedAt = new Date().toISOString();
  t.assignedBy = actorId;
  if (t.status === 'not-started' || !t.primaryReviewerId) t.status = 'assigned';

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id,
    projectId: t.projectId, taskId,
    eventType: 'task.assigned',
    beforeValue: before,
    afterValue: { primaryReviewerId: userId, assignmentMode: 'single' },
    reason: note || null,
  });
  return t;
}

/* ─── second-editor assignment (sequential, max one) ──────────── */

/**
 * Set the first editor and (optionally) the one second editor in a
 * single call. A job has at most ONE second editor and it runs
 * sequentially — never in parallel. `collaboratorIds` keeps the
 * existing call shape but must contain zero or one user.
 */
export function assignTaskParallel({ taskId, primaryReviewerId, collaboratorIds = [], actorId, note }) {
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  if (!_user(primaryReviewerId)) throw new Error(`primary reviewer not found: ${primaryReviewerId}`);
  if (collaboratorIds.length > 1) {
    throw new Error('a job has at most one second editor (sequential, never parallel)');
  }
  for (const c of collaboratorIds) {
    if (!_user(c)) throw new Error(`second editor not found: ${c}`);
    if (c === primaryReviewerId) throw new Error('the second editor must be a different person');
  }

  const before = { primaryReviewerId: t.primaryReviewerId, collaboratorIds: [...t.collaboratorIds] };
  t.primaryReviewerId = primaryReviewerId;
  t.collaboratorIds = [...new Set(collaboratorIds)];
  t.assignmentMode = collaboratorIds.length > 0 ? 'sequential' : 'single';
  t.assignedAt = new Date().toISOString();
  t.assignedBy = actorId;
  if (t.status === 'not-started') t.status = 'assigned';

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id,
    projectId: t.projectId, taskId,
    eventType: 'task.second-editor-assigned',
    beforeValue: before,
    afterValue: { primaryReviewerId, collaboratorIds: t.collaboratorIds, assignmentMode: t.assignmentMode },
    reason: note || null,
  });
  return t;
}

/** Clearer alias for the single-second-editor setup. */
export const assignSecondEditor = ({ taskId, primaryReviewerId, secondEditorId, actorId, note }) =>
  assignTaskParallel({ taskId, primaryReviewerId, collaboratorIds: secondEditorId ? [secondEditorId] : [], actorId, note });

/* ─── reassign with required reason ───────────────────────────── */

export function reassignTask({ taskId, toUserId, actorId, reason }) {
  if (!reason || !reason.trim()) throw new Error('reassignTask: reason is required');
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  if (!_user(toUserId)) throw new Error(`reviewer not found: ${toUserId}`);
  if (t.primaryReviewerId === toUserId) throw new Error('already assigned to this user');

  const before = { primaryReviewerId: t.primaryReviewerId };
  t.primaryReviewerId = toUserId;
  t.assignedAt = new Date().toISOString();
  t.assignedBy = actorId;

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id,
    projectId: t.projectId, taskId,
    eventType: 'task.reassigned',
    beforeValue: before,
    afterValue: { primaryReviewerId: toUserId },
    reason,
  });
  return t;
}

/* ─── unassign (removes reviewer; task returns to backlog) ────── */

export function unassignTask({ taskId, actorId, reason }) {
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  const before = { primaryReviewerId: t.primaryReviewerId, collaboratorIds: [...t.collaboratorIds] };
  t.primaryReviewerId = null;
  t.collaboratorIds = [];
  t.assignmentMode = 'single';
  t.assignedAt = null;
  t.assignedBy = null;
  t.status = 'not-started';

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id,
    projectId: t.projectId, taskId,
    eventType: 'task.unassigned',
    beforeValue: before,
    afterValue: { primaryReviewerId: null, collaboratorIds: [] },
    reason: reason || null,
  });
  return t;
}

/* ─── add / remove the single second editor ───────────────────── */

export function addCollaborator({ taskId, userId, actorId }) {
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  if (!_user(userId)) throw new Error(`user not found: ${userId}`);
  if (t.primaryReviewerId === userId) throw new Error('user is already the primary reviewer');
  if (t.collaboratorIds.includes(userId)) return t;
  if (t.collaboratorIds.length > 0) {
    throw new Error('a job has only one second editor (sequential); remove the current one first');
  }
  t.collaboratorIds = [userId];
  t.assignmentMode = 'sequential';
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: t.projectId, taskId,
    eventType: 'task.second-editor-assigned',
    afterValue: { userId },
  });
  return t;
}
export const assignSecondEditorTo = addCollaborator;

export function removeCollaborator({ taskId, userId, actorId }) {
  requirePermission(actorId, 'reassign_task', { taskId });
  const t = _findTask(taskId);
  t.collaboratorIds = t.collaboratorIds.filter(x => x !== userId);
  if (t.collaboratorIds.length === 0) t.assignmentMode = 'single';
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: t.projectId, taskId,
    eventType: 'task.second-editor-removed',
    afterValue: { userId },
  });
  return t;
}
export const removeSecondEditor = removeCollaborator;

/* ─── sequential second-edit gate ─────────────────────────────── */

/**
 * The first editor's pass is complete when every segment on the task
 * (or, if segments aren't task-scoped, on the project) is either
 * resolved (confirmed/edited) or locked early (101% ICE match).
 */
export function firstEditComplete(taskId) {
  const t = HITL_TASKS.find(x => x.id === taskId);
  if (!t) return false;
  let segs = HITL_SEGMENTS.filter(s => s.taskId === taskId);
  if (segs.length === 0) segs = HITL_SEGMENTS.filter(s => s.projectId === t.projectId);
  if (segs.length === 0) return false;
  return segs.every(s => s.locked || ['confirmed', 'edited'].includes(s.decision));
}

/**
 * Can the assigned second editor start? Only if a second editor exists
 * AND the first editor has finished. This enforces "sequential, never
 * in parallel".
 */
export function secondEditorCanStart(taskId) {
  const t = HITL_TASKS.find(x => x.id === taskId);
  if (!t || !t.collaboratorIds || t.collaboratorIds.length === 0) return false;
  return firstEditComplete(taskId);
}

/** Is `userId` the second editor on this task (not the first editor)? */
export function isSecondEditor(userId, taskId) {
  const t = HITL_TASKS.find(x => x.id === taskId);
  if (!t) return false;
  return t.primaryReviewerId !== userId && (t.collaboratorIds || []).includes(userId);
}

/* ─── queries ─────────────────────────────────────────────────── */

/**
 * Tasks assigned to a given reviewer — either as primary or as a
 * collaborator. Used for "My Queue" in the workspace.
 */
export function listMyTasks(userId, { projectId } = {}) {
  return HITL_TASKS.filter(t =>
    (t.primaryReviewerId === userId || t.collaboratorIds.includes(userId))
    && (!projectId || t.projectId === projectId)
  );
}

/**
 * Workload summary across reviewers for a project. The Task Assignment
 * board renders this to balance load.
 */
export function reviewerWorkload({ projectId } = {}) {
  const tasks = projectId ? HITL_TASKS.filter(t => t.projectId === projectId) : HITL_TASKS;
  const map = new Map();
  for (const t of tasks) {
    const ids = [t.primaryReviewerId, ...t.collaboratorIds].filter(Boolean);
    for (const id of ids) {
      const entry = map.get(id) || { userId: id, tasks: [], totalWords: 0, isPrimaryCount: 0, isCollaboratorCount: 0 };
      entry.tasks.push(t);
      entry.totalWords += t.wordCount || 0;
      if (t.primaryReviewerId === id) entry.isPrimaryCount += 1;
      if (t.collaboratorIds.includes(id)) entry.isCollaboratorCount += 1;
      map.set(id, entry);
    }
  }
  return [...map.values()].sort((a, b) => b.totalWords - a.totalWords);
}

/** Unassigned tasks for a project (no primary reviewer). */
export function listUnassignedTasks({ projectId } = {}) {
  return HITL_TASKS.filter(t => !t.primaryReviewerId && (!projectId || t.projectId === projectId));
}

/**
 * Compute a project's parallel-review progress: avg progress + counts.
 */
export function projectReviewProgress(projectId) {
  const tasks = HITL_TASKS.filter(t => t.projectId === projectId);
  if (!tasks.length) return { tasks: 0, assigned: 0, complete: 0, avgProgress: 0, unassigned: 0 };
  const assigned = tasks.filter(t => t.primaryReviewerId).length;
  const complete = tasks.filter(t => t.status === 'complete' || t.status === 'verified' || t.status === 'signed-off').length;
  const avgProgress = Math.round(tasks.reduce((s, t) => s + (t.progressPct || 0), 0) / tasks.length);
  return {
    tasks: tasks.length,
    assigned,
    complete,
    avgProgress,
    unassigned: tasks.length - assigned,
  };
}

/**
 * Visibility helper: can `userId` see segments on `taskId`? Yes if they
 * are primary, a collaborator, or hold a non-vendor reviewer role.
 */
export function userCanSeeTask(userId, taskId) {
  const t = HITL_TASKS.find(x => x.id === taskId);
  if (!t) return false;
  if (t.primaryReviewerId === userId) return true;
  if (t.collaboratorIds.includes(userId)) return true;
  // vendor-users are scoped strictly to their assignment; everyone else
  // (internal-reviewer / project-manager / etc.) sees all tasks in scope.
  if (isRole(userId, 'vendor-user')) return false;
  return true;
}
