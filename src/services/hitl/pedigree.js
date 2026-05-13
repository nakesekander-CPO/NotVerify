/**
 * Intelligence Pedigree service
 *
 * The platform's "wax seal". Computes the four pedigree dimensions
 * from primary records (segments, decisions, sign-offs, vendors, org
 * brain) and assembles them into a card shape the UI renders.
 *
 *   1. Model Confidence       — composite of accepted agent confidences
 *   2. Verification Depth     — Untouched / Adjudicated / Authored split
 *   3. Provenance Chain       — models + adjudicators + validator + hash
 *   4. Domain Pedigree        — vendor/trainer specialism match
 *
 * Card consumers:
 *   - SegmentPedigreeCard  (inline below the segment editor)
 *   - DocumentPedigreeCard (top of the Final Sign-Off screen)
 *   - PortfolioTrustIndex  (client home dashboard)
 */

import {
  HITL_SEGMENTS, REVIEW_DECISIONS, SIGNOFF_RECORDS, VENDOR_ASSIGNMENTS,
  ORG_BRAIN_UPDATES, getProjectById, getVendorById,
} from '../../data/hitlVendorWorkflow';

const TWO_PCT = (n) => Math.round(n * 1000) / 10;

function _decisionsForSegment(segmentId) {
  return REVIEW_DECISIONS
    .filter(d => d.segmentId === segmentId)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
}

/* ─── Verification depth classification ───────────────────────── */

/**
 * Classify a segment into one of:
 *   untouched     — no human decision recorded; agent text passed through
 *   adjudicated   — human chose between agent proposals (no authoring)
 *   authored      — human wrote / heavily edited (chosenCandidateId is null
 *                   and the final text differs from every proposal)
 */
export function classifyVerificationDepth(segment) {
  const decisions = _decisionsForSegment(segment.id);
  if (decisions.length === 0) return 'untouched';
  const latest = decisions[0];
  if (latest.chosenCandidateId) return 'adjudicated';
  if (latest.action === 'edited' || (latest.newValue && latest.newValue !== segment.agentSuggestion)) {
    return 'authored';
  }
  return 'adjudicated';
}

/* ─── Segment-level pedigree card ─────────────────────────────── */

export function segmentPedigree(segmentId) {
  const seg = HITL_SEGMENTS.find(s => s.id === segmentId);
  if (!seg) return null;
  const project = getProjectById(seg.projectId);
  const decisions = _decisionsForSegment(segmentId);
  const latest = decisions[0] || null;
  const chosen = seg.agentCandidates?.find(c => c.id === seg.chosenCandidateId) || null;

  // 1. Model confidence — confidence of the accepted candidate, or top.
  const top = (seg.agentCandidates || []).slice().sort((a, b) => b.confidence - a.confidence)[0];
  const modelConfidence = chosen?.confidence ?? top?.confidence ?? seg.agentConfidence ?? 0;

  // 2. Verification depth.
  const depth = classifyVerificationDepth(seg);
  // Numeric: untouched 60, adjudicated 85, authored 95, with bonus for tags + voice.
  let depthScore = depth === 'untouched' ? 60 : depth === 'adjudicated' ? 85 : 95;
  if (latest?.rationaleTags?.length) depthScore += Math.min(8, latest.rationaleTags.length * 2);
  if (latest?.voiceRationaleId) depthScore = Math.min(100, depthScore + 4);
  depthScore = Math.min(100, depthScore);

  // 3. Human-verified confidence — only counts segments touched by a
  //    human. Untouched segments have humanConfidence = null (not zero).
  const humanConfidence = depth === 'untouched' ? null : depthScore / 100;

  // 4. Provenance chain.
  const provenance = decisions.map(d => ({
    actorId: d.actorId, actorRole: d.actorRole, action: d.action,
    chosenCandidateId: d.chosenCandidateId, tags: d.rationaleTags,
    at: d.timestamp,
  }));
  const assignment = VENDOR_ASSIGNMENTS.find(a => a.projectId === seg.projectId && a.status !== 'rejected');
  const vendor = assignment ? getVendorById(assignment.vendorId) : null;

  // 5. Domain pedigree — vendor specialism match.
  const domainMatch = vendor && project ? (vendor.domains.includes(project.requirements.domain) ? 96 : 60) : 0;

  // Composite (weighted; admin-configurable in real impl).
  const composite = Math.round(
    0.25 * (modelConfidence * 100) +
    0.40 * depthScore +
    0.20 * domainMatch +
    0.15 * (vendor?.qualityScore ?? 75)
  );

  // Provenance strength = how strong is the corroboration for this rendering?
  //   - decisions count: more reviewers → stronger
  //   - chosen-candidate confidence: higher → stronger
  //   - vendor track record: higher → stronger
  const provenanceStrength = Math.round(
    100 * (
      0.40 * Math.min(1, decisions.length / 2) +
      0.35 * (chosen?.confidence ?? top?.confidence ?? 0.5) +
      0.25 * ((vendor?.qualityScore ?? 75) / 100)
    )
  );

  // Component scores — the four axes the ConfidenceExplainer renders.
  const componentScores = {
    model:        { score: Math.round((modelConfidence) * 100), weight: 0.25, why: 'Composite of accepted agents’ raw confidence.' },
    depth:        { score: depthScore,                         weight: 0.40, why: depth === 'untouched' ? 'No human ruling yet — confidence is model-only.' : 'Verification depth from rationale tags, voice memos, and edit posture.' },
    domain:       { score: domainMatch,                        weight: 0.20, why: vendor && project ? `${vendor.name} domain match for ${project.requirements.domain}.` : 'No vendor-domain match available.' },
    provenance:   { score: provenanceStrength,                 weight: 0.15, why: `${decisions.length} prior decision${decisions.length === 1 ? '' : 's'}; vendor track record blended in.` },
  };

  return {
    kind: 'segment',
    segmentId,
    composite,
    modelConfidence,
    humanConfidence,
    depth,
    depthScore,
    provenanceStrength,
    domainMatch,
    componentScores,
    chosenAgent: chosen ? { id: chosen.agentId, name: chosen.agentName, version: chosen.version, confidence: chosen.confidence } : null,
    rejectedAgents: (seg.agentCandidates || [])
      .filter(c => c.id !== seg.chosenCandidateId)
      .map(c => ({ id: c.agentId, name: c.agentName, version: c.version, confidence: c.confidence })),
    rationaleTags: latest?.rationaleTags || [],
    voiceRationaleId: latest?.voiceRationaleId || null,
    provenance,
    vendor: vendor ? { id: vendor.id, name: vendor.name, securityTier: vendor.securityTier, certifications: vendor.certifications } : null,
    domainMatch,
  };
}

/* ─── Document-level pedigree card ─────────────────────────────── */

export function documentPedigree(projectId) {
  const project = getProjectById(projectId);
  if (!project) return null;
  const segs = HITL_SEGMENTS.filter(s => s.projectId === projectId);
  if (segs.length === 0) return null;

  const depths = segs.map(s => classifyVerificationDepth(s));
  const counts = {
    untouched: depths.filter(d => d === 'untouched').length,
    adjudicated: depths.filter(d => d === 'adjudicated').length,
    authored: depths.filter(d => d === 'authored').length,
  };
  const total = segs.length;
  const distribution = {
    untouchedPct: TWO_PCT(counts.untouched / total),
    adjudicatedPct: TWO_PCT(counts.adjudicated / total),
    authoredPct: TWO_PCT(counts.authored / total),
  };

  // Aggregate model confidence (mean across accepted/top candidates).
  const modelConf = segs.reduce((acc, s) => {
    const chosen = s.agentCandidates?.find(c => c.id === s.chosenCandidateId);
    const top = (s.agentCandidates || []).slice().sort((a, b) => b.confidence - a.confidence)[0];
    return acc + ((chosen?.confidence ?? top?.confidence ?? s.agentConfidence ?? 0));
  }, 0) / total;

  // Aggregate verification depth (weighted).
  const depthScore = TWO_PCT(
    (counts.untouched * 60 + counts.adjudicated * 85 + counts.authored * 95) / total / 100
  );

  // Voice rationales attached.
  const voiceCount = REVIEW_DECISIONS.filter(d => segs.find(s => s.id === d.segmentId) && d.voiceRationaleId).length;

  // Domain pedigree from vendor.
  const assignment = VENDOR_ASSIGNMENTS.find(a => a.projectId === projectId && (a.status === 'active' || a.status === 'complete'));
  const vendor = assignment ? getVendorById(assignment.vendorId) : null;
  const domainMatch = vendor ? (vendor.domains.includes(project.requirements.domain) ? 96 : 60) : 0;

  // Sign-off chain.
  const signOff = SIGNOFF_RECORDS.filter(r => r.projectId === projectId).slice(-1)[0] || null;

  const composite = Math.round(
    0.25 * (modelConf * 100) +
    0.40 * depthScore +
    0.20 * domainMatch +
    0.15 * (vendor?.qualityScore ?? 75)
  );

  // A short, deterministic-looking provenance hash for display.
  const provenanceHash = hashFor([
    projectId,
    vendor?.id || '',
    signOff?.id || '',
    signOff?.actorId || '',
    composite,
    Date.parse(signOff?.timestamp || project.createdAt) || 0,
  ].join('|'));

  return {
    kind: 'document',
    projectId,
    composite,
    modelConfidence: modelConf,
    depthScore,
    distribution,
    counts,
    voiceCount,
    domainMatch,
    vendor: vendor ? { id: vendor.id, name: vendor.name, certifications: vendor.certifications, securityTier: vendor.securityTier } : null,
    signOff: signOff ? {
      id: signOff.id, actorId: signOff.actorId, actorRole: signOff.actorRole,
      timestamp: signOff.timestamp, version: signOff.version,
    } : null,
    provenanceHash,
    routedThrough: project.requirements.requiredVendorPool || null,
  };
}

function hashFor(s) {
  // FNV-1a (32-bit) — enough for a visually plausible hash.
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return '0x' + h.toString(16).padStart(8, '0');
}

/* ─── Contributor footprint queries for the Trainer Profile ───── */

/**
 * Lifetime contribution stats for a single user across all org-brain
 * updates and decisions they've touched.
 */
export function contributorLifetimeImpact(userId) {
  const ownDecisions = REVIEW_DECISIONS.filter(d => d.actorId === userId);
  const adjudicated = ownDecisions.filter(d => d.chosenCandidateId).length;
  const authored = ownDecisions.filter(d => d.action === 'edited').length;
  const tagged = ownDecisions.filter(d => (d.rationaleTags || []).length > 0).length;
  const memoryEntries = ORG_BRAIN_UPDATES.filter(o =>
    (o.contributorFootprint || []).some(c => c.userId === userId)
  );
  const confidenceLifts = ownDecisions.reduce((acc, d) => {
    if (d.confidenceBefore == null || d.confidenceAfter == null) return acc;
    return acc + Math.max(0, d.confidenceAfter - d.confidenceBefore);
  }, 0);
  // Simple per-tag distribution.
  const tagFreq = {};
  for (const d of ownDecisions) for (const t of (d.rationaleTags || [])) tagFreq[t] = (tagFreq[t] || 0) + 1;
  return {
    userId,
    adjudicated,
    authored,
    tagged,
    memoryEntries: memoryEntries.length,
    memoryDomains: [...new Set(memoryEntries.map(m => m.domain).filter(Boolean))],
    confidenceLiftsRaw: Math.round(confidenceLifts * 100), // sum of point-gains in % terms
    tagFrequency: tagFreq,
  };
}
