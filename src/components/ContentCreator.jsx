import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain, ArrowLeft, ArrowRight, CheckCircle2, Sparkles, FileText, Shield,
  Globe, ThumbsUp, ThumbsDown, RefreshCw, BookOpen, AlertTriangle, Loader2,
  X, Check, ChevronRight, Send, Pen,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ─── Domain Nodes ───────────────────────────────────────────── */

const DOMAIN_NODES = [
  { id: 'financial', label: 'Financial (J-GAAP)', entries: 412, color: '#f59e0b', patterns: 89 },
  { id: 'regulatory', label: 'Regulatory (TSE)', entries: 287, color: '#8b5cf6', patterns: 64 },
  { id: 'brand', label: 'Brand Voice', entries: 198, color: '#06b6d4', patterns: 42 },
  { id: 'cultural', label: 'Cultural Adaptation', entries: 156, color: '#10b981', patterns: 38 },
  { id: 'currency', label: 'Currency Patterns', entries: 94, color: '#f43f5e', patterns: 27 },
  { id: 'legal', label: 'Legal Compliance', entries: 143, color: '#64748b', patterns: 31 },
]

const KEYWORD_MAP = {
  financial: ['earnings', 'financial', 'revenue', 'quarter', 'q1', 'q2', 'q3', 'q4', 'fiscal', 'income', 'balance', 'profit', 'loss', 'gaap', 'ifrs'],
  regulatory: ['compliance', 'regulatory', 'filing', 'tse', 'sec', 'disclosure', 'regulation', 'audit'],
  brand: ['brand', 'voice', 'tone', 'messaging', 'communication'],
  cultural: ['cultural', 'adaptation', 'local', 'market', 'audience', 'regional'],
  currency: ['currency', 'yen', 'euro', 'dollar', 'conversion', 'denomination'],
  legal: ['legal', 'contract', 'agreement', 'liability', 'clause', 'policy', 'terms'],
}

const CONTENT_TYPES = [
  { id: 'report', label: 'Report' },
  { id: 'memo', label: 'Memo' },
  { id: 'brief', label: 'Brief' },
  { id: 'disclosure', label: 'Disclosure' },
  { id: 'email', label: 'Email' },
  { id: 'custom', label: 'Custom' },
]

const ALL_LOCALES = [
  { code: 'ja', label: 'Japanese' }, { code: 'de', label: 'German' }, { code: 'zh', label: 'Chinese' },
  { code: 'fr', label: 'French' }, { code: 'es', label: 'Spanish' }, { code: 'ko', label: 'Korean' },
]

/* ─── Mock Generated Content ─────────────────────────────────── */

const MOCK_CONTENT = {
  financial: {
    title: 'Q4 2025 Earnings Disclosure Summary',
    sections: [
      { heading: 'Executive Summary', body: 'Meridian Capital reports consolidated revenue of \u00a534.2 billion for the quarter ended December 31, 2025, representing a 12.3% increase year-over-year. Operating income reached \u00a58.7 billion, driven primarily by strong performance in the M&A advisory and wealth management divisions. The Board of Directors has approved a quarterly dividend of \u00a545 per share.' },
      { heading: 'Financial Highlights', body: 'Total assets under management grew to \u00a52.8 trillion, a 15.4% increase from the prior year period. Net interest income was \u00a512.1 billion, while fee-based income contributed \u00a518.6 billion. The cost-to-income ratio improved to 62.3% from 65.8% in the prior year quarter, reflecting continued operational efficiency gains.' },
      { heading: 'Regulatory Compliance Note', body: 'This disclosure has been prepared in accordance with J-GAAP standards and TSE listing requirements. All financial figures have been converted using the prescribed ASBJ methodology. Currency denominations follow TSE formatting conventions. This document has been reviewed by the internal compliance committee and approved for public distribution.' },
      { heading: 'Forward-Looking Statements', body: 'This document contains forward-looking statements based on current expectations and assumptions. Actual results may differ materially due to market conditions, regulatory changes, and other factors described in our annual securities report filed with the Financial Services Agency.' },
    ],
  },
  general: {
    title: 'Internal Policy Update Memorandum',
    sections: [
      { heading: 'Purpose', body: 'This memorandum outlines key updates to Meridian Capital\'s operational policies effective Q1 2026. These changes reflect evolving regulatory requirements across our Japan, Germany, and New Zealand operations.' },
      { heading: 'Key Changes', body: 'Effective immediately, all client-facing documentation must undergo compliance verification before distribution. The quality threshold has been raised from 85% to 90% for regulatory filings. New cultural adaptation guidelines have been implemented for the APAC region.' },
      { heading: 'Implementation Timeline', body: 'Phase 1 (January): Updated compliance templates deployed. Phase 2 (February): Training sessions for regional leads. Phase 3 (March): Full enforcement across all divisions.' },
    ],
  },
}

/* ─── ScoreRing (reused pattern) ─────────────────────────────── */

function ScoreRing({ score, size = 80, strokeWidth = 6, prefersReducedMotion = false }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const color = score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171'
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={strokeWidth} />
        <motion.circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: prefersReducedMotion ? 0 : 1.2, type: 'spring', stiffness: 80, damping: 15 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono font-bold text-gray-900" style={{ fontSize: size > 60 ? '1.5rem' : '1rem' }}>{score}</span>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 1: PROMPT STUDIO
   ═══════════════════════════════════════════════════════════════ */

function PromptStudio({ onGenerate, prefersReduced }) {
  const [promptText, setPromptText] = useState('')
  const [activeNodes, setActiveNodes] = useState(new Set(['brand']))
  const [selectedType, setSelectedType] = useState('report')
  const [locales, setLocales] = useState(['ja', 'de', 'zh'])
  const debounceRef = useRef(null)

  // Auto-suggest nodes from prompt keywords
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const lower = promptText.toLowerCase()
      const matched = new Set(['brand']) // always include brand voice
      for (const [nodeId, keywords] of Object.entries(KEYWORD_MAP)) {
        if (keywords.some(k => lower.includes(k))) matched.add(nodeId)
      }
      setActiveNodes(matched)
      // Auto-detect content type
      if (lower.includes('memo') || lower.includes('memorandum')) setSelectedType('memo')
      else if (lower.includes('brief')) setSelectedType('brief')
      else if (lower.includes('disclosure') || lower.includes('filing')) setSelectedType('disclosure')
      else if (lower.includes('email')) setSelectedType('email')
    }, 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [promptText])

  const toggleNode = (id) => setActiveNodes(prev => {
    const next = new Set(prev)
    if (next.has(id) && id !== 'brand') next.delete(id)
    else next.add(id)
    return next
  })

  const creditEstimate = activeNodes.size * 7 + locales.length * 3
  const timeEstimate = Math.max(2, Math.round(activeNodes.size * 0.8 + locales.length * 0.5))

  const nodeReasons = {
    financial: 'Your prompt maps to 412 J-GAAP entries',
    regulatory: 'Regulatory context detected \u2014 287 TSE entries available',
    brand: 'Applied to all generated content for voice consistency',
    cultural: 'Cultural adaptation needed for target markets',
    currency: 'Currency formatting rules activated',
    legal: 'Legal compliance terms detected',
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Stat pills */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {[
          { value: '1,247', label: 'entries available' },
          { value: '342', label: 'patterns' },
          { value: '6', label: 'domains' },
        ].map(s => (
          <span key={s.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.12] text-[11px]">
            <span className="font-mono font-bold text-gray-900">{s.value}</span>
            <span className="text-gray-500 font-medium">{s.label}</span>
          </span>
        ))}
      </div>

      {/* Prompt input */}
      <div className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
        <textarea
          value={promptText}
          onChange={e => setPromptText(e.target.value)}
          placeholder="Describe what you want to create...&#10;&#10;e.g. &quot;Write a Q4 earnings disclosure summary for TSE filing in Japanese and German&quot;"
          rows={4}
          className="w-full px-5 pt-5 pb-3 text-[14px] text-gray-900 placeholder:text-gray-400 outline-none resize-none leading-relaxed"
        />

        {/* Auto-suggested nodes */}
        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Org Brain intelligence</p>
          <div className="flex flex-wrap gap-2">
            {DOMAIN_NODES.map(node => {
              const isActive = activeNodes.has(node.id)
              return (
                <button key={node.id} type="button" onClick={() => toggleNode(node.id)}
                  className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 border border-blue-200 text-blue-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}>
                  {isActive ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-current opacity-40" />}
                  {node.label}
                  <span className="opacity-60">&middot; {node.entries}</span>
                </button>
              )
            })}
          </div>
          {/* Reason for top suggested node */}
          {promptText.length > 5 && (
            <div className="mt-2 space-y-0.5">
              {[...activeNodes].filter(id => id !== 'brand').slice(0, 2).map(id => (
                <p key={id} className="text-[10px] text-blue-600 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> {nodeReasons[id] || `${DOMAIN_NODES.find(n => n.id === id)?.label} activated`}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content type + Locale + Tone */}
      <div className="grid grid-cols-[1fr_auto] gap-4">
        {/* Content type pills */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Content type</p>
          <div className="flex flex-wrap gap-1">
            {CONTENT_TYPES.map(ct => (
              <button key={ct.id} type="button" onClick={() => setSelectedType(ct.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  selectedType === ct.id ? 'bg-[#009eda]/10 border border-[#009eda]/30 text-[#009eda]' : 'border border-black/[0.06] text-gray-500 hover:bg-gray-50'
                }`}>
                {ct.label}
              </button>
            ))}
          </div>
        </div>
        {/* Locales + Tone */}
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Markets &middot; Tone</p>
          <div className="flex items-center gap-1.5 justify-end">
            {locales.map(code => (
              <span key={code} className="inline-flex items-center px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-medium">
                {code.toUpperCase()}
              </span>
            ))}
            <span className="text-[10px] text-gray-400">&middot; Formal</span>
          </div>
        </div>
      </div>

      {/* Credit estimate + Generate */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-gray-400">
          ~{creditEstimate} credits &middot; ~{timeEstimate} minutes
        </p>
        <button
          type="button"
          onClick={() => onGenerate({ promptText, activeNodes: [...activeNodes], selectedType, locales })}
          disabled={promptText.length < 10}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#009eda] hover:bg-[#0089c4] text-white text-[14px] font-semibold shadow-sm shadow-[#009eda]/20 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-4 h-4" /> Generate
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 2: INTELLIGENCE ASSEMBLY
   ═══════════════════════════════════════════════════════════════ */

function IntelligenceAssembly({ config, onComplete, prefersReduced }) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete(), prefersReduced ? 500 : 3000)
    return () => clearTimeout(timer)
  }, [onComplete, prefersReduced])

  const nodes = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
  const totalEntries = nodes.reduce((s, n) => s + n.entries, 0)

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-black/[0.12] rounded-xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Assembling intelligence</p>
          <p className="text-[15px] font-semibold text-gray-900">{config.selectedType === 'report' ? 'Report' : config.selectedType === 'disclosure' ? 'Disclosure' : 'Document'} Generation</p>
          <p className="text-[12px] text-gray-500 mt-0.5">{config.locales.map(l => l.toUpperCase()).join(', ')} &middot; Formal tone &middot; {nodes.length} domains activated</p>
        </div>

        <div className="px-6 py-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Loading domain intelligence</p>
          {nodes.map((node, i) => (
            <motion.div key={node.id}
              initial={prefersReduced ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={prefersReduced ? { duration: 0 } : { delay: i * 0.4 }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-black/[0.06]"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: node.color + '15' }}>
                <Brain className="w-3.5 h-3.5" style={{ color: node.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-gray-800">{node.label}</p>
                <p className="text-[10px] text-gray-400">{node.entries} entries &middot; {node.patterns} patterns loaded</p>
              </div>
              <motion.div
                initial={prefersReduced ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: prefersReduced ? 0 : i * 0.4 + 0.8 }}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="px-6 py-3 border-t border-black/[0.06] bg-gray-50/60">
          <div className="space-y-1 text-[11px] text-gray-500">
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {totalEntries} knowledge entries loaded across {nodes.length} domains</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Brand voice guardrails active</p>
            <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Compliance validation will run post-generation</p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 3: GENERATION
   ═══════════════════════════════════════════════════════════════ */

function GenerationProgress({ config, onComplete, prefersReduced }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (prefersReduced) { setProgress(100); onComplete(); return }
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(100, prev + (100 / 80) * (0.8 + Math.random() * 0.4))
        if (next >= 100) { clearInterval(interval); setTimeout(() => onComplete(), 600) }
        return next
      })
    }, 100)
    return () => clearInterval(interval)
  }, [onComplete, prefersReduced])

  return (
    <div className="max-w-xl mx-auto">
      <div className="bg-white border border-black/[0.12] rounded-xl p-8 flex flex-col items-center gap-5">
        <div className="w-14 h-14 rounded-xl bg-[#009eda]/10 flex items-center justify-center">
          <Pen className="w-6 h-6 text-[#009eda]" />
        </div>
        <div className="text-center">
          <p className="text-[16px] font-semibold text-gray-900 mb-1">Generating content</p>
          <p className="text-[13px] text-gray-500">Applying {config.activeNodes.length} intelligence domains across {config.locales.length} markets</p>
        </div>
        <div className="w-full max-w-sm">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-[#009eda] to-[#34d399] rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <p className="text-[11px] text-gray-400 text-center mt-2 tabular-nums">{Math.round(progress)}% complete</p>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   PHASE 4: REVIEW & REFINE
   ═══════════════════════════════════════════════════════════════ */

function ReviewRefine({ config, onAccept, onBack, prefersReduced }) {
  const [activeTab, setActiveTab] = useState('content')
  const [showRefine, setShowRefine] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [feedback, setFeedback] = useState(null)

  const hasFinancial = config.activeNodes.includes('financial')
  const content = hasFinancial ? MOCK_CONTENT.financial : MOCK_CONTENT.general
  const activeNodeDetails = DOMAIN_NODES.filter(n => config.activeNodes.includes(n.id))
  const totalEntries = activeNodeDetails.reduce((s, n) => s + n.entries, 0)
  const totalPatterns = activeNodeDetails.reduce((s, n) => s + n.patterns, 0)
  const creditsCost = config.activeNodes.length * 7 + config.locales.length * 3

  const tabs = [
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'sources', label: 'Sources', icon: BookOpen },
    { id: 'compliance', label: 'Compliance', icon: Shield, badge: 1 },
  ]

  return (
    <div className="space-y-5">
      {/* Completion header */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Content Generated</h1>
          <p className="text-[14px] text-gray-500">
            {content.title} &middot; {config.locales.map(l => l.toUpperCase()).join(' \u00b7 ')} &middot; {creditsCost} credits
          </p>
        </div>
      </div>

      {/* Score + metadata */}
      <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-6">
        <div className="flex items-center gap-6">
          <ScoreRing score={93} size={72} strokeWidth={6} prefersReducedMotion={prefersReduced} />
          <div className="flex-1">
            <h2 className="text-[17px] font-semibold text-gray-900 mb-1">93% Confidence Score</h2>
            <p className="text-[13px] text-gray-500 leading-relaxed">
              Generated from {totalEntries} knowledge entries across {config.activeNodes.length} domains. {totalPatterns} patterns applied. Brand voice and regulatory compliance verified.
            </p>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-black/[0.12]">
        <div className="flex gap-6 px-2">
          {tabs.map(tab => {
            const TabIcon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 pb-3 text-[13px] font-medium transition-colors cursor-pointer ${
                  isActive ? 'text-gray-900 border-b-2 border-straker-500' : 'text-gray-500 hover:text-gray-700'
                }`}>
                <TabIcon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.badge && (
                  <span className={`ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${isActive ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-700'}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === 'content' && (
        <div className="grid grid-cols-[1fr_280px] gap-5">
          {/* Generated content */}
          <div className="rounded-xl border border-black/[0.08] bg-white p-6 space-y-5">
            <h2 className="text-[18px] font-bold text-gray-900">{content.title}</h2>
            {content.sections.map((section, i) => (
              <div key={i}>
                <h3 className="text-[14px] font-semibold text-gray-800 mb-2">{section.heading}</h3>
                <p className="text-[13px] text-gray-600 leading-relaxed">{section.body}</p>
              </div>
            ))}
          </div>
          {/* Sources sidebar */}
          <div className="rounded-xl border border-black/[0.08] bg-gray-50 p-4 self-start sticky top-36">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Intelligence sources used</p>
            <div className="space-y-2.5">
              {activeNodeDetails.map(node => (
                <div key={node.id} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                  <div>
                    <p className="text-[11px] font-medium text-gray-700">{node.label}</p>
                    <p className="text-[10px] text-gray-400">{node.entries} entries &middot; {node.patterns} patterns</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-black/[0.06] space-y-1 text-[10px] text-gray-400">
              <p>{totalEntries} total entries referenced</p>
              <p>{totalPatterns} patterns applied</p>
              <p>5 guardrails enforced</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'sources' && (
        <div className="space-y-3">
          {activeNodeDetails.map(node => (
            <div key={node.id} className="rounded-xl border border-black/[0.08] bg-white p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: node.color + '15' }}>
                <Brain className="w-5 h-5" style={{ color: node.color }} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-800">{node.label}</p>
                <p className="text-[11px] text-gray-500">{node.entries} entries &middot; {node.patterns} patterns &middot; v3.2</p>
              </div>
              <span className="text-[11px] font-medium text-emerald-600">Active</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-3">
          {[
            { label: 'J-GAAP terminology compliance', status: 'passed', detail: 'All financial terms match ASBJ prescribed terminology' },
            { label: 'Brand voice alignment', status: 'passed', detail: 'Tone and register consistent with Meridian Capital voice policy' },
            { label: 'Currency formatting', status: 'flag', detail: 'Minor: Section 2 uses mixed denomination formats (\u00a5 and JPY). Recommend standardizing to \u00a5 for TSE filing.' },
          ].map((item, i) => (
            <div key={i} className={`rounded-xl border p-4 ${item.status === 'passed' ? 'border-emerald-200/60 bg-emerald-50/30' : 'border-amber-200/60 bg-amber-50/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {item.status === 'passed' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                <p className={`text-[13px] font-semibold ${item.status === 'passed' ? 'text-emerald-800' : 'text-amber-800'}`}>{item.label}</p>
              </div>
              <p className="text-[12px] text-gray-600 ml-6">{item.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Feedback bar */}
      <div className="flex items-center gap-3 pt-2">
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setFeedback('up')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${feedback === 'up' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-gray-100 text-gray-400'}`}>
            <ThumbsUp className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setFeedback('down')}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${feedback === 'down' ? 'bg-red-50 text-red-500' : 'hover:bg-gray-100 text-gray-400'}`}>
            <ThumbsDown className="w-4 h-4" />
          </button>
        </div>
        <button type="button" onClick={() => setShowRefine(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.08] text-gray-600 text-[12px] font-medium hover:bg-gray-50 cursor-pointer transition-colors">
          <RefreshCw className="w-3 h-3" /> Refine
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onAccept}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#009eda] hover:bg-[#0089c4] text-white text-[13px] font-semibold cursor-pointer transition-colors">
          <CheckCircle2 className="w-4 h-4" /> Accept &amp; Save
        </button>
      </div>

      {/* Refine input */}
      <AnimatePresence>
        {showRefine && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2">
              <input type="text" value={refineText} onChange={e => setRefineText(e.target.value)}
                placeholder="e.g. Make the tone less formal, add more detail about regulatory changes..."
                className="flex-1 rounded-lg border border-black/[0.08] bg-white px-3 py-2.5 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#009eda] transition" />
              <button type="button" className="px-4 py-2.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-[12px] font-semibold cursor-pointer transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */

export default function ContentCreator({ onBack }) {
  const prefersReduced = useReducedMotion()
  const [step, setStep] = useState('prompt')
  const [config, setConfig] = useState(null)

  const handleGenerate = useCallback((cfg) => {
    setConfig(cfg)
    setStep('assembly')
  }, [])

  const handleAssemblyComplete = useCallback(() => setStep('generation'), [])
  const handleGenerationComplete = useCallback(() => setStep('review'), [])

  const handleAccept = useCallback(() => {
    console.log('Content accepted. Learning event recorded:', config)
    onBack?.()
  }, [config, onBack])

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
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-[#009eda]" />
          <h1 className="text-[20px] font-semibold text-gray-900">Create with Org Brain</h1>
        </div>
        {step !== 'prompt' && (
          <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gray-400">
            {['assembly', 'generation', 'review'].map((s, i) => (
              <span key={s} className={`flex items-center gap-1 ${step === s ? 'text-[#009eda] font-semibold' : ['assembly', 'generation', 'review'].indexOf(step) > i ? 'text-emerald-600' : ''}`}>
                {i > 0 && <span className="text-gray-200 mx-0.5">/</span>}
                {['assembly', 'generation', 'review'].indexOf(step) > i ? '\u2713' : ['Assembly', 'Generation', 'Review'][i]}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Phase content */}
      <AnimatePresence mode="wait">
        {step === 'prompt' && (
          <motion.div key="prompt" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <PromptStudio onGenerate={handleGenerate} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'assembly' && config && (
          <motion.div key="assembly" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <IntelligenceAssembly config={config} onComplete={handleAssemblyComplete} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'generation' && config && (
          <motion.div key="generation" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GenerationProgress config={config} onComplete={handleGenerationComplete} prefersReduced={prefersReduced} />
          </motion.div>
        )}
        {step === 'review' && config && (
          <motion.div key="review" initial={prefersReduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ReviewRefine config={config} onAccept={handleAccept} onBack={onBack} prefersReduced={prefersReduced} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
