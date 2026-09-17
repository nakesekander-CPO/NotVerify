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
import { bumpRbac } from './engine'

function nodeById(id) { return ORG_NODES.find(n => n.id === id) || null }

let _seq = 5000
function nextId(prefix) { _seq += 1; return `${prefix}-${_seq}` }

function appendAdminEvent({ actorId, action, tenantId, scopeId, targetUser, roleId, details, internal }) {
  AUDIT_LOG.unshift({
    id: nextId('al'),
    timestamp: new Date().toISOString(),
    actor: actorId,
    action,
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
export function addGrant({ principal, roleId, nodeId, tenantId, conditions = {}, actorId }) {
  const node = nodeById(nodeId)
  const role = ROLES.find(r => r.id === roleId)
  if (!node || !role) return { error: 'Unknown role or scope node' }
  const p = typeof principal === 'string' ? { type: 'user', id: principal } : principal
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
    details: `Assigned ${role.name} at ${node.name} to ${who}${node.barrier ? ' — barrier crossing' : ''}${conditions.expiresAt ? ` (expires ${conditions.expiresAt.slice(0, 10)})` : ''}`,
  })
  bumpRbac()
  return { grant }
}

/** Remove a grant. Returns { removed } or { error }. */
export function removeGrant({ grantId, actorId }) {
  const idx = GRANTS.findIndex(g => g.id === grantId)
  if (idx === -1) return { error: 'Grant not found' }
  const g = GRANTS[idx]
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
