/**
 * Reuse Gate
 *
 * Approved work can flow into THREE separate, independently-governed
 * pipelines (never one vague "training"):
 *   - TM           : update the Translation Memory (reuse sentence pairs)
 *   - terminology  : update the terminology-agent dataset (approved terms)
 *   - model        : model improvement via RLHF (human edits as feedback)
 *
 * Rules (non-negotiable, applied per pipeline):
 *   1. Project must be SIGNED OFF.
 *   2. Project policy must allow that pipeline
 *      (tmAllowed / terminologyAllowed / modelImprovementAllowed).
 *   3. Sign-off record must have feedTM / feedTerminology / feedModel = true.
 *   4. Segment must be confirmed or edited (the only "done" states).
 *   5. For model improvement only: the decision must carry a rationale
 *      tag (so RLHF learns the *why*, not just the *what*).
 *   6. An authorised person must approve the candidate before it is used.
 *
 * The gate produces candidate rows in 'pending' state. They flip to
 * 'approved' via `approveRetrainingCandidate`, and to 'used' once a
 * pipeline consumes them (the actual TM write / dataset update / RLHF
 * run is integration/ML work, out of scope here).
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

function signedOff(project) {
  return ['signed-off', 'published', 'retraining-queued'].includes(project.status);
}
function isDoneSegment(segment) {
  return ['confirmed', 'edited'].includes(segment.decision);
}

/** Translation Memory pipeline eligibility. */
export function evaluateForTM(segment, signOff, project) {
  if (!segment || !signOff || !project) return { eligible: false, reasons: ['missing inputs'] };
  const reasons = [];
  if (!signedOff(project)) reasons.push('project not signed-off');
  if (project.requirements.tmAllowed === false) reasons.push('project policy disallows TM update');
  if (!signOff.feedTM) reasons.push('sign-off did not authorise TM update');
  if (!isDoneSegment(segment)) reasons.push(`segment decision "${segment.decision}" not eligible`);
  return { eligible: reasons.length === 0, reasons };
}

/** Terminology-agent dataset pipeline eligibility. */
export function evaluateForTerminology(segment, signOff, project) {
  if (!segment || !signOff || !project) return { eligible: false, reasons: ['missing inputs'] };
  const reasons = [];
  if (!signedOff(project)) reasons.push('project not signed-off');
  if (project.requirements.terminologyAllowed === false) reasons.push('project policy disallows terminology capture');
  if (!signOff.feedTerminology) reasons.push('sign-off did not authorise terminology capture');
  if (!isDoneSegment(segment)) reasons.push(`segment decision "${segment.decision}" not eligible`);
  return { eligible: reasons.length === 0, reasons };
}

/** Model-improvement (RLHF) pipeline eligibility — needs a rationale tag. */
export function evaluateForModel(segment, signOff, project) {
  if (!segment || !signOff || !project) return { eligible: false, reasons: ['missing inputs'] };
  const reasons = [];
  if (!signedOff(project)) reasons.push('project not signed-off');
  if (project.requirements.modelImprovementAllowed !== true) reasons.push('project policy disallows model improvement');
  if (!signOff.feedModel) reasons.push('sign-off did not authorise model improvement');
  if (!isDoneSegment(segment)) reasons.push(`segment decision "${segment.decision}" not eligible`);
  // RLHF learns the *why* — require a rationale tag.
  const latest = decisionsFor(segment.id)[0];
  if (latest && (!latest.rationaleTags || latest.rationaleTags.length === 0)) {
    reasons.push('segment decision has no rationale tags — display only');
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
    const tm = evaluateForTM(seg, signOff, project);
    const terminology = evaluateForTerminology(seg, signOff, project);
    const model = evaluateForModel(seg, signOff, project);
    if (!tm.eligible && !terminology.eligible && !model.eligible) continue;
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
    // Per-pipeline eligibility so the UI can offer each separately.
    candidate.eligibleTM = tm.eligible;
    candidate.eligibleTerminology = terminology.eligible;
    candidate.eligibleModel = model.eligible;
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

const PIPELINE_ELIGIBILITY = { tm: 'eligibleTM', terminology: 'eligibleTerminology', model: 'eligibleModel' };
const PIPELINE_LABEL = { tm: 'Translation Memory', terminology: 'terminology dataset', model: 'model improvement' };

export function approveRetrainingCandidate({ candidateId, actorId, target }) {
  requirePermission(actorId, 'approve_retraining', { candidateId });
  const c = RETRAINING_CANDIDATES.find(x => x.id === candidateId);
  if (!c) throw new Error(`candidate not found: ${candidateId}`);
  if (c.status !== 'pending') throw new Error(`candidate not pending (status: ${c.status})`);

  // target: 'tm' | 'terminology' | 'model' | 'all'
  const wanted = target === 'all' ? ['tm', 'terminology', 'model'] : [target];
  for (const p of wanted) {
    if (!PIPELINE_ELIGIBILITY[p]) throw new Error(`unknown pipeline: ${p}`);
    if (!c[PIPELINE_ELIGIBILITY[p]]) {
      appendAuditEvent({
        actorId, actorRole: getUserRoles(actorId)[0]?.id, projectId: c.projectId, segmentId: c.segmentId,
        eventType: 'reuse.approval-rejected',
        reason: `candidate not eligible for ${PIPELINE_LABEL[p]}`,
      });
      throw new Error(`candidate not eligible for ${PIPELINE_LABEL[p]}`);
    }
  }

  c.approvedForTM = c.approvedForTM || wanted.includes('tm');
  c.approvedForTerminology = c.approvedForTerminology || wanted.includes('terminology');
  c.approvedForModel = c.approvedForModel || wanted.includes('model');
  c.status = 'approved';

  // TM and terminology approvals capture provenance into the reuse
  // store (the surface the Trainer Profile + Pedigree Card cite).
  if (wanted.includes('tm') || wanted.includes('terminology')) {
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
