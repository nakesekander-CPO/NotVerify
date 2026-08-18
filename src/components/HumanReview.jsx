import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Search, CheckCircle2, Circle, AlertTriangle, Clock,
  User, Send, Edit3, ChevronDown, ChevronUp, Sparkles,
  Globe, FileText, Shield, Bot, RotateCcw, Brain, ArrowRightLeft, Zap,
  Puzzle, Upload, MessageSquare, TicketCheck, Database, Play, X, ArrowRight, ShieldCheck,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'
import useKnowledgeRules from '../hooks/useKnowledgeRules'
import KnowledgeRuleModal from './KnowledgeRuleModal'
import RealignmentProgressBar from './RealignmentProgressBar'
import SmartHighlightFilter from './SmartHighlightFilter'
import FindReplaceDrawer from './FindReplaceDrawer'
import PropagationSettings, { usePropagationSettings } from './PropagationSettings'
import SemanticSearchPanel from './SemanticSearchPanel'
import ActiveEntitySurface from './ActiveEntitySurface'
import ConcordanceOverlay from './ConcordanceOverlay'

const springTransition = { type: 'spring', stiffness: 300, damping: 20 }

/* ─── Mock Data ─── */

const ALL_SEGMENTS = [
  {
    id: 'seg-001', segmentNumber: 1, flagged: false,
    source: 'ACME Corporation Q3 2024 Earnings Report',
    translation: 'ACME株式会社 2024年第3四半期決算報告書',
  },
  {
    id: 'seg-002', segmentNumber: 2, flagged: false,
    source: 'Prepared in accordance with US GAAP',
    translation: '米国会計基準に準拠して作成',
  },
  {
    id: 'seg-003', segmentNumber: 3, flagged: false,
    source: 'Total revenue for Q3 reached $28.5 million, representing a 15% increase over the prior year period.',
    translation: '第3四半期の総収益は2,850万ドルに達し、前年同期比15%の増加となりました。',
  },
  {
    id: 'seg-042', segmentNumber: 4, flagged: true, severity: 'critical',
    source: 'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
    translation: 'のれんの減損損失合計額¥630百万をASC 350に基づき計上しました。',
    issue: 'TSE filing requires ASBJ standard reference. ASC 350 → 企業会計基準第10号',
    suggestedFix: 'のれんの減損損失合計額¥630百万を企業会計基準第10号に基づき計上しました。',
    flaggedBy: 'J-GAAP Specialist', agentId: 'JP-FIN-3',
    diffOriginal: 'ASC 350', diffReplacement: '企業会計基準第10号',
  },
  {
    id: 'seg-018', segmentNumber: 5, flagged: true, severity: 'major',
    source: 'Revenue was recognized in accordance with ASC 606.',
    translation: '収益はASC 606に基づき認識されました。',
    issue: 'ASC 606 must be mapped to ASBJ 29 for Japanese market compliance',
    suggestedFix: '収益はASBJ第29号に基づき認識されました。',
    flaggedBy: 'J-GAAP Specialist', agentId: 'JP-FIN-3',
    diffOriginal: 'ASC 606', diffReplacement: 'ASBJ第29号',
  },
  {
    id: 'seg-006', segmentNumber: 6, flagged: false,
    source: 'Operating income increased 12% year-over-year',
    translation: '営業利益は前年同期比12%増加しました',
  },
  {
    id: 'seg-007', segmentNumber: 7, flagged: true, severity: 'major',
    source: 'Operating expenses totaled $12.8 million for the quarter.',
    translation: '四半期の営業費用は$12.8 millionでした。',
    issue: 'Currency must use Japanese denomination format for TSE filing',
    suggestedFix: '四半期の営業費用は¥1,920百万でした。',
    flaggedBy: 'J-GAAP Specialist', agentId: 'JP-FIN-3',
    diffOriginal: '$12.8 million', diffReplacement: '¥1,920百万',
  },
  {
    id: 'seg-008', segmentNumber: 8, flagged: false,
    source: 'Cash and cash equivalents at the end of the quarter totaled $45.2 million.',
    translation: '現金及び現金同等物は四半期末時点で4,520万ドルでした。',
  },
  {
    id: 'seg-009', segmentNumber: 9, flagged: false,
    source: 'Our Board of Directors declared a quarterly dividend of $0.15 per share.',
    translation: '当社の取締役会は1株当たり0.15ドルの四半期配当を宣言しました。',
  },
  {
    id: 'seg-031', segmentNumber: 10, flagged: true, severity: 'minor',
    source: 'We believe our investment strategy will yield positive results.',
    translation: '私たちの投資戦略は良い結果をもたらすと思います。',
    issue: 'Register too informal for TSE disclosure. Should use 当社は...認識しております pattern',
    suggestedFix: '当社の投資戦略は良好な成果をもたらすものと認識しております。',
    flaggedBy: 'Brand Voice Sentry', agentId: 'BV-SENT-1',
    diffOriginal: '私たちの投資戦略は良い結果をもたらすと思います。',
    diffReplacement: '当社の投資戦略は良好な成果をもたらすものと認識しております。',
  },
  {
    id: 'seg-011', segmentNumber: 11, flagged: false,
    source: 'For further information, contact Investor Relations at ir@acmecorp.com.',
    translation: '詳細については、お問い合わせください。投資家向け情報: ir@acmecorp.com',
  },
  {
    id: 'seg-012', segmentNumber: 12, flagged: false,
    source: 'This report contains forward-looking statements within the meaning of the Private Securities Litigation Reform Act.',
    translation: '本報告書には将来の見通しに関する記述が含まれています。',
  },
  // ── Propagation demo segments: identical & similar sources ──
  {
    id: 'seg-013', segmentNumber: 13, flagged: false,
    source: 'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
    translation: 'のれんの減損損失合計額¥630百万をASC 350に基づき計上しました。',
    _identical_to: 'seg-042',
  },
  {
    id: 'seg-014', segmentNumber: 14, flagged: false,
    source: 'Revenue was recognized in accordance with ASC 606.',
    translation: '収益はASC 606に基づき認識されました。',
    _identical_to: 'seg-018',
  },
  {
    id: 'seg-015', segmentNumber: 15, flagged: false,
    source: 'Goodwill impairment charges of $3.8 million were recorded under ASC 350 guidelines.',
    translation: 'のれんの減損損失額¥570百万をASC 350ガイドラインに基づき計上しました。',
    _similar_to: 'seg-042', _similarity: 0.89,
  },
  {
    id: 'seg-016', segmentNumber: 16, flagged: false,
    source: 'Revenue recognition followed ASC 606 standards for the reporting period.',
    translation: '当報告期間の収益認識はASC 606基準に従いました。',
    _similar_to: 'seg-018', _similarity: 0.85,
  },
  {
    id: 'seg-017', segmentNumber: 17, flagged: false,
    source: 'Total goodwill impairment charges of $4.2 million were recorded in accordance with ASC 350.',
    translation: 'のれんの減損損失合計額¥630百万をASC 350に基づき計上しました。',
    _identical_to: 'seg-042',
  },
]

const DEFAULT_REVIEW_REQUEST = {
  id: 'review-001',
  projectName: 'Q3 Earnings Report',
  fileName: 'Q3_Earnings_Final.docx',
  trustScore: 76,
  threshold: 85,
  locale: 'Japanese',
  localeCode: 'JA',
  assignedBy: { name: 'Alex Chen', initials: 'AC' },
  createdAt: new Date().toISOString(),
  allSegments: ALL_SEGMENTS,
  flaggedSegments: ALL_SEGMENTS.filter(s => s.flagged),
}

const TEAM_MEMBERS = [
  { id: 'kenji', name: 'Kenji Tanaka', initials: 'KT', role: 'Regional Lead (APAC)', region: 'APAC', status: 'online', relevance: 'JA locale + financial domain', recommended: true },
  { id: 'sarah', name: 'Sarah Chen', initials: 'SC', role: 'Senior Linguist (APAC)', region: 'APAC', status: 'online', relevance: 'JA quality specialist', recommended: true },
  { id: 'yuki', name: 'Yuki Nakamura', initials: 'YN', role: 'Compliance Auditor (APAC)', region: 'APAC', status: 'away', relevance: 'TSE compliance expert', recommended: true },
  { id: 'marcus', name: 'Marcus Weber', initials: 'MW', role: 'Regional Lead (EMEA)', region: 'EMEA', status: 'online' },
  { id: 'priya', name: 'Priya Patel', initials: 'PP', role: 'Legal Auditor (Global)', region: 'Global', status: 'offline' },
  { id: 'thomas', name: 'Thomas Park', initials: 'TP', role: 'QA Lead (APAC)', region: 'APAC', status: 'online' },
]

/* ─── Helpers ─── */

const severityOrder = { critical: 0, major: 1, minor: 2 }
const severityColor = {
  critical: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-500/30', dot: 'bg-red-500', leftBorder: 'border-l-red-500' },
  major: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-500/30', dot: 'bg-amber-400', leftBorder: 'border-l-amber-500' },
  minor: { bg: 'bg-blue-400/15', text: 'text-blue-600', border: 'border-blue-400/30', dot: 'bg-blue-400', leftBorder: 'border-l-blue-400' },
}

const statusColor = { online: 'bg-emerald-400', away: 'bg-amber-400', offline: 'bg-gray-500' }

const acceptReasons = [
  'AI suggestion correct',
  'Verified against standard',
  'Domain expert confirmed',
]

function trustScoreColor(score, threshold) {
  const gap = threshold - score
  if (gap >= 10) return { text: 'text-red-600', ring: 'stroke-red-400' }
  if (gap > 0) return { text: 'text-amber-600', ring: 'stroke-amber-400' }
  return { text: 'text-emerald-600', ring: 'stroke-emerald-400' }
}

function flagSummary(segments) {
  const counts = { critical: 0, major: 0, minor: 0 }
  segments.forEach(s => { counts[s.severity]++ })
  const parts = []
  if (counts.critical) parts.push(`${counts.critical} critical`)
  if (counts.major) parts.push(`${counts.major} major`)
  if (counts.minor) parts.push(`${counts.minor} minor`)
  return `${segments.length} segments flagged: ${parts.join(', ')}`
}

/* ─── Sub-components ─── */

function Avatar({ initials, size = 36, className = '' }) {
  return (
    <div
      className={`shrink-0 rounded-full flex items-center justify-center font-semibold text-xs ${className}`}
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg, #3D16FA 0%, #3D16FA 100%)',
        color: '#fff',
      }}
    >
      {initials}
    </div>
  )
}

function TrustScoreRing({ score, threshold, size = 96 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - score / 100)
  const center = size / 2
  const colors = trustScoreColor(score, threshold)

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}
      role="img" aria-label={`Trust Score: ${score}`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4"
        />
        <motion.circle cx={center} cy={center} r={radius}
          fill="none" className={colors.ring} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={springTransition}
        />
      </svg>
      <div className={`absolute inset-0 flex items-center justify-center font-mono text-xl font-bold ${colors.text}`}>
        {score}
      </div>
    </div>
  )
}

function ProgressRing({ reviewed, total, size = 80 }) {
  const radius = (size - 8) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? reviewed / total : 0
  const dashOffset = circumference * (1 - progress)
  const center = size / 2

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}
      role="img" aria-label={`${reviewed} of ${total} reviewed`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4"
        />
        <motion.circle cx={center} cy={center} r={radius}
          fill="none" stroke="#3D16FA" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          animate={{ strokeDashoffset: dashOffset }}
          transition={springTransition}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-lg font-bold text-gray-900">{reviewed}</span>
        <span className="text-[10px] text-gray-900/50">of {total}</span>
      </div>
    </div>
  )
}

function SeverityBadge({ severity }) {
  const c = severityColor[severity]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold uppercase ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {severity}
    </span>
  )
}

function LocaleBadge({ locale, localeCode }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#3D16FA]/15 text-[#3D16FA] text-xs font-semibold">
      <Globe className="w-3 h-3" />
      {localeCode || locale}
    </span>
  )
}

/* ─── Toast Component ─── */

function LearningToast({ toast, onDismiss, onTriggerRealignment, reduced }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.isKnowledgeRule ? 8000 : 3000)
    return () => clearTimeout(timer)
  }, [toast.id, toast.isKnowledgeRule, onDismiss])

  return (
    <motion.div
      layout
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, y: 40 }}
      transition={reduced ? { duration: 0 } : springTransition}
      className="flex items-center gap-3 px-4 py-3 rounded-lg border border-black/[0.12] "
      style={{ background: '#EDEFFB', borderLeft: toast.isPropagation ? '3px solid #0088FF' : toast.isKnowledgeRule ? '3px solid #A38DFF' : '3px solid #00B887' }}
    >
      {toast.isPropagation
        ? <Zap className="w-5 h-5 shrink-0 text-blue-500" />
        : <Brain className={`w-5 h-5 shrink-0 ${toast.isKnowledgeRule ? 'text-purple-500' : 'text-emerald-600'}`} />
      }
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900">
          {toast.isPropagation ? 'Truth Propagated' : toast.isKnowledgeRule ? 'Knowledge Rule saved' : 'Segment resolved & committed to Cortex'}
        </p>
        <p className="text-[11px] text-gray-900/40 mt-0.5">{toast.segLabel}</p>
        {toast.isKnowledgeRule && onTriggerRealignment && (
          <button
            onClick={() => { onTriggerRealignment(toast.ruleId); onDismiss(toast.id) }}
            className="mt-1.5 text-[11px] font-semibold text-purple-600 hover:text-purple-700 underline underline-offset-2 transition-colors"
          >
            Trigger AI Realignment &rarr;
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Minimap Scrollbar ─── */
function MinimapScrollbar({ flaggedSegments, allSegments, decisions, onJump }) {
  const total = allSegments.length
  return (
    <div className="w-3 shrink-0 relative bg-gray-50 border-l border-black/[0.06]">
      {/* Track background */}
      <div className="absolute inset-0 flex flex-col items-center py-1">
        <div className="w-px flex-1 bg-black/[0.04] rounded-full" />
      </div>
      {flaggedSegments.map(seg => {
        const idx = allSegments.findIndex(s => s.id === seg.id)
        const pct = total > 1 ? (idx / (total - 1)) * 96 + 2 : 50
        const resolved = !!decisions[seg.id]
        const colorClass = resolved
          ? 'bg-emerald-400'
          : seg.severity === 'critical'
            ? 'bg-red-500'
            : seg.severity === 'major'
              ? 'bg-amber-400'
              : 'bg-blue-400'
        return (
          <button
            key={seg.id}
            onClick={() => onJump(seg.id)}
            title={`SEG-${String(seg.segmentNumber).padStart(3, '0')} · ${seg.severity}`}
            className={`absolute left-0.5 right-0.5 h-[3px] rounded-full cursor-pointer transition-all hover:h-[5px] hover:left-px hover:right-px ${colorClass}`}
            style={{ top: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}

/* ─── Phase 1: Assign ─── */

function AssignPhase({ reviewRequest, teamMembers, onAssign, onBack, reduced }) {
  const [selectedMember, setSelectedMember] = useState(null)

  // Build smart default note from flagged segment context
  const smartNote = useMemo(() => {
    const segs = reviewRequest.flaggedSegments || [];
    if (segs.length === 0) return '';
    const counts = { critical: 0, major: 0, minor: 0 };
    segs.forEach(s => { if (s.severity) counts[s.severity]++; });
    const parts = [];
    if (counts.critical) parts.push(`${counts.critical} critical`);
    if (counts.major) parts.push(`${counts.major} major`);
    if (counts.minor) parts.push(`${counts.minor} minor`);
    const locale = reviewRequest.locale || reviewRequest.localeCode || '';
    return `${segs.length} flagged segments in ${locale} (${parts.join(', ')}). Trust score: ${reviewRequest.trustScore}/${reviewRequest.threshold}.`;
  }, [reviewRequest]);
  const [searchQuery, setSearchQuery] = useState('')
  const [note, setNote] = useState(null) // null = not yet initialized
  const [priority, setPriority] = useState('normal')

  const recommended = teamMembers.filter(m => m.recommended)
  const filtered = teamMembers.filter(m =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const grouped = useMemo(() => {
    const groups = {}
    filtered.forEach(m => {
      const region = m.region || 'Other'
      if (!groups[region]) groups[region] = []
      groups[region].push(m)
    })
    return groups
  }, [filtered])

  const topSegments = [...reviewRequest.flaggedSegments]
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const segCount = reviewRequest.flaggedSegments.length
  const estTime = Math.max(4, segCount * 3)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={reduced ? { duration: 0 } : springTransition}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-black/[0.12]">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-colors" aria-label="Go back">
          <ArrowLeft className="w-4 h-4 text-gray-900/60" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Get This Reviewed</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        {/* Primary action: Review it yourself */}
        <button
          onClick={() => { onAssign('self', 'Self-review'); }}
          className="shrink-0 w-full flex items-center gap-4 p-5 mb-4 rounded-xl border-2 border-straker-500/20 bg-straker-50/30 hover:bg-straker-50 transition-all cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-straker-50 border border-straker-500/15 flex items-center justify-center shrink-0 group-hover:bg-straker-100 transition-colors">
            <ShieldCheck className="w-5 h-5 text-straker-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-[14px] font-semibold text-gray-900">Review it myself</p>
            <p className="text-[12px] text-gray-500">Open the review workspace now — no waiting</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-straker-600 transition-colors" />
        </button>

        {/* Divider */}
        <div className="shrink-0 flex items-center gap-3 mb-4">
          <div className="flex-1 border-t border-black/[0.08]" />
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">or assign to your team</span>
          <div className="flex-1 border-t border-black/[0.08]" />
        </div>

        {/* Internal reviewer section */}
        <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Context */}
        <div className="w-[60%] overflow-y-auto pr-2 space-y-5" style={{ scrollbarWidth: 'thin' }}>
          {/* Project card */}
          <div className="rounded-lg p-5 space-y-4" style={{ background: '#EDEFFB' }}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#3D16FA]" />
                  <span className="text-sm font-semibold text-gray-900">{reviewRequest.projectName}</span>
                </div>
                <p className="text-xs text-gray-900/50">{reviewRequest.fileName}</p>
              </div>
              <LocaleBadge locale={reviewRequest.locale} localeCode={reviewRequest.localeCode} />
            </div>

            {/* Trust Score */}
            <div className="flex items-center gap-5">
              <TrustScoreRing score={reviewRequest.trustScore} threshold={reviewRequest.threshold} />
              <div className="space-y-1">
                <p className="text-sm text-gray-900/70">Trust Score</p>
                <p className="font-mono text-2xl font-bold">
                  <span className={trustScoreColor(reviewRequest.trustScore, reviewRequest.threshold).text}>
                    {reviewRequest.trustScore}
                  </span>
                  <span className="text-gray-900/30 text-base"> / {reviewRequest.threshold} threshold</span>
                </p>
              </div>
            </div>

            {/* Why flagged */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-900/60 uppercase tracking-wider">Why this was flagged</p>
              <div className="flex items-start gap-2 text-sm text-gray-900/70">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{flagSummary(reviewRequest.flaggedSegments)}</span>
              </div>
            </div>

            {/* Top segments preview */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-900/60 uppercase tracking-wider">Flagged Segments</p>
              {topSegments.map(seg => (
                <div key={seg.id} className={`rounded-lg px-3 py-2 border ${severityColor[seg.severity].border} ${severityColor[seg.severity].bg}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-900/70">SEG-{String(seg.segmentNumber).padStart(3, '0')}</span>
                    <SeverityBadge severity={seg.severity} />
                  </div>
                  <p className="text-xs text-gray-900/60 mt-1 line-clamp-1">{seg.issue}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Reviewer picker */}
        <div className="w-[40%] flex flex-col overflow-hidden rounded-lg" style={{ background: '#EDEFFB' }}>
          <div className="px-4 pt-4 pb-3 border-b border-black/[0.12]">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Assign Reviewer</h2>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-900/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search team..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-900/30 outline-none focus:border-[#3D16FA]/50 transition-colors"
              />
            </div>
          </div>

          {/* Status legend */}
          <div className="flex items-center gap-4 px-4 pt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Away</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Offline</span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ scrollbarWidth: 'thin' }}>
            {/* Recommended */}
            {!searchQuery && recommended.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold text-[#3D16FA] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> Recommended based on locale &amp; domain
                </p>
                {recommended.map(member => (
                  <MemberRow key={member.id} member={member} selected={selectedMember?.id === member.id}
                    onSelect={() => setSelectedMember(member)} showRelevance />
                ))}
              </div>
            )}

            {/* Grouped list */}
            {Object.entries(grouped).map(([region, members]) => (
              <div key={region} className="space-y-1.5">
                <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider">{region}</p>
                {members.filter(m => !m.recommended || searchQuery).map(member => (
                  <MemberRow key={member.id} member={member} selected={selectedMember?.id === member.id}
                    onSelect={() => setSelectedMember(member)} />
                ))}
              </div>
            ))}
          </div>

          {/* Selected confirmation */}
          <AnimatePresence>
            {selectedMember && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={reduced ? { duration: 0 } : { duration: 0.25 }}
                className="border-t border-black/[0.12] overflow-hidden"
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Avatar initials={selectedMember.initials} size={28} />
                    <span className="text-sm font-medium text-gray-900 flex-1">{selectedMember.name}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedMember(null); setNote(null); }}
                      className="text-[11px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                    >
                      Change
                    </button>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Review summary (editable)</label>
                    <textarea
                      value={note ?? smartNote}
                      onChange={e => setNote(e.target.value)}
                      placeholder="What should the reviewer focus on?"
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-900/30 outline-none focus:border-[#3D16FA]/50 resize-none transition-colors"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPriority('normal')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${priority === 'normal' ? 'bg-[#3D16FA] text-white' : 'bg-black/[0.03] text-gray-900/50 border border-black/[0.12]'}`}
                    >Normal</button>
                    <button
                      onClick={() => setPriority('urgent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${priority === 'urgent' ? 'bg-red-500 text-white' : 'bg-black/[0.03] text-gray-900/50 border border-black/[0.12]'}`}
                    >Urgent</button>
                  </div>
                  <p className="text-[11px] text-gray-900/40 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Avg review time: ~{estTime} min for {segCount} segments
                  </p>
                  <button
                    onClick={() => onAssign(selectedMember.id, note ?? smartNote)}
                    className="w-full py-2.5 rounded-lg bg-amber hover:bg-amber-deep text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 group relative"
                    title={`${selectedMember.name} will be notified and can start reviewing immediately`}
                  >
                    <Send className="w-3.5 h-3.5" /> Assign to {selectedMember.name.split(' ')[0]}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

        {/* arbitr professional service — demoted to quiet secondary option */}
        <div className="shrink-0 pt-3 mt-3 border-t border-black/[0.06]">
          <button
            onClick={() => onAssign('straker', 'Sent to arbitr for professional verification')}
            className="flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Need professional linguists? Send to arbitr</span>
            <span className="text-[10px] text-gray-300">~2 hrs · 0.54 TC</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function MemberRow({ member, selected, onSelect, showRelevance }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${selected ? 'bg-[#3D16FA]/15 border border-[#3D16FA]/30' : 'hover:bg-black/[0.04] border border-transparent'}`}
    >
      <div className="relative">
        <Avatar initials={member.initials} size={32} />
        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#EDEFFB] ${statusColor[member.status]}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
        <p className="text-[11px] text-gray-900/40 truncate">{member.role}</p>
        {showRelevance && member.relevance && (
          <p className="text-[10px] text-[#3D16FA]/80 mt-0.5">{member.relevance}</p>
        )}
      </div>
      {selected && <CheckCircle2 className="w-4 h-4 text-[#3D16FA] shrink-0" />}
    </button>
  )
}

/* ─── Phase 2: Review (Side-by-Side Workspace) ─── */

function ReviewPhase({ reviewRequest, onSubmitReview, onBack, reduced, reviewerProfile = null }) {
  const [decisions, setDecisions] = useState({})
  const [expandedSegId, setExpandedSegId] = useState(null)
  const [expandedAction, setExpandedAction] = useState({})
  const [toasts, setToasts] = useState([])
  const toastIdRef = useRef(0)

  // Resizable panels
  const [leftWidth, setLeftWidth] = useState(260)
  const [rightWidth, setRightWidth] = useState(272)
  const panelContainerRef = useRef(null)

  function startPanelDrag(side, e) {
    e.preventDefault()
    const startX = e.clientX
    const startLeft = leftWidth
    const startRight = rightWidth
    const container = panelContainerRef.current
    const totalW = container ? container.offsetWidth : window.innerWidth

    function onMove(ev) {
      const delta = ev.clientX - startX
      if (side === 'left') {
        setLeftWidth(Math.max(160, Math.min(500, startLeft + delta)))
      } else {
        setRightWidth(Math.max(200, Math.min(500, startRight - delta)))
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // AI Steering state
  const { rules, addRule, createRealignment } = useKnowledgeRules()
  const [knowledgeRuleModalOpen, setKnowledgeRuleModalOpen] = useState(false)
  const [knowledgeRuleContext, setKnowledgeRuleContext] = useState(null)
  const [findReplaceOpen, setFindReplaceOpen] = useState(false)
  const [realignmentState, setRealignmentState] = useState({ isRunning: false, ruleId: null, total: 0, processed: 0 })
  const [realignedSegments, setRealignedSegments] = useState({})
  const [showOnlyRealigned, setShowOnlyRealigned] = useState(false)
  const realignmentRef = useRef(null)

  // Propagation state (Epic 2)
  const [propSettings, setPropSettings] = usePropagationSettings()
  const [propagatedSegments, setPropagatedSegments] = useState({})

  // Semantic Memory & Intelligence (Epic 3)
  const [focusedSegId, setFocusedSegId] = useState(null)
  const [concordanceOpen, setConcordanceOpen] = useState(false)
  const [concordanceText, setConcordanceText] = useState('')
  const [contextMenuPos, setContextMenuPos] = useState(null)
  const [contextMenuText, setContextMenuText] = useState('')
  const [viewMode, setViewMode] = useState('document') // 'document' | 'segmented'
  const segmentRefs = useRef({})
  const docAreaRef = useRef(null)

  const allSegments = reviewRequest.allSegments || reviewRequest.flaggedSegments
  const flaggedSegments = reviewRequest.flaggedSegments
  const flaggedIds = useMemo(() => new Set(flaggedSegments.map(s => s.id)), [flaggedSegments])

  const reviewedCount = Object.keys(decisions).length
  const allCriticalMajorDone = flaggedSegments
    .filter(s => s.severity === 'critical' || s.severity === 'major')
    .every(s => decisions[s.id])
  const canSubmit = allCriticalMajorDone

  const addToast = useCallback((segLabel) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, segLabel }])
  }, [])

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  function setDecision(segId, decision, segLabel) {
    setDecisions(prev => ({ ...prev, [segId]: decision }))
    setExpandedSegId(null)
    if (decision.action === 'confirm' || decision.action === 'edit') {
      if (decision.action === 'confirm') addToast(segLabel)
      // Trigger intelligent propagation
      const sourceSeg = allSegments.find(s => s.id === segId)
      if (sourceSeg) {
        const committedTranslation = decision.translation || sourceSeg.suggestedFix || sourceSeg.translation
        triggerPropagation(segId, sourceSeg.source, committedTranslation, decision)
      }
    }
  }

  function clearDecision(segId) {
    setDecisions(prev => {
      const next = { ...prev }
      delete next[segId]
      return next
    })
  }

  function handleSubmit() {
    const results = {
      reviewId: reviewRequest.id,
      decisions: Object.entries(decisions).map(([segId, d]) => ({ segmentId: segId, ...d })),
      completedAt: new Date().toISOString(),
    }
    onSubmitReview(results)
  }

  function toggleSegment(segId) {
    if (!flaggedIds.has(segId)) return
    setExpandedSegId(prev => prev === segId ? null : segId)
  }

  // ── Intelligent Propagation (Epic 2) ──

  function triggerPropagation(fromSegId, sourceText, committedTranslation, decision) {
    const newPropagated = { ...propagatedSegments }
    const newDecisions = {}
    let exactCount = 0
    let highConfCount = 0
    let reviewCount = 0

    allSegments.forEach(seg => {
      if (seg.id === fromSegId || decisions[seg.id] || propagatedSegments[seg.id]) return

      // Story 1: 100% identical source → instant deterministic propagation
      if (seg.source === sourceText && propSettings.propagateExact) {
        if (!propSettings.overwriteVerified || !decisions[seg.id]) {
          newPropagated[seg.id] = { type: 'exact', fromSegId, confidence: 100, committedTranslation }
          newDecisions[seg.id] = { action: 'confirm', reason: 'Systemically Verified (100% match)', translation: committedTranslation, via: 'propagation-exact' }
          exactCount++
        }
        return
      }

      // Story 2 & 3: Fuzzy match scoring
      const similarity = seg._similarity || computeSimilarity(seg.source, sourceText)
      if (similarity < 0.5) return // below minimum threshold

      const confidencePercent = Math.round(similarity * 100)

      if (propSettings.allowHighConfidence && confidencePercent >= propSettings.highConfidenceThreshold) {
        // Story 2: High-confidence auto-apply (stays unverified for human sign-off)
        newPropagated[seg.id] = { type: 'high-confidence', fromSegId, confidence: confidencePercent, committedTranslation }
        highConfCount++
      } else if (confidencePercent >= 60) {
        // Story 3: Low/Medium confidence → friction, require review
        newPropagated[seg.id] = { type: 'review-recommended', fromSegId, confidence: confidencePercent, committedTranslation }
        reviewCount++
      }
    })

    if (exactCount > 0 || highConfCount > 0 || reviewCount > 0) {
      setPropagatedSegments(newPropagated)
      if (Object.keys(newDecisions).length > 0) {
        setDecisions(prev => ({ ...prev, ...newDecisions }))
      }
      // Show propagation summary toast
      const parts = []
      if (exactCount > 0) parts.push(`${exactCount} identical`)
      if (highConfCount > 0) parts.push(`${highConfCount} high-confidence`)
      if (reviewCount > 0) parts.push(`${reviewCount} need review`)
      const id = ++toastIdRef.current
      setToasts(prev => [...prev, { id, segLabel: `Propagated: ${parts.join(', ')}`, isPropagation: true }])
    }
  }

  // Simple similarity scoring for demo (Jaccard-like on word tokens)
  function computeSimilarity(a, b) {
    const wordsA = new Set(a.toLowerCase().split(/\s+/))
    const wordsB = new Set(b.toLowerCase().split(/\s+/))
    let intersection = 0
    wordsA.forEach(w => { if (wordsB.has(w)) intersection++ })
    const union = new Set([...wordsA, ...wordsB]).size
    return union === 0 ? 0 : intersection / union
  }

  // ── AI Steering functions ──

  function handleSaveKnowledgeRule(ruleData) {
    const newRule = addRule(ruleData)
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, segLabel: 'Knowledge Rule saved', isKnowledgeRule: true, ruleId: newRule.id }])
    setKnowledgeRuleModalOpen(false)
  }

  function handleTriggerRealignment(ruleId) {
    const rule = rules.find(r => r.id === ruleId) || (ruleId === realignmentRef.current?.ruleId ? null : null)
    // Find the rule we just added — it may not be in `rules` yet since state batching
    const freshRules = JSON.parse(localStorage.getItem('nv-knowledge-rules') || '[]')
    const theRule = freshRules.find(r => r.id === ruleId)
    if (!theRule) return

    const lockedIds = new Set(Object.keys(decisions))
    const { start, cancel, total } = createRealignment(theRule, allSegments, lockedIds, {
      onProgress: ({ processed, total: t, realigned }) => {
        setRealignmentState({ isRunning: true, ruleId, total: t, processed })
        const newRealigned = {}
        realigned.forEach(r => {
          newRealigned[r.segId] = { realigned: true, previousTranslation: r.previousTranslation, ruleId: r.ruleId, verified: false, deterministic: false }
        })
        setRealignedSegments(prev => ({ ...prev, ...newRealigned }))
      },
      onComplete: (realigned) => {
        setRealignmentState({ isRunning: false, ruleId: null, total: 0, processed: 0 })
        const id = ++toastIdRef.current
        setToasts(prev => [...prev, { id, segLabel: `Realignment complete — ${realigned.length} segments updated` }])
      },
    })
    realignmentRef.current = { cancel, ruleId }
    setRealignmentState({ isRunning: true, ruleId, total, processed: 0 })
    start()
  }

  function handleCancelRealignment() {
    if (realignmentRef.current?.cancel) realignmentRef.current.cancel()
    setRealignmentState({ isRunning: false, ruleId: null, total: 0, processed: 0 })
  }

  function handleVerifyAll() {
    const newDecisions = { ...decisions }
    Object.entries(realignedSegments).forEach(([segId, info]) => {
      if (info.realigned && !info.verified) {
        newDecisions[segId] = { action: 'confirm', reason: 'AI realignment verified', translation: null, via: 'realignment', ruleId: info.ruleId }
        setRealignedSegments(prev => ({ ...prev, [segId]: { ...prev[segId], verified: true } }))
      }
    })
    setDecisions(newDecisions)
  }

  function handleDeterministicReplace(replacements) {
    const newRealigned = { ...realignedSegments }
    replacements.forEach(r => {
      newRealigned[r.segId] = { realigned: true, previousTranslation: r.previousTranslation, ruleId: null, verified: false, deterministic: true }
    })
    setRealignedSegments(newRealigned)
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, segLabel: `Replaced ${replacements.length} segments deterministically` }])
  }

  // Keyboard shortcut for Shift+V to verify selected realigned segment
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.shiftKey && e.key === 'V' && expandedSegId && realignedSegments[expandedSegId]?.realigned && !realignedSegments[expandedSegId]?.verified) {
        setDecisions(prev => ({ ...prev, [expandedSegId]: { action: 'confirm', reason: 'AI realignment verified (Shift+V)', translation: null, via: 'realignment' } }))
        setRealignedSegments(prev => ({ ...prev, [expandedSegId]: { ...prev[expandedSegId], verified: true } }))
        setExpandedSegId(null)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [expandedSegId, realignedSegments])

  // Concordance keyboard shortcut: Ctrl+Shift+F / Cmd+Shift+F
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault()
        const sel = window.getSelection()?.toString()?.trim()
        if (sel) {
          setConcordanceText(sel)
          setConcordanceOpen(true)
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Context menu handler for "Find all in Corpus"
  function handleContextMenu(e) {
    const sel = window.getSelection()?.toString()?.trim()
    if (sel && sel.length > 0 && sel.length < 200) {
      e.preventDefault()
      setContextMenuText(sel)
      setContextMenuPos({ x: e.clientX, y: e.clientY })
    }
  }

  // Dismiss context menu on click
  useEffect(() => {
    if (!contextMenuPos) return
    function handleClick() { setContextMenuPos(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenuPos])

  // Scroll to a specific segment and flash it
  function scrollToSegment(segId) {
    const el = segmentRefs.current[segId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-yellow-400', 'ring-offset-1')
      setTimeout(() => el.classList.remove('ring-2', 'ring-yellow-400', 'ring-offset-1'), 1500)
    }
  }

  const focusedSegment = focusedSegId ? allSegments.find(s => s.id === focusedSegId) : null

  const realignedPendingCount = Object.values(realignedSegments).filter(r => r.realigned && !r.verified).length

  // Filter segments — apply realignment filter, then reviewer profile scoping
  const profileFilteredSegments = (() => {
    if (!reviewerProfile) return allSegments;
    return allSegments.filter(seg => {
      // Locale filter: if reviewer is scoped to specific locales, match on
      // the reviewRequest's locale (all segments in this request share one locale)
      if (reviewerProfile.locales?.length > 0) {
        const reqLocale = (reviewRequest.localeCode || reviewRequest.locale || '').toLowerCase();
        if (!reviewerProfile.locales.some(l => l.toLowerCase() === reqLocale)) return false;
      }
      // Domain filter: match flaggedBy agent against domain list (heuristic)
      if (reviewerProfile.domains?.length > 0) {
        const segDomain = seg.flaggedBy ?? '';
        const domainMatch = reviewerProfile.domains.some(d =>
          segDomain.toLowerCase().includes(d.toLowerCase()) ||
          (reviewRequest.classification ?? '').toLowerCase().includes(d.toLowerCase())
        );
        if (!domainMatch) return false;
      }
      return true;
    });
  })();

  const displaySegments = showOnlyRealigned
    ? profileFilteredSegments.filter(seg => realignedSegments[seg.id]?.realigned && !realignedSegments[seg.id]?.verified)
    : profileFilteredSegments

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={reduced ? { duration: 0 } : springTransition}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-black/[0.12]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-colors" aria-label="Go back">
            <ArrowLeft className="w-4 h-4 text-gray-900/60" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Review: {reviewRequest.projectName} — {reviewRequest.locale}
          </h1>
          <LocaleBadge locale={reviewRequest.locale} localeCode={reviewRequest.localeCode} />
          <div className="ml-auto flex items-center gap-2">
            <PropagationSettings settings={propSettings} onUpdate={setPropSettings} />
            <button
              onClick={() => setFindReplaceOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-black/[0.12] text-[11px] font-semibold text-gray-600 hover:bg-black/[0.04] transition-colors"
              aria-label="Find and replace"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Find &amp; Replace
            </button>
          </div>
        </div>
      </div>

      {/* Main layout: Source Rail + Narrative Canvas + Intelligence Sidebar */}
      <div ref={panelContainerRef} className="flex-1 flex overflow-hidden">

        {/* ─── Source Context Rail (left) ─── */}
        <div
          ref={docAreaRef}
          className="shrink-0 overflow-y-auto"
          style={{ width: leftWidth, scrollbarWidth: 'thin', background: '#F4F5FF' }}
          onScroll={(e) => {
            // Sync scroll source → narrative (proportional)
            const narrativeEl = document.getElementById('narrative-canvas')
            if (narrativeEl && !narrativeEl._syncing) {
              docAreaRef.current._syncing = true
              const pct = e.target.scrollTop / (e.target.scrollHeight - e.target.clientHeight || 1)
              narrativeEl.scrollTop = pct * (narrativeEl.scrollHeight - narrativeEl.clientHeight)
              setTimeout(() => { docAreaRef.current._syncing = false }, 50)
            }
          }}
        >
          {/* Source header */}
          <div className="sticky top-0 z-10 px-4 py-2 border-b border-black/[0.08]" style={{ background: '#F4F5FF' }}>
            <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider">Source Document</p>
          </div>
          <div className="p-4 space-y-0">
            {displaySegments.map(seg => {
              const isFocused = focusedSegId === seg.id
              const isFlagged = flaggedIds.has(seg.id)
              return (
                <p
                  key={seg.id}
                  onClick={() => scrollToSegment(seg.id)}
                  className={`text-[12px] leading-relaxed py-1 px-2 rounded-md cursor-pointer transition-all duration-200 ${
                    isFocused
                      ? 'bg-[#3D16FA]/10 text-gray-900'
                      : isFlagged
                        ? 'text-gray-700 hover:bg-black/[0.03]'
                        : 'text-gray-500 hover:bg-black/[0.03]'
                  }`}
                >
                  {seg.source}
                  {isFlagged && isFocused && (
                    <span className={`ml-1 inline-flex items-center px-1 py-0.5 rounded text-[8px] font-bold uppercase ${severityColor[flaggedSegments.find(f => f.id === seg.id).severity].bg} ${severityColor[flaggedSegments.find(f => f.id === seg.id).severity].text}`}>
                      {flaggedSegments.find(f => f.id === seg.id).severity}
                    </span>
                  )}
                </p>
              )
            })}
          </div>
        </div>

        {/* ─── Left resize handle ─── */}
        <div
          className="w-[5px] shrink-0 cursor-col-resize group relative flex items-center justify-center border-x border-black/[0.12] hover:border-[#3D16FA]/40 transition-colors"
          style={{ background: '#EDEFFB' }}
          onMouseDown={(e) => startPanelDrag('left', e)}
        >
          <div className="w-px h-8 rounded-full bg-black/[0.15] group-hover:bg-[#3D16FA]/50 transition-colors" />
        </div>

        {/* ─── Continuous Narrative Canvas (center) ─── */}
        <div className="flex-1 flex overflow-hidden">
        <div
          id="narrative-canvas"
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
          onContextMenu={handleContextMenu}
          onScroll={(e) => {
            // Sync scroll narrative → source (proportional)
            if (docAreaRef.current && !docAreaRef.current._syncing) {
              const el = e.target
              el._syncing = true
              const pct = el.scrollTop / (el.scrollHeight - el.clientHeight || 1)
              docAreaRef.current.scrollTop = pct * (docAreaRef.current.scrollHeight - docAreaRef.current.clientHeight)
              setTimeout(() => { el._syncing = false }, 50)
            }
          }}
        >
          {/* Reviewer profile scoping banner */}
          {reviewerProfile && (reviewerProfile.locales?.length > 0 || reviewerProfile.domains?.length > 0) && (
            <div className="flex items-center gap-2 px-6 py-2 bg-[#3D16FA]/[0.04] border-b border-[#3D16FA]/20 text-[11px] text-[#3D16FA]">
              <span className="font-semibold">Scoped view:</span>
              {reviewerProfile.locales?.length > 0 && (
                <span className="flex items-center gap-1">
                  Locales: {reviewerProfile.locales.map(l => l.toUpperCase()).join(', ')}
                </span>
              )}
              {reviewerProfile.domains?.length > 0 && (
                <span className="flex items-center gap-1">
                  · Domains: {reviewerProfile.domains.join(', ')}
                </span>
              )}
              <span className="ml-auto text-[#3D16FA]/60">
                {displaySegments.length} of {allSegments.length} segments in your queue
              </span>
            </div>
          )}

          {/* Realignment progress bar */}
          <AnimatePresence>
            <RealignmentProgressBar
              isRunning={realignmentState.isRunning}
              processed={realignmentState.processed}
              total={realignmentState.total}
              onCancel={handleCancelRealignment}
              reduced={reduced}
            />
          </AnimatePresence>

          {/* Document minimap bar */}
          <div className="sticky top-0 z-10 border-b border-black/[0.08] bg-white">
            <div className="flex items-center gap-1.5 px-6 py-1.5">
              <FileText className="w-3 h-3 text-gray-400" />
              {/* View Mode toggle */}
              <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 rounded-md">
                {[['document', 'Full Document'], ['segmented', 'Segmented']].map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-medium transition-all cursor-pointer ${
                      viewMode === mode
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gray-300 mx-1">·</span>
              <span className="text-[10px] text-gray-400">{displaySegments.length} segments</span>
              <div className="flex-1" />
              {/* Flag jump nav */}
              <div className="flex items-center gap-1">
                {flaggedSegments.map(fs => {
                  const resolved = !!decisions[fs.id]
                  return (
                    <button
                      key={fs.id}
                      onClick={() => scrollToSegment(fs.id)}
                      className="group relative"
                      title={`SEG-${String(fs.segmentNumber).padStart(3, '0')} · ${fs.severity}`}
                    >
                      <span className={`block w-2.5 h-2.5 rounded-full transition-all ${
                        resolved
                          ? 'bg-emerald-400 scale-90'
                          : expandedSegId === fs.id
                            ? `${severityColor[fs.severity].dot} scale-125 ring-2 ring-offset-1 ${fs.severity === 'critical' ? 'ring-red-300' : fs.severity === 'major' ? 'ring-amber-300' : 'ring-blue-300'}`
                            : `${severityColor[fs.severity].dot} hover:scale-110`
                      }`} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Segmented CAT-tool view */}
          {viewMode === 'segmented' && (
            <div className="px-6 py-4 space-y-2">
              {displaySegments.map(seg => {
                const isFlagged = flaggedIds.has(seg.id)
                const flaggedData = isFlagged ? flaggedSegments.find(f => f.id === seg.id) : null
                const decision = decisions[seg.id]
                const isFocused = focusedSegId === seg.id
                return (
                  <div
                    key={seg.id}
                    ref={el => { segmentRefs.current[seg.id] = el }}
                    onMouseEnter={() => setFocusedSegId(seg.id)}
                    onClick={() => isFlagged && toggleSegment(seg.id)}
                    className={`grid grid-cols-2 gap-0 rounded-lg border overflow-hidden text-[13px] leading-relaxed transition-all cursor-default ${
                      isFocused ? 'border-[#3D16FA]/30 shadow-sm' : 'border-black/[0.08]'
                    } ${isFlagged && !decision ? (
                      flaggedData?.severity === 'critical' ? 'border-l-4 border-l-red-400 cursor-pointer' :
                      flaggedData?.severity === 'major' ? 'border-l-4 border-l-amber-400 cursor-pointer' :
                      'border-l-4 border-l-blue-400 cursor-pointer'
                    ) : decision ? 'border-l-4 border-l-emerald-400' : ''}`}
                  >
                    {/* Source */}
                    <div className={`px-4 py-3 text-gray-500 border-r border-black/[0.06] ${isFocused ? 'bg-[#3D16FA]/[0.03]' : 'bg-gray-50/60'}`}>
                      <span className="font-mono text-[9px] text-gray-300 block mb-1">
                        SEG-{String(seg.segmentNumber).padStart(3, '0')} · EN
                      </span>
                      {seg.source}
                    </div>
                    {/* Target */}
                    <div className={`px-4 py-3 ${decision ? 'bg-emerald-50/40' : isFlagged ? (flaggedData?.severity === 'critical' ? 'bg-red-50/40' : flaggedData?.severity === 'major' ? 'bg-amber-50/30' : 'bg-blue-50/30') : 'bg-white'}`}>
                      <span className="font-mono text-[9px] text-gray-300 block mb-1">
                        JA {isFlagged && !decision && <span className={`ml-1 font-bold uppercase ${flaggedData?.severity === 'critical' ? 'text-red-400' : flaggedData?.severity === 'major' ? 'text-amber-400' : 'text-blue-400'}`}>{flaggedData?.severity}</span>}
                        {decision && <span className="ml-1 text-emerald-500 font-semibold">✓ Done</span>}
                      </span>
                      <span className={isFlagged && !decision ? (
                        flaggedData?.severity === 'critical'
                          ? 'underline decoration-wavy decoration-red-400/60 underline-offset-3'
                          : flaggedData?.severity === 'major'
                            ? 'underline decoration-wavy decoration-amber-400/60 underline-offset-3'
                            : 'underline decoration-wavy decoration-blue-400/60 underline-offset-3'
                      ) : ''}>
                        {decision?.translation || decision?.editedTranslation || seg.translation}
                      </span>
                      {isFlagged && !decision && <AlertTriangle className={`inline ml-1 w-3 h-3 align-text-bottom ${flaggedData?.severity === 'critical' ? 'text-red-500' : flaggedData?.severity === 'major' ? 'text-amber-400' : 'text-blue-400'}`} />}
                      {decision && <CheckCircle2 className="inline ml-1 w-3 h-3 text-emerald-500 align-text-bottom" />}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Full Document mode — true document flow */}
          {viewMode === 'document' && (
          <div className="py-10 px-4">
            {/* Paper card */}
            <div
              className="max-w-[680px] xl:max-w-[760px] 2xl:max-w-[840px] mx-auto bg-white rounded-xl border border-black/[0.07] px-16 xl:px-20 py-14 xl:py-16"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 12px 40px rgba(0,0,0,0.07)', fontFamily: "'Inter', system-ui, sans-serif" }}
            >
              {(() => {
                // Group segments into document blocks
                const segs = displaySegments
                const blocks = []
                if (segs.length > 0) blocks.push({ type: 'title', segs: [segs[0]] })
                if (segs.length > 1) blocks.push({ type: 'lead', segs: [segs[1]] })
                if (segs.length > 2) {
                  const body = segs.slice(2)
                  for (let i = 0; i < body.length; i += 3) {
                    blocks.push({ type: 'body', segs: body.slice(i, i + 3) })
                  }
                }

                const renderSegInline = (seg) => {
                  const isFlagged = flaggedIds.has(seg.id)
                  const flaggedData = isFlagged ? flaggedSegments.find(f => f.id === seg.id) : null
                  const isExpanded = expandedSegId === seg.id
                  const decision = decisions[seg.id]
                  const propInfo = propagatedSegments[seg.id]
                  const translationText = propInfo?.committedTranslation || seg.translation

                  if (isFlagged && !decision) {
                    return (
                      <span key={seg.id} ref={el => { segmentRefs.current[seg.id] = el }} onMouseEnter={() => setFocusedSegId(seg.id)} className="relative">
                        <span
                          onClick={() => toggleSegment(seg.id)}
                          className={`cursor-pointer ${flaggedData.severity === 'critical' ? 'underline decoration-wavy decoration-red-500' : flaggedData.severity === 'major' ? 'underline decoration-wavy decoration-amber-400' : 'underline decoration-wavy decoration-blue-400'}`}
                          style={{ textDecorationSkipInk: 'none', textUnderlineOffset: '3px' }}
                        >{translationText}</span>
                        <AlertTriangle
                          onClick={() => toggleSegment(seg.id)}
                          className={`inline-block ml-0.5 w-3 h-3 cursor-pointer align-text-top ${flaggedData.severity === 'critical' ? 'text-red-500' : flaggedData.severity === 'major' ? 'text-amber-400' : 'text-blue-400'}`}
                        />
                        {/* Anchored popover — block-level but absolutely positioned so it doesn't break text flow */}
                        <AnimatePresence>
                          {isExpanded && !decision && (
                            <motion.div
                              initial={{ opacity: 0, y: 4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 4, scale: 0.98 }}
                              transition={{ duration: 0.15 }}
                              className="absolute left-0 top-full mt-2 z-30 w-80 rounded-lg border border-black/[0.12] bg-white overflow-hidden"
                              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <div className={`px-4 py-2.5 ${severityColor[flaggedData.severity].bg} border-b ${severityColor[flaggedData.severity].border}`}>
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${severityColor[flaggedData.severity].text}`} />
                                  <div>
                                    <p className={`text-xs font-medium ${severityColor[flaggedData.severity].text}`}>{flaggedData.issue}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <SeverityBadge severity={flaggedData.severity} />
                                      <span className="font-mono text-[10px] text-gray-500">SEG-{String(seg.segmentNumber).padStart(3, '0')}</span>
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#3D16FA]/10 text-[9px] font-mono font-semibold text-[#3D16FA]"><Bot className="w-2.5 h-2.5" />{flaggedData.agentId}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="px-4 py-3 border-b border-black/[0.06]">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">AI Suggestion</p>
                                <div className="text-[13px] leading-relaxed mb-2">
                                  <span className="line-through text-red-500/70">{flaggedData.diffOriginal}</span>
                                  <span className="mx-1.5 text-gray-300">→</span>
                                  <span className="text-emerald-600 bg-emerald-50 px-1 rounded">{flaggedData.diffReplacement}</span>
                                </div>
                                <p className="text-[12px] text-gray-600 p-2 rounded bg-gray-50 font-mono">{flaggedData.suggestedFix}</p>
                              </div>
                              <div className="px-4 py-3">
                                <SegmentActionBar
                                  segment={flaggedData}
                                  expandedAction={expandedAction[seg.id]}
                                  onExpandAction={action => setExpandedAction(prev => ({ ...prev, [seg.id]: action }))}
                                  onDecide={d => setDecision(seg.id, d, `SEG-${String(seg.segmentNumber).padStart(3, '0')} ${flaggedData.severity}`)}
                                  reduced={reduced}
                                  onOpenKnowledgeRule={(sourceTerm, targetTerm) => { setKnowledgeRuleContext({ sourceTerm, targetTerm, segmentId: seg.id }); setKnowledgeRuleModalOpen(true) }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {' '}
                      </span>
                    )
                  }
                  if (isFlagged && decision) {
                    return (
                      <span key={seg.id} ref={el => { segmentRefs.current[seg.id] = el }} onMouseEnter={() => setFocusedSegId(seg.id)} onClick={() => toggleSegment(seg.id)} className="relative cursor-pointer">
                        <span className="bg-emerald-50/70 rounded-sm">{decision.translation || flaggedData?.suggestedFix || translationText}</span>
                        <CheckCircle2 className="inline ml-0.5 w-3 h-3 text-emerald-500 align-text-top" />
                        {' '}
                      </span>
                    )
                  }
                  return (
                    <span key={seg.id} ref={el => { segmentRefs.current[seg.id] = el }} onMouseEnter={() => setFocusedSegId(seg.id)}>
                      {translationText}{' '}
                    </span>
                  )
                }

                return blocks.map((block, bIdx) => {
                  if (block.type === 'title') return (
                    <h1 key={bIdx} className="text-[20px] font-bold text-gray-900 text-center mb-1.5 leading-tight">
                      {block.segs.map(renderSegInline)}
                    </h1>
                  )
                  if (block.type === 'lead') return (
                    <p key={bIdx} className="text-[13px] text-gray-400 text-center mb-10 pb-8 border-b border-black/[0.07]">
                      {block.segs.map(renderSegInline)}
                    </p>
                  )
                  return (
                    <p key={bIdx} className="text-[14.5px] leading-[2] text-gray-800 mb-5 relative">
                      {block.segs.map(renderSegInline)}
                    </p>
                  )
                })
              })()}
            </div>
          </div>
          )}{/* end viewMode === 'document' */}
        </div>{/* end narrative-canvas */}
        {/* Minimap scrollbar */}
        <MinimapScrollbar
          flaggedSegments={flaggedSegments}
          allSegments={allSegments}
          decisions={decisions}
          onJump={scrollToSegment}
        />
        </div>{/* end center column wrapper */}

        {/* ─── Right resize handle ─── */}
        <div
          className="w-[5px] shrink-0 cursor-col-resize group relative flex items-center justify-center border-x border-black/[0.12] hover:border-[#3D16FA]/40 transition-colors"
          style={{ background: '#EDEFFB' }}
          onMouseDown={(e) => startPanelDrag('right', e)}
        >
          <div className="w-px h-8 rounded-full bg-black/[0.15] group-hover:bg-[#3D16FA]/50 transition-colors" />
        </div>

        {/* ─── Intelligence + Navigation Sidebar (right) ─── */}
        <div className="shrink-0 overflow-y-auto" style={{ width: rightWidth, background: '#EDEFFB', scrollbarWidth: 'thin' }}>
          <div className="p-4 space-y-4">
            {/* Intelligence Search (Story 1 + 4) */}
            <SemanticSearchPanel
              rules={rules}
              onNavigateToSegment={scrollToSegment}
            />

            {/* Active Entity Surfacing (Story 3) */}
            <ActiveEntitySurface
              segment={focusedSegment}
              rules={rules}
            />

            {/* Divider */}
            <div className="border-t border-black/[0.06]" />

            <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider">Review Progress</p>
            <div className="flex justify-center">
              <ProgressRing reviewed={reviewedCount} total={flaggedSegments.length} />
            </div>

            {/* Smart Highlight Filter */}
            <SmartHighlightFilter
              realignedCount={realignedPendingCount}
              filterActive={showOnlyRealigned}
              onToggleFilter={() => setShowOnlyRealigned(prev => !prev)}
              onVerifyAll={handleVerifyAll}
            />

            {/* Flag Navigator */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider">Flags</p>
              {flaggedSegments.map(fs => {
                const resolved = !!decisions[fs.id]
                const active = expandedSegId === fs.id
                return (
                  <button
                    key={fs.id}
                    onClick={() => { setExpandedSegId(active ? null : fs.id); scrollToSegment(fs.id) }}
                    className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg transition-all ${
                      active
                        ? 'bg-white border border-black/[0.08] shadow-sm'
                        : focusedSegId === fs.id
                          ? 'bg-[#3D16FA]/[0.06] ring-1 ring-[#3D16FA]/20'
                          : 'hover:bg-black/[0.04]'
                    }`}
                  >
                    {resolved
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      : <span className={`w-2 h-2 rounded-full shrink-0 ${severityColor[fs.severity].dot}`} />
                    }
                    <span className={`font-mono text-[11px] ${resolved ? 'text-gray-500' : 'text-gray-700'}`}>
                      SEG-{String(fs.segmentNumber).padStart(3, '0')}
                    </span>
                    <SeverityBadge severity={fs.severity} />
                    {resolved && <span className="ml-auto text-[9px] text-emerald-500 font-medium">Done</span>}
                  </button>
                )
              })}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${canSubmit ? 'bg-amber hover:bg-amber-deep text-white' : 'bg-black/[0.03] text-gray-900/20 cursor-not-allowed'}`}
            >
              <Send className="w-3.5 h-3.5" /> Submit Review
            </button>

            {/* Model feedback */}
            <div className="rounded-lg p-3 space-y-1.5 bg-black/[0.02]">
              <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider">Model Feedback</p>
              <p className="text-[11px] text-gray-900/40 leading-relaxed">
                Your decisions improve: <span className="text-[#3D16FA]">J-GAAP Specialist</span>, <span className="text-[#3D16FA]">Brand Voice</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <div key={toast.id} className="pointer-events-auto">
              <LearningToast toast={toast} onDismiss={dismissToast} onTriggerRealignment={handleTriggerRealignment} reduced={reduced} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Knowledge Rule Modal */}
      <KnowledgeRuleModal
        isOpen={knowledgeRuleModalOpen}
        onClose={() => setKnowledgeRuleModalOpen(false)}
        onSave={handleSaveKnowledgeRule}
        initialSourceTerm={knowledgeRuleContext?.sourceTerm || ''}
        initialTargetTerm={knowledgeRuleContext?.targetTerm || ''}
        segmentId={knowledgeRuleContext?.segmentId || ''}
      />

      {/* Find & Replace Drawer */}
      <FindReplaceDrawer
        isOpen={findReplaceOpen}
        onClose={() => setFindReplaceOpen(false)}
        segments={allSegments}
        lockedSegmentIds={new Set(Object.keys(decisions))}
        onReplace={handleDeterministicReplace}
      />

      {/* Concordance Overlay (Story 2) */}
      <ConcordanceOverlay
        isOpen={concordanceOpen}
        onClose={() => setConcordanceOpen(false)}
        searchText={concordanceText}
        segments={allSegments}
        onNavigate={scrollToSegment}
      />

      {/* Custom Context Menu */}
      {contextMenuPos && (
        <div
          className="fixed z-[70] bg-white rounded-lg border border-black/[0.12] py-1 min-w-[180px]"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
        >
          <button
            onClick={() => {
              setConcordanceText(contextMenuText)
              setConcordanceOpen(true)
              setContextMenuPos(null)
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors text-left"
          >
            <Search className="w-3.5 h-3.5" />
            Find all in Corpus
            <span className="ml-auto text-[9px] text-gray-400">⌘⇧F</span>
          </button>
        </div>
      )}
    </motion.div>
  )
}

/* ─── Diff View: red strikethrough on original, green on replacement ─── */

/* ─── Propagation Badge: shows status of propagated segments ─── */

function PropagationBadge({ type, confidence }) {
  if (type === 'exact') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-[10px] font-semibold text-emerald-600 border border-emerald-200/50">
        <Zap className="w-2.5 h-2.5" /> Systemically Verified · 100%
      </span>
    )
  }
  if (type === 'high-confidence') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-[10px] font-semibold text-blue-600 border border-blue-200/50">
        <Brain className="w-2.5 h-2.5" /> High Confidence AI · {confidence}%
      </span>
    )
  }
  if (type === 'review-recommended') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-[10px] font-semibold text-amber-600 border border-amber-200/50">
        <AlertTriangle className="w-2.5 h-2.5" /> Review Recommended · {confidence}%
      </span>
    )
  }
  return null
}

function DiffView({ original, diffOriginal, diffReplacement }) {
  if (!diffOriginal) {
    return <span className="text-gray-900/70">{original}</span>
  }

  const idx = original.indexOf(diffOriginal)
  if (idx === -1) {
    // Full replacement (e.g., entire text changed)
    return (
      <span>
        <span className="line-through text-red-600/70 decoration-red-400/50">{original}</span>
      </span>
    )
  }

  const before = original.slice(0, idx)
  const match = original.slice(idx, idx + diffOriginal.length)
  const after = original.slice(idx + diffOriginal.length)

  return (
    <span className="text-gray-900/70">
      {before}
      <span className="line-through text-red-600/70 decoration-red-400/50">{match}</span>
      {after}
    </span>
  )
}

/* ─── Segment Action Bar ─── */

function SegmentActionBar({ segment, expandedAction, onExpandAction, onDecide, reduced, onOpenKnowledgeRule }) {
  const [editText, setEditText] = useState(segment.suggestedFix)
  const [editReason, setEditReason] = useState('')
  const [acceptReason, setAcceptReason] = useState('')

  const c = severityColor[segment.severity]

  return (
    <div className="px-5 py-3 space-y-3" onClick={e => e.stopPropagation()}>
      {/* Issue description */}
      <div className={`px-3 py-2 rounded-lg border ${c.border} ${c.bg}`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${c.text}`} />
          <p className={`text-xs ${c.text} leading-relaxed`}>{segment.issue}</p>
        </div>
      </div>

      {/* Action buttons — two only: Confirm or Edit. */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onExpandAction(expandedAction === 'accept' ? null : 'accept')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${expandedAction === 'accept' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/40' : 'bg-black/[0.03] text-gray-900/60 border border-black/[0.12] hover:bg-black/[0.06]'}`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirm
        </button>
        <button
          onClick={() => onExpandAction(expandedAction === 'edit' ? null : 'edit')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${expandedAction === 'edit' ? 'bg-[#3D16FA]/20 text-[#3D16FA] border border-[#3D16FA]/40' : 'bg-black/[0.03] text-gray-900/60 border border-black/[0.12] hover:bg-black/[0.06]'}`}
        >
          <Edit3 className="w-3.5 h-3.5" /> Edit
        </button>
      </div>

      {/* Expanded action panels */}
      <AnimatePresence>
        {expandedAction === 'accept' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-2">
              <p className="text-[11px] text-gray-900/50">Reason <span className="text-red-600">*</span></p>
              <select
                value={acceptReason}
                onChange={e => setAcceptReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 outline-none focus:border-emerald-500/50 transition-colors appearance-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(0,0,0,0.3)' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              >
                <option value="" disabled className="bg-[#EDEFFB] text-gray-900/50">Select reason...</option>
                {acceptReasons.map(r => (
                  <option key={r} value={r} className="bg-[#EDEFFB] text-gray-900">{r}</option>
                ))}
              </select>
              <button
                disabled={!acceptReason}
                onClick={() => onDecide({
                  action: 'confirm',
                  reason: acceptReason,
                  translation: segment.suggestedFix,
                })}
                className="w-full py-2 rounded-lg bg-emerald-500/80 hover:bg-emerald-500 disabled:bg-black/[0.03] disabled:text-gray-900/20 text-white text-xs font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        )}

        {expandedAction === 'edit' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduced ? { duration: 0 } : { duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-2">
              <p className="text-[11px] text-gray-900/50">Edit translation:</p>
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-[#3D16FA]/30 font-mono text-sm text-gray-900 placeholder:text-gray-900/30 outline-none focus:border-[#3D16FA]/50 resize-none transition-colors"
              />
              <p className="text-[11px] text-gray-900/50">Why did you change this? <span className="text-red-600">*</span></p>
              <textarea
                value={editReason}
                onChange={e => setEditReason(e.target.value)}
                placeholder="This is a retraining signal..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-900/30 outline-none focus:border-[#3D16FA]/50 resize-none transition-colors"
              />
              <button
                disabled={editReason.length < 2}
                onClick={() => onDecide({
                  action: 'edit',
                  reason: editReason,
                  translation: editText,
                })}
                className="w-full py-2 rounded-lg bg-[#3D16FA]/80 hover:bg-[#3D16FA] disabled:bg-black/[0.03] disabled:text-gray-900/20 text-white text-xs font-semibold transition-colors disabled:cursor-not-allowed"
              >
                Confirm Edit
              </button>
              {editText !== segment.suggestedFix && onOpenKnowledgeRule && (
                <button
                  onClick={() => onOpenKnowledgeRule(segment.diffOriginal || '', editText)}
                  className="w-full py-2 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Brain className="w-3.5 h-3.5" /> Save as Knowledge Rule
                </button>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}

/* ─── Phase 3: Complete ─── */

function ActionBar({ connectedIntegrations, onOpenIntegrations }) {
  const [openDropdown, setOpenDropdown] = useState(null)
  const [toast, setToast] = useState(null)

  const connectedIds = connectedIntegrations.map(c => c.id)

  const CATEGORIES = [
    {
      id: 'send',
      label: 'Send to',
      icon: Upload,
      matchIds: ['google-drive', 'dropbox', 'box', 'sharepoint', 'onedrive'],
      placeholder: 'No file storage tools connected.',
    },
    {
      id: 'notify',
      label: 'Notify',
      icon: MessageSquare,
      matchIds: ['slack', 'gmail', 'teams'],
      placeholder: 'No communication tools connected.',
    },
    {
      id: 'task',
      label: 'Create task',
      icon: TicketCheck,
      matchIds: ['jira', 'linear', 'asana', 'clickup'],
      placeholder: 'No project management tools connected.',
    },
    {
      id: 'crm',
      label: 'Log to CRM',
      icon: Database,
      matchIds: ['salesforce', 'hubspot', 'dynamics'],
      placeholder: 'No CRM tools connected.',
    },
  ]

  function fireAction(connId, connName, categoryLabel) {
    setOpenDropdown(null)
    setToast(`${categoryLabel} via ${connName} — sent successfully`)
    setTimeout(() => setToast(null), 3000)
  }

  return (
    <div className="w-full max-w-lg">
      <div className="border-t border-black/[0.08] pt-4 mb-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Actions</p>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(cat => {
            const available = connectedIntegrations.filter(c => cat.matchIds.includes(c.id))
            const Icon = cat.icon
            return (
              <div key={cat.id} className="relative">
                <button
                  onClick={() => setOpenDropdown(openDropdown === cat.id ? null : cat.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-medium text-gray-700 border border-black/[0.08] bg-white hover:bg-black/[0.03] cursor-pointer transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  {cat.label}
                  <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${openDropdown === cat.id ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {openDropdown === cat.id && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      className="absolute top-full mt-1.5 left-0 w-52 bg-white border border-black/[0.10] rounded-xl shadow-lg z-10 py-1.5 overflow-hidden"
                    >
                      {available.length === 0 ? (
                        <div className="px-4 py-3">
                          <p className="text-[12px] text-gray-400">{cat.placeholder}</p>
                          <button
                            onClick={() => { setOpenDropdown(null); onOpenIntegrations?.() }}
                            className="text-[12px] text-[#3D16FA] hover:underline cursor-pointer mt-1"
                          >
                            Connect {cat.label.toLowerCase()} tools →
                          </button>
                        </div>
                      ) : (
                        available.map(conn => (
                          <button
                            key={conn.id}
                            onClick={() => fireAction(conn.id, conn.name, cat.label)}
                            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-[13px] text-gray-700 hover:bg-black/[0.04] cursor-pointer transition-colors"
                          >
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center font-bold text-white text-[9px] shrink-0"
                              style={{ backgroundColor: conn.color }}
                            >
                              {conn.letter}
                            </div>
                            {conn.name}
                          </button>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-700 mb-3"
          >
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CompletePhase({ reviewRequest, results, onBack, reduced, connectedIntegrations = [], onOpenIntegrations }) {
  const decisions = results?.decisions || []
  const confirmed = decisions.filter(d => d.action === 'confirm').length
  const edited = decisions.filter(d => d.action === 'edit').length

  const agentImpacts = useMemo(() => {
    const impacts = {}
    reviewRequest.flaggedSegments.forEach(seg => {
      const decision = decisions.find(d => d.segmentId === seg.id)
      if (!decision) return
      if (!impacts[seg.flaggedBy]) {
        impacts[seg.flaggedBy] = { agentId: seg.agentId, learnings: [] }
      }
      if (decision.action === 'edit') {
        impacts[seg.flaggedBy].learnings.push(
          `Learning: ${seg.issue.split('.')[0]} preference from your edit on SEG-${String(seg.segmentNumber).padStart(3, '0')}`
        )
      }
    })
    return impacts
  }, [reviewRequest, decisions])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced ? { duration: 0 } : springTransition}
      className="flex flex-col items-center justify-center h-full p-8"
    >
      <div className="w-full max-w-lg space-y-6">
        {/* Checkmark */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={reduced ? { duration: 0 } : { ...springTransition, delay: 0.1 }}
          className="flex justify-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
        </motion.div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-gray-900">Review Complete</h2>
          <p className="text-sm text-gray-900/50 font-mono">
            {decisions.length} segments reviewed &bull; {confirmed} confirmed &bull; {edited} edited &bull; ~8 min
          </p>
        </div>

        {/* Retraining card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : { ...springTransition, delay: 0.2 }}
          className="rounded-lg p-5 space-y-4"
          style={{ background: '#EDEFFB' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3D16FA]" />
            <p className="text-sm font-semibold text-gray-900">Model Learning</p>
          </div>
          <p className="text-xs text-gray-900/50">Your edits are training these models:</p>

          <div className="space-y-3">
            {Object.entries(agentImpacts).map(([agentName, info]) => (
              <div key={agentName} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <motion.span
                    animate={reduced ? {} : { opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-[#3D16FA]"
                  />
                  <span className="text-sm font-medium text-gray-900">{agentName}</span>
                  <span className="text-[10px] text-gray-900/30 font-mono">{info.agentId}</span>
                </div>
                {info.learnings.map((l, i) => (
                  <p key={i} className="text-[11px] text-gray-900/40 pl-4">{l}</p>
                ))}
              </div>
            ))}

            {Object.keys(agentImpacts).length === 0 && (
              <p className="text-xs text-gray-900/40">All suggestions confirmed — reinforcing current model behavior.</p>
            )}
          </div>

          <p className="text-xs text-[#3D16FA]/70">
            Expected improvement: +3 pts on domain precision for next run
          </p>
        </motion.div>

        <ActionBar connectedIntegrations={connectedIntegrations} onOpenIntegrations={onOpenIntegrations} />

        <button
          onClick={onBack}
          className="w-full py-3 rounded-lg bg-amber hover:bg-amber-deep text-white text-sm font-semibold transition-colors"
        >
          Return to Project
        </button>
      </div>
    </motion.div>
  )
}

/* ─── Main Component ─── */

export default function HumanReview({
  reviewRequest = DEFAULT_REVIEW_REQUEST,
  mode = 'assign',
  onAssign = () => {},
  onSubmitReview = () => {},
  onBack = () => {},
  teamMembers = TEAM_MEMBERS,
  connectedIntegrations = [],
  onOpenIntegrations,
  /**
   * Role-based queue scoping — optional.
   * When provided, only segments matching these locales/domains are shown.
   * @type {{ locales?: string[], domains?: string[] } | null}
   */
  reviewerProfile = null,
}) {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState(mode === 'review' ? 'review' : 'assign')
  const [reviewResults, setReviewResults] = useState(null)

  function handleAssign(reviewerId, note) {
    onAssign(reviewerId, note)
    setPhase('review')
  }

  function handleSubmitReview(results) {
    setReviewResults(results)
    setPhase('complete')
  }

  function handleComplete() {
    if (reviewResults) onSubmitReview(reviewResults)
    onBack()
  }

  return (
    <div
      className="h-full flex flex-col"
      style={{ background: '#ffffff', color: '#1A1640', fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <AnimatePresence mode="wait">
        {phase === 'assign' && (
          <AssignPhase
            key="assign"
            reviewRequest={reviewRequest}
            teamMembers={teamMembers}
            onAssign={handleAssign}
            onBack={onBack}
            reduced={reduced}
          />
        )}
        {phase === 'review' && (
          <ReviewPhase
            key="review"
            reviewRequest={reviewRequest}
            onSubmitReview={handleSubmitReview}
            onBack={() => setPhase('assign')}
            reduced={reduced}
            reviewerProfile={reviewerProfile}
          />
        )}
        {phase === 'complete' && (
          <CompletePhase
            key="complete"
            reviewRequest={reviewRequest}
            results={reviewResults}
            onBack={handleComplete}
            reduced={reduced}
            connectedIntegrations={connectedIntegrations}
            onOpenIntegrations={onOpenIntegrations}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
