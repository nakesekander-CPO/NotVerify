/**
 * HITL Vendor Workflow — Domain Model
 *
 * In-memory seeded data + mutation helpers for the HITL Vendor Workflow
 * module. Follows the conventions in campaignModel.js and rbacModel.js:
 * exported arrays for state, factory functions for new entities, enums
 * for status/category vocabularies, and pure helpers for queries.
 *
 * No work in this module touches a network or a real datastore — every
 * persistence point is a JS mutation on the exported arrays. Service
 * layer functions in src/services/hitl/* enforce RBAC, append audit
 * events, and gate retraining eligibility before any write here.
 *
 * Project lifecycle: Upload → Extract → Review → Publish
 *   draft → intake-complete → uploaded → extracted →
 *   agent-preassessment-complete → vendor-selection-pending →
 *   vendor-recommended → vendor-auto-assigned →
 *   vendor-assignment-awaiting-approval → in-vendor-review →
 *   vendor-submitted → internal-validation → needs-rework →
 *   signoff-pending → signed-off → published → retraining-queued →
 *   completed → cancelled → archived
 */

/* ════════════════════════════════════════════════════════════════
   ENUMS
   ════════════════════════════════════════════════════════════════ */

export const VENDOR_TYPES = ['individual', 'agency', 'internal-team', 'external-partner'];

export const VENDOR_STATUS = ['draft', 'pending-approval', 'approved', 'suspended', 'archived'];

export const SERVICE_TYPES = [
  'translation',
  'review',
  'legal-review',
  'regulatory-review',
  'cultural-review',
  'terminology-review',
  'qa',
  'data-labelling',
  'model-evaluation',
  'agent-evaluation',
];

export const COST_MODELS = ['per-word', 'per-segment', 'per-hour', 'per-project', 'custom'];

export const SECURITY_TIERS = ['standard', 'elevated', 'high', 'restricted'];

export const PROJECT_STATUS = [
  'draft',
  'intake-complete',
  'uploaded',
  'extracted',
  'agent-preassessment-complete',
  'vendor-selection-pending',
  'vendor-recommended',
  'vendor-auto-assigned',
  'vendor-assignment-awaiting-approval',
  'in-vendor-review',
  'vendor-submitted',
  'internal-validation',
  'needs-rework',
  'signoff-pending',
  'signed-off',
  'published',
  'retraining-queued',
  'completed',
  'cancelled',
  'archived',
];

export const TASK_STATUS = [
  'not-started',
  'assigned',
  'in-progress',
  'blocked',
  'submitted',
  'under-validation',
  'verified',
  'not-verified',
  'needs-rework',
  'reassigned',
  'signed-off',
  'complete',
];

export const SEGMENT_DECISION = [
  'pending',
  'verified',
  'not-verified',
  'edited',
  'needs-rework',
  'escalated',
  'accepted',
  'rejected',
  'locked',
];

export const ERROR_CATEGORIES = [
  'terminology',
  'brand-voice',
  'legal',
  'regulatory',
  'cultural',
  'grammar-style',
  'accuracy',
  'formatting',
  'hallucination',
  'source-mismatch',
  'policy-violation',
  'domain-reasoning',
  'other',
];

export const RETRAINING_STATUS = ['pending', 'approved', 'rejected', 'used', 'archived'];

/**
 * Review modes — control how a project is reviewed inside arbitr.
 *
 *   external-vendor   → assigned to an external vendor agency.
 *   internal-single   → one internal reviewer takes the whole project
 *                       (one task / one reviewer). Fast lane for low-volume
 *                       work where context-switching matters more than
 *                       parallelism.
 *   internal-parallel → multiple internal reviewers work on different
 *                       tasks (files / sections) simultaneously. Project
 *                       manager assigns tasks via the Task Assignment
 *                       board. Each task has a primary reviewer; tasks
 *                       can optionally have co-reviewers for four-eyes.
 */
export const REVIEW_MODES = ['external-vendor', 'internal-single', 'internal-parallel'];

/** Per-task assignment mode. 'parallel' enables co-reviewers on one task. */
export const TASK_ASSIGNMENT_MODES = ['single', 'parallel'];

/**
 * Closed taxonomy of "Rationale Chips" the validator attaches to a
 * decision. Closed taxonomy = tractable training labels. Folksonomies
 * are forbidden — the platform does not learn from prose.
 *
 * Each chip is { id, label, domain[] }. A chip surfaces in a segment's
 * picker iff the segment's project.domain intersects chip.domain (or
 * the chip is domain-agnostic). This is what makes the chip set feel
 * domain-aware without forcing the validator to filter.
 */
export const RATIONALE_CHIPS = [
  // Universal — surface on every segment.
  { id: 'register',          label: 'Register',           domain: ['*'] },
  { id: 'brand-voice',       label: 'Brand Voice',        domain: ['*'] },
  { id: 'source-drift',      label: 'Source Drift',       domain: ['*'] },
  // Financial domain.
  { id: 'term-jgaap',        label: 'Terminology · J-GAAP', domain: ['financial'] },
  { id: 'tse-convention',    label: 'TSE Convention',     domain: ['financial'] },
  { id: 'ifrs',              label: 'IFRS Alignment',     domain: ['financial'] },
  // Regulatory.
  { id: 'reg-jfsa',          label: 'JFSA Disclosure',    domain: ['financial', 'regulatory'] },
  { id: 'reg-bafin',         label: 'BaFin Phrasing',     domain: ['regulatory'] },
  { id: 'reg-mifid',         label: 'MiFID-II',           domain: ['regulatory'] },
  { id: 'reg-gdpr',          label: 'GDPR',               domain: ['regulatory', 'legal'] },
  // Legal.
  { id: 'legal-precedent',   label: 'Legal Precedent',    domain: ['legal'] },
  { id: 'contracts',         label: 'Contractual Term',   domain: ['legal'] },
  // Cultural.
  { id: 'cultural-nuance',   label: 'Cultural Nuance',    domain: ['*'] },
  // Pedigree-only — never auto-suggested, only chosen.
  { id: 'hallucination',     label: 'Hallucination',      domain: ['*'] },
  { id: 'policy-violation',  label: 'Policy Violation',   domain: ['*'] },
];

/** Each segment may have up to N candidate agent proposals. */
export const MAX_AGENT_CANDIDATES = 4;

/**
 * Ruling Postures — the validator MUST commit to one of these before
 * the Ruling field unlocks. This is the single most important
 * constraint in the workspace: the empty-textarea-by-default rule.
 *
 *   accept → take a candidate verbatim (the Positive Calibration path
 *            fires here: 2s chip-row to capture "why it was right").
 *   refine → start from a candidate, edit. Diff-aware chips appear.
 *   reject → no candidate is acceptable. Authoring from scratch; chips +
 *            reasonNote both required.
 */
export const RULING_POSTURES = ['accept', 'refine', 'reject'];

/**
 * Positive-Calibration chips — surface ONLY on Accept-as-is. They are
 * short, frictionless, and capture the "why it was right" signal —
 * essential for upweighting good agent outputs during retraining.
 */
export const POSITIVE_CALIBRATION_CHIPS = [
  { id: 'glossary-match',  label: 'Glossary match' },
  { id: 'tone-correct',    label: 'Tone correct' },
  { id: 'register-correct',label: 'Register correct' },
  { id: 'no-edit-needed',  label: 'No edit needed' },
];

/**
 * Flag categories — closed taxonomy of why a segment is in the
 * reviewer's queue. Computed at extraction time by computeFlagCategories.
 * Each category has a tone (for the chip colour) and a short, human-
 * readable explanation that the WhyThisSegmentChips hover-card renders.
 */
export const FLAG_CATEGORIES = {
  'terminology-conflict':   { label: 'Terminology conflict',     tone: 'amber'  },
  'regulatory-sensitivity': { label: 'Regulatory sensitivity',   tone: 'ocean'  },
  'cultural-nuance':        { label: 'Cultural nuance',          tone: 'ocean'  },
  'potential-hallucination':{ label: 'Potential hallucination',  tone: 'error'  },
  'numerical-inconsistency':{ label: 'Numerical inconsistency',  tone: 'error'  },
  'brand-voice-drift':      { label: 'Brand voice drift',        tone: 'amber'  },
  'missing-org-brain':      { label: 'Missing Org Brain support',tone: 'mist'   },
  'agent-disagreement':     { label: 'Agent disagreement',       tone: 'amber'  },
  'low-provenance':         { label: 'Low provenance confidence',tone: 'mist'   },
  'length-formatting':      { label: 'Length or formatting risk',tone: 'amber'  },
};

/* ════════════════════════════════════════════════════════════════
   VENDORS
   ════════════════════════════════════════════════════════════════ */

export const VENDORS = [
  {
    id: 'v-nihon-linguistics',
    name: 'Nihon Linguistics K.K.',
    type: 'agency',
    status: 'approved',
    languages: ['ja', 'en'],
    languagePairs: [['en', 'ja'], ['ja', 'en']],
    locales: ['ja-JP'],
    domains: ['financial', 'regulatory', 'legal'],
    services: ['translation', 'review', 'regulatory-review', 'terminology-review'],
    costModel: 'per-word',
    currency: 'USD',
    standardRate: 0.18,
    rushRate: 0.27,
    minimumFee: 250,
    avgTurnaroundHours: 36,
    slaCommitmentHours: 48,
    capacityWordsPerWeek: 80000,
    availabilityStatus: 'available',
    region: 'APAC',
    jurisdiction: 'JP',
    dataResidencyEligibility: ['JP', 'APAC'],
    securityTier: 'high',
    certifications: ['ISO-17100', 'ISO-27001', 'SOC2-Type-II'],
    complianceTags: ['JFSA', 'TSE', 'J-GAAP'],
    ndaStatus: 'signed',
    contractStatus: 'active',
    insuranceStatus: 'verified',
    contactEmail: 'partners@nihon-linguistics.jp',
    vendorAdmins: ['hana'],
    assignedUsers: ['hana', 'ren'],
    rating: 4.8,
    qualityScore: 94,
    onTimeDeliveryScore: 97,
    reworkRate: 0.03,
    escalationRate: 0.01,
    avgValidationScore: 93,
    costPerformance: 0.92,
    clientRestrictions: [],
    allowedVendorPools: ['vp-japanese-financial', 'vp-global-regulatory'],
    excludedClients: [],
    notes: 'Long-standing partner for Meridian Japan filings. Preferred for J-GAAP work.',
    attachments: [
      { id: 'doc-nl-iso17100', name: 'ISO-17100 certificate.pdf', kind: 'certification' },
      { id: 'doc-nl-nda', name: 'NDA-2025.pdf', kind: 'nda' },
    ],
    createdAt: '2025-04-12T09:00:00Z',
    createdBy: 'alex',
    auditTrail: [
      { timestamp: '2025-04-12T09:00:00Z', actor: 'alex', action: 'vendor.created' },
      { timestamp: '2025-04-15T14:30:00Z', actor: 'alex', action: 'vendor.approved' },
    ],
  },
  {
    id: 'v-bonn-legal',
    name: 'Bonn Legal Translation GmbH',
    type: 'agency',
    status: 'approved',
    languages: ['de', 'en', 'fr'],
    languagePairs: [['en', 'de'], ['de', 'en'], ['fr', 'de']],
    locales: ['de-DE', 'de-AT'],
    domains: ['legal', 'regulatory', 'contracts'],
    services: ['translation', 'legal-review', 'review', 'terminology-review'],
    costModel: 'per-word',
    currency: 'EUR',
    standardRate: 0.21,
    rushRate: 0.32,
    minimumFee: 300,
    avgTurnaroundHours: 30,
    slaCommitmentHours: 48,
    capacityWordsPerWeek: 60000,
    availabilityStatus: 'limited',
    region: 'EMEA',
    jurisdiction: 'DE',
    dataResidencyEligibility: ['DE', 'EU'],
    securityTier: 'high',
    certifications: ['ISO-17100', 'GDPR-DPA'],
    complianceTags: ['BaFin', 'EU-GDPR', 'MiFID-II'],
    ndaStatus: 'signed',
    contractStatus: 'active',
    insuranceStatus: 'verified',
    contactEmail: 'partners@bonn-legal.de',
    vendorAdmins: ['klaus'],
    assignedUsers: ['klaus'],
    rating: 4.6,
    qualityScore: 91,
    onTimeDeliveryScore: 95,
    reworkRate: 0.05,
    escalationRate: 0.02,
    avgValidationScore: 90,
    costPerformance: 0.84,
    clientRestrictions: [],
    allowedVendorPools: ['vp-eu-regulatory', 'vp-global-legal'],
    excludedClients: [],
    notes: 'EU GDPR / BaFin specialist. Reserved for German regulatory filings.',
    attachments: [
      { id: 'doc-bl-iso17100', name: 'ISO-17100 cert.pdf', kind: 'certification' },
      { id: 'doc-bl-gdpr', name: 'GDPR DPA.pdf', kind: 'compliance' },
    ],
    createdAt: '2025-05-20T11:00:00Z',
    createdBy: 'alex',
    auditTrail: [
      { timestamp: '2025-05-20T11:00:00Z', actor: 'alex', action: 'vendor.created' },
      { timestamp: '2025-05-22T09:00:00Z', actor: 'alex', action: 'vendor.approved' },
    ],
  },
  {
    id: 'v-milano-finance',
    name: 'Milano Finance Linguists',
    type: 'agency',
    status: 'approved',
    languages: ['it', 'en', 'fr'],
    languagePairs: [['en', 'it'], ['it', 'en']],
    locales: ['it-IT'],
    domains: ['financial', 'investor-relations'],
    services: ['translation', 'review'],
    costModel: 'per-word',
    currency: 'EUR',
    standardRate: 0.16,
    rushRate: 0.24,
    minimumFee: 200,
    avgTurnaroundHours: 30,
    slaCommitmentHours: 60,
    capacityWordsPerWeek: 50000,
    availabilityStatus: 'available',
    region: 'EMEA',
    jurisdiction: 'IT',
    dataResidencyEligibility: ['IT', 'EU'],
    securityTier: 'elevated',
    certifications: ['ISO-17100'],
    complianceTags: ['EU-GDPR'],
    ndaStatus: 'signed',
    contractStatus: 'active',
    insuranceStatus: 'verified',
    contactEmail: 'team@milano-finance.it',
    vendorAdmins: ['sofia'],
    assignedUsers: ['sofia'],
    rating: 4.3,
    qualityScore: 88,
    onTimeDeliveryScore: 92,
    reworkRate: 0.08,
    escalationRate: 0.03,
    avgValidationScore: 87,
    costPerformance: 0.96,
    clientRestrictions: [],
    allowedVendorPools: ['vp-eu-financial'],
    excludedClients: [],
    notes: 'Cost-efficient for IT financial work. Not approved for regulated filings.',
    attachments: [
      { id: 'doc-mf-iso17100', name: 'ISO-17100 cert.pdf', kind: 'certification' },
    ],
    createdAt: '2025-08-01T10:00:00Z',
    createdBy: 'alex',
    auditTrail: [
      { timestamp: '2025-08-01T10:00:00Z', actor: 'alex', action: 'vendor.created' },
      { timestamp: '2025-08-04T09:30:00Z', actor: 'alex', action: 'vendor.approved' },
    ],
  },
  {
    id: 'v-internal-reviewers',
    name: 'Meridian Internal Reviewers',
    type: 'internal-team',
    status: 'approved',
    languages: ['en', 'ja', 'de'],
    languagePairs: [['en', 'ja'], ['en', 'de']],
    locales: ['ja-JP', 'de-DE'],
    domains: ['financial', 'regulatory', 'legal'],
    services: ['review', 'legal-review', 'regulatory-review'],
    costModel: 'per-hour',
    currency: 'USD',
    standardRate: 0,
    rushRate: 0,
    minimumFee: 0,
    avgTurnaroundHours: 18,
    slaCommitmentHours: 24,
    capacityWordsPerWeek: 30000,
    availabilityStatus: 'available',
    region: 'GLOBAL',
    jurisdiction: 'INTERNAL',
    dataResidencyEligibility: ['JP', 'DE', 'US', 'EU', 'APAC'],
    securityTier: 'restricted',
    certifications: ['INTERNAL-CLEARED'],
    complianceTags: ['INTERNAL'],
    ndaStatus: 'n/a',
    contractStatus: 'employee',
    insuranceStatus: 'n/a',
    contactEmail: 'internal-reviewers@meridian-capital.com',
    vendorAdmins: ['sarah'],
    assignedUsers: ['sarah', 'yuki', 'marcus'],
    rating: 4.9,
    qualityScore: 96,
    onTimeDeliveryScore: 99,
    reworkRate: 0.01,
    escalationRate: 0.005,
    avgValidationScore: 95,
    costPerformance: 1,
    clientRestrictions: ['meridian-only'],
    allowedVendorPools: ['vp-internal-only', 'vp-japanese-financial', 'vp-eu-regulatory'],
    excludedClients: [],
    notes: 'Internal compliance reviewers. First choice for high-security work.',
    attachments: [],
    createdAt: '2025-01-15T08:00:00Z',
    createdBy: 'alex',
    auditTrail: [
      { timestamp: '2025-01-15T08:00:00Z', actor: 'alex', action: 'vendor.created' },
    ],
  },
];

/* ════════════════════════════════════════════════════════════════
   VENDOR POOLS
   ════════════════════════════════════════════════════════════════ */

export const VENDOR_POOLS = [
  {
    id: 'vp-japanese-financial',
    name: 'Japanese Financial Translation Pool',
    description: 'Approved vendors for JA financial filings (earnings, MD&A, IR materials).',
    scope: 'global',
    includedVendorIds: ['v-nihon-linguistics', 'v-internal-reviewers'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-quality-first',
    securityMinTier: 'high',
    allowedProjectTypes: ['earnings-report', 'investor-relations', 'regulatory-filing'],
    allowedLanguages: ['ja', 'en'],
    fallbackPoolId: null,
    approvalRequired: false,
    createdBy: 'alex',
    createdAt: '2025-04-20T00:00:00Z',
  },
  {
    id: 'vp-eu-regulatory',
    name: 'EU Regulatory Review Pool',
    description: 'Vendors cleared for BaFin / MiFID-II / GDPR regulatory work.',
    scope: 'global',
    includedVendorIds: ['v-bonn-legal', 'v-internal-reviewers'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-compliance-first',
    securityMinTier: 'high',
    allowedProjectTypes: ['regulatory-filing', 'legal-contract'],
    allowedLanguages: ['de', 'fr', 'en'],
    fallbackPoolId: null,
    approvalRequired: true,
    createdBy: 'alex',
    createdAt: '2025-05-25T00:00:00Z',
  },
  {
    id: 'vp-eu-financial',
    name: 'EU Financial Translation Pool',
    description: 'EU-resident vendors for general financial content. Not approved for regulated filings.',
    scope: 'global',
    includedVendorIds: ['v-milano-finance'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-cost-balanced',
    securityMinTier: 'elevated',
    allowedProjectTypes: ['earnings-report', 'marketing-content'],
    allowedLanguages: ['it', 'fr', 'en'],
    fallbackPoolId: 'vp-eu-regulatory',
    approvalRequired: false,
    createdBy: 'alex',
    createdAt: '2025-08-05T00:00:00Z',
  },
  {
    id: 'vp-internal-only',
    name: 'Internal Reviewers Only',
    description: 'Force internal-team reviewers. Used for client-restricted or top-secret work.',
    scope: 'global',
    includedVendorIds: ['v-internal-reviewers'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-security-first',
    securityMinTier: 'restricted',
    allowedProjectTypes: ['*'],
    allowedLanguages: ['*'],
    fallbackPoolId: null,
    approvalRequired: true,
    createdBy: 'alex',
    createdAt: '2025-01-15T08:30:00Z',
  },
  {
    id: 'vp-global-legal',
    name: 'Global Legal Review Pool',
    description: 'Cross-region legal review specialists.',
    scope: 'global',
    includedVendorIds: ['v-bonn-legal', 'v-internal-reviewers'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-quality-first',
    securityMinTier: 'high',
    allowedProjectTypes: ['legal-contract'],
    allowedLanguages: ['*'],
    fallbackPoolId: null,
    approvalRequired: false,
    createdBy: 'alex',
    createdAt: '2025-09-01T00:00:00Z',
  },
  {
    id: 'vp-global-regulatory',
    name: 'Global Regulatory Pool',
    description: 'Vendors cleared for cross-jurisdiction regulatory work.',
    scope: 'global',
    includedVendorIds: ['v-nihon-linguistics', 'v-bonn-legal', 'v-internal-reviewers'],
    excludedVendorIds: [],
    defaultSelectionPolicy: 'sp-compliance-first',
    securityMinTier: 'high',
    allowedProjectTypes: ['regulatory-filing'],
    allowedLanguages: ['*'],
    fallbackPoolId: null,
    approvalRequired: true,
    createdBy: 'alex',
    createdAt: '2025-09-10T00:00:00Z',
  },
];

/* ════════════════════════════════════════════════════════════════
   SELECTION POLICIES
   ════════════════════════════════════════════════════════════════ */

/**
 * A selection policy is the configurable algorithm spec the vendor
 * selection engine consumes. Weights sum to 1.0 by convention but the
 * engine normalises if they don't. Hard filters are boolean gates.
 */
export const SELECTION_POLICIES = [
  {
    id: 'sp-quality-first',
    name: 'Quality-First',
    description: 'Maximise expected quality. Use for high-stakes filings.',
    scope: 'global',
    hardFilters: {
      requireApprovedActive: true,
      requireLanguageMatch: true,
      requireServiceMatch: true,
      requireSecurityTier: true,
      requireDataResidency: true,
      requireCertifications: true,
      requireNda: true,
      requireCapacity: true,
      requireAvailability: true,
      requireConflictFree: true,
      requireInAllowedPool: true,
    },
    weights: {
      languageMatch: 0.10,
      domainExpertise: 0.18,
      qualityScore: 0.22,
      rating: 0.06,
      onTimeDelivery: 0.10,
      reworkRate: 0.08,
      costFit: 0.04,
      slaFit: 0.06,
      availability: 0.04,
      capacity: 0.04,
      securityTier: 0.05,
      clientPreference: 0.03,
    },
    autoAssignThreshold: 0.82,
    minQualityScore: 85,
    maxCostMultiplier: 1.5,
    requireManualApproval: false,
    fallbackPolicyId: 'sp-cost-balanced',
    /* Tenant-tunable confidence thresholds (per-policy + per-domain overrides). */
    confidenceThresholds: {
      autoPublishAt: 0.96,
      flagAt: 0.90,
      escalateAt: 0.75,
      perDomain: {
        regulatory: { flagAt: 0.92, escalateAt: 0.80 },
        legal:      { flagAt: 0.92, escalateAt: 0.80 },
        financial:  { flagAt: 0.90, escalateAt: 0.75 },
      },
    },
    createdBy: 'platform',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sp-compliance-first',
    name: 'Compliance-First',
    description: 'Maximise regulatory/legal/compliance fit. Manual approval required.',
    scope: 'global',
    hardFilters: {
      requireApprovedActive: true,
      requireLanguageMatch: true,
      requireServiceMatch: true,
      requireSecurityTier: true,
      requireDataResidency: true,
      requireCertifications: true,
      requireNda: true,
      requireCapacity: true,
      requireAvailability: true,
      requireConflictFree: true,
      requireInAllowedPool: true,
    },
    weights: {
      languageMatch: 0.08,
      domainExpertise: 0.20,
      qualityScore: 0.15,
      rating: 0.04,
      onTimeDelivery: 0.07,
      reworkRate: 0.06,
      costFit: 0.02,
      slaFit: 0.05,
      availability: 0.04,
      capacity: 0.04,
      securityTier: 0.15,
      clientPreference: 0.10,
    },
    autoAssignThreshold: 0.90,
    minQualityScore: 88,
    maxCostMultiplier: 2.0,
    requireManualApproval: true,
    fallbackPolicyId: 'sp-quality-first',
    confidenceThresholds: {
      autoPublishAt: 0.98,
      flagAt: 0.92,
      escalateAt: 0.80,
      perDomain: {
        regulatory: { flagAt: 0.95, escalateAt: 0.85 },
        legal:      { flagAt: 0.94, escalateAt: 0.84 },
      },
    },
    createdBy: 'platform',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sp-cost-balanced',
    name: 'Cost-Balanced',
    description: 'Balance cost and quality. Use for non-regulated marketing/IR content.',
    scope: 'global',
    hardFilters: {
      requireApprovedActive: true,
      requireLanguageMatch: true,
      requireServiceMatch: true,
      requireSecurityTier: true,
      requireDataResidency: false,
      requireCertifications: false,
      requireNda: true,
      requireCapacity: true,
      requireAvailability: true,
      requireConflictFree: true,
      requireInAllowedPool: true,
    },
    weights: {
      languageMatch: 0.10,
      domainExpertise: 0.12,
      qualityScore: 0.14,
      rating: 0.06,
      onTimeDelivery: 0.10,
      reworkRate: 0.08,
      costFit: 0.18,
      slaFit: 0.06,
      availability: 0.06,
      capacity: 0.04,
      securityTier: 0.03,
      clientPreference: 0.03,
    },
    autoAssignThreshold: 0.75,
    minQualityScore: 80,
    maxCostMultiplier: 1.1,
    requireManualApproval: false,
    fallbackPolicyId: null,
    confidenceThresholds: {
      autoPublishAt: 0.94,
      flagAt: 0.85,
      escalateAt: 0.70,
      perDomain: {},
    },
    createdBy: 'platform',
    createdAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'sp-security-first',
    name: 'Security-First',
    description: 'Internal-only or restricted-tier vendors. For top-secret work.',
    scope: 'global',
    hardFilters: {
      requireApprovedActive: true,
      requireLanguageMatch: true,
      requireServiceMatch: true,
      requireSecurityTier: true,
      requireDataResidency: true,
      requireCertifications: true,
      requireNda: true,
      requireCapacity: true,
      requireAvailability: true,
      requireConflictFree: true,
      requireInAllowedPool: true,
    },
    weights: {
      languageMatch: 0.06,
      domainExpertise: 0.10,
      qualityScore: 0.12,
      rating: 0.04,
      onTimeDelivery: 0.06,
      reworkRate: 0.04,
      costFit: 0,
      slaFit: 0.04,
      availability: 0.04,
      capacity: 0.05,
      securityTier: 0.40,
      clientPreference: 0.05,
    },
    autoAssignThreshold: 0.95,
    minQualityScore: 90,
    maxCostMultiplier: 3.0,
    requireManualApproval: true,
    fallbackPolicyId: null,
    confidenceThresholds: {
      autoPublishAt: 0.99,
      flagAt: 0.94,
      escalateAt: 0.85,
      perDomain: {},
    },
    createdBy: 'platform',
    createdAt: '2025-01-01T00:00:00Z',
  },
];

/* ════════════════════════════════════════════════════════════════
   PROJECTS (HITL) + REQUIREMENTS + PRE-ASSESSMENTS
   ════════════════════════════════════════════════════════════════ */

export const HITL_PROJECTS = [
  {
    id: 'hp-q3-ja-earnings',
    name: 'Q3 2026 Earnings Report — JA',
    clientTenantId: 'meridian',
    clientNodeId: 'mc-japan-finance',
    status: 'vendor-recommended',
    requirements: {
      reviewMode: 'external-vendor',
      sourceLanguage: 'en',
      targetLanguages: ['ja'],
      locales: ['ja-JP'],
      domain: 'financial',
      contentType: 'earnings-report',
      serviceRequired: 'translation',
      deadline: '2026-05-22T17:00:00Z',
      budget: 18000,
      costSensitivity: 'medium',
      qualityThreshold: 92,
      autoPublishThreshold: 96,
      requiredReviewLevel: 'two-stage',
      securityClassification: 'high',
      dataResidency: 'JP',
      requiredVendorPool: 'vp-japanese-financial',
      vendorExclusions: [],
      requiredSignoffRole: 'final-validator',
      retrainingAllowed: true,
      orgBrainAllowed: true,
      modelSuggestionsAllowed: true,
    },
    riskAssessment: {
      complexityScore: 78,
      riskLevel: 'high',
      confidenceScore: 0.74,
      regulatoryRisk: 'high',
      legalRisk: 'medium',
      brandRisk: 'medium',
      culturalRisk: 'medium',
      terminologyRisk: 'high',
      languageDifficulty: 'high',
      vendorReviewRequired: true,
      internalOnlyReviewRequired: false,
      recommendedSpecialistAgents: ['agent-ja-financial', 'agent-jgaap-terminology'],
      recommendedExpertise: ['JFSA filings', 'J-GAAP', 'Investor relations JA'],
      generatedBy: 'Quality Risk Agent',
      generatedAt: '2026-05-10T08:00:00Z',
      explanation: 'Earnings reports in JA carry high regulatory (JFSA) and terminology (J-GAAP) risk. Cultural register matters for investor communications. Recommend ISO-17100 vendor with J-GAAP specialism.',
    },
    createdBy: 'kenji',
    createdAt: '2026-05-10T07:30:00Z',
    estimatedWordCount: 24000,
  },
  {
    id: 'hp-de-regulatory',
    name: 'BaFin Filing Translation — DE',
    clientTenantId: 'meridian',
    clientNodeId: 'mc-germany-tax',
    status: 'vendor-auto-assigned',
    requirements: {
      reviewMode: 'external-vendor',
      sourceLanguage: 'en',
      targetLanguages: ['de'],
      locales: ['de-DE'],
      domain: 'regulatory',
      contentType: 'regulatory-filing',
      serviceRequired: 'regulatory-review',
      deadline: '2026-05-30T17:00:00Z',
      budget: 22000,
      costSensitivity: 'low',
      qualityThreshold: 95,
      autoPublishThreshold: 98,
      requiredReviewLevel: 'multi-stage',
      securityClassification: 'high',
      dataResidency: 'DE',
      requiredVendorPool: 'vp-eu-regulatory',
      vendorExclusions: [],
      requiredSignoffRole: 'compliance-reviewer',
      retrainingAllowed: false,
      orgBrainAllowed: true,
      modelSuggestionsAllowed: false,
    },
    riskAssessment: {
      complexityScore: 88,
      riskLevel: 'critical',
      confidenceScore: 0.62,
      regulatoryRisk: 'critical',
      legalRisk: 'high',
      brandRisk: 'low',
      culturalRisk: 'low',
      terminologyRisk: 'critical',
      languageDifficulty: 'high',
      vendorReviewRequired: true,
      internalOnlyReviewRequired: false,
      recommendedSpecialistAgents: ['agent-de-regulatory', 'agent-bafin-compliance'],
      recommendedExpertise: ['BaFin', 'MiFID-II', 'GDPR'],
      generatedBy: 'Quality Risk Agent',
      generatedAt: '2026-05-11T09:00:00Z',
      explanation: 'BaFin filings have zero tolerance for terminology error. Manual approval required by policy.',
    },
    createdBy: 'marcus',
    createdAt: '2026-05-11T08:15:00Z',
    estimatedWordCount: 18000,
  },
  /* ── Internal review: single reviewer / single file ──────────── */
  {
    id: 'hp-q3-mda-internal-single',
    name: 'Q3 MD&A Memo — Internal review (single reviewer)',
    clientTenantId: 'meridian',
    clientNodeId: 'mc-japan-finance',
    status: 'in-vendor-review',
    requirements: {
      reviewMode: 'internal-single',
      sourceLanguage: 'en',
      targetLanguages: ['en'],
      locales: ['en-US'],
      domain: 'financial',
      contentType: 'investor-memo',
      serviceRequired: 'review',
      deadline: '2026-05-15T17:00:00Z',
      budget: 0,
      costSensitivity: 'low',
      qualityThreshold: 90,
      autoPublishThreshold: 95,
      requiredReviewLevel: 'single',
      securityClassification: 'high',
      dataResidency: 'INTERNAL',
      requiredVendorPool: 'vp-internal-only',
      vendorExclusions: [],
      requiredSignoffRole: 'final-validator',
      retrainingAllowed: true,
      orgBrainAllowed: true,
      modelSuggestionsAllowed: true,
    },
    riskAssessment: {
      complexityScore: 52,
      riskLevel: 'medium',
      confidenceScore: 0.83,
      regulatoryRisk: 'medium',
      legalRisk: 'low',
      brandRisk: 'medium',
      culturalRisk: 'low',
      terminologyRisk: 'medium',
      languageDifficulty: 'low',
      vendorReviewRequired: false,
      internalOnlyReviewRequired: true,
      recommendedSpecialistAgents: ['agent-brand-voice', 'agent-financial-style'],
      recommendedExpertise: ['Investor relations style', 'Brand voice'],
      generatedBy: 'Quality Risk Agent',
      generatedAt: '2026-05-12T08:00:00Z',
      explanation: 'Short investor memo. Single internal reviewer is sufficient. Restricted to internal pool because the memo contains undisclosed forecast figures.',
    },
    createdBy: 'kenji',
    createdAt: '2026-05-12T07:30:00Z',
    estimatedWordCount: 1800,
  },
  /* ── Internal review: multiple files / parallel reviewers ────── */
  {
    id: 'hp-annual-internal-parallel',
    name: 'FY26 Annual Report — Internal parallel review',
    clientTenantId: 'meridian',
    clientNodeId: 'mc-japan-finance',
    status: 'in-vendor-review',
    requirements: {
      reviewMode: 'internal-parallel',
      sourceLanguage: 'en',
      targetLanguages: ['en'],
      locales: ['en-US'],
      domain: 'financial',
      contentType: 'annual-report',
      serviceRequired: 'review',
      deadline: '2026-05-28T17:00:00Z',
      budget: 0,
      costSensitivity: 'low',
      qualityThreshold: 93,
      autoPublishThreshold: 97,
      requiredReviewLevel: 'multi-stage',
      securityClassification: 'high',
      dataResidency: 'INTERNAL',
      requiredVendorPool: 'vp-internal-only',
      vendorExclusions: [],
      requiredSignoffRole: 'final-validator',
      retrainingAllowed: true,
      orgBrainAllowed: true,
      modelSuggestionsAllowed: false,
    },
    riskAssessment: {
      complexityScore: 81,
      riskLevel: 'high',
      confidenceScore: 0.71,
      regulatoryRisk: 'high',
      legalRisk: 'medium',
      brandRisk: 'high',
      culturalRisk: 'low',
      terminologyRisk: 'high',
      languageDifficulty: 'medium',
      vendorReviewRequired: false,
      internalOnlyReviewRequired: true,
      recommendedSpecialistAgents: ['agent-financial-style', 'agent-jgaap-terminology', 'agent-brand-voice'],
      recommendedExpertise: ['Annual report sections', 'J-GAAP', 'Risk factors', 'MD&A'],
      generatedBy: 'Quality Risk Agent',
      generatedAt: '2026-05-12T08:30:00Z',
      explanation: 'Annual report. 5 sections, ~22k words. Parallel review by 4 internal reviewers in parallel will hit the May 28 deadline. Multi-stage sign-off required.',
    },
    createdBy: 'kenji',
    createdAt: '2026-05-12T07:45:00Z',
    estimatedWordCount: 22000,
  },
];

/* ════════════════════════════════════════════════════════════════
   VENDOR RECOMMENDATIONS + ASSIGNMENTS
   ════════════════════════════════════════════════════════════════ */

export const VENDOR_RECOMMENDATIONS = [];
export const VENDOR_ASSIGNMENTS = [];

/* ════════════════════════════════════════════════════════════════
   TASKS + SEGMENTS + REVIEW DECISIONS
   ════════════════════════════════════════════════════════════════ */

export const HITL_TASKS = [];
export const HITL_SEGMENTS = [];
export const REVIEW_DECISIONS = [];

/* ════════════════════════════════════════════════════════════════
   VALIDATION + SIGN-OFF
   ════════════════════════════════════════════════════════════════ */

export const VALIDATION_REPORTS = [];
export const SIGNOFF_RECORDS = [];

/* ════════════════════════════════════════════════════════════════
   RETRAINING + ORG BRAIN
   ════════════════════════════════════════════════════════════════ */

export const RETRAINING_CANDIDATES = [];
/* ─── Translation Memory store ─────────────────────────────────
 *
 * Prior committed translations that the live-TM panel matches against.
 * In production this comes from a TM database; for the prototype we
 * seed a handful of plausible JA financial-domain prior translations.
 * Each entry is { id, source, target, domain, language, vendorId,
 * createdAt }. Match scoring is a Jaccard token-set ratio computed
 * by services/hitl/tm.js.
 * ─────────────────────────────────────────────────────────────── */
export const TM_ENTRIES = [
  /* Forward-looking statement boilerplate — recurs across JFSA filings. */
  {
    id: 'tm-fls-canonical',
    source: 'Forward-looking statements in this report are subject to risks and uncertainties.',
    target: '本報告書における将来予測に関する記述は、リスクおよび不確実性の影響を受けます。',
    domain: 'financial', language: 'ja', vendorId: 'v-nihon-linguistics',
    createdAt: '2025-08-15T10:00:00Z',
  },
  {
    id: 'tm-fls-extended',
    source: 'Forward-looking statements are subject to risks and uncertainties that could cause actual results to differ.',
    target: '将来予測に関する記述は、実際の結果に相違をもたらす可能性のあるリスクおよび不確実性の影響を受けます。',
    domain: 'financial', language: 'ja', vendorId: 'v-nihon-linguistics',
    createdAt: '2025-09-22T14:00:00Z',
  },
  /* Quarterly revenue language. */
  {
    id: 'tm-q-revenue',
    source: 'Net revenue for the quarter increased by year-over-year.',
    target: '当四半期の純収益は、前年同期比で増加しました。',
    domain: 'financial', language: 'ja', vendorId: 'v-nihon-linguistics',
    createdAt: '2025-10-04T11:00:00Z',
  },
  {
    id: 'tm-revenue-driver',
    source: 'Revenue increase was driven primarily by strong performance in our investment banking division.',
    target: '収益の増加は、主に投資銀行部門の好調な業績によるものです。',
    domain: 'financial', language: 'ja', vendorId: 'v-internal-reviewers',
    createdAt: '2025-11-01T09:30:00Z',
  },
  /* Goodwill impairment. */
  {
    id: 'tm-goodwill',
    source: 'Goodwill impairment was recorded in the wealth management segment.',
    target: 'ウェルスマネジメント部門でのれん減損を計上しました。',
    domain: 'financial', language: 'ja', vendorId: 'v-nihon-linguistics',
    createdAt: '2025-11-12T13:20:00Z',
  },
  /* Dividend boilerplate. */
  {
    id: 'tm-dividend',
    source: 'The Board approved a quarterly dividend per share, payable on a future date.',
    target: '取締役会は、今後の支払日に支払予定の1株当たりの四半期配当を承認しました。',
    domain: 'financial', language: 'ja', vendorId: 'v-internal-reviewers',
    createdAt: '2025-09-18T16:00:00Z',
  },
  /* EBITDA margin. */
  {
    id: 'tm-ebitda',
    source: 'EBITDA margin expanded year-over-year.',
    target: 'EBITDAマージンは前年同期比で拡大しました。',
    domain: 'financial', language: 'ja', vendorId: 'v-internal-reviewers',
    createdAt: '2025-08-30T10:45:00Z',
  },
];

export const ORG_BRAIN_UPDATES = [
  /* Seed glossary so the Quick Review workspace can render passive
   * inline highlights on first paint. In production these are produced
   * by the retraining-gate sign-off path. */
  {
    id: 'ob-seed-fwd-looking',
    candidateId: null,
    projectId: 'hp-q3-ja-earnings',
    segmentId: null,
    domain: 'financial',
    language: 'ja',
    sourceFragment: 'Forward-looking statements in this report',
    approvedFragment: '本報告書における将来予測に関する記述',
    approvedBy: 'sarah',
    approvedAt: '2025-11-12T09:00:00Z',
    contributorFootprint: [{ userId: 'sarah', role: 'final-validator' }],
  },
  {
    id: 'ob-seed-net-revenue',
    candidateId: null,
    projectId: 'hp-q3-ja-earnings',
    segmentId: null,
    domain: 'financial',
    language: 'ja',
    sourceFragment: 'Net revenue for Q3 2026',
    approvedFragment: '2026年第3四半期の純収益',
    approvedBy: 'sarah',
    approvedAt: '2025-10-04T11:30:00Z',
    contributorFootprint: [{ userId: 'sarah', role: 'final-validator' }],
  },
  {
    id: 'ob-seed-goodwill',
    candidateId: null,
    projectId: 'hp-q3-ja-earnings',
    segmentId: null,
    domain: 'financial',
    language: 'ja',
    sourceFragment: 'Goodwill impairment of',
    approvedFragment: 'のれん減損',
    approvedBy: 'yuki',
    approvedAt: '2025-09-22T15:45:00Z',
    contributorFootprint: [{ userId: 'yuki', role: 'compliance-reviewer' }],
  },
  {
    id: 'ob-seed-quarterly-dividend',
    candidateId: null,
    projectId: 'hp-q3-ja-earnings',
    segmentId: null,
    domain: 'financial',
    language: 'ja',
    sourceFragment: 'quarterly dividend of',
    approvedFragment: '四半期配当',
    approvedBy: 'kenji',
    approvedAt: '2025-08-15T13:10:00Z',
    contributorFootprint: [{ userId: 'kenji', role: 'project-manager' }],
  },
];

/* ════════════════════════════════════════════════════════════════
   AUDIT + NOTIFICATIONS + ESCALATIONS
   ════════════════════════════════════════════════════════════════ */

export const HITL_AUDIT_LOG = [];
export const HITL_NOTIFICATIONS = [];
export const HITL_ESCALATIONS = [];

/* ════════════════════════════════════════════════════════════════
   ID GENERATOR (deterministic-ish)
   ════════════════════════════════════════════════════════════════ */

let _idCounter = 1000;
export function nextId(prefix) {
  _idCounter += 1;
  return `${prefix}-${_idCounter.toString(36)}`;
}

/**
 * Token-set divergence across an array of candidate texts. 0 = unanimous,
 * 1 = no token overlap. Cheap proxy for "is this a hot adjudication
 * decision worth the validator's time".
 */
export function divergenceScore(candidates) {
  if (!candidates || candidates.length < 2) return 0;
  const sets = candidates.map(c => new Set((c.text || '').split(/\s+|[、。．,. ]/).filter(Boolean)));
  let pairs = 0, dist = 0;
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      const a = sets[i], b = sets[j];
      const u = new Set([...a, ...b]);
      const inter = [...a].filter(x => b.has(x)).length;
      const jaccard = u.size === 0 ? 0 : inter / u.size;
      dist += 1 - jaccard;
      pairs++;
    }
  }
  return pairs ? dist / pairs : 0;
}

/**
 * Returns the rationale chips available for a given project domain.
 * '*' chips are always included. The chip picker uses this; the
 * backend retraining gate validates against this same list.
 */
export function rationaleChipsForDomain(domain) {
  return RATIONALE_CHIPS.filter(c => c.domain.includes('*') || c.domain.includes(domain));
}

/**
 * Token-level Divergence Map between a primary candidate and a peer.
 * Returns a list of token-segments, each tagged as 'shared' or 'diff'.
 * Cheap LCS-by-token implementation — good enough for visual highlight,
 * and runs in JS on every render without measurable cost.
 */
export function tokenDiff(primaryText, peerText) {
  const tokenize = (s) => (s || '').split(/(\s+|[、。．,. !?：:;；])/g).filter(Boolean);
  const a = tokenize(primaryText);
  const b = tokenize(peerText);
  // LCS table — small, segments are short.
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  // Walk back, mark each primary token as shared or diff.
  const out = [];
  let i = n, j = m;
  const marks = new Array(n).fill(false);
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { marks[i - 1] = true; i--; j--; }
    else if (dp[i - 1][j] >= dp[i][j - 1]) { i--; }
    else { j--; }
  }
  let buf = '', last = null;
  for (let k = 0; k < a.length; k++) {
    const kind = marks[k] ? 'shared' : 'diff';
    if (last === null || last === kind) { buf += a[k]; last = kind; }
    else { out.push({ kind: last, text: buf }); buf = a[k]; last = kind; }
  }
  if (buf) out.push({ kind: last, text: buf });
  return out;
}

/**
 * Run the diff against the highest-confidence "anchor" candidate to
 * produce highlight maps for every other candidate. The anchor's own
 * diff is all-shared (returned for symmetry).
 */
export function divergenceMap(candidates) {
  if (!candidates || candidates.length < 2) {
    return new Map((candidates || []).map(c => [c.id, [{ kind: 'shared', text: c.text }]]));
  }
  const anchor = [...candidates].sort((a, b) => b.confidence - a.confidence)[0];
  const out = new Map();
  for (const c of candidates) {
    if (c.id === anchor.id) out.set(c.id, [{ kind: 'shared', text: c.text }]);
    else out.set(c.id, tokenDiff(c.text, anchor.text));
  }
  return out;
}

/* ════════════════════════════════════════════════════════════════
   FACTORY FUNCTIONS
   ════════════════════════════════════════════════════════════════ */

export function createVendor(input) {
  const now = new Date().toISOString();
  return {
    id: input.id || nextId('v'),
    name: input.name || '',
    type: input.type || 'agency',
    status: input.status || 'draft',
    languages: input.languages || [],
    languagePairs: input.languagePairs || [],
    locales: input.locales || [],
    domains: input.domains || [],
    services: input.services || [],
    costModel: input.costModel || 'per-word',
    currency: input.currency || 'USD',
    standardRate: input.standardRate || 0,
    rushRate: input.rushRate || 0,
    minimumFee: input.minimumFee || 0,
    avgTurnaroundHours: input.avgTurnaroundHours || 48,
    slaCommitmentHours: input.slaCommitmentHours || 72,
    capacityWordsPerWeek: input.capacityWordsPerWeek || 0,
    availabilityStatus: input.availabilityStatus || 'available',
    region: input.region || 'GLOBAL',
    jurisdiction: input.jurisdiction || '',
    dataResidencyEligibility: input.dataResidencyEligibility || [],
    securityTier: input.securityTier || 'standard',
    certifications: input.certifications || [],
    complianceTags: input.complianceTags || [],
    ndaStatus: input.ndaStatus || 'pending',
    contractStatus: input.contractStatus || 'pending',
    insuranceStatus: input.insuranceStatus || 'pending',
    contactEmail: input.contactEmail || '',
    vendorAdmins: input.vendorAdmins || [],
    assignedUsers: input.assignedUsers || [],
    rating: input.rating || null,
    qualityScore: input.qualityScore || null,
    onTimeDeliveryScore: input.onTimeDeliveryScore || null,
    reworkRate: input.reworkRate || 0,
    escalationRate: input.escalationRate || 0,
    avgValidationScore: input.avgValidationScore || null,
    costPerformance: input.costPerformance || null,
    clientRestrictions: input.clientRestrictions || [],
    allowedVendorPools: input.allowedVendorPools || [],
    excludedClients: input.excludedClients || [],
    notes: input.notes || '',
    attachments: input.attachments || [],
    createdAt: now,
    createdBy: input.createdBy || 'unknown',
    auditTrail: [{ timestamp: now, actor: input.createdBy || 'unknown', action: 'vendor.created' }],
  };
}

export function createAssignment({ projectId, vendorId, recommendedById, assignedById, approvalRequired, recommendationId, estimatedCost, estimatedTurnaroundHours }) {
  const now = new Date().toISOString();
  return {
    id: nextId('va'),
    projectId,
    vendorId,
    recommendationId: recommendationId || null,
    status: approvalRequired ? 'awaiting-approval' : 'active',
    assignedAt: now,
    assignedById: assignedById || null,
    recommendedById: recommendedById || null,
    approvalRequired: !!approvalRequired,
    approvalDecision: null,
    overrideReason: null,
    estimatedCost: estimatedCost || null,
    estimatedTurnaroundHours: estimatedTurnaroundHours || null,
    actualCost: null,
    actualTurnaroundHours: null,
    submittedAt: null,
    closedAt: null,
  };
}

export function createSegment({ taskId, projectId, segmentNumber, source, target, agentCandidates, agentSuggestion, agentConfidence, riskFlags, errorCategory, flagCategories, sourceAnchor, script, expansionRisk, placeholders, markupCount, dntTerms, localeFormatting } = {}) {
  const input = { flagCategories, sourceAnchor, script, expansionRisk, placeholders, markupCount, dntTerms, localeFormatting };
  return {
    id: nextId('seg'),
    taskId,
    projectId,
    segmentNumber,
    source: source || '',
    target: target || '',
    /* Panel of Agents: 2–4 candidate proposals. Sorted by descending
     * raw confidence on insert; the workspace re-sorts by adjudication
     * value for display. */
    agentCandidates: agentCandidates || (agentSuggestion ? [{
      id: 'baseline',
      agentId: 'baseline',
      agentName: 'Baseline Agent',
      version: 'v1.0',
      text: agentSuggestion,
      confidence: typeof agentConfidence === 'number' ? agentConfidence : 0.7,
      pedigreeTags: [],
    }] : []),
    // Legacy single-suggestion fields are kept for back-compat.
    agentSuggestion: agentSuggestion || null,
    agentConfidence: typeof agentConfidence === 'number' ? agentConfidence : null,
    riskFlags: riskFlags || [],
    errorCategory: errorCategory || null,
    decision: 'pending',
    decidedAt: null,
    decidedById: null,
    chosenCandidateId: null,   // which agent proposal was accepted (or null if authored)
    editedTarget: null,
    comments: [],
    locked: false,
    /* Cockpit-2 fields — computed at extraction, persisted on the segment */
    flagCategories: input?.flagCategories || [],          // string[] keys of FLAG_CATEGORIES
    sourceAnchor: input?.sourceAnchor || null,             // { page, bbox, snippet }
    script: input?.script || 'ltr',                        // 'ltr' | 'rtl' | 'mixed'
    expansionRisk: input?.expansionRisk || 0,              // 0..1
    placeholders: input?.placeholders || [],               // ['{var}', '%s', ...]
    markupCount: input?.markupCount || { source: 0, target: 0 },
    dntTerms: input?.dntTerms || [],                       // do-not-translate tokens
    localeFormatting: input?.localeFormatting || null,
  };
}

export function createReviewDecision({
  segmentId, actorId, actorRole, action,
  originalValue, newValue,
  chosenCandidateId, rejectedCandidateIds,
  rationaleTags, reasonNote,
  confidenceBefore, confidenceAfter,
  agentRecommendation,
  telemetry,
  voiceRationaleId,
}) {
  const now = new Date().toISOString();
  return {
    id: nextId('rd'),
    segmentId,
    actorId,
    actorRole,
    action, // verified | not-verified | edited | needs-rework | escalated | accepted | rejected | locked
    originalValue: originalValue ?? null,
    newValue: newValue ?? null,
    /* Panel-of-agents adjudication payload. */
    chosenCandidateId: chosenCandidateId || null,
    rejectedCandidateIds: rejectedCandidateIds || [],
    /* Structured rationale (closed taxonomy). reasonNote is OPTIONAL
     * free-text and never feeds training — only the tags do. */
    rationaleTags: rationaleTags || [],
    reasonNote: reasonNote || null,
    /* Backward-compat: keep `reason` populated for older audit consumers. */
    reason: reasonNote || (rationaleTags && rationaleTags.length ? rationaleTags.join(', ') : null),
    confidenceBefore: typeof confidenceBefore === 'number' ? confidenceBefore : null,
    confidenceAfter: typeof confidenceAfter === 'number' ? confidenceAfter : null,
    agentRecommendation: agentRecommendation ?? null,
    /* Silent telemetry — collected by the workspace, weights training. */
    telemetry: telemetry || {
      dwellMs: null,                     // total time on segment
      dwellPerCandidate: {},             // { candidateId: ms } — adjudication-effort signal
      undoCount: 0,
      glossaryConsultations: 0,
      crossRefJumps: 0,
      candidateHoverSeq: [],
      posture: null,                     // final posture committed
      postureTransitions: [],            // [{ from, to, at }]
      preferencePairs: [],               // [{ chosen, rejected, atPosture }]
      summonedSecondOpinion: false,
    },
    /* Voice rationale (10-second memo) — attached when present. */
    voiceRationaleId: voiceRationaleId || null,
    eligibleForTraining: null, // set by retraining gate after sign-off
    validationStatus: 'pending',
    timestamp: now,
  };
}

export function createSignOffRecord({ projectId, outputId, actorId, actorRole, validationScore, qualityScore, riskSummary, openIssues, statement, canPublish, feedOrgBrain, feedRetraining, approvalChain, version }) {
  const now = new Date().toISOString();
  return {
    id: nextId('so'),
    projectId,
    outputId: outputId || null,
    actorId,
    actorRole,
    timestamp: now,
    version: version || 'v1',
    validationScore: validationScore ?? null,
    qualityScore: qualityScore ?? null,
    riskSummary: riskSummary || null,
    openIssues: openIssues || [],
    statement: statement || '',
    canPublish: !!canPublish,
    feedOrgBrain: !!feedOrgBrain,
    feedRetraining: !!feedRetraining,
    approvalChain: approvalChain || [],
    immutable: true,
  };
}

export function createRetrainingCandidate({ projectId, segmentId, originalAgentOutput, vendorEdit, humanFinalEdit, validationDecision, signoffRecordId, domain, language, errorCategory, correctionCategory, confidenceDelta, reviewerNotes, modelTarget }) {
  return {
    id: nextId('rc'),
    projectId,
    segmentId,
    originalAgentOutput: originalAgentOutput || '',
    vendorEdit: vendorEdit || '',
    humanFinalEdit: humanFinalEdit || '',
    validationDecision: validationDecision || 'unknown',
    signoffRecordId: signoffRecordId || null,
    domain: domain || null,
    language: language || null,
    errorCategory: errorCategory || 'other',
    correctionCategory: correctionCategory || null,
    confidenceDelta: typeof confidenceDelta === 'number' ? confidenceDelta : null,
    reviewerNotes: reviewerNotes || '',
    approvedForOrgBrain: false,
    approvedForRetraining: false,
    modelTarget: modelTarget || null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

export function createAuditEvent({ actorId, actorRole, organisationId, vendorId, projectId, taskId, segmentId, eventType, beforeValue, afterValue, reason, policy, sessionMeta }) {
  return {
    id: nextId('ae'),
    actorId: actorId || null,
    actorRole: actorRole || null,
    organisationId: organisationId || null,
    vendorId: vendorId || null,
    projectId: projectId || null,
    taskId: taskId || null,
    segmentId: segmentId || null,
    eventType,
    beforeValue: beforeValue ?? null,
    afterValue: afterValue ?? null,
    reason: reason || null,
    policy: policy || null,
    sessionMeta: sessionMeta || null,
    timestamp: new Date().toISOString(),
  };
}

/* ════════════════════════════════════════════════════════════════
   HELPERS — pure queries
   ════════════════════════════════════════════════════════════════ */

export function getVendorById(id) {
  return VENDORS.find(v => v.id === id) || null;
}

export function getPoolById(id) {
  return VENDOR_POOLS.find(p => p.id === id) || null;
}

export function getPolicyById(id) {
  return SELECTION_POLICIES.find(p => p.id === id) || null;
}

export function getProjectById(id) {
  return HITL_PROJECTS.find(p => p.id === id) || null;
}

export function listVendorsInPool(poolId) {
  const pool = getPoolById(poolId);
  if (!pool) return [];
  return pool.includedVendorIds
    .map(getVendorById)
    .filter(v => v && !pool.excludedVendorIds.includes(v.id));
}

/* ════════════════════════════════════════════════════════════════
   DEMO SEED — minimal task/segment data so screens render with real
   content. In a real backend these would be created on extraction.
   ════════════════════════════════════════════════════════════════ */

(function seedDemoTasks() {
  /* ── External vendor: Q3 JA earnings ─────────────────────────── */
  HITL_TASKS.push({
    id: 'tk-q3-ja-mgmt-discussion',
    projectId: 'hp-q3-ja-earnings',
    title: 'Management Discussion & Analysis — JA',
    status: 'in-progress',
    reviewerType: 'vendor',
    assignmentMode: 'parallel',
    assignedVendorId: 'v-nihon-linguistics',
    primaryReviewerId: 'hana',
    collaboratorIds: ['ren'],
    assignedAt: '2026-05-10T09:00:00Z',
    assignedBy: 'kenji',
    dueAt: '2026-05-20T17:00:00Z',
    wordCount: 4800,
    progressPct: 35,
  });
  HITL_TASKS.push({
    id: 'tk-q3-ja-risk-factors',
    projectId: 'hp-q3-ja-earnings',
    title: 'Risk Factors section — JA',
    status: 'assigned',
    reviewerType: 'vendor',
    assignmentMode: 'single',
    assignedVendorId: 'v-nihon-linguistics',
    primaryReviewerId: 'hana',
    collaboratorIds: [],
    assignedAt: '2026-05-10T09:05:00Z',
    assignedBy: 'kenji',
    dueAt: '2026-05-21T17:00:00Z',
    wordCount: 3200,
    progressPct: 0,
  });

  /* ── Internal-single: one file, one reviewer ─────────────────── */
  HITL_TASKS.push({
    id: 'tk-mda-internal',
    projectId: 'hp-q3-mda-internal-single',
    title: 'Q3 MD&A Memo — full review',
    status: 'in-progress',
    reviewerType: 'internal',
    assignmentMode: 'single',
    assignedVendorId: 'v-internal-reviewers',
    primaryReviewerId: 'sarah',
    collaboratorIds: [],
    assignedAt: '2026-05-12T08:00:00Z',
    assignedBy: 'kenji',
    dueAt: '2026-05-15T17:00:00Z',
    wordCount: 1800,
    progressPct: 45,
  });

  /* ── Internal-parallel: 5 sections, parallel reviewers ───────── */
  const parallelTasks = [
    { id: 'tk-annual-letter',      title: 'Chairman & CEO Letter',      reviewer: 'sarah',  collab: [],         words: 2200, progress: 80, due: '2026-05-24T17:00:00Z' },
    { id: 'tk-annual-mda',         title: 'MD&A',                       reviewer: 'yuki',   collab: ['marcus'], words: 6400, progress: 50, due: '2026-05-25T17:00:00Z' },
    { id: 'tk-annual-financial',   title: 'Financial Statements & Notes', reviewer: 'marcus', collab: [],         words: 5800, progress: 30, due: '2026-05-26T17:00:00Z' },
    { id: 'tk-annual-risk',        title: 'Risk Factors',               reviewer: 'sarah',  collab: ['yuki'],   words: 3800, progress: 0,  due: '2026-05-27T17:00:00Z' },
    { id: 'tk-annual-governance',  title: 'Corporate Governance',       reviewer: null,     collab: [],         words: 3800, progress: 0,  due: '2026-05-27T17:00:00Z' }, // unassigned
  ];
  parallelTasks.forEach(t => {
    HITL_TASKS.push({
      id: t.id,
      projectId: 'hp-annual-internal-parallel',
      title: t.title,
      status: t.reviewer ? (t.progress === 0 ? 'assigned' : 'in-progress') : 'not-started',
      reviewerType: 'internal',
      assignmentMode: t.collab.length ? 'parallel' : 'single',
      assignedVendorId: 'v-internal-reviewers',
      primaryReviewerId: t.reviewer,
      collaboratorIds: t.collab,
      assignedAt: t.reviewer ? '2026-05-12T09:00:00Z' : null,
      assignedBy: t.reviewer ? 'kenji' : null,
      dueAt: t.due,
      wordCount: t.words,
      progressPct: t.progress,
    });
  });

  /* Multi-agent panel: each segment now carries 2–3 candidate proposals
   * from differently-trained / differently-tempered agents. This is
   * what the Triangulated Review Workspace adjudicates between. */
  const sampleSegments = [
    {
      source: 'Net revenue for Q3 2026 increased by 12.4% year-over-year, driven primarily by strong performance in our APAC investment banking division.',
      target: '2026年第3四半期の純収益は、主にAPAC投資銀行部門の好調により、前年同期比12.4%増加しました。',
      candidates: [
        { id: 'c1', agentId: 'jp-fin-3', agentName: 'JP-FIN-3', version: 'v2.4', confidence: 0.91, text: '2026年第3四半期の純収益は、主にAPAC投資銀行部門の好調により、前年同期比12.4%増加しました。', pedigreeTags: ['J-GAAP 96%', 'JFSA 92%'] },
        { id: 'c2', agentId: 'brand-voice', agentName: 'Brand Voice Sentry', version: 'v1.8', confidence: 0.78, text: '2026年Q3純収益は前年比12.4%増。アジア太平洋の投資銀行部門が牽引。', pedigreeTags: ['Meridian voice 88%'] },
        { id: 'c3', agentId: 'compliance-monitor', agentName: 'Compliance Monitor', version: 'v3.1', confidence: 0.84, text: '2026年第3四半期の純収益は前年同期比で12.4%増加し、これは主にAPAC投資銀行部門の好調な業績によるものです。', pedigreeTags: ['JFSA 97%'] },
      ],
      errorCategory: 'terminology',
    },
    {
      source: 'Goodwill impairment of $42 million was recorded in the European wealth management segment.',
      target: 'ヨーロッパのウェルスマネジメント部門で4,200万ドルののれん減損を計上しました。',
      candidates: [
        { id: 'c1', agentId: 'jp-fin-3', agentName: 'JP-FIN-3', version: 'v2.4', confidence: 0.83, text: '欧州ウェルスマネジメント部門で4,200万ドルののれん減損損失を計上しました。', pedigreeTags: ['J-GAAP 96%'] },
        { id: 'c2', agentId: 'brand-voice', agentName: 'Brand Voice Sentry', version: 'v1.8', confidence: 0.71, text: 'ヨーロッパ・ウェルスマネジメント部門で4200万ドル相当ののれん減損が記録されました。', pedigreeTags: ['Meridian voice 88%'] },
      ],
      errorCategory: 'accuracy',
    },
    {
      source: 'The Board has approved a quarterly dividend of $0.85 per share, payable on June 15, 2026.',
      target: '取締役会は2026年6月15日支払い予定の四半期配当0.85ドル/株を承認しました。',
      candidates: [
        { id: 'c1', agentId: 'jp-fin-3', agentName: 'JP-FIN-3', version: 'v2.4', confidence: 0.93, text: '取締役会は、2026年6月15日に支払予定の1株当たり0.85ドルの四半期配当を承認しました。', pedigreeTags: ['J-GAAP 96%', 'TSE 91%'] },
        { id: 'c2', agentId: 'brand-voice', agentName: 'Brand Voice Sentry', version: 'v1.8', confidence: 0.88, text: '取締役会は1株あたり0.85ドルの四半期配当を承認しました（2026年6月15日支払）。', pedigreeTags: ['Meridian voice 88%'] },
      ],
      errorCategory: null,
    },
    {
      source: 'Forward-looking statements in this report are subject to risks and uncertainties that could cause actual results to differ materially.',
      target: '本報告書における将来予測に関する記述は、実際の結果と大きく異なる可能性のあるリスクおよび不確実性の影響を受けます。',
      candidates: [
        { id: 'c1', agentId: 'compliance-monitor', agentName: 'Compliance Monitor', version: 'v3.1', confidence: 0.86, text: '本報告書に含まれる将来予測に関する記述は、実際の結果に重大な相違をもたらす可能性のあるリスクおよび不確実性の影響を受けます。', pedigreeTags: ['JFSA 97%'] },
        { id: 'c2', agentId: 'jp-fin-3', agentName: 'JP-FIN-3', version: 'v2.4', confidence: 0.74, text: '本報告書における将来予測に関する記述は、実際の結果と大きく異なる可能性のあるリスクおよび不確実性の影響を受けます。', pedigreeTags: ['J-GAAP 96%'] },
        { id: 'c3', agentId: 'brand-voice', agentName: 'Brand Voice Sentry', version: 'v1.8', confidence: 0.65, text: '本書の将来予測は、実際の結果と異なる可能性のあるリスクや不確実性を含みます。', pedigreeTags: ['Meridian voice 88%'] },
      ],
      errorCategory: 'regulatory',
    },
    {
      source: 'EBITDA margin expanded by 220 basis points compared to the same period in the prior year.',
      target: 'EBITDAマージンは前年同期比で220ベーシスポイント拡大しました。',
      candidates: [
        { id: 'c1', agentId: 'jp-fin-3', agentName: 'JP-FIN-3', version: 'v2.4', confidence: 0.89, text: 'EBITDAマージンは前年同期比で220ベーシスポイント拡大しました。', pedigreeTags: ['J-GAAP 96%'] },
        { id: 'c2', agentId: 'brand-voice', agentName: 'Brand Voice Sentry', version: 'v1.8', confidence: 0.78, text: 'EBITDAマージンは前年同期と比較して220bp改善しました。', pedigreeTags: ['Meridian voice 88%'] },
      ],
      errorCategory: 'terminology',
    },
  ];

  // Per-segment flag categories — what's special about each Q3 JA segment.
  const Q3JA_FLAGS = [
    ['terminology-conflict', 'agent-disagreement'],                        // 1: net revenue
    ['numerical-inconsistency', 'terminology-conflict'],                   // 2: goodwill
    [],                                                                    // 3: dividend (clean)
    ['regulatory-sensitivity', 'agent-disagreement', 'missing-org-brain'], // 4: forward-looking
    ['terminology-conflict', 'brand-voice-drift'],                         // 5: ebitda
  ];
  const Q3JA_DNT = ['EBITDA', 'APAC', 'Q3'];
  sampleSegments.forEach((s, i) => {
    const top = [...s.candidates].sort((a, b) => b.confidence - a.confidence)[0];
    HITL_SEGMENTS.push({
      id: `seg-q3ja-${i + 1}`,
      taskId: 'tk-q3-ja-mgmt-discussion',
      projectId: 'hp-q3-ja-earnings',
      segmentNumber: i + 1,
      source: s.source,
      target: top.text,
      agentCandidates: s.candidates,
      agentSuggestion: top.text,
      agentConfidence: top.confidence,
      riskFlags: top.confidence < 0.75 ? ['low-confidence'] : [],
      errorCategory: s.errorCategory,
      decision: 'pending',
      decidedAt: null,
      decidedById: null,
      chosenCandidateId: null,
      editedTarget: null,
      comments: [],
      locked: false,
      flagCategories: Q3JA_FLAGS[i] || [],
      sourceAnchor: { page: 4 + Math.floor(i / 2), bbox: [120, 200 + i * 60, 480, 240 + i * 60], snippet: s.source.slice(0, 80) },
      script: 'mixed',                                  // EN source → JA target
      expansionRisk: top.text.length / Math.max(s.source.length, 1) - 1,
      placeholders: [],
      markupCount: { source: 0, target: 0 },
      dntTerms: Q3JA_DNT.filter(t => s.source.toLowerCase().includes(t.toLowerCase())),
      localeFormatting: { dateFormat: 'ja-JP', decimalSeparator: '.', currencySymbol: '$' },
    });
  });

  // Internal-single project: a few investor memo paragraphs (EN → EN review).
  const memoSegs = [
    { src: 'We expect FY27 EBITDA margin to expand by 150–200 bps driven by APAC operating leverage.',  agent: 'We expect FY27 EBITDA margin to expand by 150-200bps driven by APAC operating leverage.', conf: 0.86, cat: 'formatting' },
    { src: 'Forward-looking statements assume no material change in the regulatory environment.',  agent: 'Forward-looking statements assume no material change in the regulatory environment.', conf: 0.93, cat: null },
    { src: 'Capital allocation will prioritise organic growth over share buybacks in H1.',  agent: 'Capital allocation will prioritise organic growth ahead of share buybacks in H1.', conf: 0.72, cat: 'brand-voice' },
  ];
  memoSegs.forEach((s, i) => {
    HITL_SEGMENTS.push({
      id: `seg-mda-${i + 1}`,
      taskId: 'tk-mda-internal',
      projectId: 'hp-q3-mda-internal-single',
      segmentNumber: i + 1,
      source: s.src,
      target: s.agent,
      agentSuggestion: s.agent,
      agentConfidence: s.conf,
      riskFlags: s.conf < 0.75 ? ['low-confidence'] : [],
      errorCategory: s.cat,
      decision: 'pending', decidedAt: null, decidedById: null, editedTarget: null, comments: [], locked: false,
    });
  });

  // Internal-parallel project: a couple of segments per assigned task so
  // the workspace renders something for each reviewer.
  const annualSegs = [
    { taskId: 'tk-annual-letter',    src: 'Fiscal 2026 was a year of disciplined growth across all three regional franchises.', cat: null },
    { taskId: 'tk-annual-letter',    src: 'We thank our shareholders, our colleagues, and our clients for their continued trust.', cat: 'brand-voice' },
    { taskId: 'tk-annual-mda',       src: 'Revenue grew 9.2% on a constant-currency basis, with APAC contributing 41% of incremental revenue.', cat: 'accuracy' },
    { taskId: 'tk-annual-mda',       src: 'Operating expenses increased by 6.8%, primarily reflecting investments in compliance technology.', cat: null },
    { taskId: 'tk-annual-financial', src: 'Goodwill of $1.24 billion reflects acquisitions completed in FY24 and FY25.', cat: 'terminology' },
    { taskId: 'tk-annual-risk',      src: 'Geopolitical risk in the APAC region remains elevated and is monitored daily by the Risk Committee.', cat: 'regulatory' },
  ];
  annualSegs.forEach((s, i) => {
    HITL_SEGMENTS.push({
      id: `seg-annual-${i + 1}`,
      taskId: s.taskId,
      projectId: 'hp-annual-internal-parallel',
      segmentNumber: i + 1,
      source: s.src,
      target: s.src,
      agentSuggestion: s.src,
      agentConfidence: 0.85,
      riskFlags: [],
      errorCategory: s.cat,
      decision: 'pending', decidedAt: null, decidedById: null, editedTarget: null, comments: [], locked: false,
    });
  });

  // A pre-existing recommendation + active assignment for the JA project,
  // so the assignment panel shows something on first render.
  VENDOR_RECOMMENDATIONS.push({
    id: 'vrec-seed-q3ja',
    projectId: 'hp-q3-ja-earnings',
    policyId: 'sp-quality-first',
    poolId: 'vp-japanese-financial',
    recommendedVendorId: 'v-nihon-linguistics',
    score: 0.91,
    alternatives: [{ vendorId: 'v-internal-reviewers', score: 0.88 }],
    disqualified: [
      { vendorId: 'v-bonn-legal', name: 'Bonn Legal Translation GmbH', reasons: ['Missing language coverage (need en → ja)'] },
      { vendorId: 'v-milano-finance', name: 'Milano Finance Linguists', reasons: ['Missing language coverage (need en → ja)', 'Not in pool "Japanese Financial Translation Pool"'] },
    ],
    autoAssignAllowed: true,
    fallbackUsed: false,
    explanation: 'Nihon Linguistics K.K. (external) scores 91.0% under "Quality-First". Top contributors: qualityScore (94%), domainExpertise (100%), securityTier (100%).',
    createdAt: '2026-05-10T08:30:00Z',
  });

  VENDOR_ASSIGNMENTS.push({
    id: 'va-seed-q3ja',
    projectId: 'hp-q3-ja-earnings',
    vendorId: 'v-nihon-linguistics',
    recommendationId: 'vrec-seed-q3ja',
    status: 'active',
    assignedAt: '2026-05-10T08:32:00Z',
    assignedById: 'system',
    recommendedById: 'kenji',
    approvalRequired: false,
    approvalDecision: null,
    overrideReason: null,
    estimatedCost: 4320,
    estimatedTurnaroundHours: 36,
    actualCost: null,
    actualTurnaroundHours: null,
    submittedAt: null,
    closedAt: null,
  });

  // A pending-approval recommendation for the DE BaFin project.
  VENDOR_RECOMMENDATIONS.push({
    id: 'vrec-seed-de',
    projectId: 'hp-de-regulatory',
    policyId: 'sp-compliance-first',
    poolId: 'vp-eu-regulatory',
    recommendedVendorId: 'v-bonn-legal',
    score: 0.88,
    alternatives: [{ vendorId: 'v-internal-reviewers', score: 0.84 }],
    disqualified: [
      { vendorId: 'v-nihon-linguistics', name: 'Nihon Linguistics K.K.', reasons: ['Missing language coverage (need en → de)', 'Not data-resident for "DE"'] },
    ],
    autoAssignAllowed: false,
    fallbackUsed: false,
    explanation: 'Bonn Legal Translation GmbH (external) scores 88.0% under "Compliance-First". Manual approval required by policy.',
    createdAt: '2026-05-11T09:30:00Z',
  });

  VENDOR_ASSIGNMENTS.push({
    id: 'va-seed-de',
    projectId: 'hp-de-regulatory',
    vendorId: 'v-bonn-legal',
    recommendationId: 'vrec-seed-de',
    status: 'awaiting-approval',
    assignedAt: '2026-05-11T09:31:00Z',
    assignedById: null,
    recommendedById: 'marcus',
    approvalRequired: true,
    approvalDecision: null,
    overrideReason: null,
    estimatedCost: 3780,
    estimatedTurnaroundHours: 30,
    actualCost: null,
    actualTurnaroundHours: null,
    submittedAt: null,
    closedAt: null,
  });

  // Seed a few audit events so the audit screen isn't empty.
  HITL_AUDIT_LOG.push(
    { id: 'ae-seed-1', actorId: 'kenji', actorRole: 'project-manager', organisationId: 'meridian', vendorId: null, projectId: 'hp-q3-ja-earnings', taskId: null, segmentId: null, eventType: 'project.created', beforeValue: null, afterValue: { name: 'Q3 2026 Earnings Report — JA' }, reason: null, policy: null, sessionMeta: null, timestamp: '2026-05-10T07:30:00Z' },
    { id: 'ae-seed-2', actorId: 'agent-quality-risk', actorRole: 'agent', organisationId: 'meridian', vendorId: null, projectId: 'hp-q3-ja-earnings', taskId: null, segmentId: null, eventType: 'project.risk-assessed', beforeValue: null, afterValue: { riskLevel: 'high', confidenceScore: 0.74 }, reason: null, policy: null, sessionMeta: null, timestamp: '2026-05-10T08:00:00Z' },
    { id: 'ae-seed-3', actorId: 'kenji', actorRole: 'project-manager', organisationId: 'meridian', vendorId: null, projectId: 'hp-q3-ja-earnings', taskId: null, segmentId: null, eventType: 'vendor.recommended', beforeValue: null, afterValue: { recommendationId: 'vrec-seed-q3ja', vendorId: 'v-nihon-linguistics', score: 0.91 }, reason: null, policy: 'sp-quality-first', sessionMeta: null, timestamp: '2026-05-10T08:30:00Z' },
    { id: 'ae-seed-4', actorId: 'system', actorRole: 'arbitr-global-admin', organisationId: 'meridian', vendorId: 'v-nihon-linguistics', projectId: 'hp-q3-ja-earnings', taskId: null, segmentId: null, eventType: 'vendor.auto-assigned', beforeValue: null, afterValue: { assignmentId: 'va-seed-q3ja', score: 0.91 }, reason: null, policy: 'sp-quality-first', sessionMeta: null, timestamp: '2026-05-10T08:32:00Z' },
    { id: 'ae-seed-5', actorId: 'marcus', actorRole: 'project-manager', organisationId: 'meridian', vendorId: null, projectId: 'hp-de-regulatory', taskId: null, segmentId: null, eventType: 'assignment.awaiting-approval', beforeValue: null, afterValue: { assignmentId: 'va-seed-de', score: 0.88 }, reason: null, policy: 'sp-compliance-first', sessionMeta: null, timestamp: '2026-05-11T09:31:00Z' },
  );

  // Seed a couple of notifications for the dashboard.
  HITL_NOTIFICATIONS.push(
    { id: 'n-1', recipientId: 'kenji', type: 'vendor.submitted', projectId: 'hp-q3-ja-earnings', text: 'Nihon Linguistics submitted "Management Discussion" for validation', read: false, timestamp: '2026-05-12T05:30:00Z' },
    { id: 'n-2', recipientId: 'marcus', type: 'assignment.awaiting-approval', projectId: 'hp-de-regulatory', text: 'BaFin filing assignment to Bonn Legal needs your approval', read: false, timestamp: '2026-05-11T09:31:00Z' },
    { id: 'n-3', recipientId: 'sarah', type: 'signoff.pending', projectId: 'hp-q3-ja-earnings', text: 'Sign-off pending for Q3 JA earnings translation', read: false, timestamp: '2026-05-12T06:15:00Z' },
  );
})();

export function filterVendors({ language, locale, domain, minRating, maxCost, availability, securityTier, compliance, poolId, minQuality, status } = {}) {
  return VENDORS.filter(v => {
    if (status && v.status !== status) return false;
    if (language && !v.languages.includes(language)) return false;
    if (locale && !v.locales.includes(locale)) return false;
    if (domain && !v.domains.includes(domain)) return false;
    if (minRating && (v.rating ?? 0) < minRating) return false;
    if (maxCost && v.standardRate > maxCost) return false;
    if (availability && v.availabilityStatus !== availability) return false;
    if (securityTier && SECURITY_TIERS.indexOf(v.securityTier) < SECURITY_TIERS.indexOf(securityTier)) return false;
    if (compliance && !v.complianceTags.includes(compliance)) return false;
    if (poolId && !v.allowedVendorPools.includes(poolId)) return false;
    if (minQuality && (v.qualityScore ?? 0) < minQuality) return false;
    return true;
  });
}
