/**
 * SwiftBridge AI V2 (Japan) — domain model.
 *
 * SwiftBridge is the Japan customer-facing brand; arbitr (アビタAI)
 * is the orchestration platform underneath. This module is the pure,
 * tested core for the SwiftBridge experience: SLA targets, document /
 * service taxonomies, workflow templates with explicit human-review
 * gates, a step state machine with retry/override rules, glossary
 * compliance, AI-dubbing stages, QA results, and realistic demo seed
 * data for the sales story.
 *
 * Automated steps are powered by real arbitr marketplace agents —
 * ids mirror src/components/IntelligenceMarketplace/data/
 * marketplaceAgents.js (no import, to keep this module pure).
 */

/* ── SLA targets (the relaunch headline numbers) ─────────────── */

export const SLA_BY_DOC_TYPE = {
  'timely-disclosure': { hours: 24,  label: '24-hour delivery',  labelJa: '24時間以内' },
  'quarterly-report':  { hours: 24,  label: '24-hour delivery',  labelJa: '24時間以内' },
  'powerpoint':        { hours: 72,  label: '72-hour delivery',  labelJa: '72時間以内' },
  'annual-securities': { hours: 240, label: '10-day delivery',   labelJa: '10営業日以内' },
  'media-dubbing':     { hours: 120, label: '5-day delivery',    labelJa: '5営業日以内' },
}

export const DOC_TYPES = [
  { id: 'timely-disclosure', label: 'Timely disclosure',        labelJa: '適時開示' },
  { id: 'quarterly-report',  label: 'Quarterly report',         labelJa: '四半期報告書' },
  { id: 'powerpoint',        label: 'PowerPoint deck',          labelJa: '決算説明資料' },
  { id: 'annual-securities', label: 'Annual securities report', labelJa: '有価証券報告書' },
  { id: 'media-dubbing',     label: 'Video / audio (dubbing)',  labelJa: '動画・音声（吹替）' },
]

export const SERVICE_TYPES = [
  { id: 'translation', label: 'AI Translation',        labelJa: 'AI翻訳' },
  { id: 'dtp',         label: 'DTP / layout',          labelJa: 'DTP・レイアウト' },
  { id: 'qa',          label: 'QA & validation',       labelJa: 'QA・検証' },
  { id: 'dubbing',     label: 'AI Dubbing',            labelJa: 'AI吹替' },
  { id: 'glossary',    label: 'Glossary / custom agent', labelJa: '用語集・カスタムエージェント' },
]

export function slaFor(docType) {
  return SLA_BY_DOC_TYPE[docType] || SLA_BY_DOC_TYPE['quarterly-report']
}

/** Countdown / outcome for a project: { dueAt, remainingHours, breached, met } */
export function slaCountdown(project, now = Date.now()) {
  const created = new Date(project.createdAt).getTime()
  const dueAt = created + project.slaHours * 3600_000
  if (project.deliveredAt) {
    const delivered = new Date(project.deliveredAt).getTime()
    return { dueAt, remainingHours: 0, breached: delivered > dueAt, met: delivered <= dueAt, delivered: true }
  }
  const remainingMs = dueAt - now
  return {
    dueAt,
    remainingHours: Math.max(0, Math.round(remainingMs / 3600_000)),
    breached: remainingMs < 0,
    met: null,
    delivered: false,
  }
}

/* ── arbitr agents powering automated steps ──────────────────── */

export const STEP_AGENTS = {
  classification: { id: 'RISK-SENTINEL-2',  name: 'Quality Risk Agent' },
  glossary:       { id: 'TERM-GUARDIAN-1',  name: 'Terminology Guardian' },
  translation:    { id: 'JP-FIN-3',         name: 'J-GAAP Specialist' },
  dubbing:        { id: 'SUBTITLE-AV-1',    name: 'Subtitle & Media Localizer' },
  qa:             { id: 'LQA-AUDIT-1',      name: 'Localization QA Auditor' },
}

/* ── Workflow templates ──────────────────────────────────────── */

export const STEP_STATUSES = ['pending', 'in_progress', 'completed', 'blocked', 'needs_review']

let _stepSeq = 0
const step = (id, name, nameJa, kind, agentKey = null, extra = {}) => ({
  id: `${id}-${++_stepSeq}`,
  key: id, name, nameJa, kind, // 'agent' | 'human_review' | 'customer_action'
  agentId: agentKey ? STEP_AGENTS[agentKey].id : null,
  agentName: agentKey ? STEP_AGENTS[agentKey].name : null,
  status: 'pending',
  owner: kind === 'agent' ? 'arbitr · アビタAI' : kind === 'human_review' ? 'SwiftBridge review team' : 'Customer',
  retryCount: 0,
  startedAt: null, completedAt: null, notes: null, overridden: false,
  ...extra,
})

/**
 * buildWorkflow(docType, services) — the canonical chain. Every
 * workflow includes at least one human_review gate and exactly one
 * customer_action gate; they cannot be configured away.
 */
export function buildWorkflow(docType, services = []) {
  const isDubbing = services.includes('dubbing') || docType === 'media-dubbing'
  const needsDtp = ['powerpoint', 'annual-securities'].includes(docType) || services.includes('dtp')
  const steps = [
    step('intake', 'File intake', 'ファイル受領', 'agent'),
    step('classification', 'Document classification', '文書分類', 'agent', 'classification'),
    step('glossary-match', 'Terminology / glossary matching', '用語集マッチング', 'agent', 'glossary'),
    isDubbing
      ? step('dubbing-prep', 'AI dubbing preparation', 'AI吹替準備', 'agent', 'dubbing')
      : step('translation', 'AI translation', 'AI翻訳', 'agent', 'translation'),
    step('qa', 'QA agent checks', 'QAエージェント検査', 'agent', 'qa'),
    ...(needsDtp ? [step('dtp', 'DTP / layout processing', 'DTP・レイアウト', 'agent', null, { owner: 'arbitr DTP pipeline' })] : []),
    step('human-review', 'Human review', '人によるレビュー', 'human_review'),
    step('final-validation', 'Final validation', '最終検証', 'agent', 'classification'),
    step('customer-approval', 'Customer approval', 'お客様による承認', 'customer_action'),
    step('delivery', 'Delivery', '納品', 'agent'),
  ]
  return steps
}

/* ── Step state machine ──────────────────────────────────────── */

/** retryStep — only blocked steps can be retried. */
export function retryStep(steps, stepId) {
  const s = steps.find(x => x.id === stepId)
  if (!s) throw new Error(`Unknown step ${stepId}`)
  if (s.status !== 'blocked') throw new Error('Only blocked steps can be retried.')
  return steps.map(x => x.id === stepId
    ? { ...x, status: 'in_progress', retryCount: x.retryCount + 1, notes: `Retry #${x.retryCount + 1} started` }
    : x)
}

/** overrideStep — internal-ops manual override; a note is mandatory
 *  and the override is flagged for the audit trail. Completed steps
 *  are immutable. */
export function overrideStep(steps, stepId, { note, actor }) {
  if (!note || !note.trim()) throw new Error('An override note is required.')
  const s = steps.find(x => x.id === stepId)
  if (!s) throw new Error(`Unknown step ${stepId}`)
  if (s.status === 'completed') throw new Error('Completed steps cannot be overridden.')
  return steps.map(x => x.id === stepId
    ? { ...x, status: 'completed', overridden: true, notes: `Manual override by ${actor || 'ops'}: ${note}`, completedAt: new Date().toISOString() }
    : x)
}

/** advanceStep — guarded forward transition (completed is terminal). */
export function advanceStep(steps, stepId, status) {
  if (!STEP_STATUSES.includes(status)) throw new Error(`Invalid status ${status}`)
  const s = steps.find(x => x.id === stepId)
  if (!s) throw new Error(`Unknown step ${stepId}`)
  if (s.status === 'completed') throw new Error('Completed steps are immutable.')
  return steps.map(x => x.id === stepId
    ? { ...x, status, ...(status === 'in_progress' && !x.startedAt ? { startedAt: new Date().toISOString() } : {}), ...(status === 'completed' ? { completedAt: new Date().toISOString() } : {}) }
    : x)
}

/* ── Glossary & compliance ───────────────────────────────────── */

/**
 * checkGlossaryCompliance(text, terms) — per-term verdicts for an EN
 * output. Pending terms are excluded until approved.
 *   pass        — approved EN rendering present
 *   missing     — JA term appears but the approved EN rendering does not
 *   violation   — a forbidden rendering appears
 *   not-present — term concept absent from the text
 */
export function checkGlossaryCompliance(text = '', terms = []) {
  return terms
    .filter(t => t.status === 'approved' || t.status === 'forbidden')
    .map(t => {
      if (t.status === 'forbidden') {
        return { term: t, verdict: text.includes(t.en) ? 'violation' : 'pass' }
      }
      if (text.includes(t.en)) return { term: t, verdict: 'pass' }
      if (t.ja && text.includes(t.ja)) return { term: t, verdict: 'missing' }
      return { term: t, verdict: 'not-present' }
    })
}

/* ── AI Dubbing ──────────────────────────────────────────────── */

export const DUBBING_STAGES = [
  { id: 'upload',          label: 'Upload',           labelJa: 'アップロード',   kind: 'agent' },
  { id: 'transcript',      label: 'Transcript',       labelJa: '文字起こし',     kind: 'agent' },
  { id: 'script_review',   label: 'Script review',    labelJa: '原稿レビュー',   kind: 'human_review' },
  { id: 'voice_selection', label: 'Voice & tone',     labelJa: '音声・トーン選択', kind: 'customer_action' },
  { id: 'preview',         label: 'Preview',          labelJa: 'プレビュー',     kind: 'agent' },
  { id: 'approval',        label: 'Approval',         labelJa: '承認',          kind: 'human_review' },
  { id: 'export',          label: 'Export',           labelJa: '書き出し',       kind: 'agent' },
]

export const VOICE_OPTIONS = [
  { id: 'v-aoi',   name: 'Aoi',   lang: 'EN', tone: 'Formal IR',  desc: 'Measured, investor-call register' },
  { id: 'v-kenji', name: 'Kenji', lang: 'EN', tone: 'Neutral',    desc: 'Clear corporate narration' },
  { id: 'v-mika',  name: 'Mika',  lang: 'EN', tone: 'Warm',       desc: 'Approachable, brand-film friendly' },
]

/* ── QA results ──────────────────────────────────────────────── */

export function summarizeQa(results = []) {
  const by = (k, v) => results.filter(r => r[k] === v).length
  return {
    total: results.length,
    critical: by('severity', 'critical'),
    major: by('severity', 'major'),
    minor: by('severity', 'minor'),
    open: by('resolution', 'open'),
  }
}

/* ── Demo seed ───────────────────────────────────────────────── */

const H = 3600_000
const iso = (ms) => new Date(ms).toISOString()

function seededProject({ id, name, nameJa, docType, services, langPair, ageHours, deliveredAfterHours = null, completeThrough = 0, blockedKey = null, files }, now) {
  const sla = slaFor(docType)
  const createdAt = iso(now - ageHours * H)
  let steps = buildWorkflow(docType, services)
  steps = steps.map((s, i) => {
    if (deliveredAfterHours != null) {
      return { ...s, status: 'completed', startedAt: createdAt, completedAt: iso(now - ageHours * H + (i + 1) * H) }
    }
    if (blockedKey && s.key === blockedKey) {
      return { ...s, status: 'blocked', retryCount: 1, notes: 'Layout engine error: embedded font missing. Retry or escalate to ops override.' }
    }
    if (i < completeThrough) return { ...s, status: 'completed', startedAt: createdAt, completedAt: iso(now - (ageHours - i - 1) * H) }
    if (i === completeThrough && !blockedKey) return { ...s, status: 'in_progress', startedAt: iso(now - 1 * H) }
    return s
  })
  const deliveredAt = deliveredAfterHours != null ? iso(now - ageHours * H + deliveredAfterHours * H) : null
  return {
    id, name, nameJa, docType, services, langPair,
    slaHours: sla.hours, slaLabel: sla.label, slaLabelJa: sla.labelJa,
    createdAt, deliveredAt,
    status: deliveredAt ? 'delivered' : blockedKey ? 'blocked' : 'in_progress',
    steps, files,
  }
}

export function getSwiftBridgeDemo(now = Date.now()) {
  const projects = [
    seededProject({
      id: 'SB-2026-041', name: '1Q FY2026 Timely Disclosure', nameJa: '2026年度第1四半期 適時開示',
      docType: 'timely-disclosure', services: ['translation', 'qa'], langPair: 'JA → EN',
      ageHours: 10, completeThrough: 4,
      files: [{ name: '1Q_tanshin_2026.pdf', size: '1.2 MB' }],
    }, now),
    seededProject({
      id: 'SB-2026-038', name: 'Q4 FY2025 Quarterly Report', nameJa: '2025年度第4四半期 四半期報告書',
      docType: 'quarterly-report', services: ['translation', 'qa'], langPair: 'JA → EN',
      ageHours: 72, deliveredAfterHours: 20,
      files: [{ name: 'Q4_shihanki_2025.pdf', size: '2.8 MB' }],
    }, now),
    seededProject({
      id: 'SB-2026-040', name: 'FY2026 Earnings Deck', nameJa: '2026年度 決算説明資料',
      docType: 'powerpoint', services: ['translation', 'dtp', 'qa'], langPair: 'JA → EN',
      ageHours: 30, completeThrough: 5, blockedKey: 'dtp',
      files: [{ name: 'kessan_setsumei_FY2026.pptx', size: '18.4 MB' }],
    }, now),
    seededProject({
      id: 'SB-2026-042', name: 'FY2025 Annual Securities Report', nameJa: '2025年度 有価証券報告書',
      docType: 'annual-securities', services: ['translation', 'dtp', 'qa', 'glossary'], langPair: 'JA → EN',
      ageHours: 18, completeThrough: 1,
      files: [{ name: 'yukashoken_FY2025.pdf', size: '6.1 MB' }],
    }, now),
  ]

  const dubbingJob = {
    id: 'DUB-2026-007', name: 'CEO Message — Q1 Investor Video', nameJa: 'CEOメッセージ（第1四半期 投資家向け動画）',
    sourceLang: 'JA', targetLang: 'EN', durationSec: 184, stage: 'script_review',
    transcript: [
      { t: '00:00', ja: '株主・投資家の皆様、平素より格別のご支援を賜り、誠にありがとうございます。', en: 'To our shareholders and investors — thank you for your continued support.' },
      { t: '00:18', ja: '第1四半期の純収益は、前年同期比12.4%増となりました。', en: 'Net revenue for the first quarter increased 12.4% year-over-year.' },
      { t: '00:41', ja: '通期の業績予想は据え置きとし、引き続き規律ある成長を目指します。', en: 'We are maintaining our full-year guidance and remain committed to disciplined growth.' },
    ],
    voiceId: null,
  }

  const glossary = {
    id: 'gl-meridian-v3', name: 'Meridian IR Glossary', version: 'v3', clientSpecific: true,
    terms: [
      { id: 'g1',  ja: 'のれん', en: 'Goodwill', status: 'approved', note: 'Never グッドウィル' },
      { id: 'g2',  ja: '適時開示', en: 'timely disclosure', status: 'approved' },
      { id: 'g3',  ja: '有価証券報告書', en: 'Annual Securities Report', status: 'approved' },
      { id: 'g4',  ja: '決算短信', en: 'earnings report (tanshin)', status: 'approved' },
      { id: 'g5',  ja: '通期業績予想', en: 'full-year guidance', status: 'approved' },
      { id: 'g6',  ja: '純収益', en: 'net revenue', status: 'approved' },
      { id: 'g7',  ja: '営業利益', en: 'operating income', status: 'approved' },
      { id: 'g8',  ja: '親会社株主に帰属する当期純利益', en: 'profit attributable to owners of parent', status: 'approved' },
      { id: 'g9',  ja: '自己株式取得', en: 'share buyback', status: 'approved', note: 'Not “treasury stock acquisition” in IR copy' },
      { id: 'g10', ja: 'のれん', en: 'goodwill premium', status: 'forbidden', note: 'Legacy V1 rendering — do not use' },
      { id: 'g11', ja: '中期経営計画', en: 'medium-term management plan', status: 'pending', note: 'Awaiting client approval — MTP vs full form' },
      { id: 'g12', ja: '資本コスト', en: 'cost of capital', status: 'pending' },
    ],
  }

  const customAgent = {
    id: 'ca-meridian-ir', name: 'Meridian IR Agent', baseAgentId: STEP_AGENTS.translation.id,
    baseAgentName: STEP_AGENTS.translation.name, glossaryId: glossary.id,
    styleRules: ['Formal IR register (keigo-aware)', 'US investor English, SEC-style numerals', 'Half-width numerals · ISO dates'],
    validationEnabled: true, lastTrainedAt: iso(now - 6 * 24 * H),
  }

  const qaResults = [
    { id: 'qa1', projectId: 'SB-2026-041', category: 'terminology',   severity: 'critical', description: 'のれん rendered as “goodwill premium” (forbidden term)', location: 'Section 2 · seg 14', resolution: 'open', comment: null },
    { id: 'qa2', projectId: 'SB-2026-041', category: 'inconsistency', severity: 'major',    description: '“net revenue” vs “net revenues” used inconsistently', location: 'Sections 1, 3', resolution: 'open', comment: null },
    { id: 'qa3', projectId: 'SB-2026-041', category: 'formatting',    severity: 'minor',    description: 'Full-width digits in table 3 (２０２６ → 2026)', location: 'Table 3', resolution: 'open', comment: null },
    { id: 'qa4', projectId: 'SB-2026-041', category: 'missing',       severity: 'major',    description: 'Footnote 7 untranslated', location: 'p. 12', resolution: 'approved', comment: 'Fixed in v2 draft' },
    { id: 'qa5', projectId: 'SB-2026-041', category: 'terminology',   severity: 'minor',    description: '通期業績予想 → “full-year forecast” (glossary prefers “full-year guidance”)', location: 'Section 4 · seg 31', resolution: 'open', comment: null },
  ]

  return { projects, dubbingJob, glossary, customAgent, qaResults }
}
