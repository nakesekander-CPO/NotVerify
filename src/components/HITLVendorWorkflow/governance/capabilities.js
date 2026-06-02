/**
 * Capability tiers — derive sign-off authority from a role's permissions
 * (src/data/rbacModel.js ROLES). Pure; the only import is the role table.
 */
import { ROLES } from '../../../data/rbacModel'

export const TIERS = {
  PUBLISH: 'approve-publish',
  APPROVE_OWN: 'approve-own',
  REVIEW: 'review-comment',
  SUBMIT: 'submit-only',
  VIEW: 'view-only',
}

export const TIER_LABELS = {
  [TIERS.PUBLISH]: 'Approve & publish',
  [TIERS.APPROVE_OWN]: 'Approve own content',
  [TIERS.REVIEW]: 'Review & comment',
  [TIERS.SUBMIT]: 'Submit only',
  [TIERS.VIEW]: 'View only',
}

function permsFor(roleId) {
  const r = ROLES.find(x => x.id === roleId)
  return r ? r.permissions : []
}
function hasAny(perms, list) {
  return perms.some(p => p === '*' || list.includes(p))
}

export function tierForRole(roleId) {
  const p = permsFor(roleId)
  if (hasAny(p, ['signoff_output', 'final_validate'])) return TIERS.PUBLISH
  if (hasAny(p, ['client_signoff'])) return TIERS.APPROVE_OWN
  if (hasAny(p, ['submit_assigned_task', 'edit_assigned_segment', 'verify_assigned_segment'])) return TIERS.SUBMIT
  if (hasAny(p, [
    'review_vendor_work', 'verify_segment', 'edit_segment', 'compliance_review',
    'legal_review', 'approve_resource', 'manage_vendor:scope', 'review_recommendation',
    'edit_resource', 'request_changes',
  ])) return TIERS.REVIEW
  return TIERS.VIEW
}

export function canSignOff(roleId) {
  return tierForRole(roleId) === TIERS.PUBLISH
}

export function canManageAutonomy(roleId) {
  return hasAny(permsFor(roleId), ['manage_workflows', 'final_validate'])
}

/**
 * Demo personas for the view-as-role switcher. Each maps to a real role id
 * in rbacModel.js. (Finance has no dedicated role in slice 1; it maps to
 * `auditor` as a view-only stand-in until the money-loop slice adds one.)
 */
export const PERSONAS = [
  { id: 'production',  label: 'Production',         roleId: 'internal-reviewer' },
  { id: 'compliance',  label: 'Compliance (VP)',    roleId: 'final-validator' },
  { id: 'vendor-mgr',  label: 'Vendor Manager',     roleId: 'vendor-manager' },
  { id: 'linguist',    label: 'External Linguist',  roleId: 'vendor-user' },
  { id: 'client',      label: 'Client Editor',      roleId: 'client-reviewer' },
  { id: 'finance',     label: 'Finance',            roleId: 'auditor' },
  { id: 'admin',       label: 'Admin',              roleId: 'arbitr-global-admin' },
]
