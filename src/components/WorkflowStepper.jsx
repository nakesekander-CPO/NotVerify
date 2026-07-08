import { useState, useEffect } from 'react'
import { Check, Brain } from 'lucide-react'
import { motion } from 'framer-motion'
import useReducedMotion from '../hooks/useReducedMotion'

const steps = [
  { key: 'dashboard', label: 'Intelligence Hub' },
  { key: 'reading', label: 'Agent Selection' },
  { key: 'processing', label: 'Processing' },
  { key: 'narrative', label: 'Quality Check' },
  { key: 'human-review', label: 'Review' },
  { key: 'org-brain', label: 'Cortex', icon: Brain },
]

const stateToStep = { dashboard: 0, reading: 1, processing: 2, narrative: 3, 'human-review': 4, 'org-brain': 5 }

export default function WorkflowStepper({ currentState }) {
  const activeIndex = stateToStep[currentState] ?? 0
  const prefersReducedMotion = useReducedMotion()
  const [showTip, setShowTip] = useState(() => !localStorage.getItem('nv-stepper-seen'))

  useEffect(() => {
    if (!showTip) return
    const timer = setTimeout(() => {
      setShowTip(false)
      localStorage.setItem('nv-stepper-seen', '1')
    }, 6000)
    return () => clearTimeout(timer)
  }, [showTip])

  return (
    <nav
      className="sticky top-16 z-40 border-b border-black/[0.12] bg-white relative"
      aria-label="Project workflow — 6 steps from dashboard to knowledge base"
    >
      <div className="max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-6 lg:px-8 xl:px-12 2xl:px-16 py-2 flex items-center">
        <ol className="flex items-center flex-1 gap-0" role="list">
          {steps.map((step, i) => {
            const isCompleted = i < activeIndex
            const isActive = i === activeIndex
            const isFuture = i > activeIndex

            return (
              <li key={step.key} className="flex items-center flex-1 last:flex-none">
                <div
                  className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors ${
                    isFuture
                      ? 'opacity-60'
                      : 'hover:bg-black/[0.04]'
                  }`}
                  role="listitem"
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={isFuture ? 'true' : undefined}
                  tabIndex={isFuture ? -1 : 0}
                  aria-label={`Step ${i + 1}: ${step.label}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                >
                  {/* Step circle */}
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isActive
                          ? 'border-2 border-straker-500 bg-straker-50 relative'
                          : 'bg-black/[0.08]'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3 h-3 text-white" strokeWidth={3} />
                    ) : step.icon ? (
                      <step.icon className={`w-3 h-3 ${isActive ? 'text-straker-600' : 'text-gray-400'}`} />
                    ) : isActive ? (
                      <>
                        {prefersReducedMotion ? (
                          <span className="w-2 h-2 rounded-full bg-straker-500" />
                        ) : (
                          <motion.span
                            className="w-2 h-2 rounded-full bg-straker-500"
                            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                          />
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-bold font-mono text-gray-400">
                        {i + 1}
                      </span>
                    )}
                  </div>

                  {/* Step label */}
                  <span
                    className={`text-[11px] font-medium whitespace-nowrap select-none ${
                      isCompleted
                        ? 'text-emerald-700'
                        : isActive
                          ? 'text-gray-900 font-semibold'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>

                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-2.5 h-[2px] relative rounded-full overflow-hidden">
                    <div className="absolute inset-0 bg-black/[0.06]" />
                    {i < activeIndex && (
                      <div className="absolute inset-0 bg-emerald-500/60 rounded-full" />
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ol>

        {showTip && (
          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-3 py-2 rounded-lg bg-gray-800 text-white text-[11px] font-medium whitespace-nowrap z-50 shadow-lg">
            This is your project workflow — each document flows through these steps.
            <button onClick={() => { setShowTip(false); localStorage.setItem('nv-stepper-seen', '1') }} className="ml-2 underline cursor-pointer">Got it</button>
          </div>
        )}

        {/* Step counter */}
        <span className="ml-4 text-[11px] font-mono text-gray-500 whitespace-nowrap shrink-0">
          Step {activeIndex + 1} of {steps.length}
        </span>
      </div>
    </nav>
  )
}
