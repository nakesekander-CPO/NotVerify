/**
 * Vendor Selection Engine
 *
 * Two-phase: hard filters (boolean gates) → weighted scoring (0..1).
 *
 * Output: a recommendation object with the chosen vendor, ranked
 * alternatives, score breakdowns, an explanation per candidate, and
 * disqualification reasons for excluded candidates. The engine itself
 * never assigns — it only recommends. The caller is responsible for
 * RBAC + auditing + writing a VENDOR_ASSIGNMENT.
 *
 * Pure functions only. No mutation. Deterministic given the same input.
 */

import {
  VENDORS,
  VENDOR_POOLS,
  SELECTION_POLICIES,
  SECURITY_TIERS,
  getPoolById,
  getPolicyById,
  getVendorById,
} from '../../data/hitlVendorWorkflow';

/* ─── hard filters ────────────────────────────────────────────── */

function applyHardFilters(vendor, project, policy, pool) {
  const filters = policy.hardFilters || {};
  const reasons = [];

  if (filters.requireApprovedActive && vendor.status !== 'approved') {
    reasons.push(`Vendor status is "${vendor.status}", not "approved"`);
  }

  if (filters.requireLanguageMatch) {
    const tgt = project.requirements.targetLanguages || [];
    const src = project.requirements.sourceLanguage;
    const tgtMatch = tgt.every(l => vendor.languages.includes(l));
    const srcMatch = !src || vendor.languages.includes(src);
    if (!tgtMatch || !srcMatch) {
      reasons.push(`Missing language coverage (need ${src} → ${tgt.join(',')})`);
    }
  }

  if (filters.requireServiceMatch) {
    const needed = project.requirements.serviceRequired;
    if (needed && !vendor.services.includes(needed)) {
      reasons.push(`Service "${needed}" not offered`);
    }
  }

  if (filters.requireSecurityTier) {
    const need = project.requirements.securityClassification;
    if (need && SECURITY_TIERS.indexOf(vendor.securityTier) < SECURITY_TIERS.indexOf(need)) {
      reasons.push(`Security tier "${vendor.securityTier}" below required "${need}"`);
    }
  }

  if (filters.requireDataResidency) {
    const dr = project.requirements.dataResidency;
    if (dr && !vendor.dataResidencyEligibility.includes(dr)) {
      reasons.push(`Not data-resident for "${dr}"`);
    }
  }

  if (filters.requireCertifications) {
    const required = (project.requirements.requiredCertifications || []);
    const missing = required.filter(c => !vendor.certifications.includes(c));
    if (missing.length) {
      reasons.push(`Missing certifications: ${missing.join(', ')}`);
    }
  }

  if (filters.requireNda) {
    if (vendor.ndaStatus !== 'signed' && vendor.ndaStatus !== 'n/a') {
      reasons.push(`NDA status "${vendor.ndaStatus}" — needs signed`);
    }
  }

  if (filters.requireCapacity) {
    const wordcount = project.estimatedWordCount || 0;
    if (vendor.capacityWordsPerWeek && wordcount > vendor.capacityWordsPerWeek) {
      reasons.push(`Capacity ${vendor.capacityWordsPerWeek}/wk < project ${wordcount} words`);
    }
  }

  if (filters.requireAvailability) {
    if (vendor.availabilityStatus === 'unavailable') {
      reasons.push(`Vendor unavailable`);
    }
  }

  if (filters.requireConflictFree) {
    const client = project.clientTenantId;
    if (client && vendor.excludedClients.includes(client)) {
      reasons.push(`Conflict-of-interest with client "${client}"`);
    }
    if (vendor.clientRestrictions.length && !vendor.clientRestrictions.includes(`${client}-only`) && vendor.clientRestrictions.some(r => r.endsWith('-only'))) {
      reasons.push(`Vendor restricted to other clients`);
    }
  }

  if (filters.requireInAllowedPool && pool) {
    if (!pool.includedVendorIds.includes(vendor.id) || pool.excludedVendorIds.includes(vendor.id)) {
      reasons.push(`Not in pool "${pool.name}"`);
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

/* ─── scoring components (each 0..1) ──────────────────────────── */

function scoreLanguageMatch(vendor, project) {
  const tgt = project.requirements.targetLanguages || [];
  if (!tgt.length) return 1;
  const covered = tgt.filter(l => vendor.languages.includes(l)).length;
  return covered / tgt.length;
}

function scoreDomainExpertise(vendor, project) {
  const d = project.requirements.domain;
  if (!d) return 0.5;
  return vendor.domains.includes(d) ? 1 : 0.2;
}

function scoreQuality(vendor) {
  return (vendor.qualityScore ?? 50) / 100;
}

function scoreRating(vendor) {
  return (vendor.rating ?? 0) / 5;
}

function scoreOnTime(vendor) {
  return (vendor.onTimeDeliveryScore ?? 50) / 100;
}

function scoreRework(vendor) {
  // Low rework rate is better.
  return Math.max(0, 1 - (vendor.reworkRate ?? 0.1) * 4);
}

function scoreCost(vendor, project, policy) {
  const budget = project.requirements.budget;
  const words = project.estimatedWordCount || 1;
  const estimate = vendor.standardRate * words;
  if (!budget) return 0.5;
  const ratio = estimate / budget;
  if (ratio <= 1) return 1;
  if (ratio >= policy.maxCostMultiplier) return 0;
  return 1 - (ratio - 1) / (policy.maxCostMultiplier - 1);
}

function scoreSla(vendor, project) {
  const deadline = project.requirements.deadline;
  if (!deadline) return 0.5;
  const now = Date.now();
  const hoursToDeadline = (new Date(deadline).getTime() - now) / 1000 / 3600;
  if (hoursToDeadline <= 0) return 0;
  const fit = hoursToDeadline / vendor.slaCommitmentHours;
  if (fit >= 1.5) return 1;
  if (fit >= 1) return 0.85;
  if (fit >= 0.75) return 0.5;
  return 0.2;
}

function scoreAvailability(vendor) {
  if (vendor.availabilityStatus === 'available') return 1;
  if (vendor.availabilityStatus === 'limited') return 0.5;
  return 0;
}

function scoreCapacity(vendor, project) {
  const need = project.estimatedWordCount || 0;
  if (!need || !vendor.capacityWordsPerWeek) return 0.5;
  return Math.min(1, vendor.capacityWordsPerWeek / Math.max(need, 1));
}

function scoreSecurityTier(vendor) {
  return (SECURITY_TIERS.indexOf(vendor.securityTier) + 1) / SECURITY_TIERS.length;
}

function scoreClientPreference(vendor, project) {
  const tenant = project.clientTenantId;
  if (!tenant) return 0.5;
  // Heuristic: in-tenant or internal-team scores 1; otherwise 0.5.
  if (vendor.type === 'internal-team' && vendor.clientRestrictions.includes(`${tenant}-only`)) return 1;
  if (vendor.type === 'internal-team') return 0.8;
  return 0.5;
}

const SCORE_FNS = {
  languageMatch: scoreLanguageMatch,
  domainExpertise: scoreDomainExpertise,
  qualityScore: scoreQuality,
  rating: scoreRating,
  onTimeDelivery: scoreOnTime,
  reworkRate: scoreRework,
  costFit: scoreCost,
  slaFit: scoreSla,
  availability: scoreAvailability,
  capacity: scoreCapacity,
  securityTier: scoreSecurityTier,
  clientPreference: scoreClientPreference,
};

function normalisedWeights(weights) {
  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const out = {};
  for (const [k, v] of Object.entries(weights)) out[k] = v / sum;
  return out;
}

function scoreVendor(vendor, project, policy) {
  const weights = normalisedWeights(policy.weights);
  const breakdown = {};
  let total = 0;
  for (const [criterion, fn] of Object.entries(SCORE_FNS)) {
    if (weights[criterion] == null) continue;
    const raw = fn(vendor, project, policy);
    breakdown[criterion] = { weight: weights[criterion], raw, contribution: raw * weights[criterion] };
    total += raw * weights[criterion];
  }
  return { total, breakdown };
}

function explain(vendor, score, project, policy) {
  const top = Object.entries(score.breakdown)
    .sort((a, b) => b[1].contribution - a[1].contribution)
    .slice(0, 3)
    .map(([k, v]) => `${k} (${(v.raw * 100).toFixed(0)}%)`);
  const tier = vendor.type === 'internal-team' ? 'internal' : 'external';
  return `${vendor.name} (${tier}) scores ${(score.total * 100).toFixed(1)}% under "${policy.name}". Top contributors: ${top.join(', ')}.`;
}

function estimateCost(vendor, project) {
  const words = project.estimatedWordCount || 0;
  return Math.round(Math.max(vendor.standardRate * words, vendor.minimumFee || 0));
}

function estimateTurnaroundHours(vendor) {
  return vendor.avgTurnaroundHours || 48;
}

function riskLevel(score) {
  if (score >= 0.85) return 'low';
  if (score >= 0.7) return 'medium';
  if (score >= 0.55) return 'elevated';
  return 'high';
}

/* ─── main entry ──────────────────────────────────────────────── */

/**
 * recommendVendors({ project, policyId?, poolId?, candidates? })
 *
 * - policyId defaults to the pool's defaultSelectionPolicy, then to
 *   project.requirements.selectionPolicyId, then to 'sp-quality-first'.
 * - poolId defaults to project.requirements.requiredVendorPool.
 * - candidates defaults to all VENDORS.
 *
 * Returns:
 *   {
 *     policyId, poolId,
 *     recommended: VendorCandidate|null,
 *     alternatives: VendorCandidate[],
 *     disqualified: { vendorId, name, reasons }[],
 *     autoAssignAllowed: boolean,
 *     fallbackUsed: boolean,
 *     fallbackPolicyId: string|null,
 *   }
 *
 * VendorCandidate = {
 *   vendorId, name, score, breakdown, explanation,
 *   estimatedCost, estimatedTurnaroundHours, riskLevel,
 *   confidence: score,  // same number, named for downstream readers
 * }
 */
export function recommendVendors({ project, policyId, poolId, candidates } = {}) {
  if (!project) throw new Error('recommendVendors: project is required');

  const resolvedPoolId = poolId || project.requirements.requiredVendorPool || null;
  const pool = resolvedPoolId ? getPoolById(resolvedPoolId) : null;

  const resolvedPolicyId = policyId
    || (pool && pool.defaultSelectionPolicy)
    || project.requirements.selectionPolicyId
    || 'sp-quality-first';
  const policy = getPolicyById(resolvedPolicyId);
  if (!policy) throw new Error(`recommendVendors: unknown policy "${resolvedPolicyId}"`);

  const inputVendors = candidates || VENDORS;
  const disqualified = [];
  const eligible = [];

  for (const v of inputVendors) {
    const filter = applyHardFilters(v, project, policy, pool);
    if (!filter.eligible) {
      disqualified.push({ vendorId: v.id, name: v.name, reasons: filter.reasons });
      continue;
    }
    if ((v.qualityScore ?? 0) < policy.minQualityScore) {
      disqualified.push({ vendorId: v.id, name: v.name, reasons: [`Quality ${v.qualityScore} < policy min ${policy.minQualityScore}`] });
      continue;
    }
    const score = scoreVendor(v, project, policy);
    eligible.push({
      vendorId: v.id,
      name: v.name,
      score: score.total,
      confidence: score.total,
      breakdown: score.breakdown,
      explanation: explain(v, score, project, policy),
      estimatedCost: estimateCost(v, project),
      estimatedTurnaroundHours: estimateTurnaroundHours(v),
      riskLevel: riskLevel(score.total),
    });
  }

  eligible.sort((a, b) => b.score - a.score);

  // Fallback: if no eligible and policy has fallback, recurse.
  if (eligible.length === 0 && policy.fallbackPolicyId) {
    const fb = recommendVendors({ project, policyId: policy.fallbackPolicyId, poolId, candidates });
    return { ...fb, fallbackUsed: true, fallbackPolicyId: policy.fallbackPolicyId };
  }

  const recommended = eligible[0] || null;
  const autoAssignAllowed = !!recommended
    && !policy.requireManualApproval
    && recommended.score >= policy.autoAssignThreshold
    && !(pool && pool.approvalRequired);

  return {
    policyId: resolvedPolicyId,
    poolId: resolvedPoolId,
    recommended,
    alternatives: eligible.slice(1, 5),
    disqualified,
    autoAssignAllowed,
    fallbackUsed: false,
    fallbackPolicyId: null,
  };
}

/* Convenience: hydrate a recommendation with the full vendor record. */
export function expandRecommendation(rec) {
  if (!rec) return null;
  return { ...rec, vendor: getVendorById(rec.vendorId) };
}

/* Export the score function for tests. */
export const __internals__ = { applyHardFilters, scoreVendor };
