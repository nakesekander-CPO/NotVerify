/**
 * HITL RBAC adapter — a thin shim over the ONE engine
 * (src/services/rbac/engine.js). It exists so the HITL services keep
 * their calling convention while every decision — scope, tenant,
 * expiry, barriers — is made by `can()` and audited by `authorize()`.
 *
 * The old scope-blind boolean permission helper is gone on purpose:
 * an access check without a node is a developer error here.
 */

import { authorize, rolesOfUser } from '../rbac/engine'
import { getProjectById, HITL_TASKS, HITL_SEGMENTS } from '../../data/hitlVendorWorkflow'

/**
 * Resolve the org node an action is scoped to. HITL actions are always
 * project-scoped, and every project knows its client node.
 */
function resolveNodeId(context = {}) {
  if (context.nodeId) return context.nodeId
  if (context.projectId) {
    const project = getProjectById(context.projectId)
    if (project?.clientNodeId) return project.clientNodeId
  }
  throw new Error(
    'requirePermission: cannot resolve an org node from context — pass nodeId or a projectId whose project has a clientNodeId. ' +
    'A scope-blind permission check is not allowed.'
  )
}

/**
 * Who is assigned to the work this action touches? Feeds the engine's
 * assignedOnly condition (vendor grants) — the old always-true
 * canVendorUserActOnSegment approximation is gone.
 */
function resolveAssignedUserIds(context = {}) {
  let task = null
  if (context.taskId) task = HITL_TASKS.find(t => t.id === context.taskId)
  if (!task && context.segmentId) {
    const seg = HITL_SEGMENTS.find(s => s.id === context.segmentId)
    if (seg?.taskId) task = HITL_TASKS.find(t => t.id === seg.taskId)
  }
  if (!task) return undefined
  return [task.primaryReviewerId, ...(task.collaboratorIds || [])].filter(Boolean)
}

/**
 * Strict permission gate. Every call — allow or deny — lands in the
 * single audit log via authorize(). Throws PERMISSION_DENIED on refusal;
 * on success returns the decision (callers can use decision.role for
 * correct actor-role attribution instead of guessing from a role list).
 */
export function requirePermission(userId, permission, context = {}) {
  const nodeId = resolveNodeId(context)
  const assignedUserIds = resolveAssignedUserIds(context)
  const decision = authorize({
    principal: userId ? { type: 'user', id: userId } : null,
    permission,
    nodeId,
    context: assignedUserIds ? { ...context, assignedUserIds } : context,
  })
  if (!decision.allow) {
    const err = new Error(`Permission denied: ${decision.reason}`)
    err.code = 'PERMISSION_DENIED'
    err.decision = decision
    throw err
  }
  return decision
}

/** Distinct roles a user holds (display + coarse UI branching only). */
export function getUserRoles(userId) {
  return rolesOfUser(userId)
}

/** True if the user holds one of the named roles anywhere. Display only. */
export function isRole(userId, ...roleIds) {
  return rolesOfUser(userId).some(r => roleIds.includes(r.id))
}
