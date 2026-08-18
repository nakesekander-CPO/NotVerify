import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bot, Shield, Building2, Mic, Plus, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Star, GitBranch, ArrowRight } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const springTransition = { type: 'spring', stiffness: 300, damping: 20 }

const iconMap = {
  Shield,
  Building2,
  Mic,
  Star,
}

const severityColors = {
  high: 'bg-red-500',
  medium: 'bg-amber-400',
  low: 'bg-straker-400',
}

const severityLabels = {
  high: 'High severity',
  medium: 'Medium severity',
  low: 'Low severity',
}

/* ─── Animated counting number ─── */
function CountUp({ value, duration = 900, prefersReducedMotion }) {
  const [display, setDisplay] = useState(prefersReducedMotion ? value : 0)
  const prev = useRef(value)

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplay(value)
      return
    }

    const start = prev.current
    const diff = value - start
    if (diff === 0) return

    const startTime = performance.now()
    let raf

    function tick(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out quad
      const eased = 1 - (1 - progress) * (1 - progress)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        prev.current = value
      }
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, prefersReducedMotion])

  return <>{display.toLocaleString()}</>
}

/* ─── Processing dots animation ─── */
function ProcessingDots({ prefersReducedMotion }) {
  const [dotCount, setDotCount] = useState(1)

  useEffect(() => {
    if (prefersReducedMotion) return
    const id = setInterval(() => {
      setDotCount((c) => (c % 3) + 1)
    }, 500)
    return () => clearInterval(id)
  }, [prefersReducedMotion])

  const dots = prefersReducedMotion ? '...' : '.'.repeat(dotCount)

  return (
    <span className="text-[10px] font-medium text-emerald-600 ml-1.5">
      Processing<span className="inline-block w-[14px] text-left">{dots}</span>
    </span>
  )
}

/* ─── Confidence Ring ─── */
function ConfidenceRing({ value, size = 40 }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - value / 100)
  const center = size / 2

  const color =
    value >= 95 ? 'stroke-emerald-600' :
    value >= 90 ? 'stroke-straker-600' :
    'stroke-amber-600'

  const textColor =
    value >= 95 ? 'text-emerald-600' :
    value >= 90 ? 'text-straker-600' :
    'text-amber-600'

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Confidence: ${value}%`}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle
          cx={center} cy={center} r={radius}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="3"
        />
        <motion.circle
          cx={center} cy={center} r={radius}
          fill="none"
          className={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={springTransition}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-[10px] font-bold font-mono ${textColor}`}>
          {value}%
        </span>
      </div>
    </div>
  )
}

/* ─── Streaming log entry ─── */
function StreamingLogEntry({ entry, delay, prefersReducedMotion }) {
  const [visible, setVisible] = useState(prefersReducedMotion)

  useEffect(() => {
    if (prefersReducedMotion) {
      setVisible(true)
      return
    }
    const id = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(id)
  }, [delay, prefersReducedMotion])

  if (!visible) return null

  return (
    <motion.div
      className="flex gap-2 items-start"
      initial={prefersReducedMotion ? false : { opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
    >
      <span className="shrink-0 text-[9px] font-mono font-bold text-gray-400 bg-black/[0.03] rounded px-1.5 py-0.5">
        #{entry.segment}
      </span>
      <span
        className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${severityColors[entry.severity] || 'bg-gray-500'}`}
        aria-label={severityLabels[entry.severity] || 'Unknown severity'}
      />
      <span className="text-[11px] text-gray-700 leading-relaxed">
        {entry.text}
      </span>
    </motion.div>
  )
}

/* ─── Agent Card ─── */
function AgentCard({ agent, isProcessing, prefersReducedMotion, onViewProfile }) {
  const [expanded, setExpanded] = useState(false)
  const [fluctuatedConfidence, setFluctuatedConfidence] = useState(agent.confidence)
  const IconComponent = iconMap[agent.icon] || Bot

  const isActive = agent.status === 'active'
  const isComplete = agent.status === 'complete'

  // Fluctuating confidence when processing
  useEffect(() => {
    setFluctuatedConfidence(agent.confidence)

    if (!isProcessing || prefersReducedMotion) return

    const id = setInterval(() => {
      const delta = Math.round((Math.random() - 0.5) * 4) // ±2
      setFluctuatedConfidence((prev) => {
        const next = agent.confidence + delta
        return Math.max(0, Math.min(100, next))
      })
    }, 2000 + Math.random() * 1000)

    return () => clearInterval(id)
  }, [agent.confidence, isProcessing, prefersReducedMotion])

  const displayConfidence = isProcessing && !prefersReducedMotion ? fluctuatedConfidence : agent.confidence

  const statusDotColor = isActive
    ? 'bg-emerald-400'
    : isComplete
      ? 'bg-straker-400'
      : 'bg-gray-500'

  const borderClass = isActive
    ? 'border-l-2 border-l-straker-500 shadow-[inset_2px_0_12px_-4px_rgba(61,22,250,0.3)]'
    : 'border-l-2 border-l-transparent'

  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((prev) => !prev)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded((prev) => !prev) } }}
      className={`w-full text-left rounded-lg bg-[#EDEFFB] ${borderClass} p-3.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-straker-500/60`}
      whileHover={prefersReducedMotion ? {} : { y: -2 }}
      transition={springTransition}
      aria-expanded={expanded}
    >
      {/* Top row */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-straker-50 flex items-center justify-center shrink-0">
          <IconComponent className="w-4 h-4 text-straker-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-semibold text-gray-900 truncate">
              {agent.name}
            </span>
            {/* Live pulse indicator when processing */}
            {isProcessing && isActive && (
              prefersReducedMotion ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              ) : (
                <motion.span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                  animate={{ scale: [1, 1.6, 1], opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
              )
            )}
            <span className="text-[10px] font-mono text-gray-400 shrink-0">
              {agent.version}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusDotColor} ${isActive && !prefersReducedMotion ? 'animate-pulse' : ''}`}
              aria-label={`Status: ${agent.status}`}
            />
            <span className="text-[10px] text-gray-400 capitalize">{agent.status}</span>
          </div>
        </div>
        <ConfidenceRing value={displayConfidence} size={38} />
      </div>

      {/* Stats row with counting animation */}
      <p className="text-[11px] text-gray-500 font-mono mt-2.5 leading-relaxed">
        <CountUp value={agent.segmentsProcessed} prefersReducedMotion={prefersReducedMotion} /> segments
        {agent.errorsFound != null && (
          <>
            {' \u00B7 '}
            <CountUp value={agent.errorsFound} prefersReducedMotion={prefersReducedMotion} /> errors caught
          </>
        )}
        {agent.glossaryMatch != null && agent.glossaryTotal != null && (
          <>
            {' \u00B7 '}
            <CountUp value={agent.glossaryMatch} prefersReducedMotion={prefersReducedMotion} />/{agent.glossaryTotal.toLocaleString()} entries synced
          </>
        )}
        {agent.toneScore != null && (
          <>
            {' \u00B7 tone '}
            <CountUp value={agent.toneScore} prefersReducedMotion={prefersReducedMotion} />%
          </>
        )}
      </p>

      {/* Rule / profile badge */}
      {(agent.ruleBadge || agent.profile) && (
        <div className="mt-2">
          {agent.ruleBadge && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="w-2.5 h-2.5" />
              {agent.ruleBadge}
            </span>
          )}
          {agent.profile && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-straker-50 text-straker-600 border border-straker-500/20">
              <CheckCircle2 className="w-2.5 h-2.5" />
              {agent.profile}
            </span>
          )}
        </div>
      )}

      {/* Expand indicator */}
      <div className="flex items-center justify-center mt-2">
        {expanded
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
      </div>

      {/* Reasoning log with streaming effect */}
      <AnimatePresence initial={false}>
        {expanded && agent.reasoningLog?.length > 0 && (
          <motion.div
            key="log"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : springTransition}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-black/[0.12] space-y-2">
              {agent.reasoningLog.map((entry, idx) => (
                <StreamingLogEntry
                  key={idx}
                  entry={entry}
                  delay={isProcessing ? idx * 180 : 0}
                  prefersReducedMotion={prefersReducedMotion}
                />
              ))}
              {onViewProfile && (
                <button
                  onClick={(e) => { e.stopPropagation(); onViewProfile(agent) }}
                  className="group flex items-center gap-1 mt-2 text-[11px] font-medium text-straker-600 hover:text-straker-500 transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  View Profile
                  <ArrowRight size={10} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function AgentWarRoom({ agents, onHireAgent, onTrainAgent, onResolveConflicts, onViewAgentProfile, isProcessing }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <aside
      className="w-[300px] shrink-0 bg-[#ffffff] border-l border-black/[0.12] flex flex-col h-full overflow-hidden"
      aria-label="Agent War Room"
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-black/[0.12] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-straker-50 flex items-center justify-center">
            <Bot className="w-3.5 h-3.5 text-straker-600" />
          </div>
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
            Agent War Room
          </h2>
          {isProcessing && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" aria-label="Processing" />
              <ProcessingDots prefersReducedMotion={prefersReducedMotion} />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onHireAgent}
          className="flex items-center gap-1 text-[11px] font-medium text-straker-600 hover:text-straker-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-straker-500/60 rounded px-2 py-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Agent
        </button>
      </div>

      {/* Agent cards list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5 scrollbar-thin scrollbar-thumb-black/10">
        {agents && agents.length > 0 ? (
          agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isProcessing={isProcessing}
              prefersReducedMotion={prefersReducedMotion}
              onViewProfile={onViewAgentProfile}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <Bot className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400">No agents active</p>
            <p className="text-[11px] text-gray-300 mt-1">Hire agents from the marketplace</p>
          </div>
        )}
      </div>

      {/* Bottom links */}
      <div className="px-4 py-3 border-t border-black/[0.12] space-y-1.5">
        <button
          type="button"
          onClick={onHireAgent}
          className="w-full text-center text-[12px] font-medium text-straker-600 hover:text-straker-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-straker-500/60 rounded py-1.5"
        >
          Hire from Marketplace &rarr;
        </button>
        {onTrainAgent && (
          <button
            type="button"
            onClick={onTrainAgent}
            className="w-full text-center text-[12px] font-medium text-emerald-600/80 hover:text-emerald-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 rounded py-1.5"
          >
            Train Custom Agent &rarr;
          </button>
        )}
        {onResolveConflicts && isProcessing && (
          <button
            type="button"
            onClick={onResolveConflicts}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium text-amber-600/80 hover:text-amber-500 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60 rounded py-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Resolve Conflicts (2)
          </button>
        )}
      </div>
    </aside>
  )
}
