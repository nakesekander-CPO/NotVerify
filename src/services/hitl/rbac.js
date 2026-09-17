/**
 * HITL RBAC adapter — a thin shim over the ONE engine
 * (src/services/rbac/engine.js). It exists so the HITL services keep
 * their calling convention while every decision — scope, tenant,
 * expiry, barriers — is made by `can()` and audited by `authorize()`.
 *
 * The old scope-blind `hasPermission(userId, permission)` is gone on
 * purpose: an access check without a node is a developer error here.
 */

import { authorize } from '../rbac/engine'
import { rolesOfUser } from '../rbac/engine'
import { getProjectById } from '../../data/hitlVendorWorkflow'

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
 * Strict permission gate. Every call — allow or deny — lands in the
 * single audit log via authorize(). Throws PERMISSION_DENIED on refusal;
 * on success returns the decision (callers can use decision.role for
 * correct actor-role attribution instead of guessing from a role list).
 */
export function requirePermission(userId, permission, context = {}) {
  const nodeId = resolveNodeId(context)
  const decision = authorize({
    principal: userId ? { type: 'user', id: userId } : null,
    permission,
    nodeId,
    context,
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
