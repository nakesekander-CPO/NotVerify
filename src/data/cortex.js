/**
 * Cortex — mock data layer for the Living Knowledge Mesh page.
 *
 * Isolated so real APIs can replace it later. Two views consume it:
 *   - Constellation: a deterministic starfield where every point is a
 *     human-verified fact, clustered by domain (recent facts shine brighter —
 *     that's Compounding Memory made visible).
 *   - Flow: the human-verified learning loop (sources → extraction → human
 *     review → verified memory → agents, with corrections compounding back).
 * The shared Node Inspector reads FACTS entries (identity → human provenance →
 * impact radius → time machine).
 *
 * Agent names match the real Agent Studio seeds so the modules tell one story.
 */

/* ─── Headline metrics ─────────────────────────────────────────── */

export const METRICS = {
  trustScore: 98.4,
  compoundingPct: 12,
  verifiedEntries: 4120,
  caughtThisWeek: 36,
}

export const WORKSPACE_LINE = 'Living Knowledge Mesh · Meridian Capital'

/* ─── Agents (aligned with Agent Studio seeds) ─────────────────── */

export const CORTEX_AGENTS = [
  'Meridian JA Reviewer',
  'Disclosure Policy Assistant',
  'Brand QA',
  'Brand Voice',
]

/* ─── Inspector facts ──────────────────────────────────────────── */

export const FACTS = {
  featured: {
    t: 'Revenue Recognition Standard',
    s: 'Policy',
    sub: 'J-GAAP Standard 14',
    who: 'Sarah Jenkins',
    role: 'Lead Compliance',
    date: '12 Jun 2026',
    src: 'revenue-recognition-v3.2.pdf',
    impact: 'Guides 3 agents',
    agents: ['Meridian JA Reviewer', 'Disclosure Policy Assistant', 'Brand QA'],
    featured: true,
    versions: ['v1.0', 'v2.1', 'v3.0', 'v3.2 Current'],
    note: '“Updated threshold to ¥15M following board resolution.”',
  },
  forwardLooking: {
    t: 'Forward-Looking Statements',
    s: 'Policy',
    sub: 'Hedging & safe-harbor language standard',
    who: 'Sarah Jenkins',
    role: 'Lead Compliance',
    date: '18 Jun 2026',
    src: 'forward-looking-standard-v2.pdf',
    impact: 'Guides 2 agents',
    agents: ['Meridian JA Reviewer', 'Disclosure Policy Assistant'],
    versions: ['v1.0', 'v2.0 Current'],
    highlight: { value: '11', label: 'unhedged claims' },
    meta: 'Held this quarter · Marcus Lee',
  },
  numericFormat: {
    t: 'Numeric Format Rules',
    s: 'Policy',
    sub: '¥ / % formatting & rounding standard',
    who: 'Yuki Tanaka',
    role: 'Compliance Reviewer',
    date: '05 Jun 2026',
    src: 'numeric-format-standard.pdf',
    impact: 'Guides 1 agent',
    agents: ['Meridian JA Reviewer'],
    versions: ['v1.0', 'v2.0 Current'],
    highlight: { value: '41', label: 'tables' },
    meta: 'Auto-fixed · Yuki Tanaka',
  },
  visLang: {
    t: '“future-ready learning ecosystem”',
    s: 'Flagged phrase',
    sub: 'VIS-LANG-001 · vision-language drift',
    who: 'Emma Ross',
    role: 'Brand Lead',
    date: '14 Aug 2026',
    src: 'campaign-copy-review',
    impact: 'Held in 1 campaign',
    agents: ['Brand QA', 'Disclosure Policy Assistant'],
    flagged: true,
    versions: ['v1.0 Flagged'],
    meta: 'Watched everywhere · Emma Ross',
  },
  term: {
    t: 'のれん → Goodwill',
    s: 'Term',
    sub: 'Approved terminology · JA',
    who: 'Yuki Tanaka',
    role: 'Compliance Reviewer',
    date: '30 May 2026',
    src: 'terminology-jp-v8.csv',
    impact: 'Cited by 4 agents',
    agents: ['Meridian JA Reviewer', 'Disclosure Policy Assistant'],
    versions: ['v1.0', 'v2.0 Current'],
    highlight: { value: '23', label: 'violations' },
    meta: 'Caught this quarter · last hold 14 min ago · Yuki Tanaka',
  },
  timelyDisclosure: {
    t: '適時開示 → timely disclosure',
    s: 'Term',
    sub: 'Approved terminology · JA',
    who: 'Yuki Tanaka',
    role: 'Compliance Reviewer',
    date: '22 May 2026',
    src: 'terminology-jp-v8.csv',
    impact: 'Cited by 2 agents',
    agents: ['Meridian JA Reviewer', 'Disclosure Policy Assistant'],
    versions: ['v1.0', 'v2.0 Current'],
  },
  shareBuyback: {
    t: '自己株式取得 → share buyback',
    s: 'Term',
    sub: 'Approved terminology · JA',
    who: 'Yuki Tanaka',
    role: 'Compliance Reviewer',
    date: '22 May 2026',
    src: 'terminology-jp-v8.csv',
    impact: 'Cited by 1 agent',
    agents: ['Meridian JA Reviewer'],
    versions: ['v1.0', 'v2.0 Current'],
  },
  corrections: {
    t: 'Reviewer Corrections',
    s: 'Memory',
    sub: 'Live human-in-the-loop writeback',
    who: 'Review Workspace',
    role: 'Human-in-the-loop',
    date: 'Live',
    src: 'cortex-writeback-stream',
    impact: 'Feeds every agent',
    agents: CORTEX_AGENTS,
    versions: ['v1.0', 'v2.0 Current'],
    highlight: { value: '47', label: 'corrections' },
    meta: 'Committed in 30 days · Review Workspace',
  },
  answers: {
    t: 'Verified Answers',
    s: 'Memory',
    sub: 'Prior human-verified outputs',
    who: 'Review Workspace',
    role: 'Human-in-the-loop',
    date: 'Live',
    src: 'verified-answers-index',
    impact: 'Cited by 3 agents',
    agents: ['Meridian JA Reviewer', 'Disclosure Policy Assistant', 'Brand QA'],
    versions: ['v1.0', 'v2.0 Current'],
    highlight: { value: '318', label: 'responses' },
    meta: 'Reused · Review Workspace',
  },
  brand: {
    t: 'Brand Style Guide',
    s: 'Rule',
    sub: 'Voice, tone, forbidden phrasings',
    who: 'Emma Ross',
    role: 'Brand Lead',
    date: '01 Jun 2026',
    src: 'brand-guide-2026.pdf',
    impact: 'Guides 2 agents',
    agents: ['Brand QA', 'Brand Voice'],
    versions: ['v1.0', 'v2.0 Current'],
  },
  filings: {
    t: 'Q3 Earnings Context',
    s: 'Context',
    sub: 'Filing-cycle background pack',
    who: 'Alex Chen',
    role: 'Workspace Admin',
    date: '27 May 2026',
    src: 'q3-earnings-pack.pdf',
    impact: 'Cited by 2 agents',
    agents: ['Disclosure Policy Assistant'],
    versions: ['v1.0', 'v2.0 Current'],
  },
  memoryCore: {
    t: 'Verified Memory',
    s: 'Cortex core',
    sub: '4,120 human-verified entries',
    who: 'Review Workspace',
    role: 'Human-in-the-loop',
    date: 'Live',
    src: 'cortex index',
    impact: '4,120 entries guiding every agent',
    agents: CORTEX_AGENTS,
    versions: ['v1.0', 'v2.0 Current'],
  },
  sources: {
    t: 'Approved Sources',
    s: 'Stage',
    sub: 'Governed source registry',
    who: 'Workspace Admins',
    role: 'Governance',
    date: 'Continuous',
    src: 'connector registry',
    impact: '259 entries feeding extraction',
    agents: [],
    versions: ['v1.0', 'v2.0 Current'],
  },
  extracted: {
    t: 'Claims & Terms',
    s: 'Stage',
    sub: 'AI-assisted extraction',
    who: 'Extraction Pipeline',
    role: 'AI-assisted',
    date: 'Continuous',
    src: 'extraction runs',
    impact: '5,952 entries extracted',
    agents: [],
    versions: ['v1.0', 'v2.0 Current'],
  },
  review: {
    t: 'Human Review',
    s: 'Stage',
    sub: 'Verify · Edit — the human gate',
    who: 'Review Workspace',
    role: 'Human-in-the-loop',
    date: 'Live',
    src: 'review workspace',
    impact: '4,610 entries reviewed',
    agents: [],
    versions: ['v1.0', 'v2.0 Current'],
  },
}

export function agentFact(name) {
  return {
    t: name,
    s: 'Agent',
    sub: 'Retrieves from Cortex at answer time',
    who: 'Alex Chen',
    role: 'Workspace Admin',
    date: '02 Jul 2026',
    src: 'agent-studio',
    impact: 'Uses verified memory on every run',
    agents: [],
    versions: ['v1.0', 'v2.0 Current'],
  }
}

/* ─── Constellation clusters ───────────────────────────────────── */

// kind: 'memory' = memory/terminology · 'policy' = policies/rules
export const CLUSTERS = [
  { id: 'term', label: 'Terminology · JA', n: 700, x: 0.20, y: 0.30, spread: 0.10, kind: 'memory', rep: FACTS.term },
  { id: 'corr', label: 'Reviewer Corrections', n: 620, x: 0.50, y: 0.62, spread: 0.11, kind: 'memory', rep: FACTS.corrections },
  { id: 'va', label: 'Verified Answers', n: 420, x: 0.80, y: 0.32, spread: 0.09, kind: 'memory', rep: FACTS.answers },
  { id: 'pol', label: 'Policies', n: 300, x: 0.36, y: 0.20, spread: 0.07, kind: 'policy', rep: FACTS.featured },
  { id: 'brand', label: 'Brand Rules', n: 220, x: 0.68, y: 0.72, spread: 0.07, kind: 'policy', rep: FACTS.brand },
  { id: 'fil', label: 'Filings Context', n: 240, x: 0.14, y: 0.72, spread: 0.07, kind: 'policy', rep: FACTS.filings },
]

export const TOTAL_FACTS = CLUSTERS.reduce((a, c) => a + c.n, 0)

/* ─── Graph view (hub + node) ───────────────────────────────────
 * The curated alternative to the starfield: ~30 meaningful nodes instead
 * of 2,500 dots. Hubs are the CLUSTERS above (sized by fact count);
 * satellites are individual verified facts pinned near their hub;
 * agents sit on their own row. Edges are membership (satellite → hub,
 * solid) and guides/learned-from (satellite or hub → agent, dotted) —
 * both derived from each fact's own `agents` list so the graph can never
 * drift from what the Node Inspector shows. */

export const GRAPH_SATELLITES = [
  { id: 'goodwill', hub: 'term', x: 0.09, y: 0.06, factKey: 'term' },
  { id: 'disclosure', hub: 'term', x: 0.04, y: 0.48, factKey: 'timelyDisclosure' },
  { id: 'buyback', hub: 'term', x: 0.05, y: 0.60, factKey: 'shareBuyback' },
  { id: 'revenue', hub: 'pol', x: 0.42, y: 0.02, factKey: 'featured' },
  { id: 'forwardLooking', hub: 'pol', x: 0.56, y: 0.06, factKey: 'forwardLooking' },
  { id: 'numericFormat', hub: 'pol', x: 0.49, y: 0.38, factKey: 'numericFormat' },
  { id: 'brandStyle', hub: 'brand', x: 0.73, y: 0.20, factKey: 'brand' },
  { id: 'visLang', hub: 'brand', x: 0.81, y: 0.55, factKey: 'visLang', flagged: true },
  { id: 'q3earnings', hub: 'fil', x: 0.54, y: 0.93, factKey: 'filings' },
]

export const GRAPH_AGENTS = [
  { id: 'meridian', x: 0.90, y: 0.11, name: 'Meridian JA Reviewer' },
  { id: 'disclosureAgent', x: 0.94, y: 0.42, name: 'Disclosure Policy Assistant' },
  { id: 'brandQA', x: 0.90, y: 0.68, name: 'Brand QA' },
  { id: 'brandVoice', x: 0.86, y: 0.85, name: 'Brand Voice' },
]

// Hubs with no satellite that still feed agents directly (memory → agent,
// "learned-from"): Reviewer Corrections and Verified Answers.
export const GRAPH_HUB_FACT_KEYS = { corr: 'corrections', va: 'answers' }

/**
 * Deterministic starfield (seeded LCG) so the constellation is identical on
 * every render/session. ~12% of points are `recent` (brighter + larger).
 */
export function generateStars() {
  let seed = 42
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
  const gauss = () => (rnd() + rnd() + rnd()) / 3 - 0.5
  const stars = []
  for (const c of CLUSTERS) {
    for (let i = 0; i < c.n; i++) {
      stars.push({
        cl: c.id,
        x: c.x + gauss() * c.spread * 2.4,
        y: c.y + gauss() * c.spread * 2.2,
        r: 0.7 + rnd() * 1.1,
        recent: rnd() < 0.12,
        tw: rnd() * Math.PI * 2,
        kind: c.kind,
      })
    }
  }
  return stars
}

/* ─── Flow (learning loop) ─────────────────────────────────────── */

export const FLOW_STAGES = [
  { id: 'src', label: 'Sources', title: 'Approved sources', n: 259, detail: 'Uploads 37 · Website 210 · Transcripts 12', tone: 'slate', fact: FACTS.sources },
  { id: 'cl', label: 'Claims & Terms', title: 'Extracted', n: 5952, detail: 'claims · terms · rules awaiting review', tone: 'blue', fact: FACTS.extracted },
  { id: 'rev', label: 'Human Review', title: 'Verify · Edit', n: 4610, detail: 'reviewed this quarter', tone: 'blue', avatars: ['YT', 'SJ', 'ML'], fact: FACTS.review },
  { id: 'mem', label: 'Verified Memory', title: 'Cortex', n: 4120, detail: 'verified entries · +12% this quarter', tone: 'gold', fact: FACTS.memoryCore },
]

export const FLOW_RIBBONS = [
  { from: 'src', to: 'cl', w: 10, tone: 'slate' },
  { from: 'cl', to: 'rev', w: 14, tone: 'blue' },
  { from: 'rev', to: 'mem', w: 12, tone: 'gold' },
  // mem → each agent card added dynamically (violet)
]

/* ─── Memory at work ─────────────────────────────────────────────
 * "Cortex at work" card strip below the graph — a receipt per hold, not a
 * new claim: each card points at a FACTS entry (or the flagged VIS-LANG-001
 * phrase) and states what actually happened, dated and attributed. */

export const MEMORY_AT_WORK = [
  { tag: 'CORTEX', factKey: 'term', title: FACTS.term.t, value: FACTS.term.highlight.value, label: FACTS.term.highlight.label, meta: FACTS.term.meta },
  { tag: 'CORTEX', factKey: 'forwardLooking', title: FACTS.forwardLooking.t, value: FACTS.forwardLooking.highlight.value, label: FACTS.forwardLooking.highlight.label, meta: FACTS.forwardLooking.meta },
  { tag: 'VIS-LANG-001', factKey: 'visLang', title: FACTS.visLang.t, value: FACTS.visLang.impact, label: '', meta: FACTS.visLang.meta, tone: 'flagged' },
  { tag: 'CORTEX', factKey: 'numericFormat', title: FACTS.numericFormat.t, value: FACTS.numericFormat.highlight.value, label: FACTS.numericFormat.highlight.label, meta: FACTS.numericFormat.meta },
  { tag: 'CORTEX', factKey: 'corrections', title: 'Review writeback stream', value: FACTS.corrections.highlight.value, label: FACTS.corrections.highlight.label, meta: FACTS.corrections.meta },
  { tag: 'CORTEX', factKey: 'answers', title: 'Verified answer index', value: FACTS.answers.highlight.value, label: FACTS.answers.highlight.label, meta: FACTS.answers.meta },
]
