/**
 * Retraining Gate
 *
 * Decides whether a segment's correction is eligible for:
 *   - Org Brain (governed memory)
 *   - Model / agent retraining
 *
 * Rules (these are non-negotiable per the HITL spec):
 *   1. Project must be SIGNED OFF.
 *   2. Project policy must allow the feed (orgBrainAllowed / retrainingAllowed).
 *   3. Sign-off record must have feedOrgBrain / feedRetraining = true.
 *   4. Segment decision must be 'verified', 'edited', or 'accepted'.
 *   5. The segment must NOT be in the rejected / not-verified set.
 *   6. An authorised role (final-validator / arbitr-global-admin / org-admin)
 *      must approve the candidate before it is `used`.
 *
 * The gate produces RetrainingCandidate rows in 'pending' state. They
 * only flip to 'approved' via `approveRetrainingCandidate`, and to
 * 'used' once a training run consumes them (out of scope here).
 */

import {
  HITL_SEGMENTS,
  REVIEW_DECISIONS,
  SIGNOFF_RECORDS,
  RETRAINING_CANDIDATES,
  ORG_BRAIN_UPDATES,
  createRetrainingCandidate,
  getProjectById,
  nextId,
} from '../../data/hitlVendorWorkflow';
import { requirePermission, getUserRoles, isRole } from './rbac';
import { appendAuditEvent } from './auditLog';

/** Return all decisions for a segment, newest first. */
function decisionsFor(segmentId) {
  return REVIEW_DECISIONS
    .filter(d => d.segmentId === segmentId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

export function evaluateSegmentForRetraining(segment, signOff, project) {
  if (!segment || !signOff || !project) return { eligible: false, reasons: ['missing inputs'] };
  const reasons = [];
  if (project.status !== 'signed-off' && project.status !== 'published' && project.status !== 'retraining-queued') {
    reasons.push('project not signed-off');
  }
  if (project.requirements.retrainingAllowed !== true) {
    reasons.push('project policy disallows retraining');
  }
  if (!signOff.feedRetraining) {
    reasons.push('sign-off did not authorise retraining feed');
  }
  if (!['verified', 'edited', 'accepted'].includes(segment.decision)) {
    reasons.push(`segment decision "${segment.decision}" not eligible`);
  }
  // Structured-tag requirement: only segments whose latest decision
  // carries at least one rationale chip become training data. Untagged
  // segments are stored for display only and never enter retraining.
  const latest = decisionsFor(segment.id)[0];
  if (latest && (!latest.rationaleTags || latest.rationaleTags.length === 0)) {
    reasons.push('segment decision has no rationale tags — display only');
  }
  return { eligible: reasons.length === 0, reasons };
}

export function evaluateSegmentForOrgBrain(segment, signOff, project) {
  if (!segment || !signOff || !project) return { eligible: false, reasons: ['missing inputs'] };
  const reasons = [];
  if (project.status !== 'signed-off' && project.status !== 'published' && project.status !== 'retraining-queued') {
    reasons.push('project not signed-off');
  }
  if (project.requirements.orgBrainAllowed === false) {
    reasons.push('project policy disallows Org Brain feed');
  }
  if (!signOff.feedOrgBrain) {
    reasons.push('sign-off did not authorise Org Brain feed');
  }
  if (!['verified', 'edited', 'accepted'].includes(segment.decision)) {
    reasons.push(`segment decision "${segment.decision}" not eligible`);
  }
  return { eligible: reasons.length === 0, reasons };
}

/**
 * Build pending RetrainingCandidate rows for every eligible segment in
 * a project. Idempotent: rerunning will only add new candidates for
 * segments that don't already have one in the queue.
 */
export function queueRetrainingCandidates({ projectId, actorId }) {
  requirePermission(actorId, 'final_validate', { projectId });
  const project = getProjectById(projectId);
  if (!project) throw new Error(`project not found: ${projectId}`);
  const signOff = [...SIGNOFF_RECORDS].reverse().find(r => r.projectId === projectId);
  if (!signOff) throw new Error('no sign-off record found; cannot queue retraining');

  const segments = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  const existingSegIds = new Set(RETRAINING_CANDIDATES.filter(c => c.projectId === projectId).map(c => c.segmentId));
  const added = [];

  for (const seg of segments) {
    if (existingSegIds.has(seg.id)) continue;
    const retrain = evaluateSegmentForRetraining(seg, signOff, project);
    const orgBrain = evaluateSegmentForOrgBrain(seg, signOff, project);
    if (!retrain.eligible && !orgBrain.eligible) continue;
    const candidate = createRetrainingCandidate({
      projectId,
      segmentId: seg.id,
      originalAgentOutput: seg.agentSuggestion || '',
      vendorEdit: seg.editedTarget || seg.target,
      humanFinalEdit: seg.target,
      validationDecision: seg.decision,
      signoffRecordId: signOff.id,
      domain: project.requirements.domain,
      language: project.requirements.targetLanguages?.[0] || null,
      errorCategory: seg.errorCategory || 'other',
      correctionCategory: seg.errorCategory || null,
      confidenceDelta: null,
      reviewerNotes: '',
      modelTarget: project.requirements.modelTarget || null,
    });
    // Flag eligibility separately so the UI can render dual approval.
    candidate.eligibleOrgBrain = orgBrain.eligible;
    candidate.eligibleRetraining = retrain.eligible;
    RETRAINING_CANDIDATES.push(candidate);
    added.push(candidate);
  }

  project.status = 'retraining-queued';
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId,
    eventType: 'retraining.queued',
    afterValue: { added: added.length },
  });
  return added;
}

export function approveRetrainingCandidate({ candidateId, actorId, target }) {
  requirePermission(actorId, 'approve_retraining', { candidateId });
  const c = RETRAINING_CANDIDATES.find(x => x.id === candidateId);
  if (!c) throw new Error(`candidate not found: ${candidateId}`);
  if (c.status !== 'pending') throw new Error(`candidate not pending (status: ${c.status})`);

  const wantOrgBrain = target === 'orgBrain' || target === 'both';
  const wantRetraining = target === 'retraining' || target === 'both';

  if (wantOrgBrain && !c.eligibleOrgBrain) {
    appendAuditEvent({
      actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: c.projectId, segmentId: c.segmentId,
      eventType: 'retraining.approval-rejected',
      reason: 'candidate not eligible for Org Brain feed',
    });
    throw new Error('candidate not eligible for Org Brain feed');
  }
  if (wantRetraining && !c.eligibleRetraining) {
    appendAuditEvent({
      actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: c.projectId, segmentId: c.segmentId,
      eventType: 'retraining.approval-rejected',
      reason: 'candidate not eligible for retraining feed',
    });
    throw new Error('candidate not eligible for retraining feed');
  }

  c.approvedForOrgBrain = c.approvedForOrgBrain || wantOrgBrain;
  c.approvedForRetraining = c.approvedForRetraining || wantRetraining;
  c.status = 'approved';

  if (wantOrgBrain) {
    // Contributor footprint — every Org Brain entry carries the chain
    // of humans who shaped it. This is the surface the Trainer Profile
    // links to and the Pedigree Card cites as "Provenance".
    const decisions = decisionsFor(c.segmentId);
    const contributors = [...new Set(decisions.map(d => d.actorId).filter(Boolean))];
    ORG_BRAIN_UPDATES.push({
      id: nextId('ob'),
      candidateId: c.id,
      projectId: c.projectId,
      segmentId: c.segmentId,
      domain: c.domain,
      language: c.language,
      sourceFragment: c.originalAgentOutput,
      approvedFragment: c.humanFinalEdit,
      approvedBy: actorId,
      approvedAt: new Date().toISOString(),
      contributorFootprint: contributors.map(uid => {
        const d = decisions.find(x => x.actorId === uid);
        return {
          userId: uid,
          role: d?.actorRole || null,
          rationaleTags: d?.rationaleTags || [],
          chosenCandidateId: d?.chosenCandidateId || null,
          decidedAt: d?.timestamp,
        };
      }),
    });
  }

  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: c.projectId, segmentId: c.segmentId,
    eventType: 'retraining.approved',
    afterValue: { candidateId: c.id, target },
  });
  return c;
}

export function rejectRetrainingCandidate({ candidateId, actorId, reason }) {
  if (!reason) throw new Error('rejectRetrainingCandidate: reason is required');
  requirePermission(actorId, 'approve_retraining', { candidateId });
  const c = RETRAINING_CANDIDATES.find(x => x.id === candidateId);
  if (!c) throw new Error(`candidate not found: ${candidateId}`);
  c.status = 'rejected';
  c.reviewerNotes = reason;
  appendAuditEvent({
    actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: c.projectId, segmentId: c.segmentId,
    eventType: 'retraining.rejected',
    reason,
  });
  return c;
}
