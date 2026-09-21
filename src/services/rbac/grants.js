/**
 * Grant lifecycle — the only writers of the GRANTS table.
 *
 * Every mutation appends to the single audit log and bumps the store so
 * every surface re-renders through the engine. Granter constraints
 * (grantable roles ⊆ granter's permissions, scope ⊆ granter's subtree,
 * level/scope match, last-admin guard, SoD conflicts) land here as the
 * alignment progresses — callers must treat a returned `{ error }` as a
 * refusal to show, never to swallow.
 */

import { GRANTS, ROLES, ORG_NODES, USERS, TENANTS, AUDIT_LOG } from '../../data/rbacModel'
import { bumpRbac, planAllows, effectiveMembers } from './engine'

function nodeById(id) { return ORG_NODES.find(n => n.id === id) || null }

/* ─── Granter constraints (rule 7) ─────────────────────────────── */

/**
 * Barrier-agnostic ancestry: barriers bind ACCESS, not administration.
 * The audited act of granting into a walled node IS the crossing
 * mechanism — if administration were also walled, no crossing could
 * ever be created.
 */
function isSelfOrAncestor(maybeAncestorId, nodeId) {
  let cur = nodeById(nodeId)
  while (cur) {
    if (cur.id === maybeAncestorId) return true
    cur = cur.parentId ? nodeById(cur.parentId) : null
  }
  return false
}

function activeGrantsOf(principalId, tenantId, now = Date.now()) {
  return GRANTS.filter(g =>
    g.principal.type === 'user' && g.principal.id === principalId && g.tenantId === tenantId
    && (!g.conditions?.expiresAt || new Date(g.conditions.expiresAt).getTime() > now))
}

/** The permission set a granter wields over `nodeId` (union, barrier-agnostic). */
function granterPermissionsAt(actorId, tenantId, nodeId) {
  const perms = new Set()
  for (const g of activeGrantsOf(actorId, tenantId)) {
    if (!isSelfOrAncestor(g.scope.nodeId, nodeId)) continue
    const role = ROLES.find(r => r.id === g.roleId)
    for (const p of role?.permissions || []) perms.add(p)
  }
  return perms
}

/**
 * Rule 7: a granter may only hand out what they hold, where they hold it.
 * Returns null when allowed, or a human-readable refusal string.
 */
/* Second-line functions are appointed by that function or by the
 * tenant admin — never by a line manager (point 2c, ruled 2026-09-21). */
const SECOND_LINE_ROLES = new Set(['compliance-reviewer', 'legal-reviewer', 'auditor'])

function holdsRoleCovering(actorId, tenantId, roleId, nodeId) {
  return activeGrantsOf(actorId, tenantId).some(g =>
    g.roleId === roleId && isSelfOrAncestor(g.scope.nodeId, nodeId))
}

function isTenantAdmin(actorId, tenantId) {
  return activeGrantsOf(actorId, tenantId).some(g =>
    ['tenant-admin', 'arbitr-global-admin'].includes(g.roleId))
}

export function grantRefusalReason({ actorId, roleId, nodeId, tenantId, principalId }) {
  const role = ROLES.find(r => r.id === roleId)
  const node = nodeById(nodeId)
  if (!role || !node) return 'Unknown role or scope node'

  // Four-eyes: nobody grants roles to themselves.
  if (principalId && principalId === actorId) {
    return 'Four-eyes rule: you cannot grant a role to yourself — another administrator must do it'
  }

  // role.level must match scope.type: tenant/platform roles bind at the root.
  if ((role.level === 'tenant' || role.level === 'platform') && node.type !== 'tenant') {
    return `${role.name} is a ${role.level}-level role — it can only be granted at the ${TENANTS.find(t => t.id === tenantId)?.name || 'tenant'} root, not at a ${node.type}`
  }

  // Second-line independence: compliance, legal, and audit seats are
  // appointed by the tenant admin or by that same function — never by
  // a line manager.
  if (SECOND_LINE_ROLES.has(roleId)
    && !isTenantAdmin(actorId, tenantId)
    && !holdsRoleCovering(actorId, tenantId, roleId, nodeId)) {
    return `${role.name} is a second-line seat — it is appointed by the tenant admin or by the ${role.name} function, not by a line manager`
  }

  const held = granterPermissionsAt(actorId, tenantId, nodeId)
  if (held.size === 0) {
    return `You hold no grant covering ${node.name} — grantable scopes are limited to your own subtree`
  }
  if (!held.has('*') && !held.has('manage_members')) {
    return `Granting roles at ${node.name} requires manage_members there — your grants covering it do not include it`
  }
  if (!held.has('*')) {
    const missing = role.permissions.filter(p => !held.has(p))
    if (missing.length) {
      return `You cannot grant ${role.name}: it carries ${missing.length === 1 ? 'a permission' : 'permissions'} you do not hold at ${node.name} (${missing.slice(0, 3).join(', ')}${missing.length > 3 ? '…' : ''})`
    }
  }
  return null
}

/**
 * Picker feed: the roles this actor can grant anywhere, and the valid
 * scopes per role. The invite and add-role forms only OFFER what the
 * engine would accept — no more Tenant Admin on an M&A team.
 */
export function grantOptions(actorId, tenantId = 'meridian') {
  const nodes = ORG_NODES.filter(n => n.tenantId === tenantId)
  const scopesByRole = {}
  for (const role of ROLES) {
    if (role.internal) continue
    const ok = nodes.filter(n => !grantRefusalReason({ actorId, roleId: role.id, nodeId: n.id, tenantId }))
    if (ok.length) scopesByRole[role.id] = ok.map(n => n.id)
  }
  return {
    roles: ROLES.filter(r => scopesByRole[r.id]),
    scopesForRole: (roleId) => scopesByRole[roleId] || [],
  }
}

/* ─── Separation of duties (rule 8) ────────────────────────────── */

/**
 * Permission pairs one person must not hold at overlapping scope:
 * making the thing + approving the thing, editing + approving, and
 * contributing + auditing your own area.
 */
export const SOD_CONFLICT_PAIRS = [
  ['create_resource', 'approve_resource'],
  ['edit_resource', 'approve_resource'],
  ['create_resource', 'view_audit'],
  // Second-line independence: whoever reviews for compliance or legal
  // must not hold edit rights over the same scope.
  ['edit_resource', 'compliance_review'],
  ['edit_resource', 'legal_review'],
]

function scopesOverlap(nodeA, nodeB) {
  return isSelfOrAncestor(nodeA, nodeB) || isSelfOrAncestor(nodeB, nodeA)
}

/**
 * Would granting `roleId` at `nodeId` create a conflicting-duties pair
 * with a grant the principal already holds at an overlapping scope?
 * Returns null or { pair, withGrant, message }.
 */
export function sodConflictFor({ principalId, roleId, nodeId, tenantId }) {
  const newRole = ROLES.find(r => r.id === roleId)
  if (!newRole) return null
  const newPerms = new Set(newRole.permissions)
  for (const g of activeGrantsOf(principalId, tenantId)) {
    if (!scopesOverlap(g.scope.nodeId, nodeId)) continue
    const heldRole = ROLES.find(r => r.id === g.roleId)
    const heldPerms = new Set(heldRole?.permissions || [])
    for (const [a, b] of SOD_CONFLICT_PAIRS) {
      const clash = (newPerms.has(a) && heldPerms.has(b)) || (newPerms.has(b) && heldPerms.has(a))
      if (clash) {
        return {
          pair: [a, b],
          withGrant: g,
          message: `Conflicting duties: ${newRole.name} (${newPerms.has(a) ? a : b}) clashes with ${heldRole.name} at ${nodeById(g.scope.nodeId)?.name} (${newPerms.has(a) ? b : a}). A named exception with an approver is required.`,
        }
      }
    }
  }
  return null
}

/**
 * Standing SoD findings: every user currently holding a conflicting
 * permission pair on overlapping scopes, with the covering named
 * exception when one is recorded. The panel that renders this is the
 * difference between "the product tolerates conflicts" and "conflicts
 * are detected and governed".
 */
export function standingSodFindings(tenantId = 'meridian', now = Date.now()) {
  const findings = []
  const userIds = [...new Set(GRANTS.filter(g => g.principal.type === 'user' && g.tenantId === tenantId).map(g => g.principal.id))]
  for (const userId of userIds) {
    const mine = activeGrantsOf(userId, tenantId, now)
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        const a = mine[i], b = mine[j]
        if (!scopesOverlap(a.scope.nodeId, b.scope.nodeId)) continue
        const pa = new Set(ROLES.find(r => r.id === a.roleId)?.permissions || [])
        const pb = new Set(ROLES.find(r => r.id === b.roleId)?.permissions || [])
        for (const [x, y] of SOD_CONFLICT_PAIRS) {
          const clash = (pa.has(x) && pb.has(y)) || (pa.has(y) && pb.has(x))
          if (!clash) continue
          const exception = [a, b].map(g => g.conditions?.sodException)
            .find(e => e && e.pair && ((e.pair[0] === x && e.pair[1] === y) || (e.pair[0] === y && e.pair[1] === x)))
          findings.push({ userId, pair: [x, y], grants: [a, b], exception: exception || null })
        }
      }
    }
  }
  return findings
}

/** Non-expired tenant-admin grants in a tenant (rule 7 last-admin guard). */
function tenantAdminGrants(tenantId, now = Date.now()) {
  return GRANTS.filter(g => g.tenantId === tenantId && g.roleId === 'tenant-admin'
    && (!g.conditions?.expiresAt || new Date(g.conditions.expiresAt).getTime() > now))
}

let _seq = 5000
function nextId(prefix) { _seq += 1; return `${prefix}-${_seq}` }

function appendAdminEvent({ actorId, action, tenantId, scopeId, targetUser, roleId, details, internal }) {
  AUDIT_LOG.unshift({
    id: nextId('al'),
    timestamp: new Date().toISOString(),
    actor: actorId,
    action,
    // Unified-log aliases (rule 10)
    actorId,
    eventType: action,
    reason: details,
    tenantId,
    scopeId,
    targetUser: targetUser || null,
    roleId: roleId || null,
    details,
    internal: internal || false,
  })
}

/** Add a user to the directory (invite flow). */
export function addUser({ name, email, actorId, tenantId }) {
  const id = nextId('user')
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const user = { id, name, initials, email, status: 'offline', lastActive: new Date().toISOString() }
  USERS.push(user)
  appendAdminEvent({
    actorId, action: 'member.added', tenantId,
    scopeId: ORG_NODES.find(n => n.tenantId === tenantId && !n.parentId)?.id,
    targetUser: id,
    details: `Invited ${name} to ${TENANTS.find(t => t.id === tenantId)?.name}`,
  })
  bumpRbac()
  return user
}

/**
 * Create a grant. Returns { grant } or { error } — never throws for a
 * policy refusal. The scope's node type is recorded on the grant so the
 * engine and the UI agree about the grant's altitude.
 */
export function addGrant({ principal, roleId, nodeId, tenantId, conditions = {}, actorId, sodException }) {
  const node = nodeById(nodeId)
  const role = ROLES.find(r => r.id === roleId)
  if (!node || !role) return { error: 'Unknown role or scope node' }
  const p = typeof principal === 'string' ? { type: 'user', id: principal } : principal

  // Rule 7: the granter's own permissions and subtree bound what they
  // can hand out. Refusals are returned, never thrown — the UI shows them.
  const refusal = grantRefusalReason({ actorId, roleId, nodeId, tenantId, principalId: p.type === 'user' ? p.id : null })
  if (refusal) return { error: refusal }

  // Platform access is never standing (point 4, ruled 2026-09-21):
  // support-operator and arbitr-global-admin exist only as
  // just-in-time grants — customer-approved and time-boxed.
  if (['arbitr-global-admin', 'support-operator'].includes(roleId)
    && !(conditions.requiresApproval && conditions.expiresAt)) {
    return { error: `${role.name} is platform access — it can only be granted just-in-time (customer approval required, expiry required), never as standing access` }
  }

  // Rule 8: conflicting duties are caught at assign time. A named
  // exception (approver + reason) records the override on the grant.
  if (p.type === 'user') {
    const conflict = sodConflictFor({ principalId: p.id, roleId, nodeId, tenantId })
    if (conflict && !sodException) return { conflict }
    if (conflict && sodException) {
      const plan = planAllows(tenantId, 'sod-exceptions')
      if (!plan.allow) return { error: plan.detail, reason: 'plan' }
      conditions = { ...conditions, sodException: { ...sodException, pair: conflict.pair, at: new Date().toISOString() } }
    }
  }

  const grant = {
    id: nextId('ra'),
    principal: p,
    tenantId,
    roleId,
    scope: { nodeId, type: node.type },
    conditions,
    assignedBy: actorId,
    assignedAt: new Date().toISOString(),
    lastUsedAt: null,
  }
  GRANTS.push(grant)
  const who = p.type === 'user' ? (USERS.find(u => u.id === p.id)?.name || p.id) : `${p.type} ${p.id}`
  appendAdminEvent({
    actorId, action: 'role.assigned', tenantId, scopeId: nodeId, targetUser: p.type === 'user' ? p.id : null, roleId,
    details: `Assigned ${role.name} at ${node.name} to ${who}${node.barrier ? ' — barrier crossing' : ''}${conditions.expiresAt ? ` (expires ${conditions.expiresAt.slice(0, 10)})` : ''}${conditions.sodException ? ` — SoD exception approved by ${conditions.sodException.approvedBy}` : ''}`,
  })
  bumpRbac()
  return { grant }
}

/** Remove a grant. Returns { removed } or { error }. */
export function removeGrant({ grantId, actorId }) {
  const idx = GRANTS.findIndex(g => g.id === grantId)
  if (idx === -1) return { error: 'Grant not found' }
  const g = GRANTS[idx]
  // Rule 7: the last Tenant Admin grant cannot be removed — a tenant
  // with no admin is unrecoverable in this model.
  if (g.roleId === 'tenant-admin' && tenantAdminGrants(g.tenantId).length <= 1) {
    return { error: 'Cannot remove the last Tenant Admin grant — assign another Tenant Admin first' }
  }
  const role = ROLES.find(r => r.id === g.roleId)
  const node = nodeById(g.scope.nodeId)
  const who = g.principal.type === 'user' ? (USERS.find(u => u.id === g.principal.id)?.name || g.principal.id) : `${g.principal.type} ${g.principal.id}`
  GRANTS.splice(idx, 1)
  appendAdminEvent({
    actorId, action: 'role.removed', tenantId: g.tenantId, scopeId: g.scope.nodeId,
    targetUser: g.principal.type === 'user' ? g.principal.id : null, roleId: g.roleId,
    details: `Removed ${role?.name} at ${node?.name} from ${who}`,
  })
  bumpRbac()
  return { removed: g }
}

/** Remove every grant a user holds in a tenant (remove-member flow). */
export function removeAllGrantsForUser({ userId, tenantId, actorId }) {
  const mine = GRANTS.filter(g => g.principal.type === 'user' && g.principal.id === userId && g.tenantId === tenantId)
  if (mine.some(g => g.roleId === 'tenant-admin') && tenantAdminGrants(tenantId).length <= mine.filter(g => g.roleId === 'tenant-admin').length) {
    return { error: 'Cannot remove this member — they hold the last Tenant Admin grant. Assign another Tenant Admin first' }
  }
  for (const g of mine) {
    const idx = GRANTS.indexOf(g)
    if (idx !== -1) GRANTS.splice(idx, 1)
  }
  const user = USERS.find(u => u.id === userId)
  appendAdminEvent({
    actorId, action: 'member.removed', tenantId,
    scopeId: ORG_NODES.find(n => n.tenantId === tenantId && !n.parentId)?.id,
    targetUser: userId,
    details: `Removed ${user?.name || userId} from ${TENANTS.find(t => t.id === tenantId)?.name}`,
  })
  bumpRbac()
  return { removed: mine.length }
}

/* ─── Org structure: barriers (rules 4 + 11) ───────────────────── */

/**
 * Set or clear an information barrier on a node. Enterprise-only
 * (rule 11): on lower plans this returns { error, reason: 'plan' } so
 * the UI can show the upsell. The granter needs manage_structure
 * covering the node.
 */
export function setNodeBarrier({ nodeId, barrier, barrierReason, actorId, tenantId = 'meridian' }) {
  const node = nodeById(nodeId)
  if (!node) return { error: 'Unknown node' }
  const plan = planAllows(tenantId, 'barriers')
  if (!plan.allow) return { error: plan.detail, reason: 'plan' }
  const held = granterPermissionsAt(actorId, tenantId, nodeId)
  if (!held.has('*') && !held.has('manage_structure')) {
    return { error: `Changing barriers on ${node.name} requires manage_structure there` }
  }
  node.barrier = !!barrier
  node.barrierReason = barrier ? (barrierReason || 'Information barrier') : undefined
  appendAdminEvent({
    actorId, action: barrier ? 'structure.barrier-set' : 'structure.barrier-removed',
    tenantId, scopeId: nodeId,
    details: barrier
      ? `Information barrier set on ${node.name} — inherited access now stops here`
      : `Information barrier removed from ${node.name}`,
  })
  bumpRbac()
  return { node }
}

/* ─── JIT approval (rule 5, ruled 2026-09-17) ──────────────────── */

/**
 * Activate a pending (requiresApproval) grant. Only an actor holding
 * manage_members (or *) covering the grant's scope may approve —
 * support access is approved by the CUSTOMER, never by the platform.
 */
export function approveGrant({ grantId, actorId }) {
  const g = GRANTS.find(x => x.id === grantId)
  if (!g) return { error: 'Grant not found' }
  if (!g.conditions?.requiresApproval) return { error: 'This grant does not require approval' }
  if (g.conditions.approval) return { error: 'Already approved' }
  const held = granterPermissionsAt(actorId, g.tenantId, g.scope.nodeId)
  if (!held.has('*') && !held.has('manage_members')) {
    return { error: 'Approving this access requires manage_members at its scope' }
  }
  g.conditions = { ...g.conditions, approval: { approvedBy: actorId, at: new Date().toISOString() } }
  appendAdminEvent({
    actorId, action: 'grant.approved', tenantId: g.tenantId, scopeId: g.scope.nodeId,
    targetUser: g.principal.type === 'user' ? g.principal.id : null, roleId: g.roleId,
    details: `Approved ${g.principal.type} ${g.principal.id} — ${g.conditions.justification || 'no justification recorded'}${g.conditions.expiresAt ? ` (expires ${g.conditions.expiresAt.slice(0, 10)})` : ''}`,
    internal: true,
  })
  bumpRbac()
  return { grant: g }
}

/* ─── Org structure: moving nodes (demo surface 3) ─────────────── */

/**
 * What would change if `nodeId` moved under `newParentId`? Pure
 * simulation: apply, measure effective members across the moved
 * subtree, revert. Returns { gained, lost, barrierNote } where gained/
 * lost are [{ name, nodeName }] of person-level access changes.
 */
export function previewMove({ nodeId, newParentId }) {
  const node = nodeById(nodeId)
  const newParent = nodeById(newParentId)
  if (!node || !newParent) return { error: 'Unknown node' }
  if (nodeId === newParentId || isSelfOrAncestor(nodeId, newParentId)) {
    return { error: 'Cannot move a node under itself or its own subtree' }
  }
  const subtree = [nodeId, ...ORG_NODES.filter(n => isSelfOrAncestor(nodeId, n.id) && n.id !== nodeId).map(n => n.id)]
  const snapshot = (id) => new Set(effectiveMembers(id).map(m => `${m.user.id}`))
  const beforeSets = new Map(subtree.map(id => [id, snapshot(id)]))
  const oldParent = node.parentId
  node.parentId = newParentId
  const gained = []
  const lost = []
  for (const id of subtree) {
    const after = snapshot(id)
    const before = beforeSets.get(id)
    const nodeName = nodeById(id)?.name
    for (const uid of after) if (!before.has(uid)) gained.push({ userId: uid, nodeName })
    for (const uid of before) if (!after.has(uid)) lost.push({ userId: uid, nodeName })
  }
  node.parentId = oldParent
  const barrierOnPath = (() => {
    let cur = newParent
    while (cur) { if (cur.barrier) return cur; cur = cur.parentId ? nodeById(cur.parentId) : null }
    return node.barrier ? node : null
  })()
  return { gained, lost, barrierNote: barrierOnPath ? `The new location sits ${barrierOnPath.id === nodeId ? 'behind its own' : `behind the ${barrierOnPath.name}`} information barrier — inherited access changes accordingly.` : null }
}

/** Apply a move. manage_structure required; one audit event. */
export function moveNode({ nodeId, newParentId, actorId, tenantId = 'meridian' }) {
  const node = nodeById(nodeId)
  const newParent = nodeById(newParentId)
  if (!node || !newParent) return { error: 'Unknown node' }
  if (nodeId === newParentId || isSelfOrAncestor(nodeId, newParentId)) {
    return { error: 'Cannot move a node under itself or its own subtree' }
  }
  const held = granterPermissionsAt(actorId, tenantId, node.parentId || nodeId)
  if (!held.has('*') && !held.has('manage_structure')) {
    return { error: `Moving ${node.name} requires manage_structure over it` }
  }
  const from = nodeById(node.parentId)
  node.parentId = newParentId
  appendAdminEvent({
    actorId, action: 'structure.moved', tenantId, scopeId: nodeId,
    details: `Moved ${node.name} from ${from?.name || 'root'} to ${newParent.name} — inherited access recomputed`,
  })
  bumpRbac()
  return { node }
}
