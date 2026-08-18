import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useReducedMotion from '../hooks/useReducedMotion'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

const STATS = [
  { label: 'projects completed', target: 156 },
  { label: 'words processed', target: 2.4, suffix: 'M', decimals: 1 },
  { label: 'custom agents trained', target: 34 },
  { label: 'average quality score', target: 91, suffix: '%' },
]

const MONTHS = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'Month 6']

function CountUpStat({ target, suffix = '', decimals = 0, duration = 1200, delay = 0 }) {
  const [value, setValue] = useState(0)
  const rafRef = useRef(null)

  useEffect(() => {
    const startTime = Date.now() + delay
    const animate = () => {
      const now = Date.now()
      if (now < startTime) {
        rafRef.current = requestAnimationFrame(animate)
        return
      }
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(eased * target)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration, delay])

  const display = decimals > 0
    ? value.toFixed(decimals)
    : Math.round(value).toLocaleString()

  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {display}{suffix}
    </span>
  )
}

export default function TimeJumpTransition({ onComplete }) {
  const prefersReduced = useReducedMotion()
  const [phase, setPhase] = useState('overlay')    // overlay -> text -> stats -> timeline -> exit
  const [activeMonth, setActiveMonth] = useState(-1)
  const timerRef = useRef(null)

  useEffect(() => {
    if (prefersReduced) {
      // Skip animation for reduced motion users
      const t = setTimeout(() => onComplete(), 500)
      return () => clearTimeout(t)
    }

    const timers = []

    // Phase 1: Show overlay (already visible)
    // Phase 2: Show text after 400ms
    timers.push(setTimeout(() => setPhase('text'), 400))

    // Phase 3: Show stats after 1400ms
    timers.push(setTimeout(() => setPhase('stats'), 1400))

    // Phase 4: Show timeline after 2200ms
    timers.push(setTimeout(() => setPhase('timeline'), 2200))

    // Animate months sequentially
    MONTHS.forEach((_, i) => {
      timers.push(setTimeout(() => setActiveMonth(i), 2400 + i * 200))
    })

    // Phase 5: Exit after 4000ms
    timers.push(setTimeout(() => setPhase('exit'), 4000))

    // Trigger onComplete after exit animation
    timers.push(setTimeout(() => onComplete(), 4600))

    return () => timers.forEach(clearTimeout)
  }, [onComplete, prefersReduced])

  if (prefersReduced) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#ffffff] flex items-center justify-center">
        <p className="text-xl text-gray-900 font-medium">Fast forward 6 months...</p>
      </div>
    )
  }

  return (
    <AnimatePresence>
      {phase !== 'done' && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'exit' ? 0 : 1 }}
          transition={{ duration: phase === 'exit' ? 0.6 : 0.5 }}
        >
          {/* Dark overlay background */}
          <div className="absolute inset-0 bg-[#ffffff]" />

          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(61,22,250,0.08) 0%, transparent 70%)',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-10 max-w-lg px-6">
            {/* Typewriter text */}
            <AnimatePresence>
              {(phase === 'text' || phase === 'stats' || phase === 'timeline' || phase === 'exit') && (
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={SPRING}
                  className="text-2xl md:text-3xl font-semibold text-gray-900 text-center tracking-tight"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  Fast forward 6 months
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0, 1, 0, 1] }}
                    transition={{ duration: 1.5, times: [0, 0.2, 0.3, 0.5, 0.6, 0.8] }}
                    className="text-straker-600"
                  >
                    ...
                  </motion.span>
                </motion.h1>
              )}
            </AnimatePresence>

            {/* Counting stats */}
            <AnimatePresence>
              {(phase === 'stats' || phase === 'timeline' || phase === 'exit') && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="grid grid-cols-2 gap-x-10 gap-y-6"
                >
                  {STATS.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, delay: 0.1 + i * 0.12 }}
                      className="text-center"
                    >
                      <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                        <CountUpStat
                          target={stat.target}
                          suffix={stat.suffix || ''}
                          decimals={stat.decimals || 0}
                          duration={1000}
                          delay={i * 120}
                        />
                      </p>
                      <p className="text-[12px] text-gray-500 uppercase tracking-wider font-medium">
                        {stat.label}
                      </p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timeline visualization */}
            <AnimatePresence>
              {(phase === 'timeline' || phase === 'exit') && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: 0.1 }}
                  className="flex items-center gap-3"
                >
                  {MONTHS.map((month, i) => (
                    <div key={month} className="flex items-center gap-3">
                      <div className="flex flex-col items-center gap-1.5">
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={
                            i <= activeMonth
                              ? { scale: 1, opacity: 1, backgroundColor: '#3D16FA' }
                              : { scale: 0.6, opacity: 0.25, backgroundColor: '#D8DCF5' }
                          }
                          transition={SPRING}
                          className="w-3 h-3 rounded-full"
                        />
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: i <= activeMonth ? 0.7 : 0.2 }}
                          transition={{ duration: 0.3 }}
                          className="text-[10px] text-gray-500 font-mono whitespace-nowrap"
                        >
                          {month}
                        </motion.span>
                      </div>
                      {i < MONTHS.length - 1 && (
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{
                            scaleX: i < activeMonth ? 1 : 0,
                            opacity: i < activeMonth ? 0.5 : 0.1,
                          }}
                          transition={{ duration: 0.3 }}
                          className="w-6 h-px bg-straker-400 origin-left mb-5"
                        />
                      )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
