import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  ScanSearch,
  Brain,
  ShieldCheck,
  Globe,
  Bot,
  Target,
  BarChart3,
  Eye,
  Languages,
  DollarSign,
  Volume2,
  Mic,
  CheckCircle2,
  FileText,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const categoryIcons = {
  structure: ScanSearch,
  language: Languages,
  terminology: Brain,
  regulatory: ShieldCheck,
  complexity: BarChart3,
  cultural: Globe,
  currency: DollarSign,
  agent: Bot,
  quality: Target,
  audio: Volume2,
  visual: Eye,
  lipsync: Mic,
}

const categoryLabels = {
  structure: 'Detecting document structure patterns',
  language: 'Analyzing language composition',
  terminology: 'Scanning domain precision signals',
  regulatory: 'Checking regulatory compliance markers',
  complexity: 'Measuring content complexity zones',
  cultural: 'Identifying cultural adaptation needs',
  currency: 'Detecting currency and numeric formats',
  agent: 'Selecting optimal agent routing',
  quality: 'Projecting final quality metrics',
  audio: 'Analyzing audio characteristics',
  visual: 'Scanning visual content layers',
  lipsync: 'Evaluating lip-sync requirements',
}

const severityColors = {
  critical: 'border-red-400 bg-red-50 text-red-300',
  major: 'border-amber-400 bg-amber-50 text-amber-300',
  minor: 'border-blue-400 bg-blue-50 text-blue-300',
  info: 'border-black/[0.12] bg-black/[0.02] text-gray-700',
}

const phaseLabels = {
  scanning: 'Scanning Document',
  analyzing: 'Analyzing Content',
  routing: 'Routing to Agent',
  complete: 'Orchestrated Translation Complete',
}

// Positions for finding pills around the document core (angle in degrees, radius factor)
const orbitPositions = [
  { angle: -30, r: 1 },
  { angle: 30, r: 1.1 },
  { angle: -60, r: 0.95 },
  { angle: 60, r: 1.05 },
  { angle: -90, r: 1 },
  { angle: 90, r: 1 },
  { angle: -120, r: 1.1 },
  { angle: 120, r: 0.95 },
  { angle: -150, r: 1.05 },
  { angle: 150, r: 1 },
  { angle: 0, r: 1.15 },
  { angle: 180, r: 1 },
]

function TypewriterText({ text, duration = 400, reducedMotion = false }) {
  const [displayedCount, setDisplayedCount] = useState(reducedMotion ? text.length : 0)

  useEffect(() => {
    if (reducedMotion) {
      setDisplayedCount(text.length)
      return
    }
    setDisplayedCount(0)
    const charDelay = duration / text.length
    const timers = []
    for (let i = 0; i < text.length; i++) {
      timers.push(
        setTimeout(() => setDisplayedCount(i + 1), charDelay * (i + 1))
      )
    }
    return () => timers.forEach(clearTimeout)
  }, [text, duration, reducedMotion])

  return (
    <span className="font-mono text-[13px] text-straker-600/90">
      {text.slice(0, displayedCount)}
      {displayedCount < text.length && (
        <span className="inline-block w-[2px] h-[14px] bg-straker-400 animate-pulse align-middle ml-[1px]" />
      )}
    </span>
  )
}

function FindingPill({ finding, index, reducedMotion }) {
  const CategoryIcon = categoryIcons[finding.category] || Brain
  const isCritical = finding.severity === 'critical'
  const pos = orbitPositions[index % orbitPositions.length]
  const radius = 120 * pos.r
  const angleRad = (pos.angle * Math.PI) / 180
  const x = Math.cos(angleRad) * radius
  const y = Math.sin(angleRad) * radius

  const style = severityColors[finding.severity] || severityColors.info

  return (
    <motion.div
      className="absolute"
      style={{ left: '50%', top: '50%' }}
      initial={reducedMotion ? { opacity: 1, x: x - 60, y: y - 14 } : { opacity: 0, x: 0, y: 0, scale: 0.3 }}
      animate={{ opacity: 1, x: x - 60, y: y - 14, scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { type: 'spring', stiffness: 200, damping: 20, delay: 0.05 }
      }
    >
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium whitespace-nowrap ${style} ${
          isCritical ? 'animate-pulse' : ''
        }`}
      >
        <CategoryIcon className="w-3 h-3 shrink-0" />
        <span className="max-w-[100px] truncate">{finding.category}</span>
        {finding.severity !== 'info' && (
          <span className="text-[9px] uppercase opacity-70">{finding.severity}</span>
        )}
      </div>
    </motion.div>
  )
}

function DocumentCore({ phase, hasCritical, reducedMotion }) {
  const isActive = phase !== 'complete'
  const glowIntensity = phase === 'analyzing' ? 0.4 : phase === 'routing' ? 0.6 : 0.2

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow ring */}
      {!reducedMotion && (
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 100,
            height: 100,
            background: hasCritical
              ? `radial-gradient(circle, rgba(239,68,68,${glowIntensity}) 0%, transparent 70%)`
              : `radial-gradient(circle, rgba(99,200,170,${glowIntensity}) 0%, transparent 70%)`,
          }}
          animate={
            isActive
              ? { scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }
              : { scale: 1, opacity: 0.8 }
          }
          transition={
            isActive
              ? { duration: 2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.5 }
          }
        />
      )}

      {/* Inner circle */}
      <motion.div
        className={`relative z-10 w-16 h-16 rounded-full flex items-center justify-center border ${
          hasCritical
            ? 'border-red-400/40 bg-red-50'
            : phase === 'complete'
              ? 'border-emerald-400/40 bg-emerald-50'
              : 'border-straker-400/30 bg-straker-50'
        }`}
        animate={
          !reducedMotion && isActive
            ? { scale: [1, 1.06, 1] }
            : { scale: 1 }
        }
        transition={
          isActive
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.3 }
        }
      >
        <FileText
          className={`w-7 h-7 ${
            hasCritical
              ? 'text-red-400'
              : phase === 'complete'
                ? 'text-emerald-400'
                : 'text-straker-600'
          }`}
        />
      </motion.div>
    </div>
  )
}

function AgentNode({ label, state, icon: Icon }) {
  if (state === 'active') {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-straker-50 border border-straker-500/30 ring-2 ring-straker-400/20 animate-pulse flex items-center justify-center">
          <Icon className="w-4 h-4 text-straker-600" />
        </div>
        <span className="text-[13px] text-straker-600 font-medium">{label}</span>
      </div>
    )
  }

  if (state === 'complete') {
    return (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-[13px] text-emerald-400">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-black/[0.03] border border-black/[0.12] flex items-center justify-center">
        <Icon className="w-4 h-4 text-gray-400" />
      </div>
      <span className="text-[13px] text-gray-400">{label}</span>
    </div>
  )
}

function ConnectingLine({ completed }) {
  return (
    <div className={`w-0.5 h-6 mx-auto ${completed ? 'bg-emerald-400/30' : 'bg-black/[0.03]'}`} />
  )
}

function AnimatedStatValue({ value, reducedMotion }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v))
  const [rendered, setRendered] = useState(value)

  useEffect(() => {
    if (reducedMotion) {
      setRendered(value)
      return
    }
    spring.set(value)
    const unsub = display.on('change', (v) => setRendered(v))
    return unsub
  }, [value, spring, display, reducedMotion])

  return (
    <motion.span
      className="text-[15px] text-gray-900 font-semibold tabular-nums"
      key={`stat-${value}`}
    >
      {rendered}
    </motion.span>
  )
}

function StatRow({ label, value, reducedMotion }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-gray-500">{label}</span>
      <AnimatedStatValue value={value} reducedMotion={reducedMotion} />
    </div>
  )
}

export default function GlassBox({ data, findings, onComplete }) {
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState(prefersReducedMotion ? 'complete' : 'scanning')
  const [visibleCount, setVisibleCount] = useState(prefersReducedMotion ? findings.length : 0)
  const [criticalFlash, setCriticalFlash] = useState(false)
  const onCompleteRef = useRef(onComplete)
  const timersRef = useRef([])

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Phase progression
  useEffect(() => {
    if (prefersReducedMotion) {
      setPhase('complete')
      const t = setTimeout(() => onCompleteRef.current?.(), 0)
      return () => clearTimeout(t)
    }

    const timers = []
    timers.push(setTimeout(() => setPhase('analyzing'), 1500))
    timers.push(setTimeout(() => setPhase('routing'), 3500))
    timers.push(setTimeout(() => setPhase('complete'), 5000))
    timers.push(setTimeout(() => onCompleteRef.current?.(), 5800))

    return () => timers.forEach(clearTimeout)
  }, [prefersReducedMotion])

  // Finding stagger
  useEffect(() => {
    if (prefersReducedMotion) {
      setVisibleCount(findings.length)
      return
    }

    const timers = []
    findings.forEach((finding, i) => {
      timers.push(
        setTimeout(() => {
          setVisibleCount((prev) => Math.max(prev, i + 1))
          // Critical flash
          if (finding.severity === 'critical') {
            setCriticalFlash(true)
            setTimeout(() => setCriticalFlash(false), 600)
          }
        }, 500 * (i + 1))
      )
    })
    timersRef.current = timers

    return () => timers.forEach(clearTimeout)
  }, [findings, prefersReducedMotion])

  // Compute stats from visible findings
  const visibleFindings = findings.slice(0, visibleCount)
  const latestFinding = visibleFindings[visibleFindings.length - 1]
  const hasCritical = criticalFlash

  const termsDetected = visibleFindings.filter((f) => f.category === 'terminology').length
  const complexityZones = visibleFindings.filter((f) => f.category === 'complexity').length
  const guardrailsQueued = visibleFindings.filter((f) => f.category === 'regulatory').length

  const finalTerms = data.sourceIQ?.dimensions
    ? data.sourceIQ.dimensions.filter(
        (d) => d.category === 'terminology' || d.label?.toLowerCase().includes('terminol')
      ).length || termsDetected
    : termsDetected
  const finalComplexity = data.sourceIQ?.dimensions
    ? data.sourceIQ.dimensions.filter((d) => (d.score ?? 100) < 70).length || complexityZones
    : complexityZones
  const finalGuardrails = data.plan?.guardrails?.length || guardrailsQueued || 5

  const displayTerms = phase === 'complete' ? Math.max(finalTerms, termsDetected) : termsDetected
  const displayComplexity = phase === 'complete' ? Math.max(finalComplexity, complexityZones) : complexityZones
  const displayGuardrails = phase === 'complete' ? Math.max(finalGuardrails, guardrailsQueued) : guardrailsQueued

  // Reading line text
  const readingLineText = useMemo(() => {
    if (!latestFinding) return 'Initializing document scan...'
    return categoryLabels[latestFinding.category] || `Processing ${latestFinding.category} analysis...`
  }, [latestFinding])

  // Node states
  function nodeState(nodePhase) {
    const order = ['scanning', 'analyzing', 'routing', 'complete']
    const current = order.indexOf(phase)
    const target = order.indexOf(nodePhase)
    if (current > target) return 'complete'
    if (current === target) return 'active'
    return 'pending'
  }

  // Progress
  const progressMap = { scanning: 33, analyzing: 66, routing: 100, complete: 100 }
  const progressPercent = progressMap[phase] || 0

  // Gradient shifts with phase
  const progressGradient =
    phase === 'scanning'
      ? 'from-straker-500 to-straker-400'
      : phase === 'analyzing'
        ? 'from-straker-500 via-straker-400 to-emerald-500'
        : 'from-straker-500 via-emerald-400 to-emerald-400'

  const agentName = data.agent?.name || 'Specialist'

  return (
    <div className="bg-gray-50 border border-black/[0.12] rounded-lg overflow-hidden w-full">
      {/* Top section */}
      <div className="px-8 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] text-gray-900 font-medium">{data.fileName}</h3>
          <span className="text-[12px] text-gray-500">{data.classification}</span>
        </div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium ${
            phase === 'complete'
              ? 'bg-emerald-50 text-emerald-400'
              : 'bg-straker-50 text-straker-600'
          }`}
        >
          {phase !== 'complete' && (
            <span className="w-1.5 h-1.5 rounded-full bg-straker-400 animate-pulse" />
          )}
          {phaseLabels[phase]}
        </div>
      </div>

      {/* Reading line */}
      <div className="px-8 py-2 min-h-[32px]">
        <AnimatePresence mode="wait">
          {phase !== 'complete' && (
            <motion.div
              key={readingLineText}
              initial={prefersReducedMotion ? {} : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? {} : { opacity: 0, y: 4 }}
              transition={{ duration: 0.2 }}
            >
              <TypewriterText
                text={readingLineText}
                duration={400}
                reducedMotion={prefersReducedMotion}
              />
            </motion.div>
          )}
          {phase === 'complete' && (
            <motion.span
              key="complete-label"
              className="font-mono text-[13px] text-emerald-400/90"
              initial={prefersReducedMotion ? {} : { opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Document analysis complete.
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Document Core visualization */}
      <div className="px-8 py-6">
        <div
          className={`relative flex items-center justify-center rounded-lg border transition-colors duration-300 ${
            hasCritical
              ? 'bg-red-500/[0.03] border-red-500/20'
              : 'bg-gray-100 border-black/[0.06]'
          }`}
          style={{ minHeight: 280 }}
        >
          {/* Critical flash overlay */}
          <AnimatePresence>
            {hasCritical && !prefersReducedMotion && (
              <motion.div
                className="absolute inset-0 rounded-lg bg-red-500/10 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.6 }}
              />
            )}
          </AnimatePresence>

          {/* Document Core */}
          <DocumentCore
            phase={phase}
            hasCritical={hasCritical}
            reducedMotion={prefersReducedMotion}
          />

          {/* Orbiting finding pills */}
          <AnimatePresence>
            {visibleFindings.map((finding, i) => (
              <FindingPill
                key={`${finding.category}-${i}`}
                finding={finding}
                index={i}
                reducedMotion={prefersReducedMotion}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom row */}
      <div className="px-8 pb-8 pt-4 grid grid-cols-2 gap-4">
        {/* Left panel - Agent Architecture */}
        <div className="bg-gray-100 rounded-lg border border-black/[0.06] p-5">
          <span className="text-[11px] uppercase tracking-wider text-gray-500 block mb-4">
            Agent Architecture
          </span>
          <div className="flex flex-col items-start">
            <AgentNode label="Scanner" state={nodeState('scanning')} icon={ScanSearch} />
            <ConnectingLine completed={nodeState('scanning') === 'complete'} />
            <AgentNode label="Analyst" state={nodeState('analyzing')} icon={Brain} />
            <ConnectingLine completed={nodeState('analyzing') === 'complete'} />
            <AgentNode
              label={phase === 'complete' ? agentName : 'Specialist Agent'}
              state={nodeState('routing')}
              icon={Bot}
            />
          </div>
        </div>

        {/* Right panel - Live Statistics */}
        <div className="bg-gray-100 rounded-lg border border-black/[0.06] p-5">
          <span className="text-[11px] uppercase tracking-wider text-gray-500 block mb-4">
            Live Statistics
          </span>
          <div className="space-y-3">
            <StatRow label="Terms Detected" value={displayTerms} reducedMotion={prefersReducedMotion} />
            <StatRow label="Complexity Zones" value={displayComplexity} reducedMotion={prefersReducedMotion} />
            <StatRow label="Guardrails Queued" value={displayGuardrails} reducedMotion={prefersReducedMotion} />
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-black/[0.03] w-full">
        <motion.div
          className={`h-full bg-gradient-to-r ${progressGradient}`}
          initial={{ width: '0%' }}
          animate={{ width: progressPercent + '%' }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  )
}
