import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Scale, Shield, CheckCircle2, XCircle, AlertTriangle,
  Clock, User, FileText, Globe, Search, Eye, Send, Brain, ChevronRight,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

/* ─── Mock Audit Data ────────────────────────────────────────── */

const AUDIT_ENTRIES = [
  // Recent decisions
  { id: 'gov-1', timestamp: '2026-03-31T09:45:00Z', type: 'publish', document: 'Q3_Earnings_Report.pdf', locale: 'DE', actor: 'System', actorRole: 'Auto-publish', decision: 'published', reason: 'Quality score 91% exceeds 85% threshold', policy: 'Auto-publish (Balanced)', market: 'Germany', regulatoryContext: 'IFRS', confidenceScore: 91, escalated: false },
  { id: 'gov-2', timestamp: '2026-03-31T09:42:00Z', type: 'escalation', document: 'Q3_Earnings_Report.pdf', locale: 'JA', actor: 'System', actorRole: 'Quality gate', decision: 'escalated', reason: 'Quality score 78% below 85% threshold — 3 J-GAAP terminology flags', policy: 'Auto-escalate (Conservative)', market: 'Japan', regulatoryContext: 'J-GAAP, TSE', confidenceScore: 78, escalated: true },
  { id: 'gov-3', timestamp: '2026-03-31T08:30:00Z', type: 'review', document: 'Q3_Earnings_Report.pdf', locale: 'JA', actor: 'Kenji Tanaka', actorRole: 'Regional Lead (APAC)', decision: 'approved-with-edits', reason: 'Accepted 2 of 3 AI fixes, manually corrected ASC 606 → ASBJ 29 mapping', policy: 'Human review', market: 'Japan', regulatoryContext: 'J-GAAP, TSE', confidenceScore: 84, escalated: false },
  { id: 'gov-4', timestamp: '2026-03-31T08:15:00Z', type: 'publish', document: 'Q3_Earnings_Report.pdf', locale: 'ZH', actor: 'System', actorRole: 'Auto-publish', decision: 'published', reason: 'Quality score 89% exceeds threshold after human review fixes propagated', policy: 'Auto-publish (Balanced)', market: 'China', regulatoryContext: 'General', confidenceScore: 89, escalated: false },
  { id: 'gov-5', timestamp: '2026-03-30T16:20:00Z', type: 'escalation', document: 'Q3_Investor_Presentation.pptx', locale: 'JA', actor: 'System', actorRole: 'Compliance gate', decision: 'escalated', reason: 'Currency formatting inconsistency — mixed \u00a5 and JPY denominations detected', policy: 'Auto-escalate (Conservative)', market: 'Japan', regulatoryContext: 'TSE', confidenceScore: 82, escalated: true },
  { id: 'gov-6', timestamp: '2026-03-30T15:00:00Z', type: 'review', document: 'Q3_Investor_Presentation.pptx', locale: 'JA', actor: 'Sarah Chen', actorRole: 'Senior Linguist (APAC)', decision: 'approved', reason: 'All flagged segments verified — currency formatting corrected to \u00a5 standard', policy: 'Human review', market: 'Japan', regulatoryContext: 'TSE', confidenceScore: 90, escalated: false },
  { id: 'gov-7', timestamp: '2026-03-30T14:30:00Z', type: 'publish', document: 'Q3_Financial_Summary.xlsx', locale: 'DE', actor: 'System', actorRole: 'Auto-publish', decision: 'published', reason: 'Quality score 93% exceeds threshold', policy: 'Auto-publish (Balanced)', market: 'Germany', regulatoryContext: 'IFRS', confidenceScore: 93, escalated: false },
  { id: 'gov-8', timestamp: '2026-03-29T11:00:00Z', type: 'reject', document: 'Policy_Update_Memo.docx', locale: 'JA', actor: 'Yuki Nakamura', actorRole: 'Compliance Auditor', decision: 'rejected', reason: 'Regulatory reference uses outdated ASBJ standard — requires source document correction before re-processing', policy: 'Human review', market: 'Japan', regulatoryContext: 'J-GAAP', confidenceScore: 72, escalated: true },
  { id: 'gov-9', timestamp: '2026-03-28T09:15:00Z', type: 'publish', document: 'Client_Brief_Q4.pdf', locale: 'ZH', actor: 'System', actorRole: 'Auto-publish', decision: 'published', reason: 'Quality score 94% exceeds threshold — brand voice alignment confirmed', policy: 'Auto-publish (Accelerated)', market: 'China', regulatoryContext: 'General', confidenceScore: 94, escalated: false },
  { id: 'gov-10', timestamp: '2026-03-27T16:45:00Z', type: 'escalation', document: 'Regulatory_Filing_TSE.pdf', locale: 'JA', actor: 'System', actorRole: 'Compliance gate', decision: 'escalated', reason: 'Critical: 2 ASBJ standard references missing — TSE filing requirement', policy: 'Auto-escalate (Conservative)', market: 'Japan', regulatoryContext: 'J-GAAP, TSE, ASBJ', confidenceScore: 68, escalated: true },
  { id: 'gov-11', timestamp: '2026-03-27T15:30:00Z', type: 'review', document: 'Regulatory_Filing_TSE.pdf', locale: 'JA', actor: 'Kenji Tanaka', actorRole: 'Regional Lead (APAC)', decision: 'approved-with-edits', reason: 'Added missing ASBJ references, corrected currency denominations, approved for filing', policy: 'Human review', market: 'Japan', regulatoryContext: 'J-GAAP, TSE, ASBJ', confidenceScore: 91, escalated: false },
  { id: 'gov-12', timestamp: '2026-03-26T10:00:00Z', type: 'publish', document: 'Regulatory_Filing_TSE.pdf', locale: 'JA', actor: 'System', actorRole: 'Post-review publish', decision: 'published', reason: 'Human review completed — quality score improved to 91%', policy: 'Auto-publish (post-review)', market: 'Japan', regulatoryContext: 'J-GAAP, TSE', confidenceScore: 91, escalated: false },
]

/* ─── Decision styling ───────────────────────────────────────── */

const DECISION_STYLES = {
  published:           { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, label: 'Published' },
  'approved':          { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle2, label: 'Approved' },
  'approved-with-edits': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: CheckCircle2, label: 'Approved with edits' },
  escalated:           { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertTriangle, label: 'Escalated' },
  rejected:            { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: XCircle, label: 'Rejected' },
}

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'publish', label: 'Publish decisions' },
  { id: 'escalation', label: 'Escalations' },
  { id: 'review', label: 'Human reviews' },
  { id: 'reject', label: 'Rejections' },
]

/* ─── Helpers ────────────────────────────────────────────────── */

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function Avatar({ name, size = 28 }) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  const isSystem = name === 'System'
  return (
    <div className={`shrink-0 rounded-full flex items-center justify-center font-semibold text-[10px] ${isSystem ? 'bg-[#3D16FA]/10 text-[#3D16FA]' : 'bg-gray-200 text-gray-600'}`}
      style={{ width: size, height: size }}>
      {isSystem ? <Shield className="w-3 h-3" /> : initials}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function GovernanceAudit({ onBack }) {
  const prefersReduced = useReducedMotion()
  const [filterType, setFilterType] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const filtered = useMemo(() => {
    let entries = AUDIT_ENTRIES
    if (filterType !== 'all') entries = entries.filter(e => e.type === filterType)
    if (search) {
      const lower = search.toLowerCase()
      entries = entries.filter(e =>
        e.document.toLowerCase().includes(lower) ||
        e.actor.toLowerCase().includes(lower) ||
        e.reason.toLowerCase().includes(lower) ||
        e.locale.toLowerCase().includes(lower)
      )
    }
    return entries
  }, [filterType, search])

  // Summary stats
  const totalPublished = AUDIT_ENTRIES.filter(e => e.decision === 'published').length
  const totalEscalated = AUDIT_ENTRIES.filter(e => e.decision === 'escalated').length
  const totalReviewed = AUDIT_ENTRIES.filter(e => e.type === 'review').length
  const totalRejected = AUDIT_ENTRIES.filter(e => e.decision === 'rejected').length

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.4 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-black/[0.06] transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-[20px] font-semibold text-gray-900">Governance</h1>
          <p className="text-[12px] text-gray-500">Complete audit trail of every decision, escalation, and publish event</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Published', count: totalPublished, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Escalated', count: totalEscalated, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Reviewed', count: totalReviewed, icon: Eye, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Rejected', count: totalRejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl border border-black/[0.08] bg-white p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${stat.bg} flex items-center justify-center shrink-0`}>
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[18px] font-bold text-gray-900 tabular-nums leading-none">{stat.count}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          {TYPE_FILTERS.map(f => (
            <button key={f.id} type="button" onClick={() => setFilterType(f.id)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors cursor-pointer ${
                filterType === f.id ? 'bg-gray-900 text-white' : 'bg-white border border-black/[0.10] text-gray-500 hover:text-gray-800'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search documents, people, reasons..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-black/[0.08] bg-gray-50 text-[12px] placeholder:text-gray-400 outline-none focus:border-[#3D16FA] transition" />
        </div>
      </div>

      {/* Audit trail */}
      <div className="space-y-0">
        {filtered.map((entry, i) => {
          const style = DECISION_STYLES[entry.decision] || DECISION_STYLES.published
          const DecisionIcon = style.icon
          const isExpanded = expandedId === entry.id

          return (
            <div key={entry.id}>
              <button type="button" onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                className={`w-full text-left flex gap-3 py-3.5 px-4 rounded-lg transition-colors cursor-pointer ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50/60'}`}>
                {/* Timeline dot */}
                <div className="flex flex-col items-center shrink-0 pt-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${style.bg} border-2 ${style.border}`} />
                  {i < filtered.length - 1 && <div className="w-px flex-1 bg-black/[0.06] mt-1" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <Avatar name={entry.actor} size={22} />
                    <span className="text-[12px] font-medium text-gray-800">{entry.actor}</span>
                    <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>
                      <DecisionIcon className="w-2.5 h-2.5" /> {style.label}
                    </span>
                    <span className="text-[10px] text-gray-400">{entry.actorRole}</span>
                  </div>
                  <p className="text-[12px] text-gray-600 mb-1">{entry.reason}</p>
                  <div className="flex items-center gap-3 text-[10px] text-gray-400">
                    <span className="flex items-center gap-1"><FileText className="w-2.5 h-2.5" /> {entry.document}</span>
                    <span className="flex items-center gap-1"><Globe className="w-2.5 h-2.5" /> {entry.locale} &middot; {entry.market}</span>
                    <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {timeAgo(entry.timestamp)}</span>
                  </div>
                </div>

                {/* Score + expand */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[12px] font-bold tabular-nums ${entry.confidenceScore >= 85 ? 'text-emerald-600' : entry.confidenceScore >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                    {entry.confidenceScore}%
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 text-gray-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="ml-[22px] pl-4 pb-3 border-l border-black/[0.06]">
                  <div className="rounded-lg border border-black/[0.08] bg-white p-4 space-y-3 mt-1">
                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <div>
                        <span className="text-gray-400 block mb-0.5">Policy applied</span>
                        <span className="text-gray-800 font-medium">{entry.policy}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Regulatory context</span>
                        <span className="text-gray-800 font-medium">{entry.regulatoryContext}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Market</span>
                        <span className="text-gray-800 font-medium">{entry.market}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Confidence at decision</span>
                        <span className={`font-medium ${entry.confidenceScore >= 85 ? 'text-emerald-600' : entry.confidenceScore >= 75 ? 'text-amber-600' : 'text-red-600'}`}>{entry.confidenceScore}%</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Escalated</span>
                        <span className={`font-medium ${entry.escalated ? 'text-amber-600' : 'text-emerald-600'}`}>{entry.escalated ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block mb-0.5">Decision</span>
                        <span className={`inline-flex items-center gap-1 font-medium ${style.text}`}><DecisionIcon className="w-3 h-3" /> {style.label}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-black/[0.06]">
                      <span className="text-gray-400 text-[10px] block mb-1">Full reason</span>
                      <p className="text-[12px] text-gray-700 leading-relaxed">{entry.reason}</p>
                    </div>
                  </div>
                </div>
              )}

              {!isExpanded && i < filtered.length - 1 && <div className="border-b border-black/[0.03] ml-[22px]" />}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Scale className="w-8 h-8 text-gray-300 mb-3" />
          <p className="text-[14px] font-medium text-gray-500">No audit entries match your filters</p>
          <p className="text-[12px] text-gray-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}
    </motion.div>
  )
}
