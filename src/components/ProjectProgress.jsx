import { Check } from 'lucide-react'
import { motion } from 'framer-motion'
import useReducedMotion from '../hooks/useReducedMotion'

const steps = [
  { key: 'reading', label: 'Checks' },
  { key: 'processing', label: 'Processing' },
  { key: 'narrative', label: 'Flags & Review' },
  { key: 'human-review', label: 'Review' },
]

const stateToStep = { reading: 0, processing: 1, narrative: 2, 'human-review': 3 }

export default function ProjectProgress({ currentState }) {
  const activeIndex = stateToStep[currentState] ?? 0
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className="rounded-lg border border-black/[0.08] bg-white mb-4 px-4 py-2.5"
      role="navigation"
      aria-label="Project progress"
    >
      <ol className="flex items-center gap-0" role="list">
        {steps.map((step, i) => {
          const isCompleted = i < activeIndex
          const isActive = i === activeIndex
          const isFuture = i > activeIndex

          return (
            <li key={step.key} className="flex items-center flex-1 last:flex-none">
              <div
                className={`flex items-center gap-1.5 rounded-md px-1.5 py-1 ${isFuture ? 'opacity-50' : ''}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isCompleted ? 'bg-emerald-500' : isActive ? 'border-2 border-straker-500 bg-straker-50' : 'bg-black/[0.08]'
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  ) : isActive ? (
                    prefersReducedMotion ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-straker-500" />
                    ) : (
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-straker-500"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    )
                  ) : (
                    <span className="text-[8px] font-bold font-mono text-gray-400">{i + 1}</span>
                  )}
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap select-none ${
                  isCompleted ? 'text-emerald-700' : isActive ? 'text-gray-900 font-semibold' : 'text-gray-400'
                }`}>
                  {step.label}
                </span>
              </div>

              {i < steps.length - 1 && (
                <div className="flex-1 mx-2 h-[2px] relative rounded-full overflow-hidden">
                  <div className="absolute inset-0 bg-black/[0.06]" />
                  {i < activeIndex && <div className="absolute inset-0 bg-emerald-500/60 rounded-full" />}
                </div>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
