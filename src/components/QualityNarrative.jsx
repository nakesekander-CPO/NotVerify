import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Download, FileText, Bot, ShieldCheck, Target,
  Brain, TrendingUp, BarChart3, ArrowRight, RotateCcw, Loader2, Database, Sparkles,
  X, AlertTriangle, BookOpen, Wrench, LayoutDashboard, LineChart, Scale, ClipboardCheck, UserCheck, Info,
  FolderOpen, ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'
import { useToast } from './ToastProvider'
import { getQualityColor, dimensionIcons, getScoreColor } from '../utils/scoreColors'
import ValueCreationEngine from './ValueCreationEngine'
import AnomalyTrendChart from './AnomalyTrendChart'
import IntelligenceTriage from './IntelligenceTriage'
import QualityHeatmap from './QualityHeatmap'
import { EXPORT_FORMATS, FOLDER_STRUCTURE_TEMPLATES } from '../data/campaignModel'
// OrgBrain now rendered at App level

/* ─── Campaign Export Wizard ────────────────────────────────── */
function CampaignExportWizard({ campaign, onClose }) {
  const [step, setStep] = useState(1) // 1 = format, 2 = structure, 3 = confirm
  const [formatId, setFormatId] = useState('xliff')
  const [structureId, setStructureId] = useState('locale-doctype')
  const [downloading, setDownloading] = useState(false)

  const selectedFormat = EXPORT_FORMATS.find(f => f.id === formatId)
  const selectedStructure = FOLDER_STRUCTURE_TEMPLATES.find(s => s.id === structureId)

  const handleDownload = () => {
    setDownloading(true)
    // Simulate zip generation
    setTimeout(() => {
      setDownloading(false)
      onClose?.()
    }, 1800)
  }

  return (
    <div className="rounded-xl border-2 border-[#009eda]/20 bg-[#009eda]/[0.02] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-500">Export Campaign</p>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          {['Format', 'Structure', 'Confirm'].map((label, i) => (
            <span key={label} className={`flex items-center gap-1 ${step === i + 1 ? 'text-[#009eda] font-semibold' : step > i + 1 ? 'text-emerald-600' : ''}`}>
              {i > 0 && <span className="text-gray-200 mx-0.5">/</span>}
              {step > i + 1 ? '✓' : label}
            </span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-2">
          <p className="text-[12px] text-gray-500 mb-3">Choose output format</p>
          {EXPORT_FORMATS.map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFormatId(f.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${formatId === f.id ? 'border-[#009eda] bg-[#009eda]/[0.04]' : 'border-black/[0.08] bg-white hover:border-[#009eda]/30'}`}
            >
              <FileText size={14} className={formatId === f.id ? 'text-[#009eda]' : 'text-gray-400'} />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-gray-800">{f.label}</p>
                <p className="text-[11px] text-gray-400">{f.description}</p>
              </div>
              {formatId === f.id && <CheckCircle2 size={14} className="text-[#009eda] shrink-0" />}
            </button>
          ))}
          <button onClick={() => setStep(2)} className="mt-2 w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-semibold cursor-pointer hover:bg-gray-800 transition-colors">
            Next <ChevronRightIcon size={14} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          <p className="text-[12px] text-gray-500 mb-3">Choose folder structure</p>
          {FOLDER_STRUCTURE_TEMPLATES.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStructureId(s.id)}
              className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${structureId === s.id ? 'border-[#009eda] bg-[#009eda]/[0.04]' : 'border-black/[0.08] bg-white hover:border-[#009eda]/30'}`}
            >
              <FolderOpen size={14} className={`mt-0.5 ${structureId === s.id ? 'text-[#009eda]' : 'text-gray-400'}`} />
              <div className="flex-1">
                <p className="text-[13px] font-medium text-gray-800">{s.label}</p>
                <p className="text-[11px] font-mono text-gray-400">{s.example}</p>
              </div>
              {structureId === s.id && <CheckCircle2 size={14} className="text-[#009eda] shrink-0 mt-0.5" />}
            </button>
          ))}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setStep(1)} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.10] text-gray-600 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors">Back</button>
            <button onClick={() => setStep(3)} className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-[13px] font-semibold cursor-pointer hover:bg-gray-800 transition-colors">
              Next <ChevronRightIcon size={14} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-[12px] text-gray-500">Review and export</p>
          <div className="rounded-lg border border-black/[0.08] bg-white p-3 space-y-2 text-[12px]">
            <div className="flex justify-between"><span className="text-gray-500">Campaign</span><span className="text-gray-800 font-medium">{campaign.name}</span></div>
            <div className="h-px bg-black/[0.04]" />
            <div className="flex justify-between"><span className="text-gray-500">Documents</span><span className="text-gray-800 font-medium">{campaign.documents?.length ?? 0}</span></div>
            <div className="h-px bg-black/[0.04]" />
            <div className="flex justify-between"><span className="text-gray-500">Format</span><span className="text-gray-800 font-medium">{selectedFormat?.label}</span></div>
            <div className="h-px bg-black/[0.04]" />
            <div className="flex justify-between"><span className="text-gray-500">Structure</span><span className="text-gray-800 font-medium">{selectedStructure?.label}</span></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setStep(2)} className="flex-1 px-4 py-2.5 rounded-lg border border-black/[0.10] text-gray-600 text-[13px] font-medium cursor-pointer hover:bg-gray-50 transition-colors">Back</button>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-[#009eda] text-white text-[13px] font-semibold cursor-pointer hover:bg-[#007bb5] transition-colors disabled:opacity-60"
            >
              {downloading ? <><Loader2 size={13} className="animate-spin" /> Generating…</> : <><Download size={13} /> Download .zip</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const improvementIconMap = {
  terminology: Brain,
  target: Target,
  shield: ShieldCheck,
  database: Database,
}

const improvementColorMap = {
  terminology: 'text-violet-400 bg-violet-50',
  target: 'text-emerald-400 bg-emerald-50',
  shield: 'text-teal-400 bg-teal-500/10',
  database: 'text-blue-400 bg-blue-500/10',
}

// (waterfall colors removed — now handled by ValueCreationEngine)

// Locale health card data (prototype)
const localeHealthCards = [
  {
    locale: 'JA', flag: '\u{1F1EF}\u{1F1F5}', name: 'Japanese', agent: 'JP-FIN-3', score: 84,
    dimensions: [
      { name: 'Domain Precision', score: 78 },
      { name: 'Regulatory', score: 92 },
      { name: 'Cultural', score: 74 },
      { name: 'Reading Level', score: 92 },
    ],
    alert: '3 financial terms missing from J-GAAP knowledge base',
    hasDiagnostic: true,
  },
  {
    locale: 'DE', flag: '\u{1F1E9}\u{1F1EA}', name: 'German', agent: 'EU-REG-5', score: 91,
    dimensions: [
      { name: 'Domain Precision', score: 94 },
      { name: 'Regulatory', score: 90 },
      { name: 'Cultural', score: 88 },
      { name: 'Reading Level', score: 93 },
    ],
    alert: null,
    hasDiagnostic: false,
  },
  {
    locale: 'ZH', flag: '\u{1F1E8}\u{1F1F3}', name: 'Chinese', agent: 'CN-FIN-2', score: 89,
    dimensions: [
      { name: 'Domain Precision', score: 88 },
      { name: 'Regulatory', score: 91 },
      { name: 'Cultural', score: 85 },
      { name: 'Reading Level', score: 92 },
    ],
    alert: null,
    hasDiagnostic: false,
  },
]

// Diagnostic modal data for JA
const jaDiagnosticData = {
  locale: 'JA',
  flag: '\u{1F1EF}\u{1F1F5}',
  name: 'Japanese',
  agent: 'JP-FIN-3',
  score: 84,
  terminology: {
    score: 78,
    rootCause: '3 financial terms were not found in your J-GAAP knowledge base and fell back to general processing:',
    terms: [
      {
        term: '\u6E1B\u640D\u640D\u5931',
        english: 'impairment loss',
        used: 'generic output',
        expected: 'TSE-approved term',
        impact: -4,
      },
      {
        term: '\u306E\u308C\u3093',
        english: 'goodwill',
        used: 'literal output',
        expected: 'J-GAAP standard phrasing',
        impact: -2,
      },
      {
        term: '\u6301\u5206\u6CD5',
        english: 'equity method',
        used: 'generic financial term',
        expected: 'ASBJ-prescribed terminology',
        impact: -2,
      },
    ],
  },
  cultural: {
    score: 74,
    rootCause: '2 passages used Western fiscal year references (Q3 / October) without mapping to Japanese fiscal calendar conventions (\u4E0A\u534A\u671F/\u4E0B\u534A\u671F).',
  },
  regulatory: { score: 92 },
  readingLevel: { score: 92 },
  actions: [
    {
      id: 'glossary',
      label: 'Add 3 missing entries to your J-GAAP knowledge base',
      button: 'Add to Knowledge Base',
      impact: '+6 points on domain precision (78% \u2192 84%)',
      impactShort: '+6 points',
      type: 'primary',
    },
    {
      id: 'calendar',
      label: 'Enable "Cultural Calendar Mapping" enhancement',
      button: 'Enable Enhancement',
      impact: '+4 points on cultural (74% \u2192 78%)',
      impactShort: '+4 points',
      type: 'secondary',
    },
    {
      id: 'review',
      label: 'Review 2 fiscal year passages manually',
      button: 'Open in Editor',
      impact: 'Full cultural compliance',
      impactShort: null,
      type: 'link',
    },
  ],
  projectedScore: { from: 84, to: 92, delta: 8 },
}

// Score ring component
function ScoreRing({ score, size = 80, strokeWidth = 6, color, animate = true, prefersReducedMotion = false }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const scoreColor = color || (score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171')

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: animate ? circumference : circumference - progress }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{
            duration: prefersReducedMotion ? 0 : 1.2,
            type: 'spring',
            stiffness: 80,
            damping: 15,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-mono font-bold text-gray-900"
          style={{ fontSize: size > 60 ? '1.5rem' : '1rem' }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}

// Tab definitions
const TAB_DEFINITIONS = [
  { id: 'results', label: 'Results', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: LineChart },
  { id: 'governance', label: 'Governance', icon: Scale },
  { id: 'compliance', label: 'Review', icon: UserCheck },
]

const INLINE_SEGMENTS = [
  { id: 'seg-042', ref: 'SEG-042', severity: 'critical', source: 'Total goodwill impairment charges...', translation: '\u306e\u308c\u3093\u306e\u6e1b\u640d\u640d\u5931\u5408\u8a08\u984d...', issue: 'TSE filing requires ASBJ standard reference', suggestedFix: '\u306e\u308c\u3093\u306e\u6e1b\u640d\u640d\u5931\u5408\u8a08\u984d \u00a5630\u767e\u4e07\u3092\u4f01\u696d\u4f1a\u8a08\u57fa\u6e96\u7b2c10\u53f7\u306b\u57fa\u3065\u304d\u8a08\u4e0a\u3057\u307e\u3057\u305f\u3002', agent: 'J-GAAP Specialist' },
  { id: 'seg-018', ref: 'SEG-018', severity: 'major', source: 'Revenue was recognized in accordance with ASC 606.', translation: '\u53ce\u76ca\u306fASC 606\u306b\u57fa\u3065\u304d\u8a8d\u8b58\u3055\u308c\u307e\u3057\u305f\u3002', issue: 'ASC 606 must be mapped to ASBJ 29', suggestedFix: '\u53ce\u76ca\u306fASBJ\u7b2c29\u53f7\u306b\u57fa\u3065\u304d\u8a8d\u8b58\u3055\u308c\u307e\u3057\u305f\u3002', agent: 'J-GAAP Specialist' },
  { id: 'seg-007', ref: 'SEG-007', severity: 'major', source: 'Operating expenses totaled $12.8 million for the quarter.', translation: '\u56db\u534a\u671f\u306e\u55b6\u696d\u8cbb\u7528\u306f$12.8 million\u3067\u3057\u305f\u3002', issue: 'Currency must use Japanese denomination format', suggestedFix: '\u56db\u534a\u671f\u306e\u55b6\u696d\u8cbb\u7528\u306f\u00a51,920\u767e\u4e07\u3067\u3057\u305f\u3002', agent: 'J-GAAP Specialist' },
  { id: 'seg-031', ref: 'SEG-031', severity: 'minor', source: 'We believe our investment strategy will yield positive results.', translation: '\u79c1\u305f\u3061\u306e\u6295\u8cc7\u6226\u7565\u306f\u826f\u3044\u7d50\u679c\u3092\u3082\u305f\u3089\u3059\u3068\u601d\u3044\u307e\u3059\u3002', issue: 'Register too informal for TSE disclosure', suggestedFix: '\u5f53\u793e\u306e\u6295\u8cc7\u6226\u7565\u306f\u826f\u597d\u306a\u6210\u679c\u3092\u3082\u305f\u3089\u3059\u3082\u306e\u3068\u8a8d\u8b58\u3057\u3066\u304a\u308a\u307e\u3059\u3002', agent: 'Brand Voice Sentry' },
]

const SEVERITY_STYLES = {
  critical: { border: 'border-l-red-500', badge: 'bg-red-500/20 text-red-300', label: 'Critical' },
  major: { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-300', label: 'Major' },
  minor: { border: 'border-l-blue-500', badge: 'bg-blue-500/20 text-blue-300', label: 'Minor' },
}

function InlineSegmentCard({ segment, resolution, onResolve }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(segment.suggestedFix)
  const sev = SEVERITY_STYLES[segment.severity] || SEVERITY_STYLES.minor

  if (resolution) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="text-[12px] text-emerald-300 font-medium">{segment.ref} resolved</span>
        <span className="text-[11px] text-gray-500">&mdash; {resolution.action === 'edit' ? 'Edited & confirmed' : 'Confirmed AI fix'}</span>
        <span className="ml-auto text-[10px] text-gray-400 font-mono">{resolution.timestamp}</span>
      </div>
    )
  }

  return (
    <div className={`rounded-lg bg-gray-50 border border-black/[0.12] border-l-4 ${sev.border} overflow-hidden`}>
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${sev.badge}`}>{sev.label}</span>
          <span className="text-[11px] font-mono text-gray-500">{segment.ref}</span>
          <span className="text-[11px] text-gray-400">|</span>
          <span className="text-[11px] text-gray-500">{segment.agent}</span>
        </div>
        <p className="text-[12px] text-gray-700 mb-1">{segment.issue}</p>
        <p className="text-[11px] text-gray-500 truncate">Source: {segment.source}</p>
      </div>

      {editing ? (
        <div className="px-4 pb-3 space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-16 bg-gray-100 border border-black/[0.12] rounded-lg px-3 py-2 text-[12px] text-gray-900 resize-none outline-none focus:border-straker-500/40"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onResolve('edit', { editedText: editText }); setEditing(false) }}
              className="px-3 py-1.5 rounded-lg bg-amber hover:bg-amber-deep text-white text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Save & Resolve
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-3 py-1.5 rounded-lg border border-black/[0.12] text-gray-500 text-[11px] font-medium hover:bg-black/[0.02] transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="px-4 pb-3 flex items-center gap-2">
          <button
            onClick={() => onResolve('confirm', {})}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-500/25 text-emerald-300 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Confirm
          </button>
          <button
            onClick={() => setEditing(true)}
            className="px-3 py-1.5 rounded-lg bg-straker-50 hover:bg-straker-500/25 text-straker-600 text-[11px] font-semibold transition-colors cursor-pointer"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  )
}

function CausalityPopover({ open, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="absolute top-full left-0 mt-2 z-50 bg-white border border-black/[0.12] rounded-lg  max-w-[320px] p-4"
        >
          <div className="text-[11px] font-semibold text-gray-900 mb-2 flex items-center gap-1.5">
            <Info className="w-3 h-3 text-gray-500" />
            {title}
          </div>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function QualityNarrative({ data, computedQuality, enabledUpsells, qualityNarrative, orgIntelligence, onReset, activeAgents, onComplianceRequired, onReviewNow, onOpenOrgBrain, activeCampaign }) {
  const [processing, setProcessing] = useState(true)
  const [diagnosticOpen, setDiagnosticOpen] = useState(false)
  const [glossaryAdded, setGlossaryAdded] = useState(false)
  const [glossaryLoading, setGlossaryLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('results')
  const [inlineResolutions, setInlineResolutions] = useState({})
  // orgBrainOpen state removed — now uses onOpenOrgBrain prop for App-level navigation
  const [tsePopoverOpen, setTsePopoverOpen] = useState(false)
  const [publishPopoverOpen, setPublishPopoverOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const { addToast } = useToast()

  useEffect(() => {
    const timer = setTimeout(() => setProcessing(false), prefersReducedMotion ? 500 : 3000)
    return () => clearTimeout(timer)
  }, [prefersReducedMotion])

  if (!data) return null

  const pageCount = data.classification?.match(/\d+/)?.[0] || '\u2014'

  // Processing state
  if (processing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      >
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
            Processing
          </h1>
          <p className="text-[15px] text-gray-500">
            {data.fileName}
          </p>
        </div>

        <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-10">
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-lg bg-straker-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-straker-600 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-medium text-gray-900 mb-1">Full execution in progress</p>
              <p className="text-[13px] text-gray-500">Processing all {pageCount} pages with {data.agent?.name}...</p>
            </div>

            <div className="w-full max-w-sm">
              <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-straker-600 to-straker-400 rounded-full"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: prefersReducedMotion ? 0.3 : 2.5, ease: 'easeInOut' }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-[12px] text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-straker-400 animate-pulse" />
              <span>Applying {data.plan?.guardrails?.length || 0} guardrails</span>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Narrative data
  const { beforeAfter, orgImprovements, qualityTrend, cumulativeIntelligence } = qualityNarrative || {}
  const beforeScore = beforeAfter?.before || 0
  const afterScore = beforeAfter?.after || 0
  const dimensions = beforeAfter?.dimensions || []
  const cumulative = cumulativeIntelligence || {}

  const glossaryCoverage = cumulative.glossaryTermsLearned ? Math.min(100, Math.round((cumulative.glossaryTermsLearned / 3600) * 100)) : 34

  const newTermsCount = cumulative.glossaryTermsThisProject || 23

  // Glossary add handler
  const handleGlossaryAdd = () => {
    if (glossaryAdded || glossaryLoading) return
    setGlossaryLoading(true)
    setTimeout(() => {
      setGlossaryLoading(false)
      setGlossaryAdded(true)
    }, 800)
  }

  const handleInlineResolve = (segId, action, data) => {
    setInlineResolutions(prev => ({ ...prev, [segId]: { action, ...data, timestamp: new Date().toLocaleTimeString() } }))
    if (action === 'confirm' || action === 'edit') {
      addToast('\u2713 Fixed & Committed to Org Brain \u2014 Model JP-FIN-3 will incorporate this correction', 'success', 3000)
    }
  }

  // Check if compliance flags exist (for badge count on Compliance tab)
  const hasComplianceFlags = !!onComplianceRequired

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
      className="space-y-6"
    >
      {/* 1. Completion Header — always visible above tabs */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Orchestrated Translation Complete
          </h1>
          <p className="text-[14px] text-gray-500">
            {data.fileName} &middot; JA &middot; DE &middot; ZH &middot; 4m 12s
          </p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="border-b border-black/[0.12]">
        <div className="flex gap-6 px-2">
          {TAB_DEFINITIONS.map((tab) => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 pb-3 text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'text-gray-900 border-b-2 border-straker-500'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <TabIcon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.id === 'compliance' && hasComplianceFlags && (
                  <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    2
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="mt-6">

        {/* ===== RESULTS TAB ===== */}
        {activeTab === 'results' && (
          <div className="space-y-6">
            {/* 2. Score Hero — horizontal layout with Business Risk Assessment */}
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
              <div className="flex items-center gap-6">
                <ScoreRing
                  score={88}
                  size={80}
                  strokeWidth={6}
                  color="#fbbf24"
                  prefersReducedMotion={prefersReducedMotion}
                />
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-gray-900 mb-1">88% Overall Quality</h2>
                  <p className="text-sm text-gray-700 leading-relaxed mb-3">
                    Your Q2 report scored 92%. Japanese domain precision drove the 4-point delta. See JA diagnostics below.
                  </p>
                  {/* Business Risk Assessment Badges */}
                  <div className="flex flex-wrap gap-2">
                    <div
                      className="relative"
                      onMouseEnter={() => setTsePopoverOpen(true)}
                      onMouseLeave={() => setTsePopoverOpen(false)}
                    >
                      <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-500/20 text-amber-300 text-[11px] font-medium px-2.5 py-1 rounded-lg cursor-help hover:bg-amber-500/20 hover:border-amber-500/30 transition-colors">
                        <AlertTriangle className="w-3 h-3" />
                        TSE Compliance: 2 Minor Flags
                      </span>
                      <CausalityPopover open={tsePopoverOpen} title="TSE Compliance Flags">
                        <ul className="space-y-2 mb-3">
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <div>
                              <span className="text-[11px] text-gray-700 leading-snug block">SEG-042: Goodwill impairment term uses generic output instead of ASBJ-prescribed terminology</span>
                              <span className="text-[10px] text-amber-400 font-medium">Minor</span>
                            </div>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <div>
                              <span className="text-[11px] text-gray-700 leading-snug block">SEG-018: ASC 606 reference not mapped to equivalent ASBJ 29 standard</span>
                              <span className="text-[10px] text-amber-400 font-medium">Minor</span>
                            </div>
                          </li>
                        </ul>
                        <p className="text-[10px] text-gray-500 leading-relaxed mb-2">These flags do not block publication but require acknowledgment for audit trail.</p>
                        <button
                          onClick={() => setActiveTab('compliance')}
                          className="text-[10px] font-medium text-[#1B5E8F] hover:text-[#4F94C4] transition-colors cursor-pointer"
                        >
                          View in Review tab →
                        </button>
                      </CausalityPopover>
                    </div>
                    <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-500/20 text-emerald-300 text-[11px] font-medium px-2.5 py-1 rounded-lg">
                      <CheckCircle2 className="w-3 h-3" />
                      J-GAAP: Cleared
                    </span>
                    <div
                      className="relative"
                      onMouseEnter={() => setPublishPopoverOpen(true)}
                      onMouseLeave={() => setPublishPopoverOpen(false)}
                    >
                      <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-500/20 text-red-300 text-[11px] font-medium px-2.5 py-1 rounded-lg cursor-help hover:bg-red-500/20 hover:border-red-500/30 transition-colors">
                        <X className="w-3 h-3" />
                        Auto-Publish: Not Cleared
                        <Info className="w-3 h-3 ml-0.5 opacity-60" />
                      </span>
                      <CausalityPopover open={publishPopoverOpen} title="Auto-Publish Blocked">
                        <p className="text-[11px] text-gray-700 leading-relaxed mb-3">
                          Trust score (88%) is below auto-publish threshold (92%). 2 compliance flags and 1 low-confidence segment remain unresolved.
                        </p>
                        <ul className="space-y-1.5 mb-3">
                          <li className="flex items-center gap-2 text-[11px]">
                            <span className="text-red-400">✗</span>
                            <span className="text-gray-700">Trust score ≥ 92%</span>
                          </li>
                          <li className="flex items-center gap-2 text-[11px]">
                            <span className="text-red-400">✗</span>
                            <span className="text-gray-700">All compliance flags acknowledged</span>
                          </li>
                          <li className="flex items-center gap-2 text-[11px]">
                            <span className="text-red-400">✗</span>
                            <span className="text-gray-700">No low-confidence segments</span>
                          </li>
                        </ul>
                        <p className="text-[10px] text-gray-500 leading-relaxed">Resolve blockers or assign to human review to proceed.</p>
                        <button
                          onClick={() => setActiveTab('compliance')}
                          className="mt-2 text-[10px] font-medium text-[#1B5E8F] hover:text-[#4F94C4] transition-colors cursor-pointer"
                        >
                          Resolve on Review tab →
                        </button>
                      </CausalityPopover>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Locale Health — Heatmap for campaigns, cards for single docs */}
            {activeCampaign ? (
              <div className="rounded-xl border border-black/[0.08] bg-white p-5">
                <QualityHeatmap campaign={activeCampaign} threshold={activeCampaign.config?.qualityThreshold ?? 85} />
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {localeHealthCards.map((card, cardIdx) => {
                const isAmber = card.score < 85
                const borderColor = isAmber ? 'border-l-amber-400' : 'border-l-emerald-400'
                const ringColor = isAmber ? '#fbbf24' : '#34d399'

                return (
                  <motion.div
                    key={card.locale}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.4,
                      delay: prefersReducedMotion ? 0 : 0.1 * cardIdx,
                    }}
                    whileHover={prefersReducedMotion ? {} : { y: -4, transition: { duration: 0.2 } }}
                    className={`bg-gray-50 border border-black/[0.12] border-l-4 ${borderColor} rounded-lg p-5 cursor-default`}
                  >
                    {/* Header: flag + locale name */}
                    <div className="mb-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-lg">{card.flag}</span>
                        <span className="text-[15px] font-semibold text-gray-900">{card.name}</span>
                      </div>
                      <p className="text-[12px] text-gray-500">Agent: {card.agent}</p>
                    </div>

                    {/* Score ring */}
                    <div className="flex justify-center my-4">
                      <ScoreRing
                        score={card.score}
                        size={56}
                        strokeWidth={5}
                        color={ringColor}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    </div>

                    {/* Dimension bars */}
                    <div className="space-y-2.5 mb-4">
                      {card.dimensions.map((dim) => {
                        const dimColor = getScoreColor(dim.score)
                        return (
                          <div key={dim.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-gray-500">{dim.name}</span>
                              <span className={`text-[11px] font-medium ${dimColor.text}`}>{dim.score}%</span>
                            </div>
                            <div className="h-1.5 bg-black/[0.03] rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${dimColor.bar}`}
                                initial={{ width: '0%' }}
                                animate={{ width: `${dim.score}%` }}
                                transition={{
                                  duration: prefersReducedMotion ? 0 : 0.6,
                                  delay: prefersReducedMotion ? 0 : 0.3 + cardIdx * 0.1,
                                  ease: 'easeOut',
                                }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Alert box */}
                    {card.alert ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: prefersReducedMotion ? 0 : 0.6 }}
                        className="bg-amber-50 border border-amber-500/20 rounded-lg px-3 py-2 mb-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          <p className="text-[12px] text-amber-300/90 leading-snug">{card.alert}</p>
                        </div>
                      </motion.div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <p className="text-[12px] text-emerald-300/90">All clear</p>
                        </div>
                      </div>
                    )}

                    {/* Diagnose / Details link */}
                    {card.hasDiagnostic ? (
                      <button
                        onClick={() => setDiagnosticOpen(true)}
                        className="group flex items-center gap-1 text-[13px] font-medium text-straker-600 hover:text-straker-300 transition-colors cursor-pointer"
                      >
                        <span>Diagnose</span>
                        <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 text-[13px] text-gray-500">
                        Details <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
            )}

            {/* 9. Output Files — Promoted with visual separator */}
            <div className="relative pt-6">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center gap-3">
                <div className="w-16 h-px bg-gradient-to-r from-transparent to-black/[0.08]" />
                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-medium whitespace-nowrap">Deliverables</span>
                <div className="w-16 h-px bg-gradient-to-l from-transparent to-black/[0.08]" />
              </div>
            </div>
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6 ring-1 ring-straker-500/10">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-gray-500" />
                <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Output Files</h2>
              </div>

              <div className="space-y-2 mb-4">
                <OutputFile
                  name={data.fileName?.replace(/(\.\w+)$/, '_verified$1') || 'verified_output'}
                  type="Verified Document"
                />
                <OutputFile
                  name="quality_report.pdf"
                  type="Quality Assessment Report"
                />
                <OutputFile
                  name="segment_memory.tmx"
                  type="Segment Memory Export"
                />
                <OutputFile
                  name="org_intelligence_update.json"
                  type="Org Intelligence Update"
                />
              </div>

              <div className="space-y-3">
                {activeCampaign ? (
                  <CampaignExportWizard campaign={activeCampaign} onClose={onReset} />
                ) : (
                  <button
                    onClick={() => {}}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-amber hover:bg-amber-deep text-white font-semibold text-[13px] transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    Download All Files
                  </button>
                )}
                <button
                  onClick={onReset}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-black/[0.12] hover:bg-black/[0.02] text-gray-700 font-medium text-[13px] transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Project
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ANALYTICS TAB ===== */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* 4. Value Creation Engine — Agent-Linked Quality Impact */}
            <ValueCreationEngine beforeScore={beforeScore} />

            {/* 6. Quality Trend Chart with Anomaly Annotations */}
            <AnomalyTrendChart currentProjectScore={88} industryAvg={83} />

            {/* 5. Organizational Improvements */}
            {orgImprovements && orgImprovements.length > 0 && (
              <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
                <div className="flex items-center gap-2 mb-6">
                  <TrendingUp className="w-4 h-4 text-gray-500" />
                  <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Organizational Impact</h2>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {orgImprovements.map((imp) => {
                    const ImpIcon = improvementIconMap[imp.icon] || Target
                    const impColor = improvementColorMap[imp.icon] || 'text-gray-500 bg-black/[0.03]'
                    const [iconText, iconBg] = impColor.split(' ')
                    return (
                      <div key={imp.metric} className="bg-gray-100 rounded-lg border border-black/[0.06] p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                            <ImpIcon className={`w-4 h-4 ${iconText}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[12px] text-gray-500 mb-0.5">{imp.metric}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[22px] font-semibold text-gray-900">{imp.value}</span>
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 0.4 }}
                                className="bg-emerald-50 text-emerald-400 text-[11px] font-semibold px-1.5 py-0.5 rounded-md"
                              >
                                {imp.delta}
                              </motion.span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">Over {imp.period}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== GOVERNANCE TAB ===== */}
        {activeTab === 'governance' && (
          <div className="space-y-6">
            {/* 7. Cumulative Intelligence */}
            <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-gray-500" />
                  <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Cumulative Intelligence</h2>
                </div>

                {/* Animated new terms badge */}
                <motion.span
                  initial={{ opacity: 0, scale: 0.5, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }
                  }
                  className="inline-flex items-center gap-1 bg-violet-50 text-violet-400 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-violet-500/20"
                >
                  <Sparkles className="w-3 h-3" />
                  +{newTermsCount} new terms
                </motion.span>
              </div>

              {/* Project Contribution sub-header */}
              <div className="bg-gray-100 border border-black/[0.06] rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-3.5 h-3.5 text-straker-600" />
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-straker-600">Project Contribution</h3>
                </div>
                <p className="text-[13px] text-gray-700 mb-2">
                  This project added <span className="font-semibold text-straker-600">{newTermsCount} terms</span>,{' '}
                  <span className="font-semibold text-straker-600">{cumulative.patternsThisProject || 12} patterns</span>, and{' '}
                  <span className="font-semibold text-straker-600">{cumulative.segmentsThisProject || 86} segments</span> to your org brain.
                </p>
                <div className="flex items-center gap-4 text-[11px] text-gray-500">
                  <span>File: {data.fileName}</span>
                  <span>Agent: {data.agent?.name || 'Standard'}</span>
                </div>
              </div>

              <div className="bg-straker-500/[0.04] border border-straker-500/15 rounded-lg p-4 mb-4">
                <p className="text-[14px] text-gray-900 mb-1">
                  This project contributed <span className="font-semibold text-straker-600">{newTermsCount}</span> new entries to your Org Brain
                </p>
                <p className="text-[12px] text-gray-500 mb-3">
                  Org Brain: {(cumulative.glossaryTermsLearned || 1247).toLocaleString()} entries
                </p>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-gray-500">Knowledge Coverage</span>
                    <span className="text-[11px] text-gray-500">{glossaryCoverage}%</span>
                  </div>
                  <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-straker-600 to-straker-400 rounded-full"
                      initial={{ width: '0%' }}
                      animate={{ width: `${glossaryCoverage}%` }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-[12px] text-gray-500 mb-1">Patterns Captured</p>
                  <p className="text-[18px] font-semibold text-gray-900">{(cumulative.patternsCaptured || 342).toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">Reused across projects</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-1">Reusable Segments</p>
                  <p className="text-[18px] font-semibold text-gray-900">{(cumulative.reusableSegments || 1893).toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">Segment memory</p>
                </div>
                <div>
                  <p className="text-[12px] text-gray-500 mb-1">Time Saved</p>
                  <p className="text-[18px] font-semibold text-gray-900">{cumulative.timeSavedHours || 47}h</p>
                  <p className="text-[11px] text-gray-500">Estimated savings</p>
                </div>
              </div>
            </div>

            {/* Explore Org Brain CTA */}
            <div className="bg-gradient-to-r from-straker-500/[0.06] to-violet-500/[0.06] border border-straker-500/15 rounded-lg p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-straker-50 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-straker-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-gray-900">Explore your Org Brain</p>
                    <p className="text-[12px] text-gray-500">Visualize your knowledge graph, domain models, and learning history</p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenOrgBrain?.()}
                  className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber hover:bg-amber-deep text-white text-[13px] font-semibold transition-all cursor-pointer"
                >
                  Explore Org Brain
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>
            </div>

            {/* 8. Cumulative Intelligence Triage — Batch Governance */}
            <IntelligenceTriage
              onApprove={(items) => {
                console.log('Approved intelligence items:', items)
              }}
            />
          </div>
        )}

        {/* ===== COMPLIANCE TAB ===== */}
        {activeTab === 'compliance' && (
          <div className="space-y-6">
            {/* 8b. Compliance Gate Trigger — Multi-Stakeholder Handoff */}
            {onComplianceRequired ? (
              <>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[13px] font-semibold text-amber-300 mb-1">Human Review Required</h3>
                    <p className="text-[12px] text-gray-500 leading-relaxed mb-3">
                      Trust score is below threshold. 4 segments need human validation before this project can proceed. Assign a reviewer to resolve flagged items and retrain the model.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onReviewNow}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-[12px] font-semibold hover:bg-amber-deep transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Review Now
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={onComplianceRequired}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-black/[0.12] text-gray-500 text-[12px] font-medium hover:bg-black/[0.02] transition-colors cursor-pointer"
                      >
                        Assign to Reviewer
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inline flagged segments for quick resolution */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold">Flagged Segments</span>
                  <span className="text-[11px] text-gray-500 font-mono">{Object.keys(inlineResolutions).length}/4 resolved</span>
                </div>
                {INLINE_SEGMENTS.map((seg) => (
                  <InlineSegmentCard key={seg.id} segment={seg} resolution={inlineResolutions[seg.id]} onResolve={(action, data) => handleInlineResolve(seg.id, action, data)} />
                ))}
              </div>
              </>
            ) : (
              <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
                <div className="flex flex-col items-center gap-4 py-6">
                  <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>
                  <h3 className="text-[17px] font-semibold text-gray-900">All Clear</h3>
                  <p className="text-[13px] text-gray-500 text-center max-w-sm">
                    No compliance issues were detected. This project is cleared for auto-publish.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Org Brain now rendered at App level via onOpenOrgBrain prop */}

      {/* Diagnostic Modal — always rendered (outside tabs) */}
      <AnimatePresence>
        {diagnosticOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setDiagnosticOpen(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-100" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="relative w-full max-w-[640px] max-h-[85vh] overflow-y-auto bg-white border border-black/[0.12] rounded-lg "
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 bg-white border-b border-black/[0.12] px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{jaDiagnosticData.flag}</span>
                    <h3 className="text-[17px] font-semibold text-gray-900">Japanese Quality Diagnostic</h3>
                  </div>
                  <p className="text-[13px] text-gray-500">
                    Score: {jaDiagnosticData.score}/100 &middot; Agent: {jaDiagnosticData.agent}
                  </p>
                </div>
                <button
                  onClick={() => setDiagnosticOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/[0.06] text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-6">
                {/* Dimension Deep Dive */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-4 h-4 text-gray-500" />
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Dimension Deep Dive</h4>
                  </div>

                  {/* Terminology Match */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-semibold text-gray-900">Terminology Match</span>
                      <span className="text-[14px] font-mono font-semibold text-amber-400">{jaDiagnosticData.terminology.score}%</span>
                    </div>
                    <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full bg-amber-400"
                        initial={{ width: '0%' }}
                        animate={{ width: `${jaDiagnosticData.terminology.score}%` }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: 0.1 }}
                      />
                    </div>

                    <p className="text-[13px] text-gray-700 mb-3">
                      <span className="text-gray-500 font-medium">Root Cause: </span>
                      {jaDiagnosticData.terminology.rootCause}
                    </p>

                    {/* Term rows */}
                    <div className="border border-black/[0.12] rounded-lg overflow-hidden">
                      {jaDiagnosticData.terminology.terms.map((term, tIdx) => (
                        <motion.div
                          key={term.term}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            duration: prefersReducedMotion ? 0 : 0.3,
                            delay: prefersReducedMotion ? 0 : 0.2 + tIdx * 0.1,
                          }}
                          className={`p-3 hover:bg-black/[0.04] hover:border-l-[3px] hover:border-l-amber-400 transition-all ${tIdx > 0 ? 'border-t border-black/[0.12]' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[14px] text-gray-900 font-medium mb-0.5">
                                &ldquo;{term.term}&rdquo; <span className="text-gray-500 font-normal">({term.english})</span>
                              </p>
                              <p className="text-[12px] text-gray-500">
                                Used: {term.used} &middot; Expected: {term.expected}
                              </p>
                            </div>
                            <span className="text-[12px] font-semibold text-amber-400 whitespace-nowrap">
                              {term.impact} pts
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Cultural Adaptation */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-semibold text-gray-900">Cultural Adaptation</span>
                      <span className="text-[14px] font-mono font-semibold text-amber-400">{jaDiagnosticData.cultural.score}%</span>
                    </div>
                    <div className="h-2 bg-black/[0.03] rounded-full overflow-hidden mb-3">
                      <motion.div
                        className="h-full rounded-full bg-amber-400"
                        initial={{ width: '0%' }}
                        animate={{ width: `${jaDiagnosticData.cultural.score}%` }}
                        transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: 0.5 }}
                      />
                    </div>

                    <p className="text-[13px] text-gray-700">
                      <span className="text-gray-500 font-medium">Root Cause: </span>
                      {jaDiagnosticData.cultural.rootCause}
                    </p>
                  </div>

                  {/* Passing dimensions (collapsed) */}
                  <div className="flex items-center gap-4 text-[13px]">
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Regulatory &mdash; {jaDiagnosticData.regulatory.score}%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Reading Level &mdash; {jaDiagnosticData.readingLevel.score}%</span>
                    </div>
                  </div>
                </div>

                {/* Prescribed Actions */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Wrench className="w-4 h-4 text-gray-500" />
                    <h4 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Prescribed Actions</h4>
                  </div>

                  <p className="text-[13px] text-gray-700 mb-4">To improve future JA financial scores:</p>

                  <div className="space-y-4">
                    {/* Action 1: Add to Glossary */}
                    <div className="bg-gray-100 border border-black/[0.06] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-straker-50 text-straker-600 text-[12px] font-bold flex items-center justify-center shrink-0">1</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-900 mb-2">{jaDiagnosticData.actions[0].label}</p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleGlossaryAdd}
                              disabled={glossaryAdded}
                              className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                                glossaryAdded
                                  ? 'bg-emerald-50 text-emerald-400'
                                  : glossaryLoading
                                    ? 'bg-amber/50 text-white/70'
                                    : 'bg-amber hover:bg-amber-deep text-white'
                              }`}
                            >
                              {glossaryLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : glossaryAdded ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : null}
                              <span>{glossaryAdded ? 'Added' : jaDiagnosticData.actions[0].button}</span>
                              {!glossaryAdded && !glossaryLoading && (
                                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                              )}
                            </button>
                            <span className="text-[11px] text-emerald-400 font-medium">{jaDiagnosticData.actions[0].impactShort}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action 2: Enable Enhancement */}
                    <div className="bg-gray-100 border border-black/[0.06] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-straker-50 text-straker-600 text-[12px] font-bold flex items-center justify-center shrink-0">2</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-900 mb-2">{jaDiagnosticData.actions[1].label}</p>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {}}
                              className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-straker-50 hover:bg-straker-500/25 text-straker-600 text-[12px] font-semibold transition-all cursor-pointer"
                            >
                              <span>{jaDiagnosticData.actions[1].button}</span>
                              <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                            </button>
                            <span className="text-[11px] text-emerald-400 font-medium">{jaDiagnosticData.actions[1].impactShort}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action 3: Review manually */}
                    <div className="bg-gray-100 border border-black/[0.06] rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-straker-50 text-straker-600 text-[12px] font-bold flex items-center justify-center shrink-0">3</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-900 mb-2">{jaDiagnosticData.actions[2].label}</p>
                          <button
                            onClick={() => {}}
                            className="group inline-flex items-center gap-1 text-[12px] font-medium text-straker-600 hover:text-straker-300 transition-colors cursor-pointer"
                          >
                            <span>{jaDiagnosticData.actions[2].button}</span>
                            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Projected Next Score */}
                <div className="bg-emerald-500/[0.06] border border-emerald-500/15 rounded-lg p-4">
                  <p className="text-[13px] text-gray-700 mb-3">
                    If all 3 actions are taken, your next JA financial project is projected to score:
                  </p>
                  <div className="flex items-center gap-4">
                    <motion.span
                      className="text-[28px] font-mono font-bold text-amber-400"
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                    >
                      {jaDiagnosticData.projectedScore.from}
                    </motion.span>
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 48, opacity: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: 0.5 }}
                      className="flex items-center justify-center"
                    >
                      <ArrowRight className="w-6 h-6 text-gray-500" />
                    </motion.div>
                    <motion.span
                      className="text-[28px] font-mono font-bold text-emerald-400"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: 0.8, type: 'spring' }}
                    >
                      {jaDiagnosticData.projectedScore.to}
                    </motion.span>
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: prefersReducedMotion ? 0 : 0.3, delay: 1.2 }}
                      className="bg-emerald-50 text-emerald-400 text-[13px] font-semibold px-2 py-1 rounded-lg"
                    >
                      +{jaDiagnosticData.projectedScore.delta} points
                    </motion.span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function OutputFile({ name, type }) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-black/[0.02] transition-colors group">
      <FileText className="w-4 h-4 text-gray-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-gray-700 truncate">{name}</p>
        <p className="text-[11px] text-gray-500">{type}</p>
      </div>
      <button className="text-gray-500 hover:text-straker-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100">
        <Download className="w-4 h-4" />
      </button>
    </div>
  )
}
