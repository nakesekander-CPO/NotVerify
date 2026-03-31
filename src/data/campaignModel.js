/**
 * Campaign data model — factory functions, mock ensemble templates,
 * and document-type detection helpers.
 *
 * Campaign (1) → Documents (N) → LocaleResults (N)
 * Config flows top-down: Campaign config is the default; Documents can override.
 */

/* ─── ID generation ──────────────────────────────────────────── */
let _idCounter = 1
function nextId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${_idCounter++}`
}

/* ─── Ensemble Templates ─────────────────────────────────────── */

/**
 * @typedef {Object} EnsembleTemplate
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} agentIds  — IDs that map to existing agent mock data
 * @property {string} icon        — lucide icon name as string
 * @property {string} bestFor     — short phrase for UI
 */

export const ENSEMBLE_TEMPLATES = [
  {
    id: 'financial',
    name: 'Financial Reporting',
    description: 'J-GAAP compliance, regulatory terminology, currency formatting',
    agentIds: ['jp-fin-3', 'mer-dt-1', 'bv-sent-1'],
    icon: 'TrendingUp',
    bestFor: 'Earnings reports, filings, investor comms',
  },
  {
    id: 'legal',
    name: 'Standard Legal QA',
    description: 'Regulatory precision, clause preservation, jurisdiction handling',
    agentIds: ['legal-compliance', 'terminologist', 'bv-sent-1'],
    icon: 'Scale',
    bestFor: 'Contracts, policies, regulatory filings',
  },
  {
    id: 'marketing',
    name: 'Marketing Transcreation',
    description: 'Cultural nuance, tone matching, brand voice adaptation',
    agentIds: ['tone-guardian', 'cultural-adapter', 'mer-dt-1'],
    icon: 'Megaphone',
    bestFor: 'Campaigns, landing pages, product copy',
  },
  {
    id: 'general',
    name: 'General Purpose',
    description: 'Balanced quality and speed for standard content',
    agentIds: ['jp-fin-3', 'bv-sent-1'],
    icon: 'Layers',
    bestFor: 'Internal docs, presentations, reports',
  },
]

export const DEFAULT_ENSEMBLE_ID = 'general'

/* ─── Document type detection ───────────────────────────────── */

/**
 * @typedef {'Legal' | 'Financial' | 'Marketing' | 'Technical' | 'General'} DocumentType
 */

/**
 * Detects likely document type from file name and MIME type.
 * Heuristic only — no content parsing.
 * @param {File} file
 * @returns {DocumentType}
 */
export function detectDocumentType(file) {
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()

  const financialKeywords = ['earnings', 'annual', 'report', 'financial', 'revenue', 'quarter', 'q1', 'q2', 'q3', 'q4', 'fiscal', 'balance', 'income', '10-k', '10-q', 'ifrs', 'gaap']
  const legalKeywords = ['contract', 'agreement', 'terms', 'policy', 'nda', 'legal', 'compliance', 'regulation', 'filing', 'brief', 'clause', 'addendum', 'sla']
  const marketingKeywords = ['campaign', 'brief', 'copy', 'brand', 'landing', 'product', 'promo', 'marketing', 'social', 'ad', 'creative']
  const technicalKeywords = ['api', 'spec', 'architecture', 'technical', 'readme', 'docs', 'manual', 'guide', 'changelog', 'release']

  if (financialKeywords.some(k => name.includes(k))) return 'Financial'
  if (legalKeywords.some(k => name.includes(k))) return 'Legal'
  if (marketingKeywords.some(k => name.includes(k))) return 'Marketing'
  if (technicalKeywords.some(k => name.includes(k))) return 'Technical'

  // Spreadsheets lean financial; presentations lean marketing
  if (type.includes('spreadsheet') || name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) return 'Financial'
  if (type.includes('presentation') || name.endsWith('.pptx') || name.endsWith('.ppt')) return 'Marketing'

  return 'General'
}

/**
 * Map document type → recommended ensemble ID
 */
const TYPE_TO_ENSEMBLE = {
  Financial: 'financial',
  Legal: 'legal',
  Marketing: 'marketing',
  Technical: 'general',
  General: 'general',
}

export function recommendedEnsembleForType(docType) {
  return TYPE_TO_ENSEMBLE[docType] ?? 'general'
}

/**
 * Returns true if a given ensemble is a poor fit for a document type.
 * Used to surface ⚠ flags in the pre-flight table.
 * @param {string} ensembleId
 * @param {DocumentType} docType
 * @returns {string|null}  Warning message, or null if no mismatch
 */
export function checkEnsembleMismatch(ensembleId, docType) {
  const mismatches = {
    'marketing-on-Financial': 'Marketing ensemble on a Financial document — terminology agents may be insufficient for regulatory content.',
    'marketing-on-Legal': 'Marketing ensemble on a Legal document — clause preservation agents not included.',
    'legal-on-Marketing': 'Legal ensemble on a Marketing document — tone and transcreation agents not included.',
    'financial-on-Marketing': 'Financial ensemble on a Marketing document — brand voice agents not included.',
    'financial-on-Legal': 'Financial ensemble on a Legal document — legal compliance agents not included.',
  }
  const key = `${ensembleId}-on-${docType}`
  return mismatches[key] ?? null
}

/* ─── Page count estimation ─────────────────────────────────── */

/**
 * Rough page count from file size + type.
 * @param {File} file
 * @returns {number}
 */
export function estimatePageCount(file) {
  const mb = file.size / (1024 * 1024)
  const name = (file.name || '').toLowerCase()

  if (name.endsWith('.pdf')) return Math.max(1, Math.round(mb * 8))
  if (name.endsWith('.docx') || name.endsWith('.doc')) return Math.max(1, Math.round(mb * 12))
  if (name.endsWith('.pptx') || name.endsWith('.ppt')) return Math.max(1, Math.round(mb * 5))
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return Math.max(1, Math.round(mb * 4))
  if (name.endsWith('.mp4') || name.endsWith('.mov')) return Math.max(1, Math.round(mb * 0.5)) // minutes
  return Math.max(1, Math.round(mb * 6))
}

/* ─── Document Record ────────────────────────────────────────── */

/**
 * @typedef {Object} LocaleResult
 * @property {string} locale
 * @property {number|null} qualityScore
 * @property {'queued'|'processing'|'complete'|'failed'|'review'} status
 * @property {object[]} segments
 */

/**
 * @typedef {Object} DocumentRecord
 * @property {string} id
 * @property {File} file
 * @property {string} fileName
 * @property {DocumentType} detectedType
 * @property {number} pageCount
 * @property {string} ensembleId           — inherited from campaign or overridden
 * @property {string[]|null} localeOverride — null = use campaign locales
 * @property {number|null} thresholdOverride
 * @property {'pending'|'processing'|'complete'|'failed'|'review'} status
 * @property {LocaleResult[]} localeResults
 */

/**
 * Create a DocumentRecord from a File, inheriting campaign config.
 * @param {File} file
 * @param {CampaignConfig} campaignConfig
 * @returns {DocumentRecord}
 */
export function createDocumentRecord(file, campaignConfig) {
  const detectedType = detectDocumentType(file)
  return {
    id: nextId('doc'),
    file,
    fileName: file.name,
    detectedType,
    pageCount: estimatePageCount(file),
    ensembleId: campaignConfig.ensembleId ?? DEFAULT_ENSEMBLE_ID,
    localeOverride: null,    // null = inherit campaign locales
    thresholdOverride: null, // null = inherit campaign threshold
    status: 'pending',
    localeResults: (campaignConfig.locales ?? []).map(locale => ({
      locale,
      qualityScore: null,
      status: 'queued',
      segments: [],
    })),
  }
}

/* ─── Campaign Config ────────────────────────────────────────── */

/**
 * @typedef {Object} CampaignConfig
 * @property {string[]} locales
 * @property {string} vertical
 * @property {string} tone
 * @property {string} ensembleId
 * @property {number} qualityThreshold  — 0–100
 * @property {boolean} autoPublish
 */

/* ─── Campaign ───────────────────────────────────────────────── */

/**
 * @typedef {Object} Campaign
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt   — ISO 8601
 * @property {CampaignConfig} config
 * @property {DocumentRecord[]} documents
 * @property {'preflight'|'running'|'complete'|'partial'} status
 * @property {string} poNumber
 */

/**
 * Create an empty Campaign shell.
 * @param {Partial<CampaignConfig> & { name?: string, poNumber?: string }} options
 * @returns {Campaign}
 */
export function createCampaign({
  name = 'New Campaign',
  locales = [],
  vertical = '',
  tone = 'Formal',
  ensembleId = DEFAULT_ENSEMBLE_ID,
  qualityThreshold = 85,
  autoPublish = false,
  poNumber = '',
} = {}) {
  return {
    id: nextId('campaign'),
    name,
    createdAt: new Date().toISOString(),
    config: { locales, vertical, tone, ensembleId, qualityThreshold, autoPublish },
    documents: [],
    status: 'preflight',
    poNumber,
  }
}

/**
 * Resolve the effective locales for a document (override or campaign default).
 * @param {DocumentRecord} doc
 * @param {Campaign} campaign
 * @returns {string[]}
 */
export function resolveDocumentLocales(doc, campaign) {
  return doc.localeOverride ?? campaign.config.locales
}

/**
 * Resolve the effective ensemble for a document.
 * @param {DocumentRecord} doc
 * @param {Campaign} campaign
 * @returns {string}
 */
export function resolveDocumentEnsemble(doc, campaign) {
  return doc.ensembleId ?? campaign.config.ensembleId
}

/* ─── Mock campaign quality simulation ──────────────────────── */

/**
 * Generate mock quality scores for all document × locale pairs.
 * Used to simulate processing completion.
 * @param {Campaign} campaign
 * @returns {Campaign}  — with all localeResults populated
 */
export function simulateCampaignResults(campaign) {
  return {
    ...campaign,
    status: 'complete',
    documents: campaign.documents.map(doc => ({
      ...doc,
      status: 'complete',
      localeResults: resolveDocumentLocales(doc, campaign).map(locale => ({
        locale,
        qualityScore: Math.round(72 + Math.random() * 26), // 72–98
        status: 'complete',
        segments: [],
      })),
    })),
  }
}

/* ─── Sample campaign (demo) ─────────────────────────────────── */

/**
 * Pre-built demo campaign for the "Try with samples" CTA.
 * Documents are File-like objects with name + size (no real content).
 */
export function createSampleCampaign(structuredContext = {}) {
  const locales = structuredContext.targetLocales?.length > 0
    ? structuredContext.targetLocales
    : ['ja', 'de', 'zh']

  const vertical = structuredContext.industryVertical || 'Financial Services'

  const campaign = createCampaign({
    name: 'Sample — Q3 Financial Package',
    locales,
    vertical,
    tone: 'Formal',
    ensembleId: 'financial',
    qualityThreshold: 85,
    autoPublish: false,
  })

  const sampleFiles = [
    { name: 'Q3_Earnings_Report.pdf', size: 2.4 * 1024 * 1024 },
    { name: 'Q3_Investor_Presentation.pptx', size: 5.1 * 1024 * 1024 },
    { name: 'Q3_Financial_Summary.xlsx', size: 0.8 * 1024 * 1024 },
  ]

  campaign.documents = sampleFiles.map(f => {
    // Create a minimal File-like object (no real content needed for simulation)
    const fakeFile = new File([''], f.name, { type: 'application/octet-stream' })
    Object.defineProperty(fakeFile, 'size', { value: f.size })
    return createDocumentRecord(fakeFile, campaign.config)
  })

  return campaign
}

/* ─── Folder/naming convention helpers ──────────────────────── */

export const FOLDER_STRUCTURE_TEMPLATES = [
  { id: 'locale-doctype', label: '/Locale/DocType/', example: '/ja/financial/Q3_Report.pdf' },
  { id: 'project-locale', label: '/Project/Locale/', example: '/Q3_Package/ja/Q3_Report.pdf' },
  { id: 'flat', label: 'Flat (all in one folder)', example: '/Q3_Report_ja.pdf' },
]

export const NAMING_TOKENS = [
  { token: '{locale}', description: 'Target language code (e.g. ja, de)' },
  { token: '{doctype}', description: 'Detected document type' },
  { token: '{date}', description: 'ISO date of export' },
  { token: '{project}', description: 'Campaign name (slugified)' },
  { token: '{original}', description: 'Original file name without extension' },
]

export const EXPORT_FORMATS = [
  { id: 'xliff', label: 'XLIFF 2.1', description: 'Industry-standard translation exchange', ext: '.xliff' },
  { id: 'tmx', label: 'TMX', description: 'Translation memory exchange', ext: '.tmx' },
  { id: 'pdf', label: 'PDF', description: 'Formatted output document', ext: '.pdf' },
  { id: 'docx', label: 'Bilingual DOCX', description: 'Source and target side-by-side', ext: '.docx' },
]
