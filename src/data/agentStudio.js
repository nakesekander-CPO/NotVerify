/**
 * Agent Studio — mock data layer.
 *
 * Isolated so real APIs can replace it later: the UI imports the exported
 * catalogs, seed data, factories, and helpers only. Runtime mutations
 * (create / edit-as-draft / publish / pause / duplicate / archive / rollback)
 * happen against module-level arrays; screens call `bumpStore()` via the
 * `useAgentStore` hook to re-render. No backend, no real LLM calls.
 *
 * arbitr vocabulary is intentional: Org Brain, Content Maps, terminology,
 * translation memory, reviewer corrections, Verify / Not Verify / Need Review,
 * Intelligence Credits / Trust Credits.
 */

import { useState, useCallback } from 'react'

/* ─── Enums / statuses ─────────────────────────────────────────── */

export const AGENT_STATUS = ['draft', 'active', 'paused', 'archived']
export const OUTPUT_STATUS = [
  'verified', 'need_review', 'not_verified', 'draft', 'blocked', 'requires_approval',
]
export const VERSION_STATUS = ['draft', 'published', 'archived']

export const OUTPUT_STATUS_LABEL = {
  verified: 'Verified',
  need_review: 'Need Review',
  not_verified: 'Not Verified',
  draft: 'Draft',
  blocked: 'Blocked',
  requires_approval: 'Requires Approval',
}

/* ─── Deployment surfaces ──────────────────────────────────────── */

export const DEPLOYMENT_SURFACES = [
  { id: 'workspace_assistant', label: 'Workspace assistant', desc: 'A copilot available across the workspace.' },
  { id: 'project_sidebar', label: 'Project sidebar', desc: 'In-context help on a project.' },
  { id: 'review_sidebar', label: 'Review / editor sidebar', desc: 'Beside the reviewer cockpit.' },
  { id: 'intake_workflow', label: 'Intake workflow', desc: 'Triages new work as it arrives.' },
  { id: 'job_detail', label: 'Job detail page', desc: 'On an individual job.' },
  { id: 'qa_panel', label: 'QA panel', desc: 'Inside the QA / validation surface.' },
  { id: 'support_copilot', label: 'Support / copilot panel', desc: 'Answers support questions.' },
  { id: 'internal_admin', label: 'Internal admin only', desc: 'Visible to admins only.' },
]

/* ─── Capabilities & tools ─────────────────────────────────────── */

export const CAPABILITY_CATALOG = [
  { id: 'answer', label: 'Answer questions' },
  { id: 'summarize', label: 'Summarize documents' },
  { id: 'draft', label: 'Draft responses' },
  { id: 'rewrite', label: 'Rewrite content' },
  { id: 'translate_draft', label: 'Translate draft text' },
  { id: 'review_quality', label: 'Review translation quality' },
  { id: 'check_terminology', label: 'Check terminology compliance' },
  { id: 'classify', label: 'Classify requests' },
  { id: 'recommend_routing', label: 'Recommend routing' },
  { id: 'extract_tasks', label: 'Extract tasks' },
  { id: 'generate_checklist', label: 'Generate checklists' },
  { id: 'compare_content', label: 'Compare source and target content' },
  { id: 'create_review_notes', label: 'Create review notes' },
  { id: 'suggest_actions', label: 'Suggest next actions' },
]

export const PERMISSION_LEVELS = [
  { id: 'read_only', label: 'Read-only' },
  { id: 'draft_only', label: 'Draft only' },
  { id: 'recommend_only', label: 'Recommend only' },
  { id: 'create_notes', label: 'Can create internal notes' },
  { id: 'create_tasks', label: 'Can create tasks' },
  { id: 'workflow_with_approval', label: 'Can trigger workflow action with human approval' },
]

// requiresApproval: risky actions gated on a human in V1.
export const TOOL_CATALOG = [
  { id: 'search_org_brain', label: 'Search Org Brain', permission: 'read_only', requiresApproval: false },
  { id: 'search_terminology', label: 'Search terminology', permission: 'read_only', requiresApproval: false },
  { id: 'search_tm', label: 'Search translation memory', permission: 'read_only', requiresApproval: false },
  { id: 'search_content_maps', label: 'Search Content Maps', permission: 'read_only', requiresApproval: false },
  { id: 'read_project_context', label: 'Read project context', permission: 'read_only', requiresApproval: false },
  { id: 'read_workflow_status', label: 'Read workflow / job status', permission: 'read_only', requiresApproval: false },
  { id: 'create_draft_note', label: 'Create draft note', permission: 'create_notes', requiresApproval: false },
  { id: 'create_suggested_response', label: 'Create suggested response', permission: 'draft_only', requiresApproval: false },
  { id: 'add_qa_issue', label: 'Add QA issue', permission: 'create_notes', requiresApproval: false },
  { id: 'add_reviewer_comment', label: 'Add reviewer comment', permission: 'create_notes', requiresApproval: false },
  { id: 'flag_need_review', label: 'Flag for Need Review', permission: 'recommend_only', requiresApproval: false },
  { id: 'recommend_approve', label: 'Recommend Approve', permission: 'recommend_only', requiresApproval: true },
  { id: 'recommend_not_verify', label: 'Recommend Not Verify', permission: 'recommend_only', requiresApproval: true },
  { id: 'route_to_reviewer', label: 'Route to human reviewer', permission: 'create_tasks', requiresApproval: false },
  { id: 'create_internal_task', label: 'Create internal task', permission: 'create_tasks', requiresApproval: false },
  { id: 'trigger_workflow_step', label: 'Trigger workflow step (approval required)', permission: 'workflow_with_approval', requiresApproval: true },
]

/* ─── Knowledge sources ────────────────────────────────────────── */

export const KNOWLEDGE_CATALOG = [
  { id: 'org_brain', name: 'Org Brain', desc: 'Governed customer memory: approved corrections + decisions.', records: 4120, citations: true },
  { id: 'terminology', name: 'Approved terminology', desc: 'Client-approved term base.', records: 1832, citations: true },
  { id: 'translation_memory', name: 'Translation memory', desc: 'Verified sentence pairs.', records: 58210, citations: true },
  { id: 'brand_rules', name: 'Brand rules', desc: 'Voice, tone, forbidden phrasings.', records: 96, citations: true },
  { id: 'style_guides', name: 'Style guides', desc: 'Per-locale writing standards.', records: 22, citations: true },
  { id: 'content_maps', name: 'Content Maps', desc: 'Structured content + relationships.', records: 340, citations: true },
  { id: 'reviewer_corrections', name: 'Reviewer corrections', desc: 'Human edits captured from review.', records: 2755, citations: true },
  { id: 'approved_policies', name: 'Approved policies', desc: 'Compliance docs + playbooks.', records: 148, citations: true },
  { id: 'uploaded_docs', name: 'Uploaded documents', desc: 'Admin-uploaded reference files.', records: 37, citations: true },
  { id: 'project_files', name: 'Project-specific files', desc: 'Files scoped to a project.', records: 210, citations: true },
  { id: 'workflow_history', name: 'Workflow history', desc: 'Past job + decision context.', records: 990, citations: false },
  { id: 'verified_answers', name: 'Previous verified answers', desc: 'Prior human-verified agent outputs.', records: 512, citations: true },
]

/* ─── Guardrails ───────────────────────────────────────────────── */

export const GUARDRAIL_CATALOG = [
  { id: 'require_citations', name: 'Require citations', desc: 'Every claim must cite a source.', severity: 'high', defaultOn: true, locked: false },
  { id: 'require_confidence', name: 'Require confidence score', desc: 'Attach a confidence to every answer.', severity: 'medium', defaultOn: true, locked: false },
  { id: 'approval_before_send', name: 'Human approval before external send/publish', desc: 'No outbound action without a human.', severity: 'high', defaultOn: true, locked: false },
  { id: 'block_unsupported', name: 'Block unsupported claims', desc: 'Refuse claims with no source.', severity: 'high', defaultOn: true, locked: false },
  { id: 'block_cross_workspace', name: 'Block cross-workspace data access', desc: 'Never read another customer’s data.', severity: 'high', defaultOn: true, locked: true },
  { id: 'block_unapproved_terminology', name: 'Block unapproved terminology', desc: 'Only use approved terms.', severity: 'medium', defaultOn: true, locked: false },
  { id: 'need_review_low_confidence', name: 'Need Review when confidence is low', desc: 'Escalate uncertain answers.', severity: 'medium', defaultOn: true, locked: false },
  { id: 'locale_checks', name: 'Source/target language checks', desc: 'Verify language pair (localization).', severity: 'medium', defaultOn: false, locked: false },
  { id: 'pii_handling', name: 'PII handling', desc: 'Detect + protect personal data.', severity: 'high', defaultOn: true, locked: false },
  { id: 'regulated_warning', name: 'Regulated content warning', desc: 'Flag regulated/legal content.', severity: 'medium', defaultOn: false, locked: false },
]

export const ESCALATION_RULES = [
  { id: 'low_confidence', label: 'Low confidence' },
  { id: 'no_source', label: 'No supporting source' },
  { id: 'conflicting_sources', label: 'Conflicting sources' },
  { id: 'missing_terminology', label: 'Missing terminology' },
  { id: 'compliance_issue', label: 'Potential compliance issue' },
  { id: 'restricted_action', label: 'User asks for a restricted action' },
  { id: 'out_of_scope', label: 'User asks outside assigned scope' },
  { id: 'sensitive_data', label: 'Agent detects sensitive data' },
  { id: 'policy_mismatch', label: 'Translation or policy mismatch' },
]

/* ─── Templates (the 6 starting agent types) ───────────────────── */

export const TEMPLATES = [
  {
    type: 'support', name: 'Support Agent', icon: 'life-buoy',
    tagline: 'Answers support questions from approved docs, past resolutions, and policies.',
    mission: 'Help operators resolve customer and internal support questions using only approved knowledge, and escalate anything uncertain.',
    allowed: ['Answer support questions', 'Summarize prior resolutions', 'Draft replies for human review'],
    disallowed: ['Send anything to a customer without approval', 'Invent policy or make commitments'],
    knowledge: ['org_brain', 'approved_policies', 'verified_answers', 'uploaded_docs'],
    capabilities: ['answer', 'summarize', 'draft', 'suggest_actions'],
    tools: ['search_org_brain', 'search_content_maps', 'create_suggested_response', 'flag_need_review', 'route_to_reviewer'],
  },
  {
    type: 'localization_reviewer', name: 'Localization Reviewer Agent', icon: 'languages',
    tagline: 'Checks translations against terminology, tone, brand rules, TM, and regional expectations.',
    mission: 'Assist reviewers in checking translations against approved terminology, translation memory, brand rules, and locale expectations.',
    allowed: ['Review translation quality', 'Check terminology compliance', 'Compare source and target', 'Create review notes'],
    disallowed: ['Approve or publish without a human', 'Override reviewer decisions'],
    knowledge: ['terminology', 'translation_memory', 'brand_rules', 'style_guides', 'reviewer_corrections'],
    capabilities: ['review_quality', 'check_terminology', 'compare_content', 'create_review_notes', 'suggest_actions'],
    tools: ['search_terminology', 'search_tm', 'add_qa_issue', 'add_reviewer_comment', 'flag_need_review', 'recommend_not_verify'],
  },
  {
    type: 'policy_assistant', name: 'Policy Assistant', icon: 'scale',
    tagline: 'Answers from approved policies, compliance docs, and internal playbooks.',
    mission: 'Answer questions strictly from approved customer policies and compliance documents, citing sources and flagging gaps.',
    allowed: ['Answer policy questions with citations', 'Summarize policies', 'Flag missing policy coverage'],
    disallowed: ['Invent policies', 'Give legal advice', 'Answer outside approved policy scope'],
    knowledge: ['approved_policies', 'org_brain', 'uploaded_docs'],
    capabilities: ['answer', 'summarize', 'suggest_actions'],
    tools: ['search_org_brain', 'create_draft_note', 'flag_need_review'],
  },
  {
    type: 'content_qa', name: 'Content QA Agent', icon: 'shield-check',
    tagline: 'Reviews content for brand, terminology, tone, compliance, and locale issues.',
    mission: 'Review content for brand consistency, terminology, tone, compliance and locale issues, and record QA findings for humans.',
    allowed: ['Review content', 'Check terminology + brand', 'Add QA issues', 'Suggest fixes'],
    disallowed: ['Publish content', 'Sign off without a human'],
    knowledge: ['brand_rules', 'terminology', 'style_guides', 'approved_policies', 'content_maps'],
    capabilities: ['review_quality', 'check_terminology', 'compare_content', 'create_review_notes'],
    tools: ['search_terminology', 'search_content_maps', 'add_qa_issue', 'flag_need_review'],
  },
  {
    type: 'intake_triage', name: 'Intake Triage Agent', icon: 'inbox',
    tagline: 'Classifies new work, detects language/type/priority, recommends workflow.',
    mission: 'Classify incoming work, detect language, content type and priority, recommend a workflow, and flag missing inputs.',
    allowed: ['Classify requests', 'Detect language + content type', 'Recommend routing', 'Flag missing inputs'],
    disallowed: ['Start work without routing', 'Assign to humans without approval'],
    knowledge: ['content_maps', 'workflow_history', 'org_brain'],
    capabilities: ['classify', 'recommend_routing', 'extract_tasks', 'generate_checklist'],
    tools: ['read_project_context', 'read_workflow_status', 'recommend_approve', 'route_to_reviewer', 'create_internal_task'],
  },
  {
    type: 'brand_voice', name: 'Brand Voice Agent', icon: 'sparkles',
    tagline: 'Rewrites or evaluates content against approved brand rules and style.',
    mission: 'Help users rewrite or evaluate content against approved brand rules and style guidance, always citing the rule applied.',
    allowed: ['Rewrite drafts to brand', 'Evaluate content against brand rules', 'Explain the rule applied'],
    disallowed: ['Change approved brand rules', 'Publish rewrites without a human'],
    knowledge: ['brand_rules', 'style_guides', 'org_brain', 'verified_answers'],
    capabilities: ['rewrite', 'review_quality', 'suggest_actions'],
    tools: ['search_org_brain', 'create_suggested_response', 'flag_need_review'],
  },
]

export function templateByType(type) {
  return TEMPLATES.find(t => t.type === type) || null
}

/* ─── Customers (multi-tenant flavour for the seed) ────────────── */

export const CUSTOMERS = {
  meridian: { id: 'meridian', name: 'Meridian Capital', kind: 'Regulated financial services' },
  helio: { id: 'helio', name: 'Helio Cloud', kind: 'Global SaaS' },
  lumen: { id: 'lumen', name: 'Lumen Brands', kind: 'Consumer-brand localization' },
  vitalink: { id: 'vitalink', name: 'VitaLink Medical', kind: 'Medical device' },
  cartway: { id: 'cartway', name: 'Cartway', kind: 'Ecommerce' },
}
// Single active workspace for the demo — everything is scoped to it.
export const ACTIVE_CUSTOMER = CUSTOMERS.meridian

/* ─── ID helper ────────────────────────────────────────────────── */

let _seq = 5000
export function nextId(prefix = 'AG') {
  _seq += 1
  return `${prefix}-${_seq}`
}

/* ─── System-prompt generator (per the spec template) ──────────── */

export function generateSystemPrompt(version, customerName = ACTIVE_CUSTOMER.name) {
  const kn = (version.knowledgeScope || [])
    .map(id => KNOWLEDGE_CATALOG.find(k => k.id === id)?.name || id)
  const tools = (version.tools || [])
    .map(id => TOOL_CATALOG.find(t => t.id === id)?.label || id)
  const esc = (version.guardrails?.escalationRules || [])
    .map(id => ESCALATION_RULES.find(e => e.id === id)?.label || id)
  return `You are ${version.name || 'this agent'}, a governed AI agent inside arbitr for ${customerName}.

Mission:
${version.mission || '—'}

You help with:
${(version.allowedTasks || []).map(t => `- ${t}`).join('\n') || '- (not specified)'}

You must not:
${(version.disallowedTasks || []).map(t => `- ${t}`).join('\n') || '- (not specified)'}

Knowledge:
Use only the knowledge sources granted to you:
${kn.map(n => `- ${n}`).join('\n') || '- (none granted)'}

Trust rules:
- Prefer approved Org Brain knowledge over unverified context.
- Cite sources whenever possible.
- If you cannot find enough support, say the item needs review.
- Do not invent policies, terminology, translations, or customer commitments.
- Do not use information from another customer, workspace, project, or locale.
- Follow approved terminology, translation memory, brand rules, and style guidance.
- When sources conflict, explain the conflict and mark the answer Need Review.
- For external send, publish, approve, or workflow-changing actions, request human approval unless explicitly permitted.

Output style:
${version.responseStyle || 'Clear, concise, professional.'}

Available tools:
${tools.map(n => `- ${n}`).join('\n') || '- (none granted)'}

Escalation:
Mark the output as Need Review when:
${esc.map(n => `- ${n}`).join('\n') || '- (default rules)'}

Return:
- Answer or draft
- Sources
- Confidence
- Suggested status
- Any warnings or next actions`
}

/* ─── Version + Agent factories ────────────────────────────────── */

function defaultGuardrails() {
  const enabled = {}
  for (const g of GUARDRAIL_CATALOG) enabled[g.id] = g.defaultOn || g.locked
  return {
    enabled,
    escalationRules: ['low_confidence', 'no_source', 'conflicting_sources'],
    maxAnswerLength: 1200,
    creditBudgetPerDay: 500,
    rateLimitPerMin: 30,
  }
}

export function createVersion(overrides = {}, { versionNumber = 1, status = 'draft', createdBy = 'You' } = {}) {
  return {
    id: nextId('AV'),
    versionNumber,
    status,
    name: overrides.name || 'Untitled agent',
    mission: overrides.mission || '',
    allowedTasks: overrides.allowedTasks || [],
    disallowedTasks: overrides.disallowedTasks || [],
    responseStyle: overrides.responseStyle || 'Clear, concise, professional.',
    outputFormat: overrides.outputFormat || 'Answer + sources + confidence',
    systemInstructions: overrides.systemInstructions || '',
    knowledgeScope: overrides.knowledgeScope || [],
    capabilities: overrides.capabilities || [],
    tools: overrides.tools || [],
    guardrails: overrides.guardrails || defaultGuardrails(),
    deploymentSettings: overrides.deploymentSettings || { surfaces: [], proactive: false, requireVerify: true },
    modelConfig: overrides.modelConfig || { model: 'arbitr-reason-1', temperature: 0.2 },
    creditPolicy: overrides.creditPolicy || { perDay: 500, perMonth: 12000 },
    createdBy,
    createdAt: new Date().toISOString(),
    publishedBy: status === 'published' ? createdBy : null,
    publishedAt: status === 'published' ? new Date().toISOString() : null,
    changeSummary: overrides.changeSummary || 'Initial draft',
  }
}

export function createAgentFromTemplate(tpl, { owner = 'You', customer = ACTIVE_CUSTOMER } = {}) {
  const version = createVersion({
    name: tpl.name,
    mission: tpl.mission,
    allowedTasks: tpl.allowed,
    disallowedTasks: tpl.disallowed,
    knowledgeScope: tpl.knowledge,
    capabilities: tpl.capabilities,
    tools: tpl.tools,
  }, { versionNumber: 1, status: 'draft', createdBy: owner })
  return {
    id: nextId('AG'),
    orgId: customer.id,
    customerName: customer.name,
    name: tpl.name,
    type: tpl.type,
    icon: tpl.icon,
    description: tpl.tagline,
    status: 'draft',
    owner,
    defaultLanguage: 'en',
    supportedLanguages: ['en'],
    qualityScore: null,
    openIssues: 0,
    creditsUsed: 0,
    lastRunAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    publishedVersionId: null,
    draftVersionId: version.id,
    versions: [version],
  }
}

/* ─── Seed data ────────────────────────────────────────────────── */

function seedAgent(id, type, customer, over = {}) {
  const tpl = templateByType(type)
  const publishedV = createVersion({
    name: over.name || tpl.name,
    mission: tpl.mission,
    allowedTasks: tpl.allowed,
    disallowedTasks: tpl.disallowed,
    knowledgeScope: tpl.knowledge,
    capabilities: tpl.capabilities,
    tools: tpl.tools,
    changeSummary: 'Published',
  }, { versionNumber: over.versionNumber || 2, status: 'published', createdBy: over.owner || 'Alex Chen' })
  const prevV = createVersion({
    name: over.name || tpl.name, mission: tpl.mission, knowledgeScope: tpl.knowledge,
    capabilities: tpl.capabilities, tools: tpl.tools, changeSummary: 'Initial release',
  }, { versionNumber: 1, status: 'archived', createdBy: over.owner || 'Alex Chen' })
  return {
    id, orgId: customer.id, customerName: customer.name,
    name: over.name || tpl.name, type, icon: tpl.icon,
    description: over.description || tpl.tagline,
    status: over.status || 'active',
    owner: over.owner || 'Alex Chen',
    defaultLanguage: over.defaultLanguage || 'en',
    supportedLanguages: over.supportedLanguages || ['en', 'ja'],
    qualityScore: over.qualityScore ?? 92,
    openIssues: over.openIssues ?? 0,
    creditsUsed: over.creditsUsed ?? 1840,
    lastRunAt: over.lastRunAt || '2026-07-01T14:20:00Z',
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: over.updatedAt || '2026-06-28T11:00:00Z',
    publishedVersionId: publishedV.id,
    draftVersionId: null,
    versions: [prevV, publishedV],
    _deployedSurfaces: over.surfaces || ['workspace_assistant'],
  }
}

export const AGENTS = [
  seedAgent('AG-1001', 'localization_reviewer', CUSTOMERS.meridian, {
    name: 'Meridian JA Reviewer', description: 'Checks EN→JA IR translations against J-GAAP terminology, TM, and disclosure tone.',
    status: 'active', qualityScore: 94, creditsUsed: 5210, openIssues: 2, surfaces: ['review_sidebar', 'qa_panel'],
    supportedLanguages: ['en', 'ja'], lastRunAt: '2026-07-02T06:40:00Z',
  }),
  seedAgent('AG-1002', 'policy_assistant', CUSTOMERS.meridian, {
    name: 'Disclosure Policy Assistant', description: 'Answers from Meridian’s approved disclosure + compliance policies with citations.',
    status: 'active', qualityScore: 91, creditsUsed: 2980, surfaces: ['workspace_assistant'],
  }),
  seedAgent('AG-1003', 'support', CUSTOMERS.helio, {
    name: 'Helio Support Copilot', description: 'Drafts support replies from approved docs and past resolutions.',
    status: 'active', qualityScore: 89, creditsUsed: 7420, openIssues: 1, surfaces: ['support_copilot'],
    supportedLanguages: ['en', 'de', 'fr'],
  }),
  seedAgent('AG-1004', 'content_qa', CUSTOMERS.lumen, {
    name: 'Lumen Brand QA', description: 'Reviews campaign content for brand, terminology, tone, and locale issues.',
    status: 'paused', qualityScore: 87, creditsUsed: 3110, openIssues: 4, surfaces: ['qa_panel', 'project_sidebar'],
    supportedLanguages: ['en', 'fr', 'es', 'de'],
  }),
  seedAgent('AG-1005', 'intake_triage', CUSTOMERS.vitalink, {
    name: 'VitaLink Intake Triage', description: 'Classifies incoming regulated content, detects language/type/priority, recommends workflow.',
    status: 'active', qualityScore: 90, creditsUsed: 1620, surfaces: ['intake_workflow'],
    supportedLanguages: ['en', 'de', 'ja'],
  }),
  seedAgent('AG-1006', 'brand_voice', CUSTOMERS.cartway, {
    name: 'Cartway Brand Voice', description: 'Rewrites product copy to Cartway brand rules and explains the rule applied.',
    status: 'draft', qualityScore: null, creditsUsed: 0, surfaces: [],
    supportedLanguages: ['en'], updatedAt: '2026-07-01T16:00:00Z',
  }),
]

/* ─── Runs / feedback / test cases ─────────────────────────────── */

const RUN_SEED_STATUSES = ['verified', 'verified', 'need_review', 'verified', 'not_verified', 'need_review', 'verified', 'requires_approval']

export const RUNS = Array.from({ length: 16 }, (_, i) => {
  const agent = AGENTS[i % AGENTS.length]
  const status = RUN_SEED_STATUSES[i % RUN_SEED_STATUSES.length]
  const conf = status === 'verified' ? 88 + (i % 10) : status === 'need_review' ? 55 + (i % 15) : status === 'not_verified' ? 40 + (i % 10) : 72
  return {
    id: nextId('RUN'),
    orgId: agent.orgId,
    agentId: agent.id,
    agentName: agent.name,
    versionNumber: 2,
    userId: ['Sarah Kim', 'Yuki Tanaka', 'Marcus Lee', 'Alex Chen'][i % 4],
    deploymentSurface: agent._deployedSurfaces?.[0] || 'workspace_assistant',
    input: [
      'Is “のれん” the approved term for goodwill in this filing?',
      'Draft a reply to a customer asking about data residency.',
      'Does this paragraph meet our disclosure tone rules?',
      'Classify this incoming request and recommend a workflow.',
      'Rewrite this product description to brand voice.',
    ][i % 5],
    outputStatus: status,
    confidence: Math.min(99, conf),
    creditsUsed: 3 + (i % 7),
    latencyMs: 900 + (i * 137) % 2600,
    feedbackRating: i % 3 === 0 ? 'up' : i % 5 === 0 ? 'down' : null,
    createdAt: `2026-07-0${(i % 2) + 1}T${String(8 + (i % 10)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}:00Z`,
  }
})

/* ─── Store: mutable module state + re-render hook ─────────────── */

let _tick = 0
const _subs = new Set()
function bumpStore() {
  _tick += 1
  _subs.forEach(fn => fn(_tick))
}

/** Subscribe a component to store mutations. Returns a stable `refresh`. */
export function useAgentStore() {
  const [, setT] = useState(0)
  const refresh = useCallback(() => setT(t => t + 1), [])
  // register once
  useState(() => { _subs.add(refresh); return 0 })
  return { agents: AGENTS, runs: RUNS, refresh, bump: bumpStore }
}

export function getAgentById(id) { return AGENTS.find(a => a.id === id) || null }
export function getRunById(id) { return RUNS.find(r => r.id === id) || null }
export function runsForAgent(id) { return RUNS.filter(r => r.agentId === id) }
export function activeVersion(agent) {
  if (!agent) return null
  return agent.versions.find(v => v.id === (agent.draftVersionId || agent.publishedVersionId))
    || agent.versions[agent.versions.length - 1]
}

/* ─── Mutations (in-memory; API-swap later) ────────────────────── */

export function addAgent(agent) { AGENTS.unshift(agent); bumpStore(); return agent }

export function publishAgent(id) {
  const a = getAgentById(id); if (!a) return
  const draft = a.versions.find(v => v.id === a.draftVersionId)
  if (draft) {
    draft.status = 'published'
    draft.publishedAt = new Date().toISOString()
    draft.publishedBy = 'You'
    if (a.publishedVersionId) {
      const prev = a.versions.find(v => v.id === a.publishedVersionId)
      if (prev) prev.status = 'archived'
    }
    a.publishedVersionId = draft.id
    a.draftVersionId = null
  }
  a.status = 'active'
  a.qualityScore = a.qualityScore ?? 90
  a.updatedAt = new Date().toISOString()
  bumpStore()
}

export function setAgentStatus(id, status) {
  const a = getAgentById(id); if (!a) return
  a.status = status; a.updatedAt = new Date().toISOString(); bumpStore()
}

/** Editing a published agent never mutates the live version — spawn a draft. */
export function ensureDraftVersion(id) {
  const a = getAgentById(id); if (!a) return null
  if (a.draftVersionId) return a.versions.find(v => v.id === a.draftVersionId)
  const base = a.versions.find(v => v.id === a.publishedVersionId) || a.versions[a.versions.length - 1]
  const draft = createVersion(
    { ...base, changeSummary: 'Draft — editing published version' },
    { versionNumber: Math.max(...a.versions.map(v => v.versionNumber)) + 1, status: 'draft', createdBy: 'You' },
  )
  a.versions.push(draft)
  a.draftVersionId = draft.id
  a.updatedAt = new Date().toISOString()
  bumpStore()
  return draft
}

export function duplicateAgent(id) {
  const a = getAgentById(id); if (!a) return null
  const copy = JSON.parse(JSON.stringify(a))
  copy.id = nextId('AG')
  copy.name = `${a.name} (copy)`
  copy.status = 'draft'
  copy.publishedVersionId = null
  const v = copy.versions[copy.versions.length - 1]
  v.id = nextId('AV'); v.status = 'draft'; v.versionNumber = 1
  copy.versions = [v]
  copy.draftVersionId = v.id
  copy.creditsUsed = 0; copy.qualityScore = null; copy.lastRunAt = null
  copy.createdAt = copy.updatedAt = new Date().toISOString()
  AGENTS.unshift(copy); bumpStore(); return copy
}

export function rollbackToVersion(agentId, versionId) {
  const a = getAgentById(agentId); if (!a) return
  const target = a.versions.find(v => v.id === versionId); if (!target) return
  const clone = createVersion(
    { ...target, changeSummary: `Rollback to v${target.versionNumber}` },
    { versionNumber: Math.max(...a.versions.map(v => v.versionNumber)) + 1, status: 'published', createdBy: 'You' },
  )
  if (a.publishedVersionId) {
    const prev = a.versions.find(v => v.id === a.publishedVersionId)
    if (prev) prev.status = 'archived'
  }
  a.versions.push(clone)
  a.publishedVersionId = clone.id
  a.draftVersionId = null
  a.updatedAt = new Date().toISOString()
  bumpStore()
}

/* ─── Simulation (deterministic, no real LLM) ──────────────────── */

// Sample tasks per agent type, so the playground offers something realistic.
export const SAMPLE_TASKS = {
  support: 'A customer asks: “Where is my data stored and is it encrypted?”',
  localization_reviewer: 'Check this EN→JA segment: “Goodwill impairment of ¥42M was recorded.” → 「のれん減損42百万円を計上しました。」',
  policy_assistant: 'What is our approved retention period for disclosure working papers?',
  content_qa: 'Review this campaign line for brand + terminology: “Our best-in-class synergy unlocks value.”',
  intake_triage: 'New request: a 12-page PDF, mixed EN/JA, marked urgent, no glossary attached.',
  brand_voice: 'Rewrite to brand voice: “Buy now, it’s super cheap and awesome!!!”',
}

function hashStr(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff
  return Math.abs(h)
}

/**
 * Deterministically simulate a run for a version + input. Confidence and status
 * are driven by how much approved knowledge + guardrails back the answer, so the
 * trust-first UI behaves sensibly (no knowledge → Need Review).
 */
export function simulateAgentRun(version, input) {
  const kn = version?.knowledgeScope || []
  const tools = version?.tools || []
  const seed = hashStr((input || '') + (version?.id || ''))
  const jitter = seed % 12
  const base = 52 + kn.length * 5 + (version?.capabilities?.length || 0) * 2
  let confidence = Math.max(30, Math.min(97, base + jitter))

  const sourcesUsed = kn.slice(0, Math.min(kn.length, 2 + (seed % 3))).map(id => {
    const k = KNOWLEDGE_CATALOG.find(x => x.id === id)
    return { id, name: k?.name || id, cites: k?.citations !== false, snippet: `Matched approved entry in ${k?.name || id}.` }
  })
  const termMatches = kn.includes('terminology') ? 1 + (seed % 3) : 0
  const tmMatches = kn.includes('translation_memory') ? seed % 4 : 0
  const orgBrainHits = kn.includes('org_brain') ? 1 + (seed % 2) : 0

  const toolCalls = tools.slice(0, Math.min(tools.length, 3)).map(id => {
    const t = TOOL_CATALOG.find(x => x.id === id)
    return { id, label: t?.label || id, requiresApproval: !!t?.requiresApproval, status: t?.requiresApproval ? 'awaiting_approval' : 'ok' }
  })

  // Guardrail checks
  const g = version?.guardrails?.enabled || {}
  const noCitableSource = sourcesUsed.length === 0
  const guardrailResults = [
    { id: 'require_citations', label: 'Citations present', pass: !noCitableSource || !(g.require_citations ?? true) },
    { id: 'block_unsupported', label: 'No unsupported claims', pass: !noCitableSource },
    { id: 'block_cross_workspace', label: 'No cross-workspace access', pass: true },
    { id: 'block_unapproved_terminology', label: 'Approved terminology only', pass: !(kn.includes('terminology') && (seed % 7 === 0)) },
    { id: 'need_review_low_confidence', label: 'Confidence above threshold', pass: confidence >= 70 },
  ]
  const failed = guardrailResults.filter(r => !r.pass)
  const needsApproval = toolCalls.some(t => t.requiresApproval)

  const qaIssues = []
  if (noCitableSource) qaIssues.push({ severity: 'major', text: 'No approved source supports this answer.' })
  if (termMatches === 0 && (version?.capabilities || []).includes('check_terminology')) qaIssues.push({ severity: 'minor', text: 'No terminology match found for key terms.' })
  if (kn.includes('translation_memory') && tmMatches === 0) qaIssues.push({ severity: 'minor', text: 'No translation-memory match; consider human review.' })

  // Suggested status
  let status
  if (noCitableSource || confidence < 60 || failed.some(f => f.id === 'block_unsupported')) status = 'not_verified'
  else if (needsApproval) status = 'requires_approval'
  else if (confidence < 78 || failed.length > 0 || qaIssues.length > 0) status = 'need_review'
  else status = 'verified'
  if (noCitableSource) confidence = Math.min(confidence, 58)

  const creditEstimate = 2 + kn.length + toolCalls.length
  const trace = [
    { step: 'Retrieve knowledge', detail: `${sourcesUsed.length} approved source(s), ${orgBrainHits} Org Brain hit(s)` },
    ...(termMatches ? [{ step: 'Terminology lookup', detail: `${termMatches} approved term match(es)` }] : []),
    ...(tmMatches ? [{ step: 'Translation memory', detail: `${tmMatches} TM match(es)` }] : []),
    ...toolCalls.map(t => ({ step: `Tool: ${t.label}`, detail: t.requiresApproval ? 'awaiting human approval' : 'completed' })),
    { step: 'Compose answer', detail: 'Drafted with citations + confidence' },
    { step: 'Guardrail check', detail: failed.length ? `${failed.length} failed → escalate` : 'all passed' },
  ]

  return {
    input,
    output: composeAnswer(version, status, sourcesUsed),
    confidence,
    outputStatus: status,
    sourcesUsed,
    orgBrainHits, termMatches, tmMatches,
    toolCalls,
    guardrailResults,
    qaIssues,
    creditEstimate,
    trace,
    reasoningSummary: buildReasoningSummary(status, sourcesUsed.length, confidence),
  }
}

function composeAnswer(version, status, sources) {
  if (status === 'not_verified') return 'I don’t have enough approved knowledge to answer this confidently. I’ve flagged it as Not Verified and recommend a human reviewer.'
  const cite = sources.length ? ` (based on ${sources.map(s => s.name).join(', ')})` : ''
  if (status === 'need_review') return `Here is a draft answer${cite}. Some support is thin, so I’ve marked it Need Review for a human to confirm.`
  if (status === 'requires_approval') return `I’ve prepared the response and the requested action${cite}, but the action needs human approval before it runs.`
  return `Here is the answer${cite}. It aligns with approved terminology and brand rules, with sources cited below.`
}

function buildReasoningSummary(status, nSources, conf) {
  return [
    `Assessed the request against ${nSources} approved source(s).`,
    conf >= 78 ? 'Found sufficient supporting evidence.' : 'Support was limited relative to the confidence threshold.',
    status === 'verified' ? 'All guardrails passed → suggested Verified.'
      : status === 'requires_approval' ? 'A requested action requires human approval.'
        : status === 'not_verified' ? 'Insufficient support → suggested Not Verified.'
          : 'Escalated to Need Review for human confirmation.',
  ]
}

/** Enrich a seeded run row into a full trace by re-simulating deterministically. */
export function buildRunDetail(run) {
  const agent = getAgentById(run.agentId)
  const version = agent ? activeVersion(agent) : null
  const sim = simulateAgentRun(version || { id: run.id }, run.input)
  return { ...sim, ...run, agent, version, output: sim.output }
}
