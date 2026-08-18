import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Bot, ArrowRight } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const AGENTS = [
  {
    name: 'JP-FIN-3',
    specialty: 'Japanese Financial Specialist',
    desc: 'Trained on J-GAAP terminology with 97% accuracy',
  },
  {
    name: 'Brand Voice Sentry',
    specialty: 'Tone & Style Guardian',
    desc: 'Ensures consistent brand voice across all outputs',
  },
  {
    name: 'Compliance Monitor',
    specialty: 'Regulatory Framework Agent',
    desc: 'GAAP and IFRS guardrail enforcement',
  },
]

const STAGGER_DELAY = 0.6 // seconds between each agent card
const TOTAL_ANIMATION_TIME = 2500 // ms before showing continue button

/* ── Circular progress indicator ── */
function CircularProgress({ progress, reduced }) {
  const size = 48
  const strokeWidth = 3
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-black/[0.06]"
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className="text-straker-600"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress)}
        style={{
          transition: reduced ? 'none' : 'stroke-dashoffset 0.4s ease-out',
        }}
      />
    </svg>
  )
}

export default function AgentAssemblyTransition({ agents: _agents, onComplete, onSkipToDashboard, userName }) {
  const reduced = useReducedMotion()
  const [showContinue, setShowContinue] = useState(reduced)
  const [progress, setProgress] = useState(reduced ? 1 : 0)

  useEffect(() => {
    if (reduced) return

    // Increment progress as each agent "connects"
    const steps = AGENTS.length
    AGENTS.forEach((_, i) => {
      setTimeout(() => {
        setProgress((i + 1) / steps)
      }, (i + 1) * STAGGER_DELAY * 1000 + 200)
    })

    // Show continue button after all agents animate in
    const timer = setTimeout(() => {
      setShowContinue(true)
    }, TOTAL_ANIMATION_TIME)

    return () => clearTimeout(timer)
  }, [reduced])

  const cardVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center font-['Inter',sans-serif]">
      {/* Skip link */}
      <button
        onClick={onSkipToDashboard ?? onComplete}
        className="absolute top-6 right-6 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        aria-label="Skip agent assembly"
      >
        Skip
      </button>

      <div className="flex flex-col items-center max-w-md w-full px-6">
        {/* Heading */}
        <h1 className="text-[22px] font-semibold text-gray-900 text-center">
          Assembling your agent ensemble...
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-gray-500 text-center mt-2 mb-8">
          Matching specialists to {userName ? `${userName}'s` : 'your'} workspace
        </p>

        {/* Progress indicator */}
        <div className="mb-8">
          <CircularProgress progress={progress} reduced={reduced} />
        </div>

        {/* Agent cards */}
        <div className="w-full space-y-3">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.name}
              variants={reduced ? undefined : cardVariants}
              initial={reduced ? false : 'hidden'}
              animate="visible"
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 300, damping: 20, delay: i * STAGGER_DELAY }
              }
              className="flex items-center gap-3.5 rounded-lg border border-black/[0.12] bg-[#EDEFFB] px-4 py-3.5"
            >
              <div className="w-9 h-9 rounded-lg bg-straker-50 flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5 text-straker-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-900 truncate">
                  {agent.name}
                </p>
                <p className="text-[12px] text-straker-600 font-medium">
                  {agent.specialty}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {agent.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Continue button */}
        {showContinue && (
          <motion.button
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onComplete}
            className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber hover:bg-amber-deep text-white text-[14px] font-medium transition-colors cursor-pointer"
            aria-label="Set up your first campaign"
          >
            Set up your first campaign
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
        {showContinue && (
          <button
            type="button"
            onClick={onSkipToDashboard ?? onComplete}
            className="mt-3 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            Explore the dashboard first →
          </button>
        )}
      </div>
    </div>
  )
}
