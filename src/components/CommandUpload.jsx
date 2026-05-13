import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import {
  FileText, Upload, CheckCircle2, Bot, Globe, BookOpen,
  ShieldCheck, ArrowRight, Zap, Loader2
} from 'lucide-react'
import Dropzone from './Dropzone'
import useReducedMotion from '../hooks/useReducedMotion'
import { getScoreColor } from '../utils/scoreColors'

const springTransition = { type: 'spring', stiffness: 300, damping: 20 }

// Analysis step status
const STEPS = {
  IDLE: 'idle',
  UPLOADED: 'uploaded',
  PARSED: 'parsed',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
}

function AnimatedScore({ value, reducedMotion }) {
  const spring = useSpring(0, { stiffness: 120, damping: 20 })
  const display = useTransform(spring, (v) => Math.round(v))
  const [rendered, setRendered] = useState(reducedMotion ? value : 0)

  useEffect(() => {
    if (reducedMotion) { setRendered(value); return }
    spring.set(value)
    const unsub = display.on('change', (v) => setRendered(v))
    return unsub
  }, [value, spring, display, reducedMotion])

  return <span className="tabular-nums">{rendered}</span>
}

function DimensionBar({ name, score, delay, reducedMotion }) {
  const color = getScoreColor(score)
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-gray-500 w-24 shrink-0">{name}</span>
      <div className="flex-1 h-1.5 bg-black/[0.03] rounded-full overflow-hidden relative">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full ${color.bar}`}
          initial={{ width: '0%' }}
          animate={{ width: `${score}%` }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.8, delay, ease: 'easeOut' }}
        />
        {/* Shimmer overlay */}
        {!reducedMotion && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-black/[0.08] to-transparent"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.8, delay: delay + 0.3, ease: 'easeInOut' }}
          />
        )}
      </div>
      <span className={`text-[12px] font-medium w-8 text-right shrink-0 ${color.text}`}>{score}</span>
    </div>
  )
}

function FindingItem({ finding, index, reducedMotion }) {
  const severityStyles = {
    critical: 'border-red-500/20 bg-red-500/5 text-red-300',
    major: 'border-amber-500/20 bg-amber-500/5 text-amber-300',
    minor: 'border-blue-500/20 bg-blue-500/5 text-blue-300',
    info: 'border-black/[0.12] bg-black/[0.02] text-gray-700',
  }
  const style = severityStyles[finding.severity] || severityStyles.info
  const icons = { critical: '⚠', major: '⚡', minor: 'ℹ', info: 'ℹ' }

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3, delay: index * 0.15 }}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[12px] ${style}`}
    >
      <span>{icons[finding.severity]}</span>
      <span className="truncate">{finding.text}</span>
    </motion.div>
  )
}

export default function CommandUpload({
  onFileAccepted,
  onLaunch,
  triageData,
  discoveryFindings,
  structuredContext,
  preloaded,
}) {
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState(preloaded ? STEPS.COMPLETE : STEPS.IDLE)
  const [visibleFindings, setVisibleFindings] = useState([])
  const [launchEnabled, setLaunchEnabled] = useState(!!preloaded)
  const [criticalFlash, setCriticalFlash] = useState(false)
  const timersRef = useRef([])

  const fileName = triageData?.fileName || preloaded?.fileName || preloaded?.projectName || ''
  const classification = triageData?.classification || ''
  const agent = triageData?.agent || {}
  const plan = triageData?.plan || {}
  const qualityScore = triageData?.qualityScore || {}
  const locales = structuredContext?.targetLocales || []

  // Choreographed analysis sequence after file is accepted
  useEffect(() => {
    if (!triageData || step !== STEPS.IDLE) return
    const timers = []

    if (prefersReducedMotion) {
      setStep(STEPS.COMPLETE)
      setVisibleFindings(discoveryFindings || [])
      setLaunchEnabled(true)
      return
    }

    // 0.3s: uploaded
    timers.push(setTimeout(() => setStep(STEPS.UPLOADED), 300))
    // 0.8s: parsed
    timers.push(setTimeout(() => setStep(STEPS.PARSED), 800))
    // 1.0s: analyzing
    timers.push(setTimeout(() => setStep(STEPS.ANALYZING), 1000))

    // Stream findings
    const findings = discoveryFindings || []
    findings.forEach((finding, i) => {
      timers.push(setTimeout(() => {
        setVisibleFindings(prev => [...prev, finding])
        if (finding.severity === 'critical') {
          setCriticalFlash(true)
          setTimeout(() => setCriticalFlash(false), 400)
        }
      }, 1000 + (i + 1) * 500))
    })

    // Complete analysis
    const completeTime = 1000 + (findings.length + 1) * 500 + 500
    timers.push(setTimeout(() => {
      setStep(STEPS.COMPLETE)
    }, completeTime))

    // Enable launch
    timers.push(setTimeout(() => {
      setLaunchEnabled(true)
    }, completeTime + 500))

    timersRef.current = timers
    return () => timers.forEach(clearTimeout)
  }, [triageData, discoveryFindings, prefersReducedMotion])

  // Pre-loaded scenario: already complete
  useEffect(() => {
    if (preloaded && !triageData) {
      setStep(STEPS.COMPLETE)
      setLaunchEnabled(true)
    }
  }, [preloaded, triageData])

  const pageCount = classification?.match(/\d+/)?.[0] || '23'
  const wordCount = '14,200' // prototype data

  // Confidence dimensions
  const dimensions = qualityScore?.dimensions || []
  const overallScore = qualityScore?.overall || 0
  const potentialScore = qualityScore?.potential || 0
  const priorProjects = 42 // prototype data

  const scoreColor = overallScore >= 85 ? 'text-emerald-400' : overallScore >= 65 ? 'text-straker-600' : 'text-red-400'
  const ringStroke = overallScore >= 85 ? '#34d399' : overallScore >= 65 ? '#4F94C4' : '#f87171'

  // Score ring SVG
  const ringRadius = 26
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - (overallScore / 100) * ringCircumference

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-gray-900 tracking-tight mb-2">
          {fileName ? fileName.replace(/\.\w+$/, '').replace(/_/g, ' ') : 'Upload Document'}
        </h1>
        {classification && (
          <p className="text-[15px] text-gray-500">
            {fileName} · {pageCount} pages · {wordCount} words
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          {/* Intelligent Drop Zone / Analysis Area */}
          <div
            className={`bg-gray-50 border rounded-lg p-6 transition-colors duration-300 ${
              criticalFlash
                ? 'border-red-500/40'
                : step === STEPS.COMPLETE
                  ? 'border-emerald-500/20'
                  : 'border-black/[0.12]'
            }`}
          >
            {step === STEPS.IDLE && !triageData ? (
              /* Empty state — show dropzone */
              <div className="py-8">
                <Dropzone onFileAccepted={onFileAccepted} compact />
              </div>
            ) : (
              /* Analysis in progress or complete */
              <div className="space-y-5">
                {/* Document icon + status steps */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <motion.div
                      className={`w-16 h-16 rounded-lg flex items-center justify-center border ${
                        step === STEPS.COMPLETE
                          ? 'bg-emerald-50 border-emerald-500/20'
                          : 'bg-straker-50 border-straker-500/20'
                      }`}
                      animate={step !== STEPS.COMPLETE && !prefersReducedMotion ? { scale: [1, 1.04, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <FileText className={`w-7 h-7 ${step === STEPS.COMPLETE ? 'text-emerald-400' : 'text-straker-600'}`} />
                    </motion.div>
                    {/* Orbiting dots during analysis */}
                    {step === STEPS.ANALYZING && !prefersReducedMotion && (
                      <>
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 rounded-full bg-straker-600"
                            style={{ top: '50%', left: '50%' }}
                            animate={{
                              x: [0, 30 * Math.cos((i * 2 * Math.PI) / 3), 0],
                              y: [0, 30 * Math.sin((i * 2 * Math.PI) / 3), 0],
                              opacity: [0.3, 0.8, 0.3],
                            }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
                          />
                        ))}
                      </>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {[STEPS.UPLOADED, STEPS.PARSED, STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                      <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={springTransition}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[13px] text-emerald-400">Uploaded</span>
                      </motion.div>
                    )}
                    {[STEPS.PARSED, STEPS.ANALYZING, STEPS.COMPLETE].includes(step) && (
                      <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...springTransition, delay: 0.1 }}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[13px] text-emerald-400">Parsed · {pageCount} pages · {wordCount} words</span>
                      </motion.div>
                    )}
                    {step === STEPS.ANALYZING && (
                      <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-[13px] text-amber-400">Analyzing document...</span>
                      </motion.div>
                    )}
                    {step === STEPS.COMPLETE && (
                      <motion.div
                        initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={springTransition}
                        className="flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[13px] text-emerald-400">Analysis complete · {plan.guardrails?.length || 6} guardrails applied</span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Findings Feed */}
                {visibleFindings.length > 0 && (
                  <div className="space-y-2">
                    {visibleFindings.slice(-4).map((finding, i) => (
                      <FindingItem
                        key={`${finding.category}-${i}`}
                        finding={finding}
                        index={i}
                        reducedMotion={prefersReducedMotion}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Projected Confidence Score */}
          {step === STEPS.COMPLETE && overallScore > 0 && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : springTransition}
              className="bg-gray-50 border border-black/[0.12] rounded-lg p-6"
            >
              <div className="flex items-start gap-5 mb-5">
                {/* Score Ring */}
                <div className="relative shrink-0">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle
                      cx="32" cy="32" r={ringRadius}
                      fill="none"
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth="4"
                    />
                    <motion.circle
                      cx="32" cy="32" r={ringRadius}
                      fill="none"
                      stroke={ringStroke}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={ringCircumference}
                      initial={{ strokeDashoffset: ringCircumference }}
                      animate={{ strokeDashoffset: ringOffset }}
                      transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 15 }}
                      style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`font-mono text-[20px] font-bold ${scoreColor}`}>
                      <AnimatedScore value={overallScore} reducedMotion={prefersReducedMotion} />
                    </span>
                  </div>
                </div>

                {/* Score text */}
                <div>
                  <p className="text-[18px] font-semibold text-gray-900 mb-1">
                    {overallScore - 2}–{overallScore + 2}%
                    <span className="text-[14px] font-normal text-gray-500 ml-2">projected confidence range</span>
                  </p>
                  <p className="text-[12px] text-gray-500">
                    Based on {priorProjects} prior JA financial projects
                  </p>
                  {potentialScore > overallScore && (
                    <motion.p
                      initial={prefersReducedMotion ? {} : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="flex items-center gap-1.5 text-[12px] text-straker-600 mt-2"
                    >
                      <Zap className="w-3 h-3" />
                      +{potentialScore - overallScore}% with Premium Knowledge Enhancement
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Dimension bars */}
              <div className="space-y-2.5">
                {dimensions.map((dim, i) => (
                  <DimensionBar
                    key={dim.name}
                    name={dim.name.replace('Accuracy', '').replace('Compliance', '').replace('Adaptation', '').trim()}
                    score={dim.score}
                    delay={i * 0.15}
                    reducedMotion={prefersReducedMotion}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel — Live Brief (Sticky) */}
        <div className="lg:sticky lg:top-36 lg:self-start space-y-4">
          {(step !== STEPS.IDLE || preloaded) && (
            <motion.div
              initial={prefersReducedMotion ? {} : { opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, delay: 0.3 }}
              className="bg-gray-50 border border-black/[0.12] rounded-lg p-5 space-y-5"
            >
              {/* Agent */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-2">Agent</span>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-straker-50 border border-straker-500/20 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-straker-600" />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-gray-900">{agent.id || 'JP-FIN-3'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[11px] text-emerald-400">Online</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Specialized: Japanese Financial Compliance</p>
              </div>

              {/* Locales */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-2">Locales</span>
                <div className="flex flex-wrap gap-1.5">
                  {(locales.length > 0 ? locales : ['ja', 'de', 'zh']).map(l => (
                    <span key={l} className="flex items-center gap-1.5 bg-gray-100 text-gray-900 text-[12px] font-medium px-2.5 py-1 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {l.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>

              {/* Vertical */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-2">Vertical</span>
                <span className="text-[13px] text-gray-900">Financial Services</span>
              </div>

              {/* Knowledge Base */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-2">Knowledge Base</span>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[13px] text-gray-900">J-GAAP · 1,247 entries loaded</span>
                </div>
              </div>

              {/* Guardrails */}
              <div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 block mb-2">Guardrails</span>
                <div className="space-y-1.5">
                  {(plan.guardrails || [
                    'J-GAAP compliance mapping',
                    '¥/€/¥ format conversion',
                    'TSE terminology enforcement',
                    'Keigo register enforcement',
                    'ASC 606/842 mapping',
                    'Cultural adaptation',
                  ]).slice(0, 6).map((g, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[12px] text-gray-700">{g}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edit config link */}
              <button className="flex items-center gap-1.5 text-[12px] text-straker-600 hover:text-straker-500 transition-colors cursor-pointer">
                Edit configuration
                <ArrowRight className="w-3 h-3" />
              </button>
            </motion.div>
          )}

          {/* Launch Button */}
          <motion.button
            onClick={onLaunch}
            disabled={!launchEnabled}
            className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-lg text-[16px] font-semibold transition-all cursor-pointer ${
              launchEnabled
                ? 'bg-amber hover:bg-amber-deep text-white shadow-sm shadow-amber/20'
                : 'bg-amber/40 text-gray-400 cursor-not-allowed'
            }`}
            animate={launchEnabled && !prefersReducedMotion ? { scale: [1, 1.02, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            {launchEnabled ? (
              <>Deploy</>
            ) : (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing document...
              </>
            )}
          </motion.button>
          {launchEnabled && (
            <p className="text-[12px] text-gray-500 text-center">
              Estimated completion: ~4 minutes
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
