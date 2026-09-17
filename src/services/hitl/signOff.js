/**
 * Final validation + sign-off service
 *
 * signOff() is the single write path that produces an immutable
 * SignOffRecord, locks the project's segments, updates vendor
 * performance, and emits the corresponding audit event.
 *
 * Rule 9 (RBAC alignment, 2026-09-17):
 * - NOBODY signs off their own work — the signer must not be the last
 *   editor of any segment in the project. Enforced HERE, not in the UI.
 * - Sign-off authority is a PERMISSION resolved by the engine
 *   (client_signoff or signoff_output at the project's node), never a
 *   role-name check and never inferred from decision history. Delegation
 *   is an explicit, expiring grant.
 * - The old auth bypass is gone: every validation report read is checked.
 */

import {
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
import { can, authorize } from '../rbac/engine';
import { requirePermission } from './rbac';
import { appendAuditEvent } from './auditLog';

export function buildValidationReport({ projectId, actorId }) {
  // Read-only summary — but never unauthenticated: every caller passes
  // the same scoped view gate. No caller can opt out of the check.
  requirePermission(actorId, 'view_resource', { projectId });
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  // A segment is "done" when it is confirmed, edited, or pre-locked
  // (101% in-context match — already correct, no review needed).
  const done = segs.filter(s => ['confirmed', 'edited'].includes(s.decision) || (s.locked && s.lockReason === 'ice-match'));
  // Anything not yet handled is an open item still needing a person.
  const openItems = segs.filter(s => !done.includes(s));

  const validationScore = segs.length ? Math.round((done.length / segs.length) * 100) : 0;
  const qualityScore = done.length
    ? Math.round(done.reduce((acc, s) => acc + (s.agentConfidence ?? 0.8), 0) / done.length * 100)
    : 0;

  const report = {
    id: nextId('vr'),
    projectId,
    generatedBy: actorId,
    generatedAt: new Date().toISOString(),
    counts: { total: segs.length, done: done.length, open: openItems.length },
    validationScore,
    qualityScore,
    openIssues: openItems.map(s => ({ segmentId: s.id, decision: s.decision, reason: s.target?.slice?.(0, 100) })),
  };
  VALIDATION_REPORTS.push(report);
  return report;
}

/**
 * Actors who made the LAST edit or decision on any segment in the
 * project. Rule 9: none of them may sign it off.
 */
export function lastEditorsOf(projectId) {
  const editors = new Set();
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  for (const seg of segs) {
    // The segment records its deciding actor directly…
    if (seg.decidedById) editors.add(seg.decidedById);
  }
  // …and the decision log catches anything older state dropped.
  const segIds = new Set(segs.map(s => s.id));
  const latestBySegment = new Map();
  for (const d of REVIEW_DECISIONS) {
    if (!segIds.has(d.segmentId)) continue;
    const prev = latestBySegment.get(d.segmentId);
    if (!prev || d.timestamp > prev.timestamp) latestBySegment.set(d.segmentId, d);
  }
  for (const d of latestBySegment.values()) editors.add(d.actorId);
  return editors;
}

export function signOff({ projectId, actorId, statement, canPublish, feedTM, feedTerminology, feedModel, approvalChain, version }) {
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);
  const nodeId = project.clientNodeId;

  // Authority comes from the engine: client-side sign-off
  // (client_signoff) or final validation (signoff_output) at this
  // project's node. A delegated signer holds an explicit grant — there
  // is no inference from who touched the job last.
  const viaClient = can({ principal: actorId || 'anonymous', permission: 'client_signoff', nodeId });
  const permission = viaClient.allow ? 'client_signoff' : 'signoff_output';
  const decision = authorize({ principal: actorId, permission, nodeId, context: { projectId } });
  if (!decision.allow) {
    const err = new Error(`Sign-off not permitted: ${decision.reason}`);
    err.code = 'PERMISSION_DENIED';
    throw err;
  }
  const role = decision.role?.id || null;

  // Rule 9: signer ≠ last editor of any segment in the project.
  const editors = lastEditorsOf(projectId);
  if (editors.has(actorId)) {
    appendAuditEvent({
      actorId, actorRole: role, projectId, jobId: project.jobId,
      eventType: 'signoff.sod-rejected',
      reason: 'Separation of duties: the signer edited segments in this project. A different authorised signer must sign off.',
    });
    const err = new Error('Separation of duties: you edited segments in this project, so you cannot sign it off. A different authorised signer must do it.');
    err.code = 'SOD_REJECTED';
    throw err;
  }

  // Reuse pipelines (each opt-in per project policy):
  //   TM update · terminology dataset · model improvement (RLHF).
  const safeFeedTM = !!feedTM && project.requirements.tmAllowed !== false;
  const safeFeedTerminology = !!feedTerminology && project.requirements.terminologyAllowed !== false;
  const safeFeedModel = !!feedModel && project.requirements.modelImprovementAllowed === true;

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
    feedTM: safeFeedTM,
    feedTerminology: safeFeedTerminology,
    feedModel: safeFeedModel,
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
    actorId, actorRole: role, projectId, jobId: project.jobId,
    eventType: 'project.signed-off',
    afterValue: { signOffId: record.id, validationScore: report.validationScore, canPublish: record.canPublish },
  });

  return record;
}

function blend(prev, next, weight) {
  if (prev == null) return next;
  return Math.round(prev * (1 - weight) + next * weight);
}
