/**
 * Assignment service
 *
 * - autoAssignVendor: writes a VENDOR_ASSIGNMENT in 'active' state when
 *   policy permits, otherwise in 'awaiting-approval'. Always records
 *   the underlying VendorRecommendation.
 * - manualOverride: allows a project-manager / org-admin / global-admin
 *   to choose a different vendor with a required reason. The original
 *   recommendation is kept on the assignment for the audit log.
 * - approveAssignment / rejectAssignment: gate awaiting-approval assignments.
 */

import {
  VENDOR_RECOMMENDATIONS,
  VENDOR_ASSIGNMENTS,
  HITL_PROJECTS,
  createAssignment,
  nextId,
  getVendorById,
  getProjectById,
} from '../../data/hitlVendorWorkflow';
import { recommendVendors } from './selectionEngine';
import { requirePermission, getUserRoles } from './rbac';
import { appendAuditEvent } from './auditLog';

function persistRecommendation(projectId, rec) {
  const record = {
    id: nextId('vrec'),
    projectId,
    policyId: rec.policyId,
    poolId: rec.poolId,
    recommendedVendorId: rec.recommended?.vendorId || null,
    score: rec.recommended?.score ?? null,
    alternatives: rec.alternatives.map(a => ({ vendorId: a.vendorId, score: a.score })),
    disqualified: rec.disqualified,
    autoAssignAllowed: rec.autoAssignAllowed,
    fallbackUsed: rec.fallbackUsed,
    explanation: rec.recommended?.explanation || null,
    createdAt: new Date().toISOString(),
  };
  VENDOR_RECOMMENDATIONS.push(record);
  return record;
}

function setProjectStatus(projectId, status) {
  const project = getProjectById(projectId);
  if (project) project.status = status;
}

/**
 * Run the selection engine, persist the recommendation, and either
 * auto-assign or hand off to manual approval based on policy.
 *
 * @returns { recommendation, assignment }
 */
export function runRecommendationAndAssign({ projectId, actorId, policyId, poolId }) {
  requirePermission(actorId, 'review_recommendation', { projectId });
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);

  const rec = recommendVendors({ project, policyId, poolId });
  const persisted = persistRecommendation(projectId, rec);

  setProjectStatus(projectId, 'vendor-recommended');
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId,
    eventType: 'vendor.recommended',
    afterValue: { recommendationId: persisted.id, vendorId: persisted.recommendedVendorId, score: persisted.score },
    policy: persisted.policyId,
  });

  if (!rec.recommended) {
    appendAuditEvent({
      actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId,
      eventType: 'vendor.no-eligible',
      reason: `No vendor passed hard filters under policy "${rec.policyId}"`,
      policy: rec.policyId,
    });
    return { recommendation: persisted, assignment: null };
  }

  if (rec.autoAssignAllowed) {
    const assignment = createAssignment({
      projectId,
      vendorId: rec.recommended.vendorId,
      recommendationId: persisted.id,
      recommendedById: actorId,
      assignedById: 'system',
      approvalRequired: false,
      estimatedCost: rec.recommended.estimatedCost,
      estimatedTurnaroundHours: rec.recommended.estimatedTurnaroundHours,
    });
    VENDOR_ASSIGNMENTS.push(assignment);
    setProjectStatus(projectId, 'vendor-auto-assigned');
    appendAuditEvent({
      actorId: 'system', actorRole: 'arbitr-global-admin', projectId, vendorId: assignment.vendorId,
      eventType: 'vendor.auto-assigned',
      afterValue: { assignmentId: assignment.id, score: rec.recommended.score },
      policy: rec.policyId,
    });
    return { recommendation: persisted, assignment };
  }

  // Manual-approval path.
  const assignment = createAssignment({
    projectId,
    vendorId: rec.recommended.vendorId,
    recommendationId: persisted.id,
    recommendedById: actorId,
    assignedById: null,
    approvalRequired: true,
    estimatedCost: rec.recommended.estimatedCost,
    estimatedTurnaroundHours: rec.recommended.estimatedTurnaroundHours,
  });
  VENDOR_ASSIGNMENTS.push(assignment);
  setProjectStatus(projectId, 'vendor-assignment-awaiting-approval');
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId, vendorId: assignment.vendorId,
    eventType: 'assignment.awaiting-approval',
    afterValue: { assignmentId: assignment.id, score: rec.recommended.score },
    policy: rec.policyId,
  });
  return { recommendation: persisted, assignment };
}

export function manualOverride({ projectId, vendorId, actorId, reason }) {
  if (!reason || !reason.trim()) {
    throw new Error('manualOverride: reason is required');
  }
  requirePermission(actorId, 'override_assignment', { projectId });

  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);
  const vendor = getVendorById(vendorId);
  if (!vendor) throw new Error(`vendor not found: ${vendorId}`);

  // Find the open recommendation for context.
  const lastRec = [...VENDOR_RECOMMENDATIONS].reverse().find(r => r.projectId === projectId);

  const assignment = createAssignment({
    projectId,
    vendorId,
    recommendationId: lastRec?.id || null,
    recommendedById: lastRec?.recommendedVendorId || null,
    assignedById: actorId,
    approvalRequired: false,
    estimatedCost: null,
    estimatedTurnaroundHours: null,
  });
  assignment.overrideReason = reason;
  VENDOR_ASSIGNMENTS.push(assignment);
  setProjectStatus(projectId, 'in-vendor-review');

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId, vendorId,
    eventType: 'assignment.manual-override',
    beforeValue: { recommendedVendorId: lastRec?.recommendedVendorId },
    afterValue: { vendorId, assignmentId: assignment.id },
    reason,
  });
  return assignment;
}

export function approveAssignment({ assignmentId, actorId, comment }) {
  requirePermission(actorId, 'approve_assignment', { assignmentId });
  const a = VENDOR_ASSIGNMENTS.find(x => x.id === assignmentId);
  if (!a) throw new Error(`assignment not found: ${assignmentId}`);
  a.status = 'active';
  a.approvalDecision = { decision: 'approved', actorId, at: new Date().toISOString(), comment: comment || '' };
  setProjectStatus(a.projectId, 'in-vendor-review');
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: a.projectId, vendorId: a.vendorId,
    eventType: 'assignment.approved',
    afterValue: { assignmentId },
  });
  return a;
}

export function rejectAssignment({ assignmentId, actorId, reason }) {
  if (!reason || !reason.trim()) throw new Error('rejectAssignment: reason is required');
  requirePermission(actorId, 'approve_assignment', { assignmentId });
  const a = VENDOR_ASSIGNMENTS.find(x => x.id === assignmentId);
  if (!a) throw new Error(`assignment not found: ${assignmentId}`);
  a.status = 'rejected';
  a.approvalDecision = { decision: 'rejected', actorId, at: new Date().toISOString(), reason };
  setProjectStatus(a.projectId, 'vendor-selection-pending');
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: a.projectId, vendorId: a.vendorId,
    eventType: 'assignment.rejected',
    afterValue: { assignmentId },
    reason,
  });
  return a;
}
