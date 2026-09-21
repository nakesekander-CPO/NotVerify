/**
 * Segment Review service
 *
 * The real Straker workflow has only two reviewer actions:
 *   - confirm : "this is good, leave it"  (was verify/accept — now one)
 *   - edit    : "I improved it"
 * Plus segments may be LOCKED early (101% in-context matches) so the
 * reviewer can't change them. There is no reject / escalate / needs-
 * rework. Every action flows through `decideSegment` to enforce RBAC
 * and write a ReviewDecision + audit event.
 */

import {
  HITL_SEGMENTS,
  HITL_TASKS,
  REVIEW_DECISIONS,
  createReviewDecision,
  getProjectById,
} from '../../data/hitlVendorWorkflow';
import { requirePermission } from './rbac';
import { can } from '../rbac/engine';
import { isSecondEditor, secondEditorCanStart } from './taskAssignment';
import { appendAuditEvent } from './auditLog';

/** Role of the actor's decisive view grant at the project's node — used
 * only for attributing pre-gate denial events. */
function probeRole(actorId, projectId) {
  try {
    const nodeId = getProjectById(projectId)?.clientNodeId;
    if (!nodeId) return null;
    const d = can({ principal: actorId, permission: 'view_resource', nodeId });
    return d.role?.id || null;
  } catch {
    return null;
  }
}

const PERMISSION_BY_ACTION = {
  confirmed: 'verify_segment',
  edited: 'edit_segment',
  locked: 'final_validate', // system/admin only — set early, not a reviewer choice
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
      // Pre-gate event: attribute by the decisive view grant at this
      // project's node (pure probe — the real gate has not run yet).
      actorId, actorRole: probeRole(actorId, seg.projectId), projectId: seg.projectId, segmentId,
      eventType: 'segment.write-on-locked-rejected',
      reason: 'Segment is locked; only an authorised role may reopen',
    });
    throw new Error('segment is locked');
  }
  const perm = PERMISSION_BY_ACTION[action];
  if (!perm) throw new Error(`unknown action: ${action}`);
  const auth = requirePermission(actorId, perm, { projectId: seg.projectId, segmentId });
  // Rule 10: actor-role attribution is the DECISIVE grant's role, never
  // "first role in the list".
  const actorRole = auth.role?.id || null;

  // Sequential second edit: a second editor can only start once the
  // first editor has finished. The two editors never touch the same
  // segment at the same time.
  if (seg.taskId && isSecondEditor(actorId, seg.taskId) && !secondEditorCanStart(seg.taskId)) {
    appendAuditEvent({
      actorId, actorRole, projectId: seg.projectId, segmentId,
      eventType: 'segment.second-editor-too-early',
      reason: 'Second edit is sequential; the first editor has not finished.',
    });
    const err = new Error('second editor cannot start until the first edit is finished');
    err.code = 'SECOND_EDIT_NOT_READY';
    throw err;
  }

  // Vendor-user segment scoping now lives in the engine: vendor grants
  // carry conditions.assignedOnly and requirePermission supplies the
  // task's assigned users, so an unassigned vendor-user is denied above
  // with decisivePolicy 'assigned-only' (and audited). The old local
  // check that always returned true is gone.

  const before = seg.target;
  const decision = createReviewDecision({
    segmentId,
    actorId,
    actorRole,
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
    actorId, actorRole, projectId: seg.projectId, segmentId,
    eventType: `segment.${action}`,
    beforeValue: before,
    afterValue: newValue ?? null,
    reason,
  });

  return decision;
}

export function addSegmentComment({ segmentId, actorId, text }) {
  const seg = HITL_SEGMENTS.find(s => s.id === segmentId);
  if (!seg) throw new Error(`segment not found: ${segmentId}`);
  // Comments require any scope-level view + comment perm.
  const auth = requirePermission(actorId, 'comment_segment', { projectId: seg.projectId, segmentId });
  const comment = {
    id: `cm-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    actorId,
    actorRole: auth.role?.id || null,
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

