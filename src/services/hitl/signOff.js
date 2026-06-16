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
import { requirePermission, getUserRoles, isRole } from './rbac';
import { appendAuditEvent } from './auditLog';

export function buildValidationReport({ projectId, actorId, skipAuth }) {
  // Read-only summary — any reviewer/signer scope can view it. When
  // called from within signOff() the signer is already authorised by
  // the client-side role gate, so we skip the view permission (a
  // delegated vendor signer wouldn't otherwise hold view_resource).
  if (!skipAuth) requirePermission(actorId, 'view_resource', { projectId });
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
 * The vendor-user who most recently acted on a segment in this project.
 * Sign-off may be delegated to this "last-touch vendor".
 */
export function lastTouchVendor(projectId) {
  const segIds = new Set(HITL_SEGMENTS.filter(s => s.projectId === projectId).map(s => s.id));
  const decisions = REVIEW_DECISIONS
    .filter(d => segIds.has(d.segmentId))
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const latestVendor = decisions.find(d => d.actorRole === 'vendor-user');
  return latestVendor ? latestVendor.actorId : null;
}

/**
 * Sign-off is a CLIENT-side action. By default the signer is the
 * client reviewer, or — if the client delegates it — the vendor who
 * last touched the job. No Straker "final validator" signs off files.
 */
export function signOff({ projectId, actorId, statement, canPublish, feedTM, feedTerminology, feedModel, approvalChain, version }) {
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);

  // Sign-off is client-side. Authorisation is the ROLE gate below — NOT
  // a Straker "final validator" permission. The signer is the client
  // reviewer, or (only if the client delegated it) the vendor who last
  // touched the job. Admins may always sign off.
  const role = getUserRoles(actorId)[0]?.id;
  const isClientReviewer = isRole(actorId, 'client-reviewer');
  const isDelegatedVendor = lastTouchVendor(projectId) === actorId;
  const isAdmin = role === 'tenant-admin' || role === 'arbitr-global-admin';
  if (!isClientReviewer && !isDelegatedVendor && !isAdmin) {
    appendAuditEvent({
      actorId, actorRole: role, projectId, jobId: project.jobId,
      eventType: 'signoff.not-permitted',
      reason: 'Sign-off is client-side only (client reviewer or the last-touch vendor).',
    });
    throw new Error('Sign-off is restricted to the client reviewer or the last-touch vendor.');
  }

  // Reuse pipelines (each opt-in per project policy):
  //   TM update · terminology dataset · model improvement (RLHF).
  const safeFeedTM = !!feedTM && project.requirements.tmAllowed !== false;
  const safeFeedTerminology = !!feedTerminology && project.requirements.terminologyAllowed !== false;
  const safeFeedModel = !!feedModel && project.requirements.modelImprovementAllowed === true;

  const report = buildValidationReport({ projectId, actorId, skipAuth: true });

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
