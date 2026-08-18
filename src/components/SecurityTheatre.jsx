import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, Shield, Lock, CheckCircle2, Bot, Loader2 } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

// --- Constants ---

const TOTAL_DURATION = 12000 // 12s prototype timeline
const PHASE_SCANNING_END = 3000
const PHASE_TRANSLATING_END = 8000
const PHASE_QA_END = 11000
const COMPLETE_AT = 12000

const SECURITY_LINES = [
  { time: 1000, text: 'AES-256 encryption handshake established', type: 'success' },
  { time: 2000, text: 'Processing in ap-northeast-1 (Tokyo)', type: 'success' },
  { time: 3000, text: 'Zero-retention pipeline active', type: 'success' },
  { time: 4000, text: 'Auto-delete:', type: 'countdown' },
]

const GUARDRAILS = [
  'J-GAAP compliance mapping',
  'Currency format validation (¥/€/¥)',
  'TSE domain precision check',
  'Keigo formality verification',
  'ASC 606/842 regulatory alignment',
  'Cultural adaptation review',
]

const spring = { stiffness: 300, damping: 20 }

// --- Encryption Label Typewriter ---

function TypewriterText({ text, startDelay = 1200, charDelay = 40, reducedMotion }) {
  const [displayed, setDisplayed] = useState(reducedMotion ? text : '')

  useEffect(() => {
    if (reducedMotion) { setDisplayed(text); return }
    let i = 0
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) clearInterval(interval)
      }, charDelay)
      return () => clearInterval(interval)
    }, startDelay)
    return () => clearTimeout(startTimer)
  }, [text, startDelay, charDelay, reducedMotion])

  return (
    <span
      className="font-mono text-xs tracking-[0.15em]"
      style={{ color: '#5A39FB', fontFamily: 'JetBrains Mono, monospace' }}
    >
      {displayed}
      {!reducedMotion && displayed.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  )
}

// --- Orbiting Ring ---

function OrbitingRing({ radius, duration, direction, icons, IconComponent, iconSize, reducedMotion }) {
  const count = icons
  const circumference = 2 * Math.PI * radius
  const dashArray = `4 8`

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Ring stroke */}
      <svg
        width={radius * 2 + 30}
        height={radius * 2 + 30}
        className="absolute"
        style={{ overflow: 'visible' }}
      >
        <circle
          cx={radius + 15}
          cy={radius + 15}
          r={radius}
          fill="none"
          stroke="rgba(61,22,250,0.2)"
          strokeWidth="1"
          strokeDasharray={dashArray}
        />
      </svg>

      {/* Rotating container with icons */}
      <div
        className="absolute"
        style={{
          width: radius * 2 + 30,
          height: radius * 2 + 30,
          animation: reducedMotion
            ? 'none'
            : `spin-${direction} ${duration}s linear infinite`,
        }}
      >
        {Array.from({ length: count }).map((_, i) => {
          const angle = (i / count) * 360
          const rad = (angle * Math.PI) / 180
          const cx = radius + 15 + Math.cos(rad) * radius
          const cy = radius + 15 + Math.sin(rad) * radius
          return (
            <div
              key={i}
              className="absolute"
              style={{
                left: cx - iconSize / 2,
                top: cy - iconSize / 2,
                animation: reducedMotion
                  ? 'none'
                  : `counter-spin-${direction} ${duration}s linear infinite`,
              }}
            >
              <IconComponent
                size={iconSize}
                style={{ color: 'rgba(158,139,253,0.6)' }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Countdown Timer ---

function CountdownTimer() {
  const [seconds, setSeconds] = useState(23 * 3600 + 59 * 60 + 58)

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => Math.max(0, s - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')

  return (
    <span
      className="font-mono"
      style={{
        fontFamily: 'JetBrains Mono, monospace',
        color: seconds > 43200 ? '#FFBD59' : '#E53935',
      }}
    >
      {h}:{m}:{s} remaining
    </span>
  )
}

// --- Phase Card ---

function PhaseCard({ title, badge, status, children, reducedMotion }) {
  const isActive = status === 'active'
  const isComplete = status === 'complete'
  const isPending = status === 'pending'

  return (
    <motion.div
      layout={!reducedMotion}
      className="rounded-lg border overflow-hidden"
      style={{
        backgroundColor: '#EDEFFB',
        borderColor: isActive
          ? 'rgba(61,22,250,0.3)'
          : 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Status indicator */}
        {isComplete && (
          <CheckCircle2 size={16} style={{ color: '#00B887', flexShrink: 0 }} />
        )}
        {isActive && (
          <Loader2
            size={16}
            className="animate-spin"
            style={{ color: '#3D16FA', flexShrink: 0 }}
          />
        )}
        {isPending && (
          <div
            className="w-4 h-4 rounded-full border-2 flex-shrink-0"
            style={{ borderColor: 'rgba(255,255,255,0.2)' }}
          />
        )}

        {/* Badge */}
        <span
          className="text-[10px] font-semibold tracking-wider px-2 py-0.5 rounded"
          style={{
            backgroundColor: isComplete
              ? 'rgba(0,184,135,0.15)'
              : 'rgba(61,22,250,0.15)',
            color: isComplete ? '#00B887' : '#5A39FB',
          }}
        >
          {badge}
        </span>

        {/* Title */}
        <span className="text-sm text-gray-700">{title}</span>
      </div>

      <AnimatePresence>
        {(isActive || isComplete) && children && (
          <motion.div
            initial={reducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ type: 'spring', ...spring }}
            className="px-4 pb-3 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// --- Locale Progress Bar ---

function LocaleBar({ code, progress, reducedMotion }) {
  const isComplete = progress >= 100

  return (
    <div className="flex items-center gap-3 py-1">
      <span
        className="text-xs font-semibold w-6 text-right"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: isComplete ? '#00B887' : '#322D5C',
        }}
      >
        {code}
      </span>
      <div
        className="flex-1 h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: 'rgba(61,22,250,0.1)' }}
      >
        <motion.div
          className="h-full rounded-full relative"
          style={{
            background: isComplete
              ? '#00B887'
              : 'linear-gradient(90deg, #3D16FA, #00B887)',
            width: `${progress}%`,
          }}
          initial={reducedMotion ? false : { width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {!isComplete && !reducedMotion && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }}
            />
          )}
        </motion.div>
      </div>
      <span
        className="text-xs w-8 text-right"
        style={{
          fontFamily: 'JetBrains Mono, monospace',
          color: isComplete ? '#00B887' : 'rgba(0,0,0,0.5)',
        }}
      >
        {Math.round(progress)}%
      </span>
      {isComplete && (
        <motion.div
          initial={reducedMotion ? false : { scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', ...spring }}
        >
          <CheckCircle2 size={14} style={{ color: '#00B887' }} />
        </motion.div>
      )}
    </div>
  )
}

// --- Main Component ---

export default function SecurityTheatre({ data, onComplete, structuredContext }) {
  const reducedMotion = useReducedMotion()
  const [elapsed, setElapsed] = useState(0)
  const [handshakeStage, setHandshakeStage] = useState(reducedMotion ? 6 : 0)
  const [visibleSecurityLines, setVisibleSecurityLines] = useState(
    reducedMotion ? SECURITY_LINES.length : 0
  )
  const [guardrailStates, setGuardrailStates] = useState(
    GUARDRAILS.map(() => (reducedMotion ? 'passed' : 'pending'))
  )
  const startTimeRef = useRef(Date.now())
  const completedRef = useRef(false)

  const fileName = data?.fileName || 'Q3_Earnings_Final.docx'
  const agentName = data?.agent?.id || 'JP-FIN-3'
  const locales = structuredContext?.targetLocales || ['JA', 'DE', 'ZH']
  const localeStr = locales.join(' \u00b7 ')

  // --- Master timer ---
  useEffect(() => {
    if (reducedMotion) {
      setElapsed(COMPLETE_AT)
      return
    }
    const interval = setInterval(() => {
      const now = Date.now()
      const e = now - startTimeRef.current
      setElapsed(Math.min(e, COMPLETE_AT))
      if (e >= COMPLETE_AT) clearInterval(interval)
    }, 50)
    return () => clearInterval(interval)
  }, [reducedMotion])

  // --- Handshake sequence ---
  useEffect(() => {
    if (reducedMotion) return
    const timers = [
      setTimeout(() => setHandshakeStage(1), 0),
      setTimeout(() => setHandshakeStage(2), 300),
      setTimeout(() => setHandshakeStage(3), 600),
      setTimeout(() => setHandshakeStage(4), 800),
      setTimeout(() => setHandshakeStage(5), 1200),
      setTimeout(() => setHandshakeStage(6), 1500),
    ]
    return () => timers.forEach(clearTimeout)
  }, [reducedMotion])

  // --- Security ticker ---
  useEffect(() => {
    if (reducedMotion) return
    SECURITY_LINES.forEach((line, i) => {
      setTimeout(() => setVisibleSecurityLines(i + 1), line.time)
    })
  }, [reducedMotion])

  // --- Guardrail states during QA phase ---
  useEffect(() => {
    if (reducedMotion) return
    if (elapsed < PHASE_TRANSLATING_END) return

    const qaProgress = (elapsed - PHASE_TRANSLATING_END) / (PHASE_QA_END - PHASE_TRANSLATING_END)
    const totalGuardrails = GUARDRAILS.length
    const completedCount = Math.floor(qaProgress * totalGuardrails)

    setGuardrailStates(prev => {
      const next = [...prev]
      for (let i = 0; i < totalGuardrails; i++) {
        if (i < completedCount) {
          next[i] = 'passed'
        } else if (i === completedCount && qaProgress > 0) {
          next[i] = 'validating'
        } else {
          next[i] = 'pending'
        }
      }
      return next
    })
  }, [elapsed, reducedMotion])

  // --- Completion callback ---
  useEffect(() => {
    if (elapsed >= COMPLETE_AT && !completedRef.current) {
      completedRef.current = true
      const timer = setTimeout(() => {
        onComplete?.()
      }, reducedMotion ? 0 : 500)
      return () => clearTimeout(timer)
    }
  }, [elapsed, onComplete, reducedMotion])

  // --- Derived state ---
  const masterProgress = Math.min(100, (elapsed / COMPLETE_AT) * 100)

  const currentPhase =
    elapsed < PHASE_SCANNING_END ? 'scanning'
    : elapsed < PHASE_TRANSLATING_END ? 'translating'
    : elapsed < PHASE_QA_END ? 'qa'
    : 'complete'

  // Locale progress during translating phase
  const getLocaleProgress = (index) => {
    if (elapsed < PHASE_SCANNING_END) return 0
    if (elapsed >= PHASE_TRANSLATING_END) return 100
    const phaseElapsed = elapsed - PHASE_SCANNING_END
    const phaseDuration = PHASE_TRANSLATING_END - PHASE_SCANNING_END
    // Stagger: first locale leads, last locale lags
    const offset = index * 0.15
    const raw = (phaseElapsed / phaseDuration - offset) / (1 - offset)
    return Math.max(0, Math.min(100, raw * 100))
  }

  const getPhaseStatus = (phase) => {
    if (phase === 'scanning') {
      if (currentPhase === 'scanning') return 'active'
      return 'complete'
    }
    if (phase === 'translating') {
      if (currentPhase === 'scanning') return 'pending'
      if (currentPhase === 'translating') return 'active'
      return 'complete'
    }
    if (phase === 'qa') {
      if (currentPhase === 'scanning' || currentPhase === 'translating') return 'pending'
      if (currentPhase === 'qa') return 'active'
      return 'complete'
    }
    return 'pending'
  }

  const getTimeRemaining = () => {
    const remaining = Math.max(0, COMPLETE_AT - elapsed)
    if (remaining <= 0) return 'Complete'
    if (remaining < 1500) return 'Finalizing...'
    const secs = Math.ceil(remaining / 1000)
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `~${mins}:${String(s).padStart(2, '0')} remaining`
  }

  return (
    <div className="w-full max-w-[1000px] xl:max-w-[1200px] 2xl:max-w-[1400px] mx-auto py-10 xl:py-14 px-4 xl:px-8">
      {/* Injected keyframes */}
      <style>{`
        @keyframes spin-clockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-counter {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes counter-spin-clockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(-360deg); }
        }
        @keyframes counter-spin-counter {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes greenFlash {
          0% { opacity: 0; }
          50% { opacity: 0.3; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* --- Header --- */}
      <motion.div
        className="mb-8"
        initial={reducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', ...spring }}
      >
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">
          Executing Deployment
        </h1>
        <p className="text-sm text-gray-500 mb-2">
          {fileName} &rarr; {localeStr}
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Bot size={16} style={{ color: '#5A39FB' }} />
          <span>Agent {agentName}</span>
          <span className="flex items-center gap-1">
            &middot;
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{
                backgroundColor: '#00B887',
                animation: reducedMotion ? 'none' : 'pulse 2s ease-in-out infinite',
                boxShadow: '0 0 6px rgba(0,184,135,0.5)',
              }}
            />
            <span style={{ color: '#00B887' }}>Active</span>
          </span>
        </div>
      </motion.div>

      {/* --- Security Core --- */}
      <motion.div
        className="relative flex flex-col items-center justify-center mb-8"
        style={{ height: 280 }}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', ...spring, delay: 0.2 }}
      >
        {/* Handshake: initial lock at center */}
        <AnimatePresence>
          {handshakeStage < 2 && (
            <motion.div
              className="absolute z-20"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', ...spring }}
            >
              <Lock size={32} style={{ color: '#5A39FB' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Orbiting rings (appear at stage 3+) */}
        {handshakeStage >= 3 && (
          <>
            <motion.div
              initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', ...spring }}
            >
              <OrbitingRing
                radius={60}
                duration={8}
                direction="clockwise"
                icons={3}
                IconComponent={Lock}
                iconSize={12}
                reducedMotion={reducedMotion}
              />
            </motion.div>
            <motion.div
              initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', ...spring, delay: 0.1 }}
            >
              <OrbitingRing
                radius={90}
                duration={12}
                direction="counter"
                icons={4}
                IconComponent={Shield}
                iconSize={10}
                reducedMotion={reducedMotion}
              />
            </motion.div>
          </>
        )}

        {/* Central document + shield (appears at stage 2+) */}
        {handshakeStage >= 2 && (
          <motion.div
            className="relative z-10 flex flex-col items-center"
            initial={reducedMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', ...spring }}
          >
            <div className="relative">
              <FileText size={48} style={{ color: '#3D16FA' }} />
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                initial={reducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Shield
                  size={48}
                  style={{ color: 'rgba(61,22,250,0.3)' }}
                />
              </motion.div>

              {/* Green flash at handshake stage 6 */}
              {handshakeStage >= 6 && !reducedMotion && (
                <motion.div
                  className="absolute inset-0 rounded-lg"
                  style={{
                    backgroundColor: 'rgba(0,184,135,0.2)',
                    animation: 'greenFlash 0.6s ease-out forwards',
                  }}
                />
              )}
            </div>

            {/* AES-256 ENCRYPTED label */}
            <div className="mt-3">
              {handshakeStage >= 5 ? (
                <TypewriterText
                  text="AES-256 ENCRYPTED"
                  startDelay={0}
                  charDelay={40}
                  reducedMotion={reducedMotion}
                />
              ) : (
                <span className="text-xs" style={{ color: 'transparent' }}>
                  AES-256 ENCRYPTED
                </span>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* --- Security Ticker --- */}
      <div className="mb-8 space-y-2">
        <AnimatePresence>
          {SECURITY_LINES.slice(0, visibleSecurityLines).map((line, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-2 text-sm"
              initial={reducedMotion ? false : { x: -8, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', ...spring }}
            >
              {line.type === 'success' ? (
                <motion.div
                  initial={reducedMotion ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', ...spring }}
                >
                  <CheckCircle2 size={16} style={{ color: '#00B887' }} />
                </motion.div>
              ) : (
                <span
                  className="inline-block w-4 h-4 text-center leading-4"
                  style={{
                    color: '#FFBD59',
                    animation: reducedMotion
                      ? 'none'
                      : 'pulse 2s ease-in-out infinite',
                  }}
                >
                  &#9679;
                </span>
              )}
              <span className="text-gray-700">
                {line.type === 'countdown' ? (
                  <>
                    {line.text} <CountdownTimer />
                  </>
                ) : (
                  line.text
                )}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- Processing Phases --- */}
      <div className="space-y-3 mb-8">
        {/* Phase 1: Scanning */}
        <PhaseCard
          title={
            getPhaseStatus('scanning') === 'complete'
              ? 'Complete \u00b7 47 terms matched, 6 guardrails applied'
              : 'Document Scanning'
          }
          badge="SCANNING"
          status={getPhaseStatus('scanning')}
          reducedMotion={reducedMotion}
        >
          {getPhaseStatus('scanning') === 'active' && (
            <p className="text-xs text-gray-500">
              Matching against J-GAAP knowledge base...
            </p>
          )}
          {getPhaseStatus('scanning') === 'complete' && (
            <p className="text-xs text-gray-500">
              47 entries matched to J-GAAP knowledge base
            </p>
          )}
        </PhaseCard>

        {/* Phase 2: Deploying */}
        <PhaseCard
          title={
            getPhaseStatus('translating') === 'complete'
              ? `Complete \u00b7 ${locales.length} of ${locales.length} locales`
              : getPhaseStatus('translating') === 'active'
                ? `Deploying \u00b7 ${locales.filter((_, i) => getLocaleProgress(i) >= 100).length} of ${locales.length} locales complete`
                : 'Deployment'
          }
          badge="DEPLOYING"
          status={getPhaseStatus('translating')}
          reducedMotion={reducedMotion}
        >
          {(getPhaseStatus('translating') === 'active' ||
            getPhaseStatus('translating') === 'complete') && (
            <div className="space-y-1">
              {locales.map((locale, i) => (
                <LocaleBar
                  key={locale}
                  code={locale}
                  progress={getLocaleProgress(i)}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          )}
        </PhaseCard>

        {/* Phase 3: Quality Assurance */}
        <PhaseCard
          title={
            getPhaseStatus('qa') === 'complete'
              ? `All ${GUARDRAILS.length} guardrails passed`
              : getPhaseStatus('qa') === 'active'
                ? `Quality assurance \u00b7 ${GUARDRAILS.length} guardrails`
                : `Quality assurance \u00b7 ${GUARDRAILS.length} guardrails queued`
          }
          badge="QUALITY CHECK"
          status={getPhaseStatus('qa')}
          reducedMotion={reducedMotion}
        >
          {(getPhaseStatus('qa') === 'active' ||
            getPhaseStatus('qa') === 'complete') && (
            <div className="space-y-1.5">
              {GUARDRAILS.map((name, i) => {
                const state = guardrailStates[i]
                return (
                  <motion.div
                    key={i}
                    className="flex items-center gap-2 text-xs rounded px-2 py-1"
                    style={{
                      backgroundColor:
                        state === 'passed'
                          ? 'rgba(0,184,135,0.05)'
                          : state === 'validating'
                            ? 'rgba(255,189,89,0.05)'
                            : 'transparent',
                    }}
                    animate={
                      state === 'passed'
                        ? { backgroundColor: ['rgba(0,184,135,0.15)', 'rgba(0,184,135,0.05)'] }
                        : {}
                    }
                    transition={{ duration: 0.6 }}
                  >
                    {state === 'passed' && (
                      <motion.div
                        initial={reducedMotion ? false : { scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', ...spring }}
                      >
                        <CheckCircle2 size={14} style={{ color: '#00B887' }} />
                      </motion.div>
                    )}
                    {state === 'validating' && (
                      <Loader2
                        size={14}
                        className="animate-spin"
                        style={{ color: '#FFBD59' }}
                      />
                    )}
                    {state === 'pending' && (
                      <div
                        className="w-3.5 h-3.5 rounded-full border"
                        style={{ borderColor: 'rgba(255,255,255,0.15)' }}
                      />
                    )}
                    <span
                      style={{
                        color:
                          state === 'passed'
                            ? '#00B887'
                            : state === 'validating'
                              ? '#FFBD59'
                              : 'rgba(0,0,0,0.35)',
                      }}
                    >
                      {name}
                    </span>
                    <span className="ml-auto text-[10px]" style={{
                      color:
                        state === 'passed'
                          ? '#00B887'
                          : state === 'validating'
                            ? '#FFBD59'
                            : 'rgba(0,0,0,0.2)',
                    }}>
                      {state === 'passed' ? 'Passed' : state === 'validating' ? 'Validating...' : 'Pending'}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </PhaseCard>
      </div>

      {/* --- Master Progress Bar --- */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span
            className="text-lg font-semibold"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: masterProgress >= 100 ? '#00B887' : '#322D5C',
            }}
          >
            {Math.round(masterProgress)}%
          </span>
          <span
            className="text-sm"
            style={{
              fontFamily: 'JetBrains Mono, monospace',
              color: 'rgba(128,135,172,1)',
            }}
          >
            {getTimeRemaining()}
          </span>
        </div>

        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, backgroundColor: 'rgba(61,22,250,0.1)' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                masterProgress >= 100
                  ? '#00B887'
                  : 'linear-gradient(90deg, #3D16FA, #5A39FB, #00B887)',
              boxShadow:
                masterProgress >= 100
                  ? '0 0 8px rgba(0,184,135,0.5)'
                  : 'none',
            }}
            initial={reducedMotion ? { width: `${masterProgress}%` } : { width: '0%' }}
            animate={{ width: `${masterProgress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
