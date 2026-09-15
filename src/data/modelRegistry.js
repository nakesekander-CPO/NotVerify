/**
 * Model Registry — the custom models arbitr has built for this workspace.
 *
 * Same mock-store pattern as agentStudio.js: module-level mutable array,
 * bumpStore() notifies useModelRegistry() subscribers. Agents reference
 * models by the `modelKey` string their version carries in
 * modelConfig.model, so "which agents use this model" is derived — no
 * agent data changes needed. Import direction is one-way: this module
 * imports from agentStudio, never the reverse.
 */

import { useCallback, useState } from 'react'
import { AGENTS, activeVersion } from './agentStudio'
import { REVIEWERS } from './governanceDashboard'

export const MODEL_TIERS = ['Platform base', 'Domain base', 'Custom fine-tune', 'Detection']

export const MODEL_STATUS_LABEL = {
  enabled: 'Enabled',
  available: 'Available',
  evaluation: 'In evaluation',
}

/* ─── Seeds ────────────────────────────────────────────────────── */

export const MODELS = [
  {
    id: 'MDL-1001',
    modelKey: 'arbitr-reason-1',
    name: 'arbitr Reason 1',
    tier: 'Platform base',
    status: 'enabled',
    purpose: 'The workspace default. General reasoning model tuned for governed content work: terminology checks, policy lookups, and structured review verdicts with citations.',
    intendedUse: ['Agent reasoning and tool use across all deployment surfaces', 'Terminology and policy checks with cited sources', 'Structured verdicts (cleared / held with reason)'],
    notIntendedUse: ['Final-say publishing decisions without a configured review gate', 'Content outside the workspace knowledge scope'],
    technical: {
      baseModel: 'arbitr Foundation v3',
      version: 'v1.4',
      versionHistory: [
        { version: 'v1.4', date: '2026-04-20', notes: 'Citation grounding tightened; verdict schema v2' },
        { version: 'v1.2', date: '2026-01-15', notes: 'Tool-use reliability pass' },
        { version: 'v1.0', date: '2025-10-01', notes: 'Initial workspace release' },
      ],
      contextWindow: '128K tokens',
      avgLatency: '1.1s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'ISO 27001'],
      dataResidency: ['US', 'JP'],
      trainingDataProvenance: 'arbitr platform corpus. No customer data in base training.',
      biasAuditScore: 90,
      lastAuditDate: '2026-03-15',
      guardrailNotes: ['Compatible with all locked workspace guardrails', 'Requires citation for policy answers'],
    },
    evals: {
      scores: { accuracy: 88, tone: 84, regulatory: 82, speed: 92 },
      testDrive: {
        before: 'Does this paragraph meet our disclosure tone rules?',
        after: 'Held — sentence 2 asserts forward-looking growth without the approved hedging language (Disclosure Policy §4.2).',
        baselineScore: 74,
        boostedScore: 88,
      },
    },
    creditCostPerRun: 3,
    marketplaceRef: null,
    enabledBy: { name: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role },
    enabledAt: '2026-05-12T09:30:00Z',
    auditTrail: [
      { id: 'MA-1', event: 'enabled', actor: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role, at: '2026-05-12T09:30:00Z', detail: 'Governed enable · 4/4 policy checks passed' },
    ],
  },
  {
    id: 'MDL-1002',
    modelKey: 'arbitr-general',
    name: 'arbitr General',
    tier: 'Platform base',
    status: 'enabled',
    purpose: 'Fast general-purpose model for drafting and triage where per-check cost matters more than domain depth. The default for newly built agents.',
    intendedUse: ['Draft replies and rewrites inside review gates', 'Intake classification and routing', 'High-volume, low-risk checks'],
    notIntendedUse: ['Regulated disclosure language without a domain model in the loop', 'Japanese IR filings (use Meridian JA Disclosure)'],
    technical: {
      baseModel: 'arbitr Foundation v3',
      version: 'v3.0',
      versionHistory: [
        { version: 'v3.0', date: '2026-01-01', notes: 'Architecture update; throughput +30%' },
        { version: 'v2.5', date: '2025-07-01', notes: 'Expanded language coverage' },
      ],
      contextWindow: '64K tokens',
      avgLatency: '0.4s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'GDPR', 'ISO 27001'],
      dataResidency: ['US', 'EU', 'APAC'],
      trainingDataProvenance: 'Multi-source corpus, bias-audited, no PII.',
      biasAuditScore: 88,
      lastAuditDate: '2026-03-15',
      guardrailNotes: ['Compatible with all locked workspace guardrails'],
    },
    evals: {
      scores: { accuracy: 82, tone: 80, regulatory: 72, speed: 96 },
      testDrive: {
        before: 'Classify this incoming request and recommend a workflow.',
        after: 'Regulated financial content · Japanese · priority high → route to Disclosure review workflow.',
        baselineScore: 78,
        boostedScore: 82,
      },
    },
    creditCostPerRun: 1,
    marketplaceRef: null,
    enabledBy: { name: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role },
    enabledAt: '2026-05-12T09:32:00Z',
    auditTrail: [
      { id: 'MA-2', event: 'enabled', actor: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role, at: '2026-05-12T09:32:00Z', detail: 'Governed enable · 4/4 policy checks passed' },
    ],
  },
  {
    id: 'MDL-1003',
    modelKey: 'meridian-digital-twin-2',
    name: 'Meridian Digital Twin',
    tier: 'Custom fine-tune',
    status: 'enabled',
    purpose: 'Meridian Capital’s own voice. Fine-tuned exclusively on the workspace’s golden records so outputs match approved terminology, style, and disclosure tone.',
    intendedUse: ['Investor relations and earnings content in Meridian’s approved voice', 'EN→JA translation of filings with approved terminology', 'Brand-voice rewrites that cite the golden record applied'],
    notIntendedUse: ['Content for other client organizations', 'Domains outside the golden-record corpus'],
    technical: {
      baseModel: 'Claude 3.5 Sonnet (fine-tuned)',
      version: 'v2.1',
      versionHistory: [
        { version: 'v2.1', date: '2026-02-01', notes: 'Q4 earnings terminology update' },
        { version: 'v2.0', date: '2025-11-15', notes: 'Added IR presentation support' },
        { version: 'v1.0', date: '2025-08-01', notes: 'Initial training on 42 golden records' },
      ],
      contextWindow: '200K tokens',
      avgLatency: '0.7s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'ISO 27001'],
      dataResidency: ['US', 'JP'],
      trainingDataProvenance: 'Client-provided golden records only. 42 projects, 4,120 verified entries.',
      biasAuditScore: 94,
      lastAuditDate: '2026-02-28',
      guardrailNotes: ['Scoped to Meridian Capital workspace data', 'Outputs carry golden-record citations'],
    },
    evals: {
      scores: { accuracy: 97, tone: 95, regulatory: 92, speed: 88 },
      testDrive: {
        before: 'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
        after: 'のれんの減損損失合計額 ¥630百万をASBJ企業会計基準第10号に基づき計上しました。',
        baselineScore: 71,
        boostedScore: 98,
      },
    },
    creditCostPerRun: 5,
    marketplaceRef: 'MER-DT-1',
    enabledBy: { name: REVIEWERS.marcus.name, role: REVIEWERS.marcus.role },
    enabledAt: '2026-06-03T14:10:00Z',
    auditTrail: [
      { id: 'MA-3', event: 'enabled', actor: REVIEWERS.marcus.name, role: REVIEWERS.marcus.role, at: '2026-06-03T14:10:00Z', detail: 'Governed enable · 4/4 policy checks passed' },
    ],
  },
  {
    id: 'MDL-1004',
    modelKey: 'arbitr-financial-2',
    name: 'arbitr Financial v2',
    tier: 'Domain base',
    status: 'enabled',
    purpose: 'Financial-services domain base. Understands GAAP, IFRS, and major regional accounting standards — the right floor for disclosure and filing checks.',
    intendedUse: ['Earnings, filings, and disclosure checks in any supported language', 'Financial terminology QA against major standards', 'Baseline for financial agents without full customization'],
    notIntendedUse: ['Medical, legal, or other non-financial regulated domains', 'Brand-voice rewriting (use Meridian Digital Twin)'],
    technical: {
      baseModel: 'arbitr Financial v2',
      version: 'v2.0',
      versionHistory: [
        { version: 'v2.0', date: '2025-12-01', notes: 'ESG terminology expansion' },
        { version: 'v1.5', date: '2025-06-01', notes: 'IFRS 17 insurance standard added' },
      ],
      contextWindow: '128K tokens',
      avgLatency: '0.5s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'ISO 27001', 'GDPR'],
      dataResidency: ['US', 'EU', 'JP'],
      trainingDataProvenance: 'Licensed financial corpus from SEC, ESMA, and FSA filings.',
      biasAuditScore: 91,
      lastAuditDate: '2026-02-01',
      guardrailNotes: ['Compatible with all locked workspace guardrails'],
    },
    evals: {
      scores: { accuracy: 87, tone: 82, regulatory: 88, speed: 90 },
      testDrive: {
        before: 'Operating expenses increased 12% year-over-year, driven by higher compensation costs.',
        after: '営業費用は、報酬コストの増加を主因として前年同期比12%増加しました。',
        baselineScore: 76,
        boostedScore: 87,
      },
    },
    creditCostPerRun: 2,
    marketplaceRef: 'BASE-FIN-1',
    enabledBy: { name: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role },
    enabledAt: '2026-05-20T10:00:00Z',
    auditTrail: [
      { id: 'MA-4', event: 'enabled', actor: REVIEWERS.sarah.name, role: REVIEWERS.sarah.role, at: '2026-05-20T10:00:00Z', detail: 'Governed enable · 4/4 policy checks passed' },
    ],
  },
  {
    id: 'MDL-1005',
    modelKey: 'meridian-ja-disclosure-1',
    name: 'Meridian JA Disclosure',
    tier: 'Custom fine-tune',
    status: 'available',
    purpose: 'Japanese IR and securities-report language, tuned on Meridian’s approved JA disclosure filings. Built for the SwiftBridge delivery targets: disclosure docs, presentations, and annual securities reports.',
    intendedUse: ['JA disclosure and timely-disclosure document checks', 'Annual securities report terminology and tone QA', 'EN→JA disclosure translation with J-GAAP terminology'],
    notIntendedUse: ['Non-Japanese regulatory regimes', 'Marketing or brand content (use Meridian Digital Twin)'],
    technical: {
      baseModel: 'arbitr Financial v2 (fine-tuned)',
      version: 'v1.0',
      versionHistory: [
        { version: 'v1.0', date: '2026-06-15', notes: 'Initial training on Meridian JA disclosure corpus' },
      ],
      contextWindow: '128K tokens',
      avgLatency: '0.6s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'ISO 27001'],
      dataResidency: ['JP', 'US'],
      trainingDataProvenance: 'Meridian-approved JA filings and disclosure documents. 1,860 verified segments.',
      biasAuditScore: 92,
      lastAuditDate: '2026-06-20',
      guardrailNotes: ['Scoped to Meridian Capital workspace data', 'JP data residency for training corpus'],
    },
    evals: {
      scores: { accuracy: 95, tone: 93, regulatory: 96, speed: 89 },
      testDrive: {
        before: 'The company expects continued revenue growth in the next fiscal year.',
        after: '当社は、翌事業年度においても増収を見込んでおりますが、これは現時点の見通しであり、実際の業績は異なる可能性があります。',
        baselineScore: 73,
        boostedScore: 96,
      },
    },
    creditCostPerRun: 4,
    marketplaceRef: null,
    enabledBy: null,
    enabledAt: null,
    auditTrail: [
      { id: 'MA-5', event: 'registered', actor: 'arbitr', role: 'Platform', at: '2026-06-22T08:00:00Z', detail: 'Model registered to workspace after fine-tune delivery' },
    ],
  },
  {
    id: 'MDL-1006',
    modelKey: 'meridian-term-enforce-1',
    name: 'Meridian Terminology Enforcement',
    tier: 'Custom fine-tune',
    status: 'available',
    purpose: 'Enforces Meridian’s approved term base at generation time instead of correcting afterwards — forbidden terms cannot be produced, approved terms are preferred.',
    intendedUse: ['Terminology-critical checks where the term base is authoritative', 'Pre-publish enforcement of approved and forbidden terms', 'Pairing with review agents to cut terminology flags'],
    notIntendedUse: ['Free-form drafting where term-base coverage is thin', 'Languages without an approved term base'],
    technical: {
      baseModel: 'arbitr Foundation v3 (constrained decode)',
      version: 'v1.2',
      versionHistory: [
        { version: 'v1.2', date: '2026-05-30', notes: 'Term-base sync latency reduced' },
        { version: 'v1.0', date: '2026-03-10', notes: 'Initial constrained-decode build on Meridian term base' },
      ],
      contextWindow: '64K tokens',
      avgLatency: '0.5s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II', 'ISO 27001'],
      dataResidency: ['US', 'JP'],
      trainingDataProvenance: 'Meridian approved term base (2,340 terms) and correction history.',
      biasAuditScore: 89,
      lastAuditDate: '2026-05-01',
      guardrailNotes: ['Term base is read-only to the model', 'Forbidden-term list applied at decode time'],
    },
    evals: {
      scores: { accuracy: 93, tone: 85, regulatory: 90, speed: 91 },
      testDrive: {
        before: 'Is "のれん" the approved term for goodwill in this filing?',
        after: 'Approved — のれん is the term base entry for goodwill (J-GAAP). 23 past violations of the forbidden alternative were corrected.',
        baselineScore: 77,
        boostedScore: 93,
      },
    },
    creditCostPerRun: 2,
    marketplaceRef: null,
    enabledBy: null,
    enabledAt: null,
    auditTrail: [
      { id: 'MA-6', event: 'registered', actor: 'arbitr', role: 'Platform', at: '2026-04-02T08:00:00Z', detail: 'Model registered to workspace after fine-tune delivery' },
    ],
  },
  {
    id: 'MDL-1007',
    modelKey: 'meridian-fls-detect-1',
    name: 'Meridian FLS Detect',
    tier: 'Detection',
    status: 'evaluation',
    purpose: 'Detects forward-looking statements and unhedged claims before they publish — the language pattern most likely to trigger a disclosure hold.',
    intendedUse: ['Pre-publish scan for forward-looking statements', 'Flagging unhedged growth or performance claims', 'Feeding held-change reasons into the governance queue'],
    notIntendedUse: ['Generation or rewriting of any kind (detection only)', 'Legal judgment on flagged statements — human review decides'],
    technical: {
      baseModel: 'arbitr Financial v2 (classifier head)',
      version: 'v0.9',
      versionHistory: [
        { version: 'v0.9', date: '2026-06-28', notes: 'Evaluation build — precision tuning in progress' },
      ],
      contextWindow: '32K tokens',
      avgLatency: '0.3s/check',
    },
    compliance: {
      certifications: ['SOC 2 Type II'],
      dataResidency: ['US'],
      trainingDataProvenance: 'Labeled FLS corpus from Meridian filings and public disclosure precedents.',
      biasAuditScore: null,
      lastAuditDate: null,
      guardrailNotes: ['Evaluation report due before enablement', 'Bias audit scheduled with the eval run'],
    },
    evals: {
      scores: { accuracy: 91, tone: null, regulatory: 94, speed: 95 },
      testDrive: {
        before: 'We are confident revenue will grow at least 15% next year.',
        after: 'Flagged — unhedged forward-looking claim ("will grow at least 15%"). Suggested hold reason: FLS without safe-harbor language.',
        baselineScore: 68,
        boostedScore: 91,
      },
    },
    creditCostPerRun: 1,
    marketplaceRef: null,
    enabledBy: null,
    enabledAt: null,
    auditTrail: [
      { id: 'MA-7', event: 'registered', actor: 'arbitr', role: 'Platform', at: '2026-07-01T08:00:00Z', detail: 'Model registered in evaluation — enable gated on eval report' },
    ],
  },
]

/* ─── Store: mutable module state + re-render hook ─────────────── */

let _tick = 0
const _subs = new Set()
function bumpStore() {
  _tick += 1
  _subs.forEach(fn => fn(_tick))
}

/** Subscribe a component to registry mutations. */
export function useModelRegistry() {
  const [, setT] = useState(0)
  const refresh = useCallback(() => setT(t => t + 1), [])
  useState(() => { _subs.add(refresh); return 0 })
  return { models: MODELS, refresh }
}

export function getModelById(id) { return MODELS.find(m => m.id === id) || null }
export function getModelByKey(key) { return MODELS.find(m => m.modelKey === key) || null }

/** Models an agent may select — only ones that passed the governed enable. */
export function selectableModels() { return MODELS.filter(m => m.status === 'enabled') }

/** Agents whose active version runs on this model. */
export function agentsUsingModel(modelKey) {
  return AGENTS.filter(a => activeVersion(a)?.modelConfig?.model === modelKey)
}

/* ─── Governed enable ──────────────────────────────────────────── */

/**
 * Policy checks run before a model can be enabled. Deterministic fixtures:
 * evaluation-status models fail the audit-currency check (no eval report
 * yet); available models pass all four.
 */
export function runEnableChecks(model) {
  if (!model) return []
  const inEvaluation = model.status === 'evaluation'
  return [
    {
      id: 'data_residency',
      label: 'Data residency',
      pass: true,
      detail: `Training corpus residency (${model.compliance.dataResidency.join(', ')}) matches workspace policy`,
    },
    {
      id: 'guardrail_compat',
      label: 'Guardrail compatibility',
      pass: true,
      detail: 'Compatible with locked guardrail: Block cross-workspace data access',
    },
    {
      id: 'credit_budget',
      label: 'Credit budget',
      pass: true,
      detail: `Per-check cost of ${model.creditCostPerRun} Intelligence Credits fits the workspace daily budget (500)`,
    },
    {
      id: 'audit_currency',
      label: 'Audit currency',
      pass: !inEvaluation,
      detail: inEvaluation
        ? 'Evaluation report not yet delivered — enablement blocked'
        : `Training-data audit current (last audit ${model.compliance.lastAuditDate})`,
    },
  ]
}

let _auditSeq = 100
function auditLine(event, approver, detail) {
  _auditSeq += 1
  return {
    id: `MA-${_auditSeq}`,
    event,
    actor: approver.name,
    role: approver.role,
    at: new Date().toISOString(),
    detail,
  }
}

/**
 * Governed enable: only an `available` model with all policy checks passing
 * can be enabled. Records the approval line and appends to the audit trail.
 * Returns the model, or null if the guard refuses.
 */
export function enableModel(id, { approver } = {}) {
  const m = getModelById(id)
  if (!m || m.status !== 'available' || !approver) return null
  const checks = runEnableChecks(m)
  if (!checks.every(c => c.pass)) return null
  m.status = 'enabled'
  m.enabledBy = { name: approver.name, role: approver.role }
  m.enabledAt = new Date().toISOString()
  m.auditTrail = [...m.auditTrail, auditLine('enabled', approver, `Governed enable · ${checks.length}/${checks.length} policy checks passed`)]
  bumpStore()
  return m
}

/** Symmetric governed disable — enabled → available, with an audit line. */
export function disableModel(id, { approver } = {}) {
  const m = getModelById(id)
  if (!m || m.status !== 'enabled' || !approver) return null
  m.status = 'available'
  m.enabledBy = null
  m.enabledAt = null
  m.auditTrail = [...m.auditTrail, auditLine('disabled', approver, 'Model disabled for this workspace')]
  bumpStore()
  return m
}
