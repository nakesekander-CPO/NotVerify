/**
 * HITL RBAC service
 *
 * Wraps the existing `checkAccess` from rbacModel.js with HITL-specific
 * permission helpers. Every service-layer function in this folder calls
 * `requirePermission(...)` before mutating state, and writes a denial
 * audit event when blocked.
 */

import { ROLES, ROLE_ASSIGNMENTS, USERS, checkAccess } from '../../data/rbacModel';
import { appendAuditEvent } from './auditLog';

/**
 * Resolve the effective HITL roles for a user. A user can hold several
 * scoped assignments simultaneously (e.g. project-manager on Japan AND
 * vendor-user on their vendor org). Returns Role[] dereferenced from
 * ROLES, never null — empty array if no assignments.
 */
export function getUserRoles(userId) {
  return ROLE_ASSIGNMENTS
    .filter(a => a.userId === userId)
    .map(a => ROLES.find(r => r.id === a.roleId))
    .filter(Boolean);
}

/**
 * True if any of the user's roles grants `permission` (or '*').
 * For tenant/project/segment scopes, callers should additionally check
 * scope membership via the existing `checkAccess` from rbacModel.
 */
export function hasPermission(userId, permission) {
  const roles = getUserRoles(userId);
  return roles.some(r => r.permissions.includes('*') || r.permissions.includes(permission));
}

/** True if user holds one of the named roles. */
export function isRole(userId, ...roleIds) {
  const roles = getUserRoles(userId);
  return roles.some(r => roleIds.includes(r.id));
}

/**
 * Strict permission gate. Throws on denial AND emits a
 * `policy.violation` audit event (so attempts are visible to admins).
 */
export function requirePermission(userId, permission, context = {}) {
  if (!userId) {
    appendAuditEvent({
      actorId: 'anonymous',
      actorRole: null,
      eventType: 'policy.violation',
      reason: `Anonymous attempt to use permission "${permission}"`,
      ...context,
    });
    const err = new Error(`Permission denied: no actor`);
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  if (!hasPermission(userId, permission)) {
    appendAuditEvent({
      actorId: userId,
      actorRole: getUserRoles(userId)[0]?.id || null,
      eventType: 'policy.violation',
      reason: `User "${userId}" lacks "${permission}"`,
      ...context,
    });
    const err = new Error(`Permission denied: ${permission}`);
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  return true;
}

/**
 * Vendor-user scoping. A vendor-user must only see assignments that
 * belong to their vendor and where they are the assigned user.
 */
export function vendorUserCanSeeAssignment(userId, assignment, vendor) {
  if (!assignment || !vendor) return false;
  if (!vendor.assignedUsers.includes(userId)) return false;
  if (assignment.vendorId !== vendor.id) return false;
  return assignment.status === 'active' || assignment.status === 'in-progress';
}

/**
 * Re-export the org-tree access check so callers can do org-scope
 * checks without two imports.
 */
export { checkAccess };

/** Pretty role list for display. */
export function describeUserRoles(userId) {
  return getUserRoles(userId).map(r => r.name);
}

/** Lookup util — returns USERS[] who hold the named role. */
export function listUsersWithRole(roleId) {
  const ids = new Set(ROLE_ASSIGNMENTS.filter(a => a.roleId === roleId).map(a => a.userId));
  return USERS.filter(u => ids.has(u.id));
}
