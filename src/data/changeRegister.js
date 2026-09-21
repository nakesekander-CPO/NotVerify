/**
 * Governed Change Register — versioned claims with scope, evidence,
 * owners, and federated approval (ruled 2026-09-21).
 *
 * A CLAIM is a proposed new version of something the platform governs —
 * a Cortex fact, an agent, a model, or a billing term — pinned to an org
 * altitude (Global Company → Country Business → Business Unit →
 * Department/Team). The blast radius scales with altitude: a Global
 * change impacts everyone; a department change impacts one team.
 *
 * Approval model (ruled 2026-09-21): a Global-scope BUSINESS claim fans
 * out into one sign-off per Country Business — Japan, Germany and New
 * Zealand each sign before it publishes. Administrative claims (billing
 * terms) keep a single slot at their scope, because admin authority is
 * genuinely hierarchical while business sign-off is federated.
 *
 * Every sign/decline/re-affirm decision goes through the ONE RBAC engine
 * (`authorize`) — the admin/business split, barriers, expiry, residency
 * and scope rules all apply — and lands in the ONE audit log.
 *
 * Downstream local EXCEPTIONS survive a parent publish but flip to
 * "re-affirmation required" with a named owner: nothing silently breaks,
 * and the re-check is visible work.
 *
 * Import direction: this module reads cortex / modelRegistry / rbacModel /
 * the engine. Nothing in those modules may import this one.
 */

import { useState, useCallback } from 'react'
import {
  ORG_NODES, AUDIT_LOG, USERS,
  getNodeChildren, getNodeDescendants, getNodePath,
} from './rbacModel'
import { authorize, effectiveMembers, BUSINESS_DECISION_PERMISSIONS } from '../services/rbac/engine'
import { FACTS, MEMORY_AT_WORK } from './cortex'
import { getModelById, agentsUsingModel, recordModelVersion } from './modelRegistry'

/* ─── Kind catalogue ───────────────────────────────────────────── */

export const CLAIM_KIND_META = {
  fact:    { label: 'Terminology & policy', permission: 'approve_org_brain' },
  model:   { label: 'Model',                permission: 'approve_resource' },
  agent:   { label: 'Agent',                permission: 'approve_resource' },
  billing: { label: 'Billing term',         permission: 'manage_billing' },
}

export function claimPermission(claim) {
  return CLAIM_KIND_META[claim.kind]?.permission || 'approve_resource'
}

/* ─── Seeds — claims ───────────────────────────────────────────── */

export const CLAIMS = [
  // THE live demo beat: a Global Company terminology claim. Germany has
  // already ratified; Japan and New Zealand sign live, and the last
  // signature publishes the claim and flips the two local exceptions
  // below to re-affirmation required.
  {
    id: 'CHG-2026-041',
    kind: 'fact',
    refId: 'term',
    title: 'Goodwill (のれん) — approved rendering v3.0',
    summary: 'Retires the v2.0 gloss. のれん is rendered "Goodwill" in every English disclosure; marketing paraphrases such as "goodwill premium" remain banned. v3.0 adds the katakana first-use rule to the group glossary.',
    scopeNodeId: 'mc-root',
    ownerId: 'yuki',
    version: { from: 'v2.0', to: 'v3.0' },
    evidence: [
      { label: 'IFRS terminology memo — group finance', src: 'ifrs-terminology-memo-2026.pdf', date: '2026-09-08' },
      { label: 'Group glossary diff v2.0 → v3.0', src: 'group-glossary-v3-diff.html', date: '2026-09-10' },
      { label: 'Cortex receipt — 23 violations caught this quarter', src: 'cortex · approved terminology', date: '2026-09-12' },
    ],
    approvals: [
      { unitNodeId: 'mc-japan',   status: 'pending', by: null,    at: null, note: null },
      { unitNodeId: 'mc-germany', status: 'signed',  by: 'priya', at: '2026-09-15T10:20:00Z', note: 'HGB format exception flagged for re-affirmation on publish.' },
      { unitNodeId: 'mc-nz',      status: 'pending', by: null,    at: null, note: null },
    ],
    status: 'pending',
    proposedAt: '2026-09-12T08:00:00Z',
    decidedAt: null,
  },
  // A pending MODEL version claim at business-unit altitude — the same
  // mechanism wrapping the Model Registry; a single slot Sarah can sign.
  {
    id: 'CHG-2026-039',
    kind: 'model',
    refId: 'MDL-1005',
    title: 'Meridian JA Disclosure v1.0 → v1.1',
    summary: 'Fine-tune refresh on the 2026 H1 disclosure corpus. Terminology adherence eval up 89 → 93; no residency or guardrail changes.',
    scopeNodeId: 'mc-japan-securities',
    ownerId: 'kenji',
    version: { from: 'v1.0', to: 'v1.1' },
    evidence: [
      { label: 'Eval report — terminology adherence 89 → 93', src: 'mdl-1005-eval-2026-09.html', date: '2026-09-13' },
      { label: 'Training-corpus provenance note', src: 'ja-disclosure-corpus-h1-2026.pdf', date: '2026-09-11' },
    ],
    approvals: [
      { unitNodeId: 'mc-japan-securities', status: 'pending', by: null, at: null, note: null },
    ],
    status: 'pending',
    proposedAt: '2026-09-14T08:00:00Z',
    decidedAt: null,
  },
  // The department-altitude contrast: one node, a handful of people,
  // no exceptions — approved in June, matching the Cortex fact's chain.
  {
    id: 'CHG-2026-036',
    kind: 'fact',
    refId: 'numericFormat',
    title: 'Numeric format rules v2.0 — negative values in tables',
    summary: 'Tables in JA filings render negative values per the Financial Reporting house style; v2.0 extends the rounding standard to appendix tables.',
    scopeNodeId: 'mc-japan-finance',
    ownerId: 'kenji',
    version: { from: 'v1.0', to: 'v2.0' },
    evidence: [
      { label: 'House style note — Financial Reporting', src: 'numeric-format-standard.pdf', date: '2026-06-01' },
    ],
    approvals: [
      { unitNodeId: 'mc-japan-finance', status: 'signed', by: 'sarah', at: '2026-06-05T09:30:00Z', note: null },
    ],
    status: 'approved',
    proposedAt: '2026-06-01T08:00:00Z',
    decidedAt: '2026-06-05T09:30:00Z',
  },
  // An ADMINISTRATIVE claim: commercial terms on the invoice rail.
  // manage_billing is administration, not a business decision — so the
  // tenant admin's wildcard signs it (deliberate contrast with the
  // Global fact claim above, where the admin/business split refuses him).
  {
    id: 'CHG-2026-031',
    kind: 'billing',
    refId: 'enterprise-invoice',
    title: 'Payment terms — Net 30 → Net 45',
    summary: 'Group procurement renewal moves the invoice rail to Net 45 from the October cycle. Payment rail and credit wallets unchanged.',
    scopeNodeId: 'mc-root',
    ownerId: 'alex',
    version: { from: 'Net 30', to: 'Net 45' },
    evidence: [
      { label: 'Procurement renewal addendum 7', src: 'meridian-msa-addendum-7.pdf', date: '2026-08-28' },
    ],
    approvals: [
      { unitNodeId: 'mc-root', status: 'signed', by: 'alex', at: '2026-09-02T10:00:00Z', note: 'Administrative change — commercial terms, not a business sign-off.' },
    ],
    status: 'approved',
    proposedAt: '2026-08-30T08:00:00Z',
    decidedAt: '2026-09-02T10:00:00Z',
  },
]

/* ─── Seeds — exceptions ───────────────────────────────────────────
   A local, approved deviation from a governed claim's subject. It
   survives a parent publish, but flips to reaffirm-required. */

export const EXCEPTIONS = [
  {
    id: 'EXC-4', kind: 'fact', refId: 'term',
    nodeId: 'mc-japan-securities', ownerId: 'kenji',
    reason: 'Securities filings keep the katakana gloss のれん（グッドウィル）on first use — regulator reviewer preference on record.',
    approvedBy: 'sarah', approvedAt: '2026-06-18T09:00:00Z',
    status: 'in-force', reaffirmedBy: null, reaffirmedAt: null,
  },
  {
    id: 'EXC-5', kind: 'fact', refId: 'term',
    nodeId: 'mc-germany-pb', ownerId: 'marcus',
    reason: 'German client statements render the term per the HGB format note, not the group gloss.',
    approvedBy: 'james', approvedAt: '2026-07-02T11:00:00Z',
    status: 'in-force', reaffirmedBy: null, reaffirmedAt: null,
  },
  // Historic: left over from the June forward-looking update — shows a
  // re-affirmation that is already overdue when the demo starts.
  {
    id: 'EXC-2', kind: 'fact', refId: 'forwardLooking',
    nodeId: 'mc-nz-legal', ownerId: 'lena',
    reason: 'NZ legal opinions carry their own disclaimer block instead of the group safe-harbor paragraph.',
    approvedBy: 'james', approvedAt: '2026-04-10T09:00:00Z',
    status: 'reaffirm-required', reaffirmedBy: null, reaffirmedAt: null,
  },
]

/* ─── Tree + lookup helpers ────────────────────────────────────── */

const nodeById = (id) => ORG_NODES.find(n => n.id === id) || null
const userName = (id) => USERS.find(u => u.id === id)?.name || id

export function getClaimById(id) { return CLAIMS.find(c => c.id === id) || null }

/** The scope node plus everything under it. */
export function subtreeNodes(scopeNodeId) {
  const root = nodeById(scopeNodeId)
  if (!root) return []
  return [root, ...getNodeDescendants(scopeNodeId)]
}

/**
 * Who must ratify a claim (ruled 2026-09-21): a business claim at the
 * Global Company fans out to one slot per Country Business — vendor orgs
 * and root-level group departments are impacted but never ratifying
 * units. Everything else (narrower scope, or an administrative kind)
 * is a single slot at the claim's own scope node.
 */
export function approvalUnits(claim) {
  const scope = nodeById(claim.scopeNodeId)
  if (!scope) return []
  const isBusiness = BUSINESS_DECISION_PERMISSIONS.has(claimPermission(claim))
  if (isBusiness && scope.parentId === null) {
    return getNodeChildren(scope.id).filter(n => n.type === 'country')
  }
  return [scope]
}

/* ─── Impact map ───────────────────────────────────────────────── */

export const ALTITUDES = [
  { key: 'tenant',        label: 'Global Company' },
  { key: 'country',       label: 'Country Business' },
  { key: 'business-unit', label: 'Business Unit' },
  { key: 'department',    label: 'Department / Team' },
]
const ALTITUDE_KEY = { tenant: 'tenant', country: 'country', 'business-unit': 'business-unit', department: 'department', team: 'department', 'vendor-org': 'department' }

/**
 * Everything a claim touches, computed live: the affected subtree
 * grouped by altitude with per-node principal counts, the deduped
 * principal roster, the uses the subject feeds (kind-specific), the
 * version it replaces, and every local exception inside the scope.
 */
export function impactOf(claim) {
  const nodes = subtreeNodes(claim.scopeNodeId)
  const seen = new Map()
  const perNode = nodes.map(node => {
    const members = effectiveMembers(node.id)
    for (const m of members) if (!seen.has(m.user.id)) seen.set(m.user.id, m.user)
    return { node, altitude: ALTITUDE_KEY[node.type] || 'department', memberCount: members.length }
  })
  const byAltitude = ALTITUDES
    .map(a => ({ ...a, nodes: perNode.filter(p => p.altitude === a.key) }))
    .filter(a => a.nodes.length > 0)

  let uses = []
  if (claim.kind === 'fact') {
    const fact = FACTS[claim.refId]
    uses = [
      ...(fact?.agents || []).map(name => ({ label: name, detail: 'agent consuming this entry' })),
      ...MEMORY_AT_WORK.filter(m => m.factKey === claim.refId)
        .map(m => ({ label: m.title, detail: `${m.value} ${m.label} · live receipt` })),
    ]
  } else if (claim.kind === 'model') {
    const model = getModelById(claim.refId)
    uses = agentsUsingModel(model?.modelKey).map(a => ({ label: a.name, detail: 'agent running on this model' }))
    if (model) uses.unshift({ label: model.name, detail: `Model Registry · ${model.status}` })
  } else if (claim.kind === 'billing') {
    uses = [{ label: 'Invoice / PO rail', detail: 'purchase requests, invoices and remittance terms' }]
  }

  const teamCount = perNode.filter(p => p.altitude === 'department').length
  return {
    scopeNode: nodeById(claim.scopeNodeId),
    path: getNodePath(claim.scopeNodeId),
    byAltitude,
    nodeCount: nodes.length,
    teamCount,
    people: [...seen.values()],
    peopleCount: seen.size,
    uses,
    replaces: claim.version?.from || null,
    exceptions: exceptionsForClaim(claim),
  }
}

/** Local exceptions to this claim's subject inside its scope. */
export function exceptionsForClaim(claim) {
  const ids = new Set(subtreeNodes(claim.scopeNodeId).map(n => n.id))
  return EXCEPTIONS.filter(e => e.kind === claim.kind && e.refId === claim.refId && ids.has(e.nodeId))
}

export function pendingClaims() { return CLAIMS.filter(c => c.status === 'pending') }
export function reaffirmQueue() { return EXCEPTIONS.filter(e => e.status === 'reaffirm-required') }

/* ─── Audit — the ONE log ──────────────────────────────────────── */

let _evSeq = 0
function appendClaimEvent(eventType, actorId, scopeId, details) {
  _evSeq += 1
  AUDIT_LOG.unshift({
    id: `al-chg-${_evSeq}`,
    timestamp: new Date().toISOString(),
    actor: actorId, actorId,
    action: eventType, eventType,
    tenantId: 'meridian',
    scopeId,
    targetUser: null, roleId: null,
    details, reason: details,
  })
}

/* ─── Mutations ────────────────────────────────────────────────── */

/**
 * Sign one ratification slot. The decision is made by the engine at the
 * unit node — the admin/business split, scope, expiry, residency and
 * barrier rules all apply, and the refusal reason is returned verbatim.
 * The LAST signature publishes the claim.
 */
export function signClaimUnit(claimId, unitNodeId, { actorId, note } = {}) {
  const claim = getClaimById(claimId)
  if (!claim || claim.status !== 'pending') return { ok: false, reason: 'This claim is not open for sign-off.' }
  const slot = claim.approvals.find(a => a.unitNodeId === unitNodeId)
  if (!slot) return { ok: false, reason: 'No ratification slot exists for that node.' }
  if (slot.status === 'signed') return { ok: false, reason: 'This sign-off is already recorded.' }

  const decision = authorize({
    principal: { type: 'user', id: actorId },
    permission: claimPermission(claim),
    nodeId: unitNodeId,
    context: { claimId: claim.id },
  })
  if (!decision.allow) return { ok: false, reason: decision.reason, decision }

  slot.status = 'signed'
  slot.by = actorId
  slot.at = new Date().toISOString()
  slot.note = note || null
  appendClaimEvent('claim.signed', actorId, unitNodeId,
    `${userName(actorId)} signed ${claim.id} (${claim.title}) for ${nodeById(unitNodeId)?.name}`)

  let published = false
  if (claim.approvals.every(a => a.status === 'signed')) {
    publishClaim(claim, actorId)
    published = true
  }
  bumpStore()
  return { ok: true, decision, published }
}

/** Decline one slot — the whole claim is rejected, with the reason on record. */
export function declineClaimUnit(claimId, unitNodeId, { actorId, reason } = {}) {
  const claim = getClaimById(claimId)
  if (!claim || claim.status !== 'pending') return { ok: false, reason: 'This claim is not open for sign-off.' }
  const slot = claim.approvals.find(a => a.unitNodeId === unitNodeId)
  if (!slot || slot.status !== 'pending') return { ok: false, reason: 'No open ratification slot for that node.' }

  const decision = authorize({
    principal: { type: 'user', id: actorId },
    permission: claimPermission(claim),
    nodeId: unitNodeId,
    context: { claimId: claim.id },
  })
  if (!decision.allow) return { ok: false, reason: decision.reason, decision }

  slot.status = 'declined'
  slot.by = actorId
  slot.at = new Date().toISOString()
  slot.note = reason || null
  claim.status = 'rejected'
  claim.decidedAt = slot.at
  appendClaimEvent('claim.rejected', actorId, unitNodeId,
    `${userName(actorId)} declined ${claim.id} for ${nodeById(unitNodeId)?.name}${reason ? ` — ${reason}` : ''}`)
  bumpStore()
  return { ok: true, decision }
}

/**
 * Publish (internal): all slots signed. Advances the subject's version
 * chain and flips every in-force exception inside the scope to
 * reaffirm-required — preserved, never silently voided.
 */
function publishClaim(claim, actorId) {
  claim.status = 'approved'
  claim.decidedAt = new Date().toISOString()
  appendClaimEvent('claim.published', actorId, claim.scopeNodeId,
    `${claim.id} published — ${claim.title} (replaces ${claim.version?.from}) at ${nodeById(claim.scopeNodeId)?.name}`)

  if (claim.kind === 'fact') {
    const fact = FACTS[claim.refId]
    if (fact && Array.isArray(fact.versions)) {
      fact.versions = [
        ...fact.versions.map(v => v.replace(/ Current$/, '')),
        `${claim.version.to} Current`,
      ]
    }
  } else if (claim.kind === 'model') {
    recordModelVersion(claim.refId, {
      version: claim.version.to,
      notes: claim.title,
      date: new Date().toISOString().slice(0, 10),
    })
  }

  for (const exc of exceptionsForClaim(claim)) {
    if (exc.status === 'in-force') {
      exc.status = 'reaffirm-required'
      appendClaimEvent('exception.reaffirm-required', actorId, exc.nodeId,
        `${exc.id} (${nodeById(exc.nodeId)?.name}) requires re-affirmation — approval predates ${claim.version.to}; owner ${userName(exc.ownerId)}`)
    }
  }
}

/**
 * Re-affirm a local exception against the new parent version. Gated by
 * the same permission as the claim kind, at the exception's own node.
 */
export function reaffirmException(excId, { actorId } = {}) {
  const exc = EXCEPTIONS.find(e => e.id === excId)
  if (!exc || exc.status !== 'reaffirm-required') return { ok: false, reason: 'This exception is not awaiting re-affirmation.' }
  const decision = authorize({
    principal: { type: 'user', id: actorId },
    permission: CLAIM_KIND_META[exc.kind].permission,
    nodeId: exc.nodeId,
    context: { exceptionId: exc.id },
  })
  if (!decision.allow) return { ok: false, reason: decision.reason, decision }
  exc.status = 'reaffirmed'
  exc.reaffirmedBy = actorId
  exc.reaffirmedAt = new Date().toISOString()
  appendClaimEvent('exception.reaffirmed', actorId, exc.nodeId,
    `${userName(actorId)} re-affirmed ${exc.id} at ${nodeById(exc.nodeId)?.name}`)
  bumpStore()
  return { ok: true, decision }
}

/* ─── Store: mutable module state + re-render hook ─────────────── */

let _tick = 0
const _subs = new Set()
function bumpStore() {
  _tick += 1
  _subs.forEach(fn => fn(_tick))
}

/** Subscribe a component to register mutations. */
export function useChangeRegister() {
  const [, setT] = useState(0)
  const refresh = useCallback(() => setT(t => t + 1), [])
  useState(() => { _subs.add(refresh); return 0 })
  return { claims: CLAIMS, exceptions: EXCEPTIONS, refresh }
}
