import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  FileText, CheckCircle2, Bot, Globe, BookOpen, ShieldCheck,
  ArrowRight, Zap, Loader2, Clock, Coins, BarChart3,
  Plus, X, ChevronDown, ChevronRight, SlidersHorizontal, Shield, Building2,
  Mic, Scale, Megaphone, Gavel, Heart,
} from 'lucide-react'
import Dropzone from './Dropzone'
import useReducedMotion from '../hooks/useReducedMotion'
import { getScoreColor } from '../utils/scoreColors'
import { LIBRARY_AGENTS } from './IntelligenceMarketplace/data/marketplaceAgents'
import AgentLibrarySection from './AgentLibrarySection'
import AgentAssignDrawer from './AgentAssignDrawer'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ── Analysis steps ── */
const STEPS = {
  SCANNING: 'scanning',
  UPLOADED: 'uploaded',
  PARSED: 'parsed',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
}

/* ── Agent constants ── */
const BASELINE_SCORE = 76
const GUARDRAILS_BOOST = 2
const BASE_TIME = 3
const BASE_COST = 5

const ICON_MAP = { Shield, Building2, Mic, Scale: Shield, Megaphone: Zap, Gavel: FileText, Heart: Bot }

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

const AGENT_RELEVANCE = {
  'JP-FIN-3': { verticals: ['financial'], locales: ['ja'], contentTypes: ['earnings reports', 'regulatory filings'] },
  'MER-DT-1': { verticals: ['financial', 'legal', 'technology'], locales: ['all'], contentTypes: ['all'] },
  'BV-SENT-1': { verticals: ['all'], locales: ['all'], contentTypes: ['all'] },
  'EU-REG-5': { verticals: ['financial', 'legal'], locales: ['de', 'fr', 'nl', 'it'], contentTypes: ['regulatory filings', 'legal contracts'] },
  'MKT-1': { verticals: ['marketing'], locales: ['all'], contentTypes: ['marketing content', 'video/media'] },
  'LEGAL-2': { verticals: ['legal', 'financial'], locales: ['all'], contentTypes: ['legal contracts', 'regulatory filings'] },
  'MED-1': { verticals: ['life sciences'], locales: ['all'], contentTypes: ['medical/clinical'] },
  'HC-CLIN-1': { verticals: ['healthcare', 'life sciences'], locales: ['all'], contentTypes: ['clinical trials', 'patient information'] },
  'LEGAL-CS-1': { verticals: ['legal', 'financial'], locales: ['all'], contentTypes: ['legal contracts', 'regulatory filings'] },
  'ENG-TECH-1': { verticals: ['technical'], locales: ['all'], contentTypes: ['API documentation', 'technical specs'] },
}

function computeRelevance(agentId, profile) {
  const rel = AGENT_RELEVANCE[agentId]
  if (!rel) return 0
  let score = 0
  const v = (profile.vertical || '').toLowerCase()
  if (rel.verticals.includes('all') || rel.verticals.some(x => v.includes(x))) score += 40
  if (rel.locales.includes('all') || rel.locales.some(l => profile.locales.includes(l))) score += 30
  if (rel.contentTypes.includes('all') || rel.contentTypes.some(ct => profile.contentTypes.includes(ct))) score += 30
  return Math.min(score, 100)
}

function getQualityColor(v) {
  if (v < 70) return '#E53935'
  if (v <= 85) return '#FFB000'
  return '#00B887'
}

function AgentIcon({ iconName, size = 18, className = '' }) {
  const Ic = ICON_MAP[iconName] || Shield
  return <Ic size={size} className={className} />
}

/* ── Animated score counter ── */
function AnimatedScore({ value, reducedMotion }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 })
  const display = useTransform(spring, v => Math.round(v))
  const [rendered, setRendered] = useState(reducedMotion ? value : 0)

  useEffect(() => {
    if (reducedMotion) { setRendered(value); return }
    spring.set(value)
    const unsub = display.on('change', v => setRendered(v))
    return unsub
  }, [value, spring, display, reducedMotion])

  return <span className="tabular-nums">{rendered}</span>
}

/* ── Finding item ── */
function FindingItem({ finding, index, reducedMotion }) {
  const severityStyles = {
    critical: 'border-red-200 bg-red-50 text-red-700',
    major: 'border-amber-200 bg-amber-50 text-amber-700',
    minor: 'border-blue-200 bg-blue-50 text-blue-700',
    info: 'border-black/[0.08] bg-black/[0.02] text-gray-700',
  }
  const style = severityStyles[finding.severity] || severityStyles.info
  const icons = { critical: '⚠', major: '⚡', minor: 'ℹ', info: 'ℹ' }

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.12 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] ${style}`}
    >
      <span>{icons[finding.severity]}</span>
      <span className="truncate">{finding.text}</span>
    </motion.div>
  )
}

/* ── Dimension bar (quality) ── */
function DimensionBar({ name, score, delay, reducedMotion }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] text-gray-500 w-20 shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-black/[0.03] rounded-full overflow-hidden relative">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${color.bar}`}
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[11px] font-medium w-7 text-right shrink-0 ${color.text}`}>{score}</span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════
   MISSION CONTROL — Unified Launch Experience
   ══════════════════════════════════════════════════════ */
export default function MissionControl({
  triageData,
  discoveryFindings,
  structuredContext,
  documentProfile: docProfileProp,
  onDeploy,
  onFileAccepted,
  preloaded,
}) {
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState(preloaded ? STEPS.COMPLETE : STEPS.SCANNING)
  const [visibleFindings, setVisibleFindings] = useState([])
  const [showCustomize, setShowCustomize] = useState(false)
  const [showLowRelevance, setShowLowRelevance] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [drawerAgent, setDrawerAgent] = useState(null)
  const [showAssignDrawer, setShowAssignDrawer] = useState(false)
  const timersRef = useRef([])

  const fileName = triageData?.fileName || preloaded?.fileName || preloaded?.projectName || ''
  const classification = triageData?.classification || ''
  const plan = triageData?.plan || {}
  const qualityScore = triageData?.qualityScore || {}
  const locales = structuredContext?.targetLocales || []
  const pageCount = classification?.match(/\d+/)?.[0] || '23'
  const wordCount = '14,200'

  const documentProfile = useMemo(
    () => docProfileProp || { vertical: 'Financial Services', contentTypes: ['earnings reports'], locales: ['ja'] },
    [docProfileProp],
  )

  /* ── Agent pool with relevance scoring ── */
  const allAgents = useMemo(() => {
    const merged = [...DEFAULT_AGENTS, ...AVAILABLE_AGENTS].map(a => ({
      ...a,
      relevance: computeRelevance(a.id, documentProfile),
    }))
    merged.sort((a, b) => b.relevance - a.relevance)
    return merged
  }, [documentProfile])

  const [agentStates, setAgentStates] = useState(() => {
    const map = {}
    ;[...DEFAULT_AGENTS, ...AVAILABLE_AGENTS].forEach(a => {
      const rel = computeRelevance(a.id, docProfileProp || { vertical: 'Financial Services', contentTypes: ['earnings reports'], locales: ['ja'] })
      map[a.id] = { ...a, relevance: rel, active: rel >= 70 }
    })
    return map
  })

  const activeAgents = useMemo(
    () => allAgents.filter(a => agentStates[a.id]?.active).map(a => ({ ...a, ...agentStates[a.id] })),
    [agentStates, allAgents],
  )
  const availableAgents = useMemo(
    () => allAgents.filter(a => !agentStates[a.id]?.active).map(a => ({ ...a, ...agentStates[a.id] })),
    [agentStates, allAgents],
  )

  /* ── Projections ── */
  const projectedScore = useMemo(
    () => Math.min(100, BASELINE_SCORE + GUARDRAILS_BOOST + activeAgents.reduce((s, a) => s + a.qualityLift, 0)),
    [activeAgents],
  )
  const estimatedTime = useMemo(() => BASE_TIME + activeAgents.reduce((s, a) => s + a.timeMinutes, 0), [activeAgents])
  const estimatedCost = useMemo(() => BASE_COST + activeAgents.reduce((s, a) => s + a.costCredits, 0), [activeAgents])

  const qualityColor = getQualityColor(projectedScore)

  /* ── Agent actions ── */
  const removeAgent = useCallback(id => {
    setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], active: false } }))
  }, [])
  const addAgent = useCallback(id => {
    setAgentStates(prev => ({ ...prev, [id]: { ...prev[id], active: true } }))
  }, [])

  const handleLibraryAgentSelect = useCallback((agent) => {
    setDrawerAgent(agent)
    setShowAssignDrawer(true)
  }, [])

  const handleAssignFromLibrary = useCallback((agent) => {
    setAgentStates(prev => ({
      ...prev,
      [agent.id]: {
        id: agent.id,
        name: agent.name,
        version: agent.technical?.version || 'v1.0',
        icon: agent.icon,
        confidence: agent.scores?.accuracy || 90,
        qualityLift: agent.roi?.avgQualityLift || 5,
        timeMinutes: 4,
        costCredits: agent.roi?.tier === 'Enterprise' ? 18 : agent.roi?.tier === 'Premium' ? 12 : 8,
        relevance: computeRelevance(agent.id, documentProfile),
        active: true,
      }
    }))
  }, [documentProfile])

  /* ── Quality ring SVG ── */
  const ringRadius = 30
  const ringCircumference = 2 * Math.PI * ringRadius
  const overallScore = qualityScore?.overall || 0
  const potentialScore = qualityScore?.potential || 0
  const dimensions = qualityScore?.dimensions || []
  const ringOffset = ringCircumference - (overallScore / 100) * ringCircumference
  const ringStroke = overallScore >= 85 ? '#00B887' : overallScore >= 65 ? '#3D16FA' : '#E53935'

  /* ── Choreographed analysis sequence ── */
  useEffect(() => {
    if (!triageData || step !== STEPS.SCANNING) return
    const timers = []

    if (prefersReducedMotion) {
      setStep(STEPS.COMPLETE)
      setVisibleFindings(discoveryFindings || [])
      return
    }

    // Rapid scan → analysis → complete
    timers.push(setTimeout(() => setStep(STEPS.UPLOADED), 400))
    timers.push(setTimeout(() => setStep(STEPS.PARSED), 900))
    timers.push(setTimeout(() => setStep(STEPS.ANALYZING), 1200))

    // Stream findings
    const findings = discoveryFindings || []
    findings.forEach((f, i) => {
      timers.push(setTimeout(() => setVisibleFindings(prev => [...prev, f]), 1200 + (i + 1) * 400))
    })

    // Complete
    const completeTime = 1200 + (findings.length + 1) * 400 + 400
    timers.push(setTimeout(() => setStep(STEPS.COMPLETE), completeTime))

    timersRef.current = timers
    return () => timers.forEach(clearTimeout)
  }, [triageData, discoveryFindings, prefersReducedMotion])

  // Preloaded
  useEffect(() => {
    if (preloaded && !triageData) {
      setStep(STEPS.COMPLETE)
    }
  }, [preloaded, triageData])

  /* ── Deploy handler ── */
  const handleDeploy = useCallback(() => {
    onDeploy?.({ agents: activeAgents, projectedScore, estimatedTime, estimatedCost })
  }, [onDeploy, activeAgents, projectedScore, estimatedTime, estimatedCost])

  const isReady = step === STEPS.COMPLETE

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-1">
          {fileName ? fileName.replace(/\.\w+$/, '').replace(/_/g, ' ') : 'Upload Document'}
        </h1>
        {classification && (
          <p className="text-[14px] text-gray-500">
            {fileName} · {pageCount} pages · {wordCount} words
          </p>
        )}
      </div>

      {/* No file yet — show dropzone */}
      {!triageData && !preloaded && (
        <div className="bg-gray-50 border border-black/[0.12] rounded-lg p-8">
          <Dropzone onFileAccepted={onFileAccepted} compact />
        </div>
      )}

      {/* Trust Assessment — default view (simplified) */}
      {(triageData || preloaded) && !showAdvanced && isReady && (
        <div className="max-w-xl mx-auto space-y-5">
          {/* Assessment header */}
          <div className="bg-white border border-black/[0.12] rounded-xl overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-black/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">Trust assessment</p>
                  <p className="text-[16px] font-semibold text-gray-900">{classification || 'Document Analysis'}</p>
                  <p className="text-[12px] text-gray-500 mt-0.5">{fileName} &middot; {pageCount} pages &middot; {locales.map(l => l.toUpperCase()).join(', ')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative" style={{ width: 56, height: 56 }}>
                    <svg width={56} height={56} viewBox="0 0 56 56" className="transform -rotate-90">
                      <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth={4} />
                      <motion.circle cx={28} cy={28} r={24} fill="none" stroke={qualityColor} strokeWidth={4} strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 24}
                        initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 24 - (projectedScore / 100) * 2 * Math.PI * 24 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 15 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-mono text-[15px] font-bold" style={{ color: qualityColor }}>{projectedScore}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-semibold text-gray-800">Projected confidence</p>
                    <p className="text-[10px] text-gray-400">{estimatedCost}cr &middot; ~{estimatedTime}m</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Specialist intelligence selected */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Specialist intelligence assigned</p>
              <div className="space-y-2">
                {activeAgents.map(agent => (
                  <div key={agent.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-black/[0.06]">
                    <div className="w-7 h-7 rounded-md bg-[#3D16FA]/10 flex items-center justify-center shrink-0">
                      <Shield className="w-3.5 h-3.5 text-[#3D16FA]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-gray-800">{agent.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {agent.id === 'JP-FIN-3' ? 'J-GAAP compliance, TSE terminology, currency formatting' :
                         agent.id === 'MER-DT-1' ? 'Meridian Capital voice policy, organizational memory' :
                         agent.id === 'BV-SENT-1' ? 'Brand voice consistency, register enforcement' :
                         agent.id === 'EU-REG-5' ? 'EU regulatory precision, IFRS terminology' :
                         agent.id === 'LEGAL-2' ? 'Legal compliance, contract clause integrity' :
                         'Domain-specific quality assurance'}
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium shrink-0">+{agent.qualityLift} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Governance context */}
            <div className="px-6 py-3 border-t border-black/[0.06] bg-gray-50/60">
              <div className="space-y-1 text-[11px] text-gray-500">
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Cortex: 1,247 entries loaded for domain memory</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> {(plan.guardrails || []).length || 5} guardrails active: {(plan.guardrails || ['J-GAAP compliance', 'TSE terminology', 'Currency formatting']).slice(0, 3).join(', ')}</p>
                <p className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" /> Escalation: segments below confidence threshold routed to human review</p>
              </div>
            </div>
          </div>

          {/* Primary CTA */}
          <motion.button
            onClick={handleDeploy}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-[#3D16FA] hover:bg-[#2E10C4] text-white text-[15px] font-semibold shadow-sm shadow-[#3D16FA]/20 cursor-pointer transition-all"
            animate={!prefersReducedMotion ? { scale: [1, 1.015, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            Approve &amp; Begin Processing <ArrowRight size={16} />
          </motion.button>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(true)}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer transition-colors py-2"
          >
            Advanced configuration <ChevronRight size={13} className="transition-transform" />
          </button>
        </div>
      )}

      {/* Loading state (before analysis complete) — show simple progress */}
      {(triageData || preloaded) && !showAdvanced && !isReady && (
        <div className="max-w-lg mx-auto">
          <div className="bg-gray-50 border border-black/[0.12] rounded-xl p-8 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-[#3D16FA] animate-spin" />
            <div className="text-center">
              <p className="text-[15px] font-medium text-gray-900 mb-1">Analyzing document</p>
              <p className="text-[13px] text-gray-500">{fileName}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main 2-column grid (advanced view) */}
      {(triageData || preloaded) && showAdvanced && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          {/* ═══ LEFT COLUMN: Document Analysis ═══ */}
          <div className="space-y-4">
            {/* Analysis status card */}
            <div className={`bg-white border rounded-lg p-5 transition-colors duration-300 ${
              step === STEPS.COMPLETE ? 'border-emerald-200' : 'border-black/[0.12]'
            }`}>
              <div className="flex items-center gap-4 mb-4">
                <motion.div
                  className={`w-14 h-14 rounded-lg flex items-center justify-center border ${
                    isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-[#3D16FA]/5 border-[#3D16FA]/20'
                  }`}
                  animate={!isReady && !prefersReducedMotion ? { scale: [1, 1.04, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <FileText className={`w-6 h-6 ${isReady ? 'text-emerald-500' : 'text-[#3D16FA]'}`} />
                </motion.div>
                <div className="space-y-1">
                  {[STEPS.UPLOADED, STEPS.PARSED, STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[12px] text-emerald-600">Uploaded</span>
                    </motion.div>
                  )}
                  {[STEPS.PARSED, STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[12px] text-emerald-600">Parsed · {pageCount} pages · {wordCount} words</span>
                    </motion.div>
                  )}
                  {step === STEPS.ANALYZING && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[12px] text-amber-600">Analyzing document...</span>
                    </motion.div>
                  )}
                  {step === STEPS.COMPLETE && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[12px] text-emerald-600">Analysis complete · {plan.guardrails?.length || 6} guardrails applied</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Findings feed */}
              {visibleFindings.length > 0 && (
                <div className="space-y-1.5">
                  {visibleFindings.slice(-4).map((f, i) => (
                    <FindingItem key={`${f.category}-${i}`} finding={f} index={i} reducedMotion={prefersReducedMotion} />
                  ))}
                </div>
              )}
            </div>

            {/* Recommended Agent Ensemble — appears once analysis starts */}
            <AnimatePresence>
              {[STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, delay: 0.2 }}
                  className="bg-white border border-black/[0.12] rounded-lg p-5"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-[#3D16FA]" />
                      <h2 className="text-[13px] font-semibold text-gray-900">Recommended Agent Ensemble</h2>
                    </div>
                    <button
                      onClick={() => setShowCustomize(v => !v)}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      {showCustomize ? 'Done' : 'Customize'}
                    </button>
                  </div>

                  {/* Active agents */}
                  <div className="space-y-2 mb-3">
                    <AnimatePresence mode="popLayout">
                      {activeAgents.map(agent => (
                        <motion.div
                          key={agent.id}
                          layout
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12, height: 0, marginBottom: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : SPRING}
                          className="flex items-center justify-between p-3 rounded-lg border border-black/[0.08] bg-gray-50/50"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#3D16FA]/10 flex items-center justify-center">
                              <AgentIcon iconName={agent.icon} size={16} className="text-[#3D16FA]" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-[13px] font-medium text-gray-900">{agent.name}</p>
                                {agent.relevance >= 70 && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                    {agent.relevance}% match
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 font-mono">{agent.id} {agent.version} · +{agent.qualityLift}pts · {agent.costCredits}cr</p>
                            </div>
                          </div>
                          {showCustomize && (
                            <button
                              onClick={() => removeAgent(agent.id)}
                              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {activeAgents.length === 0 && (
                    <p className="text-[12px] text-gray-400 italic mb-3">No agents selected. Add agents below.</p>
                  )}

                  {/* Available agents — only in customize mode */}
                  <AnimatePresence>
                    {showCustomize && availableAgents.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, stiffness: 250 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-black/[0.06] pt-3 mt-1">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Available Agents</p>
                          <div className="space-y-1">
                            {availableAgents
                              .filter(a => showLowRelevance || a.relevance >= 40)
                              .map(agent => (
                                <div
                                  key={agent.id}
                                  className={`flex items-center justify-between px-3 py-2 rounded-lg hover:bg-black/[0.02] transition-colors ${
                                    agent.relevance < 40 ? 'opacity-40' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <AgentIcon iconName={agent.icon} size={14} className="text-gray-400" />
                                    <div>
                                      <p className="text-[12px] text-gray-700">{agent.name}</p>
                                      <p className="text-[10px] text-gray-400 font-mono">
                                        +{agent.qualityLift}pts · {agent.timeMinutes}m · {agent.costCredits}cr
                                        {agent.relevance >= 40 && <span className="text-gray-500 ml-1.5">{agent.relevance}%</span>}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => addAgent(agent.id)}
                                    className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium bg-[#3D16FA]/10 text-[#3D16FA] hover:bg-[#3D16FA]/20 transition-colors cursor-pointer"
                                  >
                                    <Plus size={12} /> Add
                                  </button>
                                </div>
                              ))}
                          </div>
                          {availableAgents.some(a => a.relevance < 40) && (
                            <button
                              onClick={() => setShowLowRelevance(v => !v)}
                              className="mt-2 flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-500 transition-colors cursor-pointer"
                            >
                              <motion.span
                                animate={{ rotate: showLowRelevance ? 180 : 0 }}
                                transition={{ duration: 0.2 }}
                                className="inline-flex"
                              >
                                <ChevronDown size={12} />
                              </motion.span>
                              {showLowRelevance ? 'Hide low relevance' : `Show ${availableAgents.filter(a => a.relevance < 40).length} more`}
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Agent Library — discovery section, appears once analysis completes */}
            <AnimatePresence>
              {isReady && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, delay: 0.35 }}
                >
                  <AgentLibrarySection
                    agents={LIBRARY_AGENTS}
                    agentStates={agentStates}
                    onSelectAgent={handleLibraryAgentSelect}
                    reducedMotion={prefersReducedMotion}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Assign Drawer (portal-rendered via Drawer.jsx) */}
            <AgentAssignDrawer
              agent={drawerAgent}
              isOpen={showAssignDrawer}
              onClose={() => setShowAssignDrawer(false)}
              onAssign={handleAssignFromLibrary}
              isAlreadyAssigned={drawerAgent ? !!agentStates[drawerAgent.id]?.active : false}
            />

            {/* Confidence Projection — appears on complete */}
            <AnimatePresence>
              {isReady && overallScore > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, delay: 0.1 }}
                  className="bg-white border border-black/[0.12] rounded-lg p-5"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative shrink-0">
                      <svg width="72" height="72" viewBox="0 0 72 72">
                        <circle cx="36" cy="36" r={ringRadius} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="4" />
                        <motion.circle
                          cx="36" cy="36" r={ringRadius} fill="none" stroke={ringStroke} strokeWidth="4" strokeLinecap="round"
                          strokeDasharray={ringCircumference}
                          initial={{ strokeDashoffset: ringCircumference }}
                          animate={{ strokeDashoffset: ringOffset }}
                          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 15 }}
                          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-mono text-[18px] font-bold" style={{ color: ringStroke }}>
                          <AnimatedScore value={overallScore} reducedMotion={prefersReducedMotion} />
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[16px] font-semibold text-gray-900 mb-0.5">
                        {overallScore - 2}–{overallScore + 2}%
                        <span className="text-[13px] font-normal text-gray-500 ml-2">projected confidence</span>
                      </p>
                      <p className="text-[11px] text-gray-500">Based on 42 prior JA financial projects</p>
                      {potentialScore > overallScore && (
                        <p className="flex items-center gap-1 text-[11px] text-[#3D16FA] mt-1.5">
                          <Zap className="w-3 h-3" />
                          +{potentialScore - overallScore}% with Premium Knowledge Enhancement
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {dimensions.map((dim, i) => (
                      <DimensionBar
                        key={dim.name}
                        name={dim.name.replace('Accuracy', '').replace('Compliance', '').replace('Adaptation', '').trim()}
                        score={dim.score}
                        delay={i * 0.12}
                        reducedMotion={prefersReducedMotion}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ═══ RIGHT COLUMN: Projections + Config + Deploy ═══ */}
          <div className="lg:sticky lg:top-36 lg:self-start space-y-4">
            {/* Ensemble Projections */}
            <AnimatePresence>
              {[STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 }}
                  className="bg-white border border-black/[0.12] rounded-lg p-5 space-y-4"
                >
                  <h3 className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Ensemble Projections</h3>

                  {/* Projected Confidence */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><BarChart3 size={13} className="text-gray-400" /> Confidence</span>
                      <span className="text-[14px] font-bold font-mono" style={{ color: qualityColor }}>{projectedScore}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: qualityColor }}
                        animate={{ width: `${Math.min(projectedScore, 100)}%` }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>

                  {/* Time */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><Clock size={13} className="text-gray-400" /> Time</span>
                      <span className="text-[13px] font-bold font-mono text-[#3D16FA]">{estimatedTime}m</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full rounded-full bg-[#3D16FA]"
                        animate={{ width: `${Math.min((estimatedTime / 20) * 100, 100)}%` }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>

                  {/* Cost */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500"><Coins size={13} className="text-gray-400" /> Cost</span>
                      <span className="text-[13px] font-bold font-mono text-purple-500">{estimatedCost}cr</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <motion.div
                        className="h-full rounded-full bg-purple-400"
                        animate={{ width: `${Math.min((estimatedCost / 60) * 100, 100)}%` }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 25 }}
                      />
                    </div>
                  </div>

                  {/* Confidence Breakdown */}
                  <div className="border-t border-black/[0.06] pt-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Confidence Breakdown</p>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div className="flex justify-between"><span className="text-gray-500">Baseline</span><span className="text-gray-700">{BASELINE_SCORE}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">AI Guardrails</span><span className="text-emerald-500">+{GUARDRAILS_BOOST}</span></div>
                      <AnimatePresence mode="popLayout">
                        {activeAgents.map(a => (
                          <motion.div
                            key={a.id} layout
                            initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -8, height: 0 }}
                            transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, stiffness: 250 }}
                            className="flex justify-between"
                          >
                            <span className="flex items-center gap-1.5 text-gray-500">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#3D16FA]" />{a.id}
                            </span>
                            <span className="text-emerald-500">+{a.qualityLift}</span>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      <div className="border-t border-black/[0.06] my-1.5" />
                      <div className="flex justify-between text-[12px] font-bold">
                        <span className="text-gray-700">Final</span>
                        <motion.span key={projectedScore} style={{ color: qualityColor }} initial={{ scale: 1.15 }} animate={{ scale: 1 }}>
                          {projectedScore}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Config summary */}
            <AnimatePresence>
              {(step !== STEPS.SCANNING || preloaded) && (
                <motion.div
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.4 }}
                  className="bg-white border border-black/[0.12] rounded-lg p-5 space-y-4"
                >
                  {/* Locales */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5">Locales</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(locales.length > 0 ? locales : ['ja', 'de', 'zh']).map(l => (
                        <span key={l} className="flex items-center gap-1.5 bg-gray-50 border border-black/[0.08] text-gray-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {l.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Knowledge Base */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5">Knowledge Base</span>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-[12px] text-gray-700">J-GAAP · 1,247 entries loaded</span>
                    </div>
                  </div>

                  {/* Guardrails */}
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 block mb-1.5">Guardrails</span>
                    <div className="space-y-1">
                      {(plan.guardrails || [
                        'J-GAAP compliance mapping',
                        '¥/€/¥ format conversion',
                        'TSE terminology enforcement',
                        'Keigo register enforcement',
                        'ASC 606/842 mapping',
                      ]).slice(0, 5).map((g, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="text-[11px] text-gray-600">{g}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Deploy Button */}
            <motion.button
              onClick={handleDeploy}
              disabled={!isReady}
              className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[15px] font-semibold transition-all cursor-pointer ${
                isReady
                  ? 'bg-[#3D16FA] hover:bg-[#2E10C4] text-white shadow-sm shadow-[#3D16FA]/20'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              animate={isReady && !prefersReducedMotion ? { scale: [1, 1.015, 1] } : {}}
              transition={{ duration: 0.3 }}
            >
              {isReady ? (
                <>Deploy {activeAgents.length} Agent{activeAgents.length !== 1 ? 's' : ''} <ArrowRight size={16} /></>
              ) : (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing document...
                </>
              )}
            </motion.button>
            {isReady && (
              <p className="text-[11px] text-gray-400 text-center">
                Est. {estimatedTime}m · {estimatedCost} credits · {activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}
