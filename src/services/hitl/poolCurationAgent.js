/**
 * Pool Curation Agent
 *
 * An autonomous agent that continuously assesses a vendor pool's
 * composition against the pool's hard constraints and live vendor
 * performance, then proposes membership changes (remove / watch /
 * add). It is deterministic and pure — given the same data it
 * produces the same verdicts — so the UI can present it as an
 * always-on agent while a human retains override authority.
 *
 * The component layer decides whether the agent's proposals are
 * applied automatically (Autonomous), require approval (Supervised),
 * or are held (Paused / human override). This module only computes
 * the recommendation; it never mutates data.
 */

import { SECURITY_TIERS, VENDORS } from '../../data/hitlVendorWorkflow';

const tierRank = (t) => {
  const i = SECURITY_TIERS.indexOf(t);
  return i < 0 ? 0 : i;
};

const pct = (n) => `${Math.round((n || 0) * 100)}%`;

/* Verdict for a single current member. */
function memberVerdict(v, pool) {
  const reasons = [];
  let verdict = 'keep';
  let severity = 'ok'; // ok | warn | critical

  // ── Hard constraint violations → remove ──────────────────────
  if (v.status !== 'approved') {
    reasons.push({ kind: 'block', text: `Vendor status "${v.status}" — not approved` });
    verdict = 'remove'; severity = 'critical';
  }
  if (tierRank(v.securityTier) < tierRank(pool.securityMinTier)) {
    reasons.push({ kind: 'block', text: `Security tier ${v.securityTier} < pool minimum ${pool.securityMinTier}` });
    verdict = 'remove'; severity = 'critical';
  }
  if (v.ndaStatus && v.ndaStatus !== 'signed') {
    reasons.push({ kind: 'block', text: `NDA ${v.ndaStatus}` });
    verdict = 'remove'; severity = 'critical';
  }
  if (v.contractStatus && v.contractStatus !== 'active') {
    reasons.push({ kind: 'block', text: `Contract ${v.contractStatus}` });
    verdict = 'remove'; severity = 'critical';
  }
  const poolLangs = pool.allowedLanguages || [];
  if (!poolLangs.includes('*') && !(v.languages || []).some(l => poolLangs.includes(l))) {
    reasons.push({ kind: 'block', text: `No language overlap with pool (${poolLangs.join('/')})` });
    verdict = 'remove'; severity = 'critical';
  }
  if (v.availabilityStatus === 'unavailable') {
    reasons.push({ kind: 'block', text: 'Marked unavailable' });
    if (verdict !== 'remove') verdict = 'watch';
    severity = severity === 'critical' ? 'critical' : 'warn';
  }

  // ── Soft performance concerns → watch ────────────────────────
  if (verdict !== 'remove') {
    const soft = [];
    if (v.qualityScore != null && v.qualityScore < 88) soft.push(`Quality ${v.qualityScore} < 88`);
    if (v.onTimeDeliveryScore != null && v.onTimeDeliveryScore < 90) soft.push(`On-time ${v.onTimeDeliveryScore} < 90`);
    if (v.reworkRate != null && v.reworkRate > 0.08) soft.push(`Rework ${pct(v.reworkRate)} > 8%`);
    if (v.escalationRate != null && v.escalationRate > 0.05) soft.push(`Escalations ${pct(v.escalationRate)} > 5%`);
    if (v.avgValidationScore != null && v.avgValidationScore < 85) soft.push(`Validation ${v.avgValidationScore} < 85`);
    if (v.availabilityStatus === 'limited') soft.push('Limited availability');
    if (soft.length) {
      verdict = verdict === 'keep' ? 'watch' : verdict;
      severity = severity === 'critical' ? 'critical' : 'warn';
      soft.forEach(t => reasons.push({ kind: 'warn', text: t }));
    }
  }

  if (verdict === 'keep') {
    reasons.push({
      kind: 'good',
      text: `Quality ${v.qualityScore} · on-time ${v.onTimeDeliveryScore} · rework ${pct(v.reworkRate)}`,
    });
  }

  const confidence = verdict === 'remove' ? 0.97 : verdict === 'watch' ? 0.82 : 0.9;
  return { vendor: v, verdict, severity, reasons, confidence };
}

/* Fit assessment for a vendor NOT currently in the pool. */
function candidateFit(v, pool) {
  if (v.status !== 'approved') return null;
  if (tierRank(v.securityTier) < tierRank(pool.securityMinTier)) return null;
  if (v.ndaStatus && v.ndaStatus !== 'signed') return null;
  if (v.contractStatus && v.contractStatus !== 'active') return null;
  const poolLangs = pool.allowedLanguages || [];
  if (!poolLangs.includes('*') && !(v.languages || []).some(l => poolLangs.includes(l))) return null;

  const allowList = v.allowedVendorPools || [];
  const onAllowList = allowList.includes(pool.id);
  // Approval-gated pools only admit vendors explicitly allow-listed.
  if (pool.approvalRequired && !onAllowList) return null;

  const q = v.qualityScore ?? 0;
  const ot = v.onTimeDeliveryScore ?? 0;
  if (q < 90 || ot < 92) return null; // only strong fits are proposed

  const fitScore = Math.round(q * 0.5 + ot * 0.3 + (100 - (v.reworkRate ?? 0) * 100) * 0.2);
  const reasons = [
    `Quality ${q} · on-time ${ot} · rework ${pct(v.reworkRate)}`,
    onAllowList ? 'Vendor allow-list includes this pool' : 'Pool is open (no approval gate)',
    `Languages ${(v.languages || []).join('/')}`,
  ];
  return { vendor: v, fitScore, reasons };
}

/**
 * Assess a pool, factoring in any human-applied overrides so the
 * agent reasons over the *effective* membership.
 *
 * overrides = { addedIds, removedIds, pinnedIds }
 */
export function assessPool(pool, overrides = {}) {
  if (!pool) return null;
  const addedIds = overrides.addedIds || [];
  const removedIds = overrides.removedIds || [];
  const pinnedIds = overrides.pinnedIds || [];

  const effective = new Set(
    [...(pool.includedVendorIds || []), ...addedIds].filter(id => !removedIds.includes(id))
  );

  const members = [...effective]
    .map(id => VENDORS.find(v => v.id === id))
    .filter(Boolean)
    .map(v => {
      const a = memberVerdict(v, pool);
      a.pinned = pinnedIds.includes(v.id);
      return a;
    })
    .sort((a, b) => {
      const order = { remove: 0, watch: 1, keep: 2 };
      return order[a.verdict] - order[b.verdict];
    });

  const memberIds = new Set(members.map(m => m.vendor.id));
  const candidates = VENDORS
    .filter(v => !memberIds.has(v.id) && !removedIds.includes(v.id))
    .map(v => candidateFit(v, pool))
    .filter(Boolean)
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 4);

  const atRisk = members.filter(m => m.verdict === 'remove' && !m.pinned).length;
  const watch = members.filter(m => m.verdict === 'watch' && !m.pinned).length;
  const healthy = members.filter(m => m.verdict === 'keep').length;
  const pendingActions = atRisk + candidates.length;
  const autonomyConfidence = members.length
    ? Math.round((members.reduce((s, m) => s + m.confidence, 0) / members.length) * 100)
    : 90;

  return {
    pool,
    members,
    candidates,
    summary: { healthy, watch, atRisk, recommendedAdds: candidates.length, pendingActions, autonomyConfidence },
  };
}
