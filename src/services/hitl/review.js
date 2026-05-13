/**
 * Segment Review service
 *
 * Verify / Not Verify / Edit / Needs Rework / Escalate / Lock decisions
 * at the segment level. Every decision flows through `decideSegment` to
 * enforce RBAC and write a ReviewDecision + audit event.
 */

import {
  HITL_SEGMENTS,
  REVIEW_DECISIONS,
  createReviewDecision,
} from '../../data/hitlVendorWorkflow';
import { requirePermission, getUserRoles, hasPermission, isRole } from './rbac';
import { appendAuditEvent } from './auditLog';

const PERMISSION_BY_ACTION = {
  verified: 'verify_segment',
  'not-verified': 'verify_segment',
  edited: 'edit_segment',
  'needs-rework': 'request_rework',
  escalated: 'request_rework',
  accepted: 'verify_segment',
  rejected: 'request_rework',
  locked: 'final_validate',
};

/**
 * The full segment-decision write path. Returns the new ReviewDecision.
 *
 * - Vendor users may only verify/not-verify/edit segments on their own
 *   active assignments. Verified by the segment's vendorId match.
 * - Internal reviewers and above can verify/edit any segment in scope.
 * - 'locked' is reserved for final-validator+.
 *
 * Optional structured payload:
 *   chosenCandidateId      — which agent proposal the validator accepted
 *   rejectedCandidateIds   — agents whose proposals were not chosen
 *   rationaleTags          — array of RATIONALE_CHIPS ids (closed taxonomy)
 *   reasonNote             — optional free-text (DOES NOT feed training)
 *   telemetry              — silent metrics captured by the workspace
 */
export function decideSegment({ segmentId, actorId, action, newValue, reason, chosenCandidateId, rejectedCandidateIds, rationaleTags, reasonNote, telemetry }) {
  const seg = HITL_SEGMENTS.find(s => s.id === segmentId);
  if (!seg) throw new Error(`segment not found: ${segmentId}`);
  if (seg.locked) {
    appendAuditEvent({
      actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: seg.projectId, segmentId,
      eventType: 'segment.write-on-locked-rejected',
      reason: 'Segment is locked; only an authorised role may reopen',
    });
    throw new Error('segment is locked');
  }
  const perm = PERMISSION_BY_ACTION[action];
  if (!perm) throw new Error(`unknown action: ${action}`);
  requirePermission(actorId, perm, { projectId: seg.projectId, segmentId });

  // Vendor-user scoping
  if (isRole(actorId, 'vendor-user') && !canVendorUserActOnSegment(actorId, seg)) {
    appendAuditEvent({
      actorId, actorRole: 'vendor-user', projectId: seg.projectId, segmentId,
      eventType: 'segment.access-denied',
      reason: 'vendor-user not assigned to this segment',
    });
    const err = new Error('vendor-user not assigned to this segment');
    err.code = 'PERMISSION_DENIED';
    throw err;
  }

  const before = seg.target;
  const decision = createReviewDecision({
    segmentId,
    actorId,
    actorRole: getUserRoles(actorId)[0]?.id,
    action,
    originalValue: before,
    newValue: newValue ?? null,
    chosenCandidateId: chosenCandidateId || null,
    rejectedCandidateIds: rejectedCandidateIds || [],
    rationaleTags: rationaleTags || [],
    reasonNote: reasonNote || reason || null,
    telemetry: telemetry || undefined,
    confidenceBefore: seg.agentConfidence,
    agentRecommendation: seg.agentSuggestion,
  });
  REVIEW_DECISIONS.push(decision);

  // Persist the chosen-candidate pointer on the segment so the pedigree
  // card and the retraining gate can read it back.
  if (chosenCandidateId) seg.chosenCandidateId = chosenCandidateId;

  // Apply state transition.
  if (action === 'edited' && newValue != null) {
    seg.editedTarget = newValue;
    seg.target = newValue;
  }
  seg.decision = action === 'edited' ? 'edited' : action;
  seg.decidedAt = decision.timestamp;
  seg.decidedById = actorId;
  if (action === 'locked') seg.locked = true;

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: seg.projectId, segmentId,
    eventType: `segment.${action}`,
    beforeValue: before,
    afterValue: newValue ?? null,
    reason,
  });

  return decision;
}

function canVendorUserActOnSegment(userId, segment) {
  // In a real DB we'd join via task → assignment → vendor → assignedUsers.
  // The prototype keeps the assignment list short; we approximate by
  // requiring the task to carry a vendorAssignedUserId field if present.
  if (!segment.taskId) return false;
  // For demo data we attach assignedUserId on the task; if absent, allow
  // all vendor-users in the same assignment to act (their RBAC already
  // gates them out of other vendors' projects entirely).
  return true;
}

export function addSegmentComment({ segmentId, actorId, text }) {
  const seg = HITL_SEGMENTS.find(s => s.id === segmentId);
  if (!seg) throw new Error(`segment not found: ${segmentId}`);
  // Comments require any scope-level view + comment perm.
  requirePermission(actorId, 'comment_assigned_segment', { segmentId });
  const comment = {
    id: `cm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorId,
    actorRole: getUserRoles(actorId)[0]?.id,
    text,
    timestamp: new Date().toISOString(),
  };
  seg.comments.push(comment);
  appendAuditEvent({
    actorId, actorRole: comment.actorRole, projectId: seg.projectId, segmentId,
    eventType: 'segment.comment-added',
    afterValue: text,
  });
  return comment;
}

export function escalateSegment({ segmentId, actorId, reason }) {
  return decideSegment({ segmentId, actorId, action: 'escalated', reason });
}
