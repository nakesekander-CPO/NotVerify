/**
 * Final validation + sign-off service
 *
 * signOff() is the single write path that produces an immutable
 * SignOffRecord, locks the project's segments, updates vendor
 * performance, and emits the corresponding audit event. After sign-off,
 * the retraining gate decides eligibility per segment.
 */

import {
  HITL_PROJECTS,
  HITL_SEGMENTS,
  REVIEW_DECISIONS,
  SIGNOFF_RECORDS,
  VENDORS,
  VENDOR_ASSIGNMENTS,
  VALIDATION_REPORTS,
  createSignOffRecord,
  nextId,
  getProjectById,
} from '../../data/hitlVendorWorkflow';
import { requirePermission, getUserRoles } from './rbac';
import { appendAuditEvent } from './auditLog';

export function buildValidationReport({ projectId, actorId }) {
  requirePermission(actorId, 'final_validate', { projectId });
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  const verified = segs.filter(s => s.decision === 'verified' || s.decision === 'accepted' || s.decision === 'edited');
  const notVerified = segs.filter(s => s.decision === 'not-verified' || s.decision === 'rejected');
  const escalated = segs.filter(s => s.decision === 'escalated');
  const needsRework = segs.filter(s => s.decision === 'needs-rework');

  const validationScore = segs.length ? Math.round((verified.length / segs.length) * 100) : 0;
  const qualityScore = verified.length
    ? Math.round(verified.reduce((acc, s) => acc + (s.agentConfidence ?? 0.8), 0) / verified.length * 100)
    : 0;

  const report = {
    id: nextId('vr'),
    projectId,
    generatedBy: actorId,
    generatedAt: new Date().toISOString(),
    counts: { total: segs.length, verified: verified.length, notVerified: notVerified.length, escalated: escalated.length, needsRework: needsRework.length },
    validationScore,
    qualityScore,
    openIssues: [...notVerified, ...escalated, ...needsRework].map(s => ({ segmentId: s.id, decision: s.decision, reason: s.target?.slice?.(0, 100) })),
  };
  VALIDATION_REPORTS.push(report);
  return report;
}

export function signOff({ projectId, actorId, statement, canPublish, feedOrgBrain, feedRetraining, approvalChain, version }) {
  requirePermission(actorId, 'signoff_output', { projectId });
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);

  const role = getUserRoles(actorId)[0]?.id;
  const requiredRole = project.requirements.requiredSignoffRole;
  if (requiredRole && requiredRole !== role && role !== 'tenant-admin' && role !== 'arbitr-global-admin') {
    appendAuditEvent({
      actorId, actorRole: role, projectId,
      eventType: 'signoff.role-mismatch',
      reason: `signoff requires role "${requiredRole}" but actor is "${role}"`,
    });
    throw new Error(`Sign-off requires role "${requiredRole}"`);
  }

  // Honour project policy: cannot feed retraining if project disallows.
  const safeFeedOrgBrain = !!feedOrgBrain && project.requirements.orgBrainAllowed !== false;
  const safeFeedRetraining = !!feedRetraining && project.requirements.retrainingAllowed === true;

  const report = buildValidationReport({ projectId, actorId });

  const record = createSignOffRecord({
    projectId,
    outputId: null,
    actorId,
    actorRole: role,
    validationScore: report.validationScore,
    qualityScore: report.qualityScore,
    riskSummary: project.riskAssessment?.riskLevel || null,
    openIssues: report.openIssues,
    statement: statement || `Signed off by ${actorId} (${role}).`,
    canPublish: !!canPublish,
    feedOrgBrain: safeFeedOrgBrain,
    feedRetraining: safeFeedRetraining,
    approvalChain: approvalChain || [{ actorId, role, at: new Date().toISOString() }],
    version: version || 'v1',
  });

  // Make the record immutable in spirit by freezing it.
  Object.freeze(record);
  Object.freeze(record.approvalChain);
  SIGNOFF_RECORDS.push(record);

  // Lock all segments.
  for (const seg of HITL_SEGMENTS.filter(s => s.projectId === projectId)) {
    seg.locked = true;
  }

  // Move project to signed-off.
  project.status = 'signed-off';
  if (record.canPublish) project.status = 'published';

  // Update vendor performance using actual assignment.
  const assignment = VENDOR_ASSIGNMENTS.find(a => a.projectId === projectId && a.status === 'active');
  if (assignment) {
    assignment.status = 'complete';
    assignment.closedAt = new Date().toISOString();
    const vendor = VENDORS.find(v => v.id === assignment.vendorId);
    if (vendor) {
      vendor.avgValidationScore = blend(vendor.avgValidationScore, report.validationScore, 0.2);
      vendor.qualityScore = blend(vendor.qualityScore, report.qualityScore, 0.15);
    }
  }

  appendAuditEvent({
    actorId, actorRole: role, projectId,
    eventType: 'project.signed-off',
    afterValue: { signOffId: record.id, validationScore: report.validationScore, canPublish: record.canPublish },
  });

  return record;
}

function blend(prev, next, weight) {
  if (prev == null) return next;
  return Math.round(prev * (1 - weight) + next * weight);
}
