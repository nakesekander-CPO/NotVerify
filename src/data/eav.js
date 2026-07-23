/**
 * Enterprise AI Visibility (EAV) — mock data layer.
 *
 * Frontend demo, isolated so real APIs can replace it later. Everything here is
 * FIXTURE data for a fictional workspace ("Northstar Business School") — it is
 * clearly labelled "Demo data" in the UI and must never be presented as live.
 *
 * The score is the Enterprise AI Visibility Index (EAVI), computed by the
 * versioned, reproducible `computeEAVI` below. Vocabulary follows the spec:
 * mention coverage, recommendation appearance, prominence, citation support,
 * competitive share of recommendation, knowledge accuracy, language parity.
 */

export const METHODOLOGY_VERSION = 'EAVI_v1'
export const BENCHMARK_HASH = 'bmk_9f3c1a7e'   // fixture — stable so trends read as "comparable"
export const PROVENANCE = 'fixture'            // live_api | manual_import | fixture

export const EAVI_DISCLAIMER =
  'AI assistant outputs are probabilistic and can change with model, provider, location, ' +
  'language, session, and time. EAVI reflects a defined benchmark and observation period; ' +
  'it is not a guaranteed placement or universal rank.'

export const HYPOTHESIS_LABEL =
  'Evidence-backed hypothesis, not causal access to the provider’s internal ranking process.'

/* ─── EAVI methodology (versioned, reproducible) ───────────────── */

export const EAVI_WEIGHTS = {
  coverage: 0.25,
  prominence: 0.20,
  citationQuality: 0.15,
  knowledgeAccuracy: 0.15,
  consistency: 0.10,
  multilingual: 0.10,
  freshness: 0.05,
}

export const EAVI_DIMENSION_META = [
  { key: 'coverage', label: 'Coverage', weight: 25, desc: 'Weighted share of benchmark observations where the canonical entity is correctly detected.' },
  { key: 'prominence', label: 'Prominence', weight: 20, desc: 'First / top-three / below / mention-only / absent, per documented extraction rules.' },
  { key: 'citationQuality', label: 'Citation Quality', weight: 15, desc: 'Resolvability, direct support, source reliability, independence, currency.' },
  { key: 'knowledgeAccuracy', label: 'Knowledge Accuracy', weight: 15, desc: 'Statements about the org vs approved claims; penalises incorrect/contradictory/stale.' },
  { key: 'consistency', label: 'Consistency', weight: 10, desc: 'Agreement across repeats and providers on core facts (not stylistic diversity).' },
  { key: 'multilingual', label: 'Multilingual Performance', weight: 10, desc: 'Coverage/prominence/accuracy per configured locale + parity vs reference locale.' },
  { key: 'freshness', label: 'Freshness', weight: 5, desc: 'Referenced sources current, claims within validity, no stale/superseded info.' },
]

/**
 * computeEAVI — the versioned formula. Inputs are 0–100 per dimension.
 * Returns { raw, display } where display = Math.round(raw).
 * Golden fixture (72/68/80/90/75/50/85) → raw 73.85 → display 74.
 */
export function computeEAVI(d) {
  const w = EAVI_WEIGHTS
  const raw =
    w.coverage * d.coverage +
    w.prominence * d.prominence +
    w.citationQuality * d.citationQuality +
    w.knowledgeAccuracy * d.knowledgeAccuracy +
    w.consistency * d.consistency +
    w.multilingual * d.multilingual +
    w.freshness * d.freshness
  return { raw: Math.round(raw * 100) / 100, display: Math.round(raw) }
}

// The golden fixture dimension scores for the seeded workspace.
export const EAVI_DIMENSIONS = {
  coverage: 72,
  prominence: 68,
  citationQuality: 80,
  knowledgeAccuracy: 90,
  consistency: 75,
  multilingual: 50,
  freshness: 85,
}

export const EAVI = {
  ...computeEAVI(EAVI_DIMENSIONS),         // { raw: 73.85, display: 74 }
  dimensions: EAVI_DIMENSIONS,
  confidenceInterval: [71, 77],            // 95% CI (stratified bootstrap, fixture)
  trend90d: +8,
  provisional: false,                      // ≥100 prompts, ≥3 provider families, enough repeats
  strategic: false,                        // Standard EAVI (fixed weights), not business-weighted
}

/* ─── Seeded workspace: Northstar Business School (fictional) ───── */

export const WORKSPACE = {
  id: 'ws-northstar',
  organisation: 'Northstar Business School',
  market: 'Australia',
  referenceLocale: 'en',
  brands: ['Northstar Business School'],
  products: ['Online MBA', 'Graduate Certificate', 'International Student MBA'],
  aliases: ['Northstar', 'NBS', 'Northstar B-School'],
  locales: [
    { code: 'en', name: 'English', reference: true },
    { code: 'vi', name: 'Vietnamese', reference: false },
    { code: 'es', name: 'Spanish', reference: false },
    { code: 'hi', name: 'Hindi', reference: false },
  ],
  competitors: [
    { id: 'harbour', name: 'Harbour School of Management' },
    { id: 'atlas', name: 'Atlas Business Institute' },
  ],
}

/* ─── Benchmark summary + observation composition ──────────────── */

export const BENCHMARK = {
  hash: BENCHMARK_HASH,
  methodologyVersion: METHODOLOGY_VERSION,
  uniquePrompts: 500,
  observations: 4000,       // 500 × 4 providers × 2 repeats
  providerFamilies: 4,
  repetitions: 2,
  locales: 4,
  observationPeriod: '2026-04-03 → 2026-07-02',
  lastUpdated: '2026-07-02T06:00:00Z',
}

export const PROMPT_PERFORMANCE = {
  tested: 500,
  mentionedIn: 312,
  firstRecommendationIn: 84,
  neverMentionedIn: 188,
}

// Coverage by model (spec fixture).
export const MODEL_COVERAGE = [
  { provider: 'ChatGPT', model: 'gpt-*', coverage: 78, provenance: 'fixture' },
  { provider: 'Perplexity', model: 'sonar-*', coverage: 83, provenance: 'fixture' },
  { provider: 'Gemini', model: 'gemini-*', coverage: 71, provenance: 'fixture' },
  { provider: 'Claude', model: 'claude-*', coverage: 52, provenance: 'fixture' },
]

// Competitive share of recommendation (within the benchmark — NOT market share).
export const COMPETITIVE_SHARE = [
  { id: 'harbour', name: 'Harbour School of Management', share: 36, isOrg: false },
  { id: 'northstar', name: 'Northstar Business School', share: 24, isOrg: true },
  { id: 'atlas', name: 'Atlas Business Institute', share: 19, isOrg: false },
  { id: 'other', name: 'Other', share: 21, isOrg: false },
]

// Language coverage (only configured target locales).
export const LANGUAGE_COVERAGE = [
  { code: 'en', name: 'English', coverage: 82, prominence: 71, accuracy: 92, reference: true },
  { code: 'vi', name: 'Vietnamese', coverage: 21, prominence: 14, accuracy: 70, reference: false },
  { code: 'es', name: 'Spanish', coverage: 15, prominence: 9, accuracy: 68, reference: false },
  { code: 'hi', name: 'Hindi', coverage: 8, prominence: 5, accuracy: 61, reference: false },
]

/* ─── Prompt-level observations (sample for the Explorer) ───────── */

export const PROMPT_OBSERVATIONS = [
  {
    id: 'obs-1', prompt: 'What are the best online MBA programs in Australia?', family: 'best-online-mba',
    locale: 'en', region: 'AU', provider: 'Perplexity', model: 'sonar-large', persona: 'prospective student',
    intent: 'recommendation', stage: 'consideration', topic: 'Online MBA', mentioned: true, band: 'top_three',
    confidence: 88, accuracy: 'approved', competitors: ['Harbour School of Management'], citations: 3,
    response: 'For online MBA study in Australia, strong options include Harbour School of Management, Northstar Business School, and Atlas Business Institute. Northstar’s Online MBA is noted for flexible entry and student support…',
  },
  {
    id: 'obs-2', prompt: 'Which business school is best for international students in Australia?', family: 'intl-student',
    locale: 'en', region: 'AU', provider: 'ChatGPT', model: 'gpt-4o', persona: 'international applicant',
    intent: 'recommendation', stage: 'consideration', topic: 'International Student MBA', mentioned: true, band: 'mention_only',
    confidence: 74, accuracy: 'ambiguous', competitors: ['Harbour School of Management', 'Atlas Business Institute'], citations: 2,
    response: 'Several Australian institutions cater to international students. Harbour School of Management is frequently recommended… Northstar Business School is also mentioned for its International Student MBA.',
  },
  {
    id: 'obs-3', prompt: 'Chương trình MBA trực tuyến tốt nhất ở Úc cho sinh viên quốc tế?', family: 'best-online-mba',
    locale: 'vi', region: 'AU', provider: 'Gemini', model: 'gemini-1.5-pro', persona: 'du học sinh',
    intent: 'recommendation', stage: 'consideration', topic: 'Online MBA', mentioned: false, band: 'absent',
    confidence: 66, accuracy: 'n/a', competitors: ['Harbour School of Management'], citations: 1,
    response: 'Một số lựa chọn phổ biến bao gồm Harbour School of Management… (Northstar không được đề cập.)',
  },
  {
    id: 'obs-4', prompt: 'Entry requirements for an online MBA in Australia?', family: 'entry-requirements',
    locale: 'en', region: 'AU', provider: 'Claude', model: 'claude-3.5', persona: 'career changer',
    intent: 'informational', stage: 'research', topic: 'Online MBA', mentioned: true, band: 'first', confidence: 91,
    accuracy: 'approved', competitors: [], citations: 2,
    response: 'Entry to an Australian online MBA typically requires a bachelor’s degree or equivalent work experience. Northstar Business School, for example, offers flexible entry pathways…',
  },
  {
    id: 'obs-5', prompt: 'Is Northstar Business School accredited?', family: 'accreditation',
    locale: 'en', region: 'AU', provider: 'ChatGPT', model: 'gpt-4o', persona: 'prospective student',
    intent: 'informational', stage: 'evaluation', topic: 'Accreditation', mentioned: true, band: 'mention_only',
    confidence: 62, accuracy: 'stale', competitors: [], citations: 1,
    response: 'Northstar Business School is accredited… (references a 2022 accreditation note that may be outdated).',
  },
]

export const BAND_META = {
  first: { label: 'First recommendation', score: 100, tone: 'teal' },
  top_three: { label: 'Top-three', score: 80, tone: 'teal' },
  below: { label: 'Below top three', score: 50, tone: 'amber' },
  mention_only: { label: 'Mentioned only', score: 25, tone: 'amber' },
  absent: { label: 'Absent', score: 0, tone: 'error' },
}

export const ACCURACY_META = {
  approved: { label: 'Matches approved claim', tone: 'teal' },
  ambiguous: { label: 'Ambiguous', tone: 'amber' },
  stale: { label: 'Stale claim', tone: 'amber' },
  conflicting: { label: 'Conflicting', tone: 'error' },
  unsupported: { label: 'Unsupported', tone: 'error' },
  'n/a': { label: 'Not mentioned', tone: 'mist' },
}

/* ─── Citations (source view) ──────────────────────────────────── */

export const CITATIONS = [
  { domain: 'northstar.edu.au', type: 'First-party', firstParty: true, resolvable: true, supports: 'mention', reliability: 'high', uses: 41 },
  { domain: 'gooduniversitiesguide.com.au', type: 'Independent directory', firstParty: false, resolvable: true, supports: 'claim', reliability: 'high', uses: 28 },
  { domain: 'harbourmgmt.edu.au', type: 'Competitor first-party', firstParty: false, resolvable: true, supports: 'competitor', reliability: 'medium', uses: 33 },
  { domain: 'studyaustralia.gov.au', type: 'Government', firstParty: false, resolvable: true, supports: 'claim', reliability: 'high', uses: 17 },
  { domain: 'reddit.com', type: 'Forum', firstParty: false, resolvable: true, supports: 'mention', reliability: 'low', uses: 12 },
  { domain: 'oldblog.example', type: 'Blog', firstParty: false, resolvable: false, supports: 'mention', reliability: 'low', uses: 4 },
]

/* ─── Trusted Enterprise Knowledge Layer (entities / claims) ───── */

export const CLAIM_STATES = ['extracted', 'needs_review', 'approved', 'disputed', 'rejected', 'expired', 'superseded']

export const ENTITIES = [
  { id: 'e-org', type: 'Organisation', name: 'Northstar Business School', aliases: ['Northstar', 'NBS'], locales: ['en', 'vi', 'es', 'hi'] },
  { id: 'e-mba', type: 'Product', name: 'Online MBA', aliases: ['NBS Online MBA'], locales: ['en', 'vi'] },
  { id: 'e-intl', type: 'Product', name: 'International Student MBA', aliases: [], locales: ['en', 'vi'] },
  { id: 'e-accred', type: 'Certification', name: 'TEQSA registration', aliases: [], locales: ['en'] },
]

export const CLAIMS = [
  { id: 'c-1', subject: 'Online MBA', predicate: 'offers', object: 'flexible entry pathways', locale: 'en', state: 'approved', public: true, confidence: 0.96, evidence: 'northstar.edu.au/online-mba', validTo: '2027-01-01' },
  { id: 'c-2', subject: 'International Student MBA', predicate: 'provides', object: 'dedicated international student support', locale: 'en', state: 'approved', public: true, confidence: 0.94, evidence: 'northstar.edu.au/international', validTo: '2027-01-01' },
  { id: 'c-3', subject: 'Northstar Business School', predicate: 'is registered with', object: 'TEQSA', locale: 'en', state: 'approved', public: true, confidence: 0.99, evidence: 'accreditation-report.pdf p.3', validTo: '2028-06-30' },
  { id: 'c-4', subject: 'Online MBA', predicate: 'international support (VI)', object: 'hỗ trợ du học sinh', locale: 'vi', state: 'needs_review', public: true, confidence: 0.7, evidence: 'draft', validTo: null },
  { id: 'c-5', subject: 'Northstar Business School', predicate: 'accreditation', object: 'accredited (2022 note)', locale: 'en', state: 'expired', public: false, confidence: 0.5, evidence: 'media-release-2022.pdf', validTo: '2024-12-31' },
  { id: 'c-6', subject: 'Online MBA', predicate: 'duration', object: '18 months', locale: 'en', state: 'disputed', public: true, confidence: 0.6, evidence: 'programme-guide.pdf vs website', validTo: null },
]

export const CONFLICTS = [
  { id: 'cf-1', severity: 'major', claim: 'Online MBA duration', detail: 'Programme guide says 18 months; website says 24 months.', sources: ['programme-guide.pdf', 'northstar.edu.au/online-mba'], status: 'open' },
]

export const SOURCES = [
  { id: 's-1', name: 'northstar.edu.au (website)', kind: 'Website', classification: 'public', status: 'synced', lastSync: '2026-07-01', locale: 'en' },
  { id: 's-2', name: 'programme-guide.pdf', kind: 'File', classification: 'public', status: 'complete', lastSync: '2026-06-20', locale: 'en' },
  { id: 's-3', name: 'accreditation-report.pdf', kind: 'File', classification: 'public', status: 'complete', lastSync: '2026-06-20', locale: 'en' },
  { id: 's-4', name: 'media-release-2022.pdf', kind: 'File', classification: 'public', status: 'expired', lastSync: '2026-06-20', locale: 'en' },
  { id: 's-5', name: 'scanned-brochure.pdf', kind: 'File (OCR)', classification: 'public', status: 'review_required', lastSync: '2026-06-22', locale: 'en', ocrWarning: true },
  { id: 's-6', name: 'FY26 growth plan.docx', kind: 'File', classification: 'private', status: 'complete', lastSync: '2026-06-18', locale: 'en', neverPublic: true },
]

/* ─── Recommendations ──────────────────────────────────────────── */

export const RECOMMENDATIONS = [
  {
    id: 'rec-1',
    title: 'Publish a reviewed Vietnamese information page on international-student support and Online MBA entry requirements',
    problem: 'Vietnamese-language prompts about the Online MBA rarely surface Northstar; competitors dominate this high-value cluster and there is little approved local-language evidence.',
    promptCluster: 'best-online-mba · vi',
    providers: ['Gemini', 'ChatGPT', 'Perplexity'],
    locales: ['vi'],
    competitorEvidence: 'Harbour School of Management appears in 8/10 sampled Vietnamese prompts; Northstar in 0/10.',
    missingClaims: ['c-4'],
    approvedClaims: ['c-1', 'c-2'],
    action: 'Create a localised, source-backed Vietnamese page covering international-student support and entry requirements.',
    dimensionsAffected: ['coverage', 'multilingual', 'citationQuality'],
    expectedDirection: 'up',
    confidence: 'medium',
    effort: 'medium',
    risk: 'low',
    owner: 'Localization Lead',
    status: 'open',
    hasDraft: true,
  },
  {
    id: 'rec-2',
    title: 'Correct the stale 2022 accreditation reference in public sources',
    problem: 'Assistants cite an outdated 2022 accreditation note; the current TEQSA registration is approved but under-cited.',
    promptCluster: 'accreditation · en',
    providers: ['ChatGPT'],
    locales: ['en'],
    competitorEvidence: null,
    missingClaims: [],
    approvedClaims: ['c-3'],
    action: 'Publish a current, source-backed accreditation fact sheet and retire the stale media release.',
    dimensionsAffected: ['knowledgeAccuracy', 'freshness'],
    expectedDirection: 'up',
    confidence: 'high',
    effort: 'low',
    risk: 'low',
    owner: 'Knowledge Steward',
    status: 'open',
    hasDraft: false,
  },
  {
    id: 'rec-3',
    title: 'Resolve the Online MBA duration conflict (18 vs 24 months)',
    problem: 'Contradictory public sources create an accuracy risk and reduce citation trust.',
    promptCluster: 'entry-requirements · en',
    providers: ['Claude', 'ChatGPT'],
    locales: ['en'],
    competitorEvidence: null,
    missingClaims: [],
    approvedClaims: ['c-1'],
    action: 'Consolidate to one authoritative value and update the programme guide + website.',
    dimensionsAffected: ['knowledgeAccuracy', 'consistency'],
    expectedDirection: 'up',
    confidence: 'high',
    effort: 'low',
    risk: 'low',
    owner: 'Content Editor',
    status: 'open',
    hasDraft: false,
  },
]

// Grounded draft for rec-1 (sentence-level evidence; approved claims only).
export const SAMPLE_DRAFT = {
  recId: 'rec-1',
  locale: 'vi',
  title: 'Hỗ trợ du học sinh & điều kiện nhập học MBA trực tuyến',
  status: 'draft',
  sentences: [
    { text: 'Chương trình MBA trực tuyến của Northstar Business School cung cấp lộ trình nhập học linh hoạt.', claim: 'c-1' },
    { text: 'Northstar cung cấp hỗ trợ chuyên biệt cho du học sinh.', claim: 'c-2' },
    { text: 'Northstar Business School được đăng ký với TEQSA.', claim: 'c-3' },
  ],
  policyWarnings: [],
}

/* ─── Experiments / Outcomes / Alerts ──────────────────────────── */

export const EXPERIMENTS = [
  {
    id: 'exp-1', hypothesis: 'A reviewed Vietnamese support page will raise VI coverage & prominence for the Online MBA cluster.',
    intervention: 'rec-1', baselineWindow: '2026-04 → 2026-06', holdout: 'VI accreditation prompts',
    providers: ['Gemini', 'ChatGPT'], locales: ['vi'], status: 'monitoring',
    primaryMetric: 'multilingual', result: 'Associated improvement',
  },
  {
    id: 'exp-2', hypothesis: 'Fixing the accreditation staleness will improve EN knowledge-accuracy.',
    intervention: 'rec-2', baselineWindow: '2026-05 → 2026-06', holdout: 'EN pricing prompts',
    providers: ['ChatGPT'], locales: ['en'], status: 'ready', primaryMetric: 'knowledgeAccuracy', result: 'Inconclusive',
  },
]

export const OUTCOME_EVENTS = [
  { id: 'oe-1', type: 'application', when: '2026-06-28', product: 'Online MBA', locale: 'en', value: null, attribution: 'A', source: 'Tagged landing path' },
  { id: 'oe-2', type: 'lead', when: '2026-06-29', product: 'International Student MBA', locale: 'vi', value: null, attribution: 'C', source: 'Temporal association' },
  { id: 'oe-3', type: 'demo_request', when: '2026-07-01', product: 'Online MBA', locale: 'en', value: null, attribution: 'B', source: 'CRM self-reported: used AI assistant' },
  { id: 'oe-4', type: 'enrolment', when: '2026-07-02', product: 'Online MBA', locale: 'en', value: 24500, attribution: 'D', source: 'No reliable AI relationship' },
]

export const ATTRIBUTION_LEVELS = {
  A: { label: 'Direct', tone: 'teal', desc: 'Explicit referrer / tagged path / campaign id.' },
  B: { label: 'Reported', tone: 'ocean', desc: 'CRM or form records the person used an AI assistant.' },
  C: { label: 'Associated', tone: 'amber', desc: 'Temporal / cohort association, no direct attribution.' },
  D: { label: 'Unattributed', tone: 'mist', desc: 'No reliable AI relationship.' },
}

export const ALERTS = [
  { id: 'al-1', severity: 'high', reason: 'New high-severity false claim', scope: 'accreditation · ChatGPT · en', evidence: 'obs-5', action: 'Open rec-2', when: '2026-07-01', ack: false },
  { id: 'al-2', severity: 'medium', reason: 'Competitor gain in high-priority cluster', scope: 'best-online-mba · vi', evidence: 'obs-3', action: 'Open rec-1', when: '2026-06-30', ack: false },
  { id: 'al-3', severity: 'low', reason: 'Stale public source', scope: 'media-release-2022.pdf', evidence: 's-4', action: 'Retire source', when: '2026-06-29', ack: true },
]

/* ─── Providers / models (Settings) ────────────────────────────── */

export const PROVIDERS = [
  { id: 'chatgpt', name: 'ChatGPT', official: true, provenance: 'fixture', citations: true, enabled: true },
  { id: 'perplexity', name: 'Perplexity', official: true, provenance: 'fixture', citations: true, enabled: true },
  { id: 'gemini', name: 'Gemini', official: true, provenance: 'fixture', citations: true, enabled: true },
  { id: 'claude', name: 'Claude', official: true, provenance: 'fixture', citations: false, enabled: true },
]

/* ─── Nav sections (module left-nav) ───────────────────────────── */

export const EAV_NAV = [
  { id: 'overview', label: 'Overview', group: 'Measure' },
  { id: 'explorer', label: 'Visibility Explorer', group: 'Measure' },
  { id: 'competitors', label: 'Competitors', group: 'Measure' },
  { id: 'languages', label: 'Languages', group: 'Measure' },
  { id: 'citations', label: 'Citations', group: 'Measure' },
  { id: 'prompts', label: 'Prompt Library', group: 'Measure' },
  { id: 'knowledge', label: 'Knowledge Layer', group: 'Improve' },
  { id: 'recommendations', label: 'Recommendations', group: 'Improve' },
  { id: 'content', label: 'Content & Approvals', group: 'Improve' },
  { id: 'experiments', label: 'Experiments', group: 'Measure Outcomes' },
  { id: 'outcomes', label: 'Outcomes', group: 'Measure Outcomes' },
  { id: 'reports', label: 'Reports', group: 'Measure Outcomes' },
  { id: 'alerts', label: 'Alerts', group: 'Monitor' },
  { id: 'settings', label: 'Settings', group: 'Monitor' },
]
export const EAV_NAV_GROUPS = ['Measure', 'Improve', 'Monitor', 'Measure Outcomes']
