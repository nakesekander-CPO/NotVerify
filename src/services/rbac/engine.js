/**
 * arbitr RBAC engine — the ONE decision point.
 *
 * Every access answer in the app comes from `can()`. Services enforce
 * (and audit) through `authorize()`. UI surfaces read through the
 * selectors (`effectiveMembers`, `grantsForUser`, `rolesOfUser`).
 * Nothing outside this folder may read GRANTS to make its own decision —
 * enforced by engine.boundary.test.js.
 *
 * Resolution order (deterministic, never array-order):
 *   explicit deny > nearest-scope allow > inherited allow.
 * Conditions (expiry today; assigned-only, residency, plan as they land)
 * are evaluated on every call — including member lists and tree counts.
 * Inheritance stops at a node marked `barrier: true`; reaching a walled
 * node requires a grant scoped at or below it (an explicit "crossing").
 */

import { useCallback, useState } from 'react'
import {
  GRANTS, ROLES, ORG_NODES, USERS, TENANTS, AUDIT_LOG, getNodePath, getNodeDescendants,
} from '../../data/rbacModel'

/* ─── Store: mutable module state + re-render hook ─────────────── */

let _tick = 0
const _subs = new Set()

/** Notify subscribed components that grants/audit changed. */
export function bumpRbac() {
  _tick += 1
  _subs.forEach(fn => fn(_tick))
}

/** Subscribe a component to RBAC store mutations. */
export function useRbacStore() {
  const [, setT] = useState(0)
  const refresh = useCallback(() => setT(t => t + 1), [])
  useState(() => { _subs.add(refresh); return 0 })
  return { grants: GRANTS, users: USERS, audit: AUDIT_LOG, refresh }
}

/* ─── Internals ────────────────────────────────────────────────── */

function nodeById(id) { return ORG_NODES.find(n => n.id === id) || null }
function roleById(id) { return ROLES.find(r => r.id === id) || null }

/** Chain from a node up to its root: [node, parent, …, root]. */
function ancestryOf(nodeId) {
  const out = []
  let cur = nodeById(nodeId)
  while (cur) { out.push(cur); cur = cur.parentId ? nodeById(cur.parentId) : null }
  return out
}

/** Accept a bare userId string or a {type,id} principal. */
export function normalizePrincipal(p) {
  if (!p) return null
  return typeof p === 'string' ? { type: 'user', id: p } : p
}

/**
 * Does this grant's scope cover `nodeId`?
 * depth 0 = direct grant at the node; N = grant N levels above.
 * A `barrier: true` node blocks inheritance from ABOVE it: a grant only
 * reaches a walled node (or its children) if the grant's scope sits at
 * or below the barrier. That direct grant is the "crossing".
 */
function scopeCovers(grant, nodeId) {
  const chain = ancestryOf(nodeId)
  const idx = chain.findIndex(n => n.id === grant.scope.nodeId)
  if (idx === -1) return { covers: false }
  for (let i = 0; i < idx; i++) {
    if (chain[i].barrier) return { covers: false, blockedByBarrier: chain[i] }
  }
  return { covers: true, depth: idx }
}

function isExpired(grant, now) {
  const exp = grant.conditions?.expiresAt
  return exp ? new Date(exp).getTime() <= now : false
}

/** Deterministic ordering: nearest scope first, then oldest, then id. */
function byPrecedence(a, b) {
  return a.cov.depth - b.cov.depth
    || String(a.g.assignedAt).localeCompare(String(b.g.assignedAt))
    || String(a.g.id).localeCompare(String(b.g.id))
}

function scopeNameOf(grant) { return nodeById(grant.scope.nodeId)?.name || grant.scope.nodeId }

/* ─── Plan gating (rule 11) ────────────────────────────────────── */

/** Capabilities gated to the Enterprise plan (ruled 2026-09-17). */
export const ENTERPRISE_CAPABILITIES = new Set([
  'barriers', 'custom-roles', 'access-reviews', 'residency', 'agent-principals', 'sod-exceptions',
])

export function tenantPlan(tenantId) {
  return TENANTS.find(t => t.id === tenantId)?.plan || 'standard'
}

/** Demo switcher hook: the tier preview writes the tenant's real plan. */
export function setTenantPlan(tenantId, plan) {
  const t = TENANTS.find(x => x.id === tenantId)
  if (t) { t.plan = plan; bumpRbac() }
}

/**
 * Plan check for a capability. Denies with reason 'plan' — the UI shows
 * the upsell rather than hiding the capability.
 */
export function planAllows(tenantId, capability) {
  if (!ENTERPRISE_CAPABILITIES.has(capability)) return { allow: true }
  const plan = tenantPlan(tenantId)
  if (plan === 'enterprise') return { allow: true }
  return {
    allow: false,
    reason: 'plan',
    detail: `${capability.replace(/-/g, ' ')} is an Enterprise capability — the ${plan} plan does not include it`,
  }
}

/* ─── The decision function ────────────────────────────────────── */

/**
 * can({ principal, permission, nodeId, tenantId, at })
 * → { allow, reason, grantId, decisivePolicy, role? }
 *
 * `nodeId` is REQUIRED: a scope-blind access check is a developer error,
 * not a deny.
 */
export function can({ principal, permission, nodeId, tenantId, at, context } = {}) {
  if (!nodeId) throw new Error('rbac.can(): nodeId is required — every access check is scoped to an org node')
  if (!permission) throw new Error('rbac.can(): permission is required')
  const p = normalizePrincipal(principal)
  if (!p || !p.id) throw new Error('rbac.can(): principal is required ({type,id} or a userId string)')

  const now = at ? new Date(at).getTime() : Date.now()
  const node = nodeById(nodeId)
  if (!node) throw new Error(`rbac.can(): unknown nodeId "${nodeId}"`)
  const tenant = tenantId || node.tenantId

  // Rule 11: agent principals are an Enterprise capability. The deny
  // names the plan so the UI can show the upsell, not a mystery.
  if (p.type === 'agent') {
    const plan = planAllows(tenant, 'agent-principals')
    if (!plan.allow) {
      return { allow: false, reason: plan.detail, grantId: null, decisivePolicy: 'plan' }
    }
  }

  const candidates = GRANTS.filter(g =>
    g.principal.type === p.type && g.principal.id === p.id && g.tenantId === tenant)
  if (candidates.length === 0) {
    return { allow: false, reason: `No grant exists for ${p.type} "${p.id}" in this tenant`, grantId: null, decisivePolicy: 'no-grant' }
  }

  const evaluated = candidates.map(g => {
    const role = roleById(g.roleId)
    const hasPerm = !!role && (role.permissions.includes('*') || role.permissions.includes(permission))
    // assignedOnly: the grant only works on work the principal is assigned
    // to — callers supply context.assignedUserIds for the entity at hand.
    const assignedBlocked = !!g.conditions?.assignedOnly
      && !(context?.assignedUserIds || []).includes(p.id)
    return { g, role, hasPerm, cov: scopeCovers(g, nodeId), expired: isExpired(g, now), assignedBlocked }
  })

  // 1. Explicit deny beats everything.
  const denies = evaluated
    .filter(e => e.g.effect === 'deny' && e.hasPerm && e.cov.covers && !e.expired && !e.assignedBlocked)
    .sort(byPrecedence)
  if (denies.length) {
    const e = denies[0]
    return { allow: false, reason: `Explicit deny: ${e.role.name} denied at ${scopeNameOf(e.g)} (grant ${e.g.id})`, grantId: e.g.id, decisivePolicy: 'explicit-deny', role: e.role }
  }

  // 2. Nearest-scope allow, then inherited allow (same comparator).
  const allows = evaluated
    .filter(e => (e.g.effect ?? 'allow') === 'allow' && e.hasPerm && e.cov.covers && !e.expired && !e.assignedBlocked)
    .sort(byPrecedence)
  if (allows.length) {
    const e = allows[0]
    const direct = e.cov.depth === 0
    return {
      allow: true,
      reason: `${direct ? 'Direct' : 'Inherited'}: ${e.role.name} at ${scopeNameOf(e.g)} (grant ${e.g.id})`,
      grantId: e.g.id,
      decisivePolicy: direct ? 'nearest-allow' : 'inherited-allow',
      role: e.role,
    }
  }

  // 3. Denied — explain the most informative near-miss.
  const expiredHit = evaluated.filter(e => e.hasPerm && e.cov.covers && e.expired).sort(byPrecedence)[0]
  if (expiredHit) {
    const when = new Date(expiredHit.g.conditions.expiresAt).toISOString().slice(0, 10)
    return { allow: false, reason: `Grant ${expiredHit.g.id} (${expiredHit.role.name} at ${scopeNameOf(expiredHit.g)}) expired ${when}`, grantId: expiredHit.g.id, decisivePolicy: 'expired', role: expiredHit.role }
  }
  // Barrier explains the denial even for an expired grant — a fresh one
  // would not have crossed the wall either.
  const barrierHit = evaluated.find(e => e.hasPerm && e.cov.blockedByBarrier)
  if (barrierHit) {
    const wall = barrierHit.cov.blockedByBarrier
    return { allow: false, reason: `Information barrier on ${wall.name}: inherited access from ${scopeNameOf(barrierHit.g)} stops at the barrier — a direct, audited crossing grant is required`, grantId: barrierHit.g.id, decisivePolicy: 'barrier', role: barrierHit.role }
  }
  const assignedHit = evaluated.find(e => e.hasPerm && e.cov.covers && !e.expired && e.assignedBlocked)
  if (assignedHit) {
    return { allow: false, reason: `${assignedHit.role.name} at ${scopeNameOf(assignedHit.g)} is assigned-only — ${p.id} is not assigned to this work`, grantId: assignedHit.g.id, decisivePolicy: 'assigned-only', role: assignedHit.role }
  }
  const scopeMiss = evaluated.find(e => e.hasPerm && !e.expired)
  if (scopeMiss) {
    return { allow: false, reason: `${scopeMiss.role.name} at ${scopeNameOf(scopeMiss.g)} does not cover ${node.name}`, grantId: null, decisivePolicy: 'out-of-scope', role: scopeMiss.role }
  }
  return { allow: false, reason: `No held role grants "${permission}"`, grantId: null, decisivePolicy: 'no-permission' }
}

/* ─── Enforcement wrapper: decide + audit + lastUsedAt ─────────── */

let _evSeq = 1000
function nextEventId() { _evSeq += 1; return `al-${_evSeq}` }

/** Append one decision event to the single audit log. */
function appendAccessEvent({ p, permission, nodeId, tenant, decision, context }) {
  const action = decision.allow ? 'access.allowed' : 'access.denied'
  AUDIT_LOG.unshift({
    id: nextEventId(),
    timestamp: new Date().toISOString(),
    actor: p.id,
    actorType: p.type,
    action,
    // Unified-log aliases (rule 10)
    actorId: p.id,
    actorRole: decision.role?.id || null,
    eventType: action,
    reason: decision.reason,
    projectId: context?.projectId || null,
    tenantId: tenant,
    scopeId: nodeId,
    targetUser: null,
    roleId: decision.role?.id || null,
    permission,
    grantId: decision.grantId,
    decisivePolicy: decision.decisivePolicy,
    details: decision.reason,
    internal: p.id === 'support-bot' || p.type === 'support-session' || undefined,
    context: context || undefined,
  })
}

/**
 * authorize(...) — the enforcing form of can(): same decision, plus
 * exactly one audit event (allow or deny) and a lastUsedAt bump on the
 * decisive grant. Services go through this; pure UI rendering uses can().
 */
export function authorize({ principal, permission, nodeId, tenantId, at, context } = {}) {
  const p = normalizePrincipal(principal) || { type: 'user', id: 'anonymous' }
  // Developer errors (missing nodeId etc.) propagate from can() — they are
  // bugs, not denials, and must never be swallowed into an audit event.
  const decision = can({ principal: p, permission, nodeId, tenantId, at, context })
  const tenant = tenantId || nodeById(nodeId)?.tenantId
  if (decision.allow && decision.grantId) {
    const g = GRANTS.find(x => x.id === decision.grantId)
    if (g) g.lastUsedAt = new Date(at ?? Date.now()).toISOString()
  }
  appendAccessEvent({ p, permission, nodeId, tenant, decision, context })
  bumpRbac()
  return decision
}

/* ─── Selectors (display reads — same conditions, same barriers) ── */

/**
 * People (not grants) with access at a node. Each entry:
 * { user, grants: [{ grant, role, scopeNode, isDirect, inheritancePath }] }.
 * Expired grants and barrier-blocked inheritance are excluded — the tree,
 * the counts, and the member panels all tell the same story as can().
 */
export function effectiveMembers(nodeId, { at } = {}) {
  const now = at ? new Date(at).getTime() : Date.now()
  const node = nodeById(nodeId)
  if (!node) return []
  const byPerson = new Map()
  for (const g of GRANTS) {
    if (g.tenantId !== node.tenantId) continue
    if ((g.effect ?? 'allow') !== 'allow') continue
    if (isExpired(g, now)) continue
    const cov = scopeCovers(g, nodeId)
    if (!cov.covers) continue
    const role = roleById(g.roleId)
    const user = g.principal.type === 'user' ? USERS.find(u => u.id === g.principal.id) : null
    if (!role || !user) continue
    const entry = byPerson.get(user.id) || { user, grants: [] }
    entry.grants.push({
      grant: g,
      role,
      scopeNode: nodeById(g.scope.nodeId),
      isDirect: cov.depth === 0,
      inheritancePath: cov.depth === 0 ? null : getNodePath(g.scope.nodeId).map(n => n.name).join(' > '),
    })
    byPerson.set(user.id, entry)
  }
  return [...byPerson.values()]
}

/**
 * A user's grants in a tenant, decorated for display (role, scope node,
 * covered nodes — barrier- and expiry-aware).
 */
export function grantsForUser(userId, tenantId, { at } = {}) {
  const now = at ? new Date(at).getTime() : Date.now()
  return GRANTS
    .filter(g => g.principal.type === 'user' && g.principal.id === userId && g.tenantId === tenantId)
    .map(g => {
      const scopeNode = nodeById(g.scope.nodeId)
      const covered = scopeNode
        ? [scopeNode, ...getNodeDescendants(g.scope.nodeId).filter(d => scopeCovers(g, d.id).covers)]
        : []
      return {
        grant: g,
        role: roleById(g.roleId),
        scopeNode,
        coveredNodes: covered,
        path: getNodePath(g.scope.nodeId),
        expired: isExpired(g, now),
      }
    })
}

/** Grants scoped directly at a node (active only) — for tree badges. */
export function grantsAtNode(nodeId, { at } = {}) {
  const now = at ? new Date(at).getTime() : Date.now()
  return GRANTS.filter(g => g.scope.nodeId === nodeId && !isExpired(g, now))
}

/** Display: a user's most senior grant (tenant scope first, then oldest). */
export function primaryRoleOf(userId, tenantId = 'meridian') {
  const mine = GRANTS.filter(g => g.principal.type === 'user' && g.principal.id === userId && g.tenantId === tenantId)
  if (!mine.length) return null
  const best = [...mine].sort((a, b) =>
    (a.scope.type === 'tenant' ? 0 : 1) - (b.scope.type === 'tenant' ? 0 : 1)
    || String(a.assignedAt).localeCompare(String(b.assignedAt))
    || String(a.id).localeCompare(String(b.id)))[0]
  return { role: roleById(best.roleId), tenantId: best.tenantId, grant: best }
}

/** Distinct roles a user holds anywhere in a tenant — for display only. */
export function rolesOfUser(userId, tenantId = 'meridian') {
  const seen = new Map()
  for (const g of GRANTS) {
    if (g.principal.type !== 'user' || g.principal.id !== userId) continue
    if (tenantId && g.tenantId !== tenantId) continue
    const role = roleById(g.roleId)
    if (role) seen.set(role.id, role)
  }
  return [...seen.values()]
}
