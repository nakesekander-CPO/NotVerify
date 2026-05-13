import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, Building2, Mic, Scale, Megaphone, Gavel, Heart,
  FileText, Bot, Plus, X, ArrowRight, BarChart3, Clock, Coins, Zap,
  ChevronDown, CheckCircle, SlidersHorizontal,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

/* ── Icon mapping (with fallbacks for missing lucide icons) ── */
const ICON_MAP = {
  Shield,
  Building2,
  Mic,
  Scale: Shield,
  Megaphone: Zap,
  Gavel: FileText,
  Heart: Bot,
}

/* ── Spring preset ── */
const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ── Constants ── */
const BASELINE_SCORE = 76
const GUARDRAILS_BOOST = 2
const BASE_TIME = 3
const BASE_COST = 5
const MAX_TIME = 20
const MAX_COST = 60

/* ── Default agents ── */
const DEFAULT_AGENTS = [
  { id: 'JP-FIN-3', name: 'J-GAAP Specialist', version: 'v4.2', icon: 'Shield', confidence: 94, qualityLift: 5, timeMinutes: 4, costCredits: 12, rule: 'ASBJ Rule 29', active: true },
  { id: 'MER-DT-1', name: 'Meridian Capital Digital Twin', version: 'v2.1', icon: 'Building2', confidence: 97, qualityLift: 3, timeMinutes: 2, costCredits: 8, glossaryMatch: 112, active: true },
  { id: 'BV-SENT-1', name: 'Brand Voice Sentry', version: 'v1.8', icon: 'Mic', confidence: 91, qualityLift: 2, timeMinutes: 1, costCredits: 5, profile: 'Meridian Capital Corporate', active: true },
]

const AVAILABLE_AGENTS = [
  { id: 'EU-REG-5', name: 'EU Regulatory Agent', version: 'v3.1', icon: 'Scale', confidence: 88, qualityLift: 4, timeMinutes: 5, costCredits: 15, rule: 'IFRS Compliance', active: false },
  { id: 'MKT-1', name: 'Marketing Specialist', version: 'v2.0', icon: 'Megaphone', confidence: 82, qualityLift: 2, timeMinutes: 3, costCredits: 10, active: false },
  { id: 'LEGAL-2', name: 'Legal & Compliance', version: 'v1.5', icon: 'Gavel', confidence: 90, qualityLift: 3, timeMinutes: 4, costCredits: 14, active: false },
  { id: 'MED-1', name: 'Medical & Pharma', version: 'v3.0', icon: 'Heart', confidence: 93, qualityLift: 5, timeMinutes: 6, costCredits: 18, active: false },
]

const SCAN_MESSAGES = [
  'Orchestrator identifying document DNA...',
  'Regulatory structure detected',
  'Optimal ensemble identified',
]

/* ── Agent relevance profiles ── */
const AGENT_RELEVANCE = {
  'JP-FIN-3': { verticals: ['financial'], locales: ['ja'], contentTypes: ['earnings reports', 'regulatory filings'] },
  'MER-DT-1': { verticals: ['financial', 'legal', 'technology'], locales: ['all'], contentTypes: ['all'] },
  'BV-SENT-1': { verticals: ['all'], locales: ['all'], contentTypes: ['all'] },
  'EU-REG-5': { verticals: ['financial', 'legal'], locales: ['de', 'fr', 'nl', 'it'], contentTypes: ['regulatory filings', 'legal contracts'] },
  'MKT-1': { verticals: ['marketing'], locales: ['all'], contentTypes: ['marketing content', 'video/media'] },
  'LEGAL-2': { verticals: ['legal', 'financial'], locales: ['all'], contentTypes: ['legal contracts', 'regulatory filings'] },
  'MED-1': { verticals: ['life sciences'], locales: ['all'], contentTypes: ['medical/clinical'] },
}

const DEFAULT_DOCUMENT_PROFILE = { vertical: 'Financial Services', contentTypes: ['earnings reports'], locales: ['ja'] }

function computeRelevance(agentId, profile) {
  const rel = AGENT_RELEVANCE[agentId]
  if (!rel) return 0
  let score = 0
  // Vertical match: +40 (case-insensitive)
  const profileVerticalLower = (profile.vertical || '').toLowerCase()
  if (rel.verticals.includes('all') || rel.verticals.some(v => profileVerticalLower.includes(v))) score += 40
  // Locale match: +30
  if (rel.locales.includes('all') || rel.locales.some((l) => profile.locales.includes(l))) score += 30
  // Content type match: +30
  if (rel.contentTypes.includes('all') || rel.contentTypes.some((ct) => profile.contentTypes.includes(ct))) score += 30
  return Math.min(score, 100)
}

/* ── Helpers ── */
function getQualityColor(value) {
  if (value < 70) return '#ef4444'   // red
  if (value <= 85) return '#f59e0b'  // amber
  return '#10b981'                    // emerald
}

function AgentIcon({ iconName, size = 18, className = '' }) {
  const IconComponent = ICON_MAP[iconName] || Shield
  return <IconComponent size={size} className={className} />
}

/* ══════════════════════════════════════════════════════════════
   Phase 1 -- Auto-Detection overlay
   ══════════════════════════════════════════════════════════════ */
function AutoDetectionPhase({ fileName, reducedMotion, onComplete }) {
  const [messageIndex, setMessageIndex] = useState(0)

  useEffect(() => {
    const timers = [
      setTimeout(() => setMessageIndex(1), 700),
      setTimeout(() => setMessageIndex(2), 1400),
      setTimeout(onComplete, 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [onComplete])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ backgroundColor: '#f9fafb' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.3 }}
    >
      {/* Scanning icon */}
      <motion.div
        className="mb-8 rounded-lg p-6"
        style={{ backgroundColor: '#ffffff' }}
        animate={reducedMotion ? {} : { scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 1.5 }}
      >
        <FileText size={48} className="text-gray-600" />
      </motion.div>

      {/* File name */}
      <p className="mb-6 text-sm font-medium tracking-wide text-gray-400 uppercase" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {fileName}
      </p>

      {/* Streaming log messages */}
      <div className="flex flex-col items-center gap-2 h-20">
        <AnimatePresence mode="popLayout">
          {SCAN_MESSAGES.slice(0, messageIndex + 1).map((msg, i) => (
            <motion.p
              key={msg}
              className="text-sm"
              style={{
                fontFamily: 'JetBrains Mono, monospace',
                color: i === messageIndex ? '#1B5E8F' : 'rgba(0,0,0,0.35)',
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.25 }}
            >
              {msg}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>

      {/* Pulse ring */}
      {!reducedMotion && (
        <motion.div
          className="absolute rounded-full border"
          style={{ borderColor: 'rgba(27,94,143,0.15)', width: 200, height: 200 }}
          animate={{ scale: [1, 2.5], opacity: [0.6, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
        />
      )}
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Auto-Mode Summary
   ══════════════════════════════════════════════════════════════ */
function AutoModeSummary({
  fileName,
  documentProfile,
  activeAgents,
  projectedScore,
  estimatedTime,
  estimatedCost,
  reducedMotion,
  onDeploy,
  onCustomize,
}) {
  const qualityColor = getQualityColor(projectedScore)
  const qualityPct = Math.min((projectedScore / 100) * 100, 100)

  // Build profile description
  const profileParts = [
    documentProfile.vertical ? documentProfile.vertical.charAt(0).toUpperCase() + documentProfile.vertical.slice(1) : null,
    documentProfile.locales?.[0] === 'ja' ? 'Japanese' : documentProfile.locales?.[0]?.toUpperCase(),
    documentProfile.contentTypes?.[0] ? documentProfile.contentTypes[0].charAt(0).toUpperCase() + documentProfile.contentTypes[0].slice(1) : null,
  ].filter(Boolean)

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: '#f9fafb' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reducedMotion ? 0 : 0.35 }}
    >
      <div className="w-full max-w-[560px] px-6">
        {/* Heading */}
        <motion.h1
          className="mb-8 text-xs font-bold tracking-widest text-gray-400 uppercase text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.1, ...SPRING }}
        >
          Agent Ensemble Ready
        </motion.h1>

        {/* File info pill */}
        <motion.div
          className="rounded-lg border px-5 py-3 mb-8"
          style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.15, ...SPRING }}
        >
          <p className="text-gray-900 font-medium text-sm">{fileName}</p>
          <p className="text-gray-500 text-[13px]">{profileParts.join(' \u00B7 ')}</p>
        </motion.div>

        {/* Optimal Ensemble Selected */}
        <motion.div
          className="flex items-center justify-center gap-2 mb-5"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.2, ...SPRING }}
        >
          <CheckCircle size={14} className="text-emerald-500/60" />
          <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">
            Optimal Ensemble Selected
          </span>
        </motion.div>

        {/* Agent summary row */}
        <motion.div
          className="flex gap-3 justify-center mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.25, ...SPRING }}
        >
          {activeAgents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border p-3 text-center min-w-[100px]"
              style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}
            >
              <p className="text-xs font-mono text-gray-600">{agent.id}</p>
              <p className="text-[13px] font-medium text-gray-900 mt-0.5">{agent.name}</p>
              <p className="text-emerald-400 text-xs font-mono mt-1">+{agent.qualityLift}</p>
            </div>
          ))}
          <div className="flex items-center pl-1">
            <p className="text-sm text-gray-500 font-mono">
              {activeAgents.length} agent{activeAgents.length === 1 ? '' : 's'}<br />selected
            </p>
          </div>
        </motion.div>

        {/* Projected Quality */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.3, ...SPRING }}
        >
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Projected Quality</p>
          <p className="text-[32px] font-bold font-mono mb-2" style={{ color: qualityColor }}>
            {projectedScore}
          </p>
          <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#ffffff' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: qualityColor }}
              initial={{ width: 0 }}
              animate={{ width: `${qualityPct}%` }}
              transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
            />
          </div>
        </motion.div>

        {/* Time + Cost */}
        <motion.p
          className="text-sm text-gray-500 font-mono mb-10"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.35, ...SPRING }}
        >
          Est. Time: {estimatedTime}m &middot; Est. Cost: {estimatedCost}cr
        </motion.p>

        {/* Action buttons */}
        <motion.div
          className="flex gap-3 justify-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.4, ...SPRING }}
        >
          <button
            onClick={onDeploy}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: '#164D75' }}
          >
            Deploy Agents <ArrowRight size={16} />
          </button>
          <button
            onClick={onCustomize}
            className="flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-medium text-gray-700 transition-colors"
            style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderColor: 'rgba(0,0,0,0.12)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.04)' }}
          >
            <SlidersHorizontal size={16} /> Customize Agents
          </button>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Agent Card (active)
   ══════════════════════════════════════════════════════════════ */
function ActiveAgentCard({ agent, onRemove, reducedMotion }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24, height: 0, marginBottom: 0, padding: 0 }}
      transition={reducedMotion ? { duration: 0 } : SPRING}
      className="mb-3 rounded-lg border p-4"
      style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: 'rgba(27,94,143,0.12)' }}>
            <AgentIcon iconName={agent.icon} size={18} className="text-[#1B5E8F]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
              {agent.relevance >= 70 && (
                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agent.id} {agent.version}</p>
              {agent.relevance >= 70 && (
                <span className="text-[10px] text-emerald-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agent.relevance}% match</span>
              )}
              {agent.relevance >= 40 && agent.relevance < 70 && (
                <span className="text-[10px] text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agent.relevance}% match</span>
              )}
              {agent.relevance < 40 && (
                <span className="text-[10px] text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Low relevance</span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onRemove(agent.id)}
          className="flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-black/[0.06] hover:text-gray-600"
          aria-label={`Remove ${agent.name}`}
        >
          <X size={14} />
        </button>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex items-center gap-4" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        <span className="flex items-center gap-1 text-xs text-emerald-400">
          <BarChart3 size={12} /> +{agent.qualityLift} pts
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={12} /> {agent.timeMinutes}m
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Coins size={12} /> {agent.costCredits}cr
        </span>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Available Agent Row
   ══════════════════════════════════════════════════════════════ */
function AvailableAgentRow({ agent, onAdd, reducedMotion }) {
  const isLow = agent.relevance < 40
  const isHigh = agent.relevance >= 70
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8, height: 0 }}
      transition={reducedMotion ? { duration: 0 } : { ...SPRING, stiffness: 250 }}
      className={`flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-black/[0.02]${isLow ? ' opacity-40' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <AgentIcon iconName={agent.icon} size={16} className="text-gray-400" />
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-700">{agent.name}</p>
            {isHigh && (
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Recommended
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
              +{agent.qualityLift} pts &middot; {agent.timeMinutes}m &middot; {agent.costCredits}cr
            </p>
            {isHigh && (
              <span className="text-[10px] text-emerald-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agent.relevance}% match</span>
            )}
            {!isHigh && !isLow && (
              <span className="text-[10px] text-gray-500" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{agent.relevance}% match</span>
            )}
            {isLow && (
              <span className="text-[10px] text-gray-400" style={{ fontFamily: 'JetBrains Mono, monospace' }}>Low relevance</span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => onAdd(agent.id)}
        className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
        style={{ backgroundColor: 'rgba(27,94,143,0.12)', color: '#1B5E8F' }}
        aria-label={`Add ${agent.name}`}
      >
        <Plus size={12} /> Add
      </button>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Metric Bar
   ══════════════════════════════════════════════════════════════ */
function MetricBar({ label, value, max, color, displayValue, icon: Icon, reducedMotion }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
          <Icon size={13} className="text-gray-400" /> {label}
        </span>
        <span className="text-sm font-bold" style={{ fontFamily: 'JetBrains Mono, monospace', color }}>
          {displayValue}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: '#ffffff' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          animate={{ width: `${pct}%` }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
        />
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Quality Breakdown Waterfall
   ══════════════════════════════════════════════════════════════ */
function QualityBreakdown({ activeAgents, totalScore, reducedMotion }) {
  return (
    <div className="mt-6 rounded-lg border p-4" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}>
      <p className="mb-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Quality Breakdown</p>

      <div className="space-y-1.5" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {/* Baseline */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Baseline</span>
          <span className="text-gray-700">{BASELINE_SCORE}</span>
        </div>

        {/* Guardrails */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">AI Guardrails</span>
          <span className="text-emerald-400">+{GUARDRAILS_BOOST}</span>
        </div>

        {/* Active agents */}
        <AnimatePresence mode="popLayout">
          {activeAgents.map((a) => (
            <motion.div
              key={a.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, height: 0 }}
              transition={reducedMotion ? { duration: 0 } : { ...SPRING, stiffness: 250 }}
              className="flex items-center justify-between text-xs"
            >
              <span className="flex items-center gap-1.5 text-gray-500">
                <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#1B5E8F' }} />
                {a.id}
              </span>
              <span className="text-emerald-400">+{a.qualityLift}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Divider */}
        <div className="my-1.5 border-t" style={{ borderColor: 'rgba(0,0,0,0.12)' }} />

        {/* Final */}
        <div className="flex items-center justify-between text-sm font-bold">
          <span className="text-gray-700">Final</span>
          <motion.span
            key={totalScore}
            style={{ color: getQualityColor(totalScore) }}
            initial={{ scale: 1.15 }}
            animate={{ scale: 1 }}
            transition={reducedMotion ? { duration: 0 } : SPRING}
          >
            {totalScore}
          </motion.span>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */
export default function PreFlightSimulator({
  fileName = 'Q3_Earnings_Final.docx',
  onDeploy,
  agents: initialAgents,
  documentProfile: docProfileProp,
}) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState(1)
  const [mode, setMode] = useState('auto') // 'auto' | 'customize'
  const [showLowRelevance, setShowLowRelevance] = useState(false)

  const documentProfile = useMemo(
    () => docProfileProp || DEFAULT_DOCUMENT_PROFILE,
    [docProfileProp],
  )

  // Build full agent pool: merge provided agents + available replacements, scored & sorted
  const allAgents = useMemo(() => {
    const provided = initialAgents?.length ? initialAgents : DEFAULT_AGENTS
    const providedIds = new Set(provided.map((a) => a.id))
    const extras = AVAILABLE_AGENTS.filter((a) => !providedIds.has(a.id))
    const merged = [...provided, ...extras].map((a) => ({
      ...a,
      relevance: computeRelevance(a.id, documentProfile),
    }))
    merged.sort((a, b) => b.relevance - a.relevance)
    return merged
  }, [initialAgents, documentProfile])

  const [agentStates, setAgentStates] = useState(() => {
    const map = {}
    allAgents.forEach((a) => {
      map[a.id] = { ...a, active: a.relevance >= 70 }
    })
    return map
  })

  const activeAgents = useMemo(
    () => allAgents.filter((a) => agentStates[a.id]?.active).map((a) => ({ ...a, ...agentStates[a.id] })),
    [agentStates, allAgents],
  )

  const availableAgents = useMemo(
    () => allAgents.filter((a) => !agentStates[a.id]?.active).map((a) => ({ ...a, ...agentStates[a.id] })),
    [agentStates, allAgents],
  )

  const visibleAvailable = useMemo(
    () => availableAgents.filter((a) => a.relevance >= 40),
    [availableAgents],
  )

  const lowRelevanceAvailable = useMemo(
    () => availableAgents.filter((a) => a.relevance < 40),
    [availableAgents],
  )

  /* ── Computed projections ── */
  const projectedScore = useMemo(
    () => Math.min(100, BASELINE_SCORE + GUARDRAILS_BOOST + activeAgents.reduce((s, a) => s + a.qualityLift, 0)),
    [activeAgents],
  )

  const estimatedTime = useMemo(
    () => BASE_TIME + activeAgents.reduce((s, a) => s + a.timeMinutes, 0),
    [activeAgents],
  )

  const estimatedCost = useMemo(
    () => BASE_COST + activeAgents.reduce((s, a) => s + a.costCredits, 0),
    [activeAgents],
  )

  /* ── Actions ── */
  const removeAgent = useCallback((id) => {
    setAgentStates((prev) => ({ ...prev, [id]: { ...prev[id], active: false } }))
  }, [])

  const addAgent = useCallback((id) => {
    setAgentStates((prev) => ({ ...prev, [id]: { ...prev[id], active: true } }))
  }, [])

  const handleDeploy = useCallback(() => {
    onDeploy?.({
      agents: activeAgents,
      projectedScore,
      estimatedTime,
      estimatedCost,
    })
  }, [onDeploy, activeAgents, projectedScore, estimatedTime, estimatedCost])

  const handleDetectionComplete = useCallback(() => setPhase(2), [])

  /* ── Render ── */
  return (
    <AnimatePresence mode="wait">
      {phase === 1 && (
        <AutoDetectionPhase
          key="detection"
          fileName={fileName}
          reducedMotion={reducedMotion}
          onComplete={handleDetectionComplete}
        />
      )}

      {phase === 2 && mode === 'auto' && (
        <AutoModeSummary
          key="auto-summary"
          fileName={fileName}
          documentProfile={documentProfile}
          activeAgents={activeAgents}
          projectedScore={projectedScore}
          estimatedTime={estimatedTime}
          estimatedCost={estimatedCost}
          reducedMotion={reducedMotion}
          onDeploy={handleDeploy}
          onCustomize={() => setMode('customize')}
        />
      )}

      {phase === 2 && mode === 'customize' && (
        <motion.div
          key="simulator"
          className="fixed inset-0 z-50 flex flex-col overflow-hidden"
          style={{ backgroundColor: '#f9fafb' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.35 }}
        >
          {/* ── Header ── */}
          <header className="flex items-center justify-between border-b px-8 py-5" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-xs font-bold tracking-widest text-gray-400 uppercase">Pre-Flight Simulator</h1>
                <p className="mt-0.5 text-sm text-gray-600" style={{ fontFamily: 'JetBrains Mono, monospace' }}>{fileName}</p>
              </div>
              <button
                onClick={() => setMode('auto')}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-gray-500"
              >
                &larr; Back to Summary
              </button>
            </div>
            <button
              onClick={handleDeploy}
              className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#164D75' }}
            >
              Deploy Ensemble <ArrowRight size={16} />
            </button>
          </header>

          {/* ── Body grid ── */}
          <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '1fr 380px' }}>
            {/* ── Left: Agent Management ── */}
            <div className="overflow-y-auto border-r px-8 py-6" style={{ borderColor: 'rgba(0,0,0,0.12)' }}>
              {/* Active Agents */}
              <h2 className="mb-4 text-xs font-bold tracking-widest text-gray-400 uppercase">Active Agents</h2>

              <AnimatePresence mode="popLayout">
                {activeAgents.map((agent) => (
                  <ActiveAgentCard
                    key={agent.id}
                    agent={agent}
                    onRemove={removeAgent}
                    reducedMotion={reducedMotion}
                  />
                ))}
              </AnimatePresence>

              {activeAgents.length === 0 && (
                <p className="mb-4 text-sm text-gray-400 italic">No agents selected. Add agents below.</p>
              )}

              {/* Available Agents */}
              {availableAgents.length > 0 && (
                <>
                  <h2 className="mb-3 mt-8 text-xs font-bold tracking-widest text-gray-400 uppercase">Available Agents</h2>
                  <div className="rounded-lg border" style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}>
                    <AnimatePresence mode="popLayout">
                      {visibleAvailable.map((agent) => (
                        <AvailableAgentRow
                          key={agent.id}
                          agent={agent}
                          onAdd={addAgent}
                          reducedMotion={reducedMotion}
                        />
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Low relevance agents toggle */}
                  {lowRelevanceAvailable.length > 0 && (
                    <>
                      <button
                        onClick={() => setShowLowRelevance((v) => !v)}
                        className="mt-4 flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors hover:text-gray-500"
                      >
                        <motion.span
                          animate={{ rotate: showLowRelevance ? 180 : 0 }}
                          transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
                          className="inline-flex"
                        >
                          <ChevronDown size={14} />
                        </motion.span>
                        {showLowRelevance ? 'Hide' : `View ${lowRelevanceAvailable.length} more agent${lowRelevanceAvailable.length === 1 ? '' : 's'}`}
                      </button>
                      <AnimatePresence>
                        {showLowRelevance && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={reducedMotion ? { duration: 0 } : { ...SPRING, stiffness: 250 }}
                            className="mt-2 overflow-hidden rounded-lg border"
                            style={{ backgroundColor: '#ffffff', borderColor: 'rgba(0,0,0,0.12)' }}
                          >
                            {lowRelevanceAvailable.map((agent) => (
                              <AvailableAgentRow
                                key={agent.id}
                                agent={agent}
                                onAdd={addAgent}
                                reducedMotion={reducedMotion}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </>
              )}
            </div>

            {/* ── Right: Projections ── */}
            <div className="overflow-y-auto px-8 py-6">
              <h2 className="mb-6 text-xs font-bold tracking-widest text-gray-400 uppercase">Projections</h2>

              <MetricBar
                label="Projected Quality"
                value={projectedScore}
                max={100}
                color={getQualityColor(projectedScore)}
                displayValue={projectedScore}
                icon={BarChart3}
                reducedMotion={reducedMotion}
              />

              <MetricBar
                label="Estimated Time"
                value={estimatedTime}
                max={MAX_TIME}
                color="#1B5E8F"
                displayValue={`${estimatedTime}m`}
                icon={Clock}
                reducedMotion={reducedMotion}
              />

              <MetricBar
                label="Estimated Cost"
                value={estimatedCost}
                max={MAX_COST}
                color="#a78bfa"
                displayValue={`${estimatedCost}cr`}
                icon={Coins}
                reducedMotion={reducedMotion}
              />

              <QualityBreakdown
                activeAgents={activeAgents}
                totalScore={projectedScore}
                reducedMotion={reducedMotion}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
