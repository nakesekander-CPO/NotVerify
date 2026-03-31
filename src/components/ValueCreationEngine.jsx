import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Building2, Mic, ArrowRight, CheckCircle2, AlertTriangle, XCircle, Cpu } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const ICON_MAP = { Shield, Building2, Mic, Cpu }

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }
const RING_SPRING = { type: 'spring', stiffness: 80, damping: 15 }

const AI_GUARDRAILS_LIFT = 2

const DEFAULT_AGENTS = [
  {
    id: 'JP-FIN-3',
    name: 'J-GAAP Specialist',
    color: '#5c7cfa',
    icon: 'Shield',
    errorsFound: 14,
    qualityLift: 5,
    contributions: [
      'GAAP\u2192J-GAAP mapping (+2 pts)',
      '\u306e\u308c\u3093 domain term (+2 pts)',
      'Currency formatting (+1 pt)',
    ],
  },
  {
    id: 'MER-DT-1',
    name: 'Meridian Capital Digital Twin',
    color: '#8b5cf6',
    icon: 'Building2',
    errorsFound: 3,
    qualityLift: 3,
    contributions: [
      '112 knowledge entries enforced (+2 pts)',
      'Formal register maintained (+1 pt)',
    ],
  },
  {
    id: 'BV-SENT-1',
    name: 'Brand Voice Sentry',
    color: '#f59e0b',
    icon: 'Mic',
    errorsFound: 2,
    qualityLift: 2,
    contributions: [
      'Tone adjustment: casual\u2192formal (+2 pts)',
    ],
  },
]

const DEFAULT_CONTEXT_BADGES = [
  { label: 'TSE Compliance', status: '2 Minor Flags', color: 'amber' },
  { label: 'J-GAAP', status: 'Cleared', color: 'emerald' },
  { label: 'Auto-Publish', status: 'Not Cleared', color: 'red' },
]

const BADGE_STYLES = {
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-500/30',
    text: 'text-amber-600',
    Icon: AlertTriangle,
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600',
    Icon: CheckCircle2,
  },
  red: {
    bg: 'bg-red-50',
    border: 'border-red-500/30',
    text: 'text-red-600',
    Icon: XCircle,
  },
}

/* ---------- ScoreRing ---------- */
function ScoreRing({ score, size = 80, strokeWidth = 6, color, prefersReducedMotion }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = (score / 100) * circumference
  const scoreColor = color || (score >= 85 ? '#34d399' : score >= 70 ? '#fbbf24' : '#f87171')

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={scoreColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: prefersReducedMotion ? 0 : 1.2, ...RING_SPRING }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="font-['JetBrains_Mono'] font-bold text-gray-900"
          style={{ fontSize: size > 60 ? '1.5rem' : '1rem' }}
        >
          {score}
        </span>
      </div>
    </div>
  )
}

/* ---------- Main Component ---------- */
export default function ValueCreationEngine({
  beforeScore = 76,
  agents = DEFAULT_AGENTS,
  contextBadges = DEFAULT_CONTEXT_BADGES,
}) {
  const prefersReducedMotion = useReducedMotion()
  const dur = prefersReducedMotion ? 0 : undefined

  const totalAgentLift = useMemo(
    () => agents.reduce((sum, a) => sum + a.qualityLift, 0),
    [agents],
  )
  const totalLift = totalAgentLift + AI_GUARDRAILS_LIFT
  const finalScore = Math.min(100, beforeScore + totalLift)
  const totalErrors = agents.reduce((sum, a) => sum + a.errorsFound, 0)

  /* waterfall segments */
  const segments = useMemo(() => {
    const segs = [
      { label: 'Baseline', value: beforeScore, color: '#64748b', isBase: true },
      { label: 'AI Guardrails', value: AI_GUARDRAILS_LIFT, color: '#34d399', isBase: false },
      ...agents.map((a) => ({
        label: a.name.split(' ').slice(0, 2).join(' '),
        value: a.qualityLift,
        color: a.color,
        isBase: false,
      })),
    ]
    return segs
  }, [beforeScore, agents])

  const barTotal = segments.reduce((s, seg) => s + seg.value, 0)

  return (
    <div className="w-full rounded-lg bg-[#f5f5f5] border border-black/[0.12] overflow-hidden">
      {/* ---------- SCORE HERO ROW ---------- */}
      <div className="px-6 pt-6 pb-4">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-500 mb-5">
          Value Creation Engine
        </p>

        <div className="flex items-center justify-center gap-6 flex-wrap">
          {/* Baseline */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: dur ?? 0.5, ...SPRING }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Baseline</p>
            <ScoreRing score={beforeScore} size={90} strokeWidth={7} color="#94a3b8" prefersReducedMotion={prefersReducedMotion} />
          </motion.div>

          {/* Arrow + lift badge */}
          <motion.div
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: dur === 0 ? 0 : 0.6, duration: dur ?? 0.4, ...SPRING }}
          >
            <div className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-gray-400" />
              <span className="font-['JetBrains_Mono'] text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-500/20 rounded-full px-3 py-1">
                +{totalLift} pts
              </span>
              <ArrowRight className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">{totalErrors} errors caught</p>
          </motion.div>

          {/* Final */}
          <motion.div
            className="flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dur === 0 ? 0 : 1.0, duration: dur ?? 0.5, ...SPRING }}
          >
            <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Final</p>
            <ScoreRing score={finalScore} size={90} strokeWidth={7} color="#34d399" prefersReducedMotion={prefersReducedMotion} />
          </motion.div>
        </div>

        {/* Context Badges */}
        <motion.div
          className="flex items-center justify-center gap-2 mt-4 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: dur === 0 ? 0 : 1.4, duration: dur ?? 0.4 }}
        >
          {contextBadges.map((badge) => {
            const style = BADGE_STYLES[badge.color] || BADGE_STYLES.amber
            const BadgeIcon = style.Icon
            return (
              <span
                key={badge.label}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${style.bg} ${style.border} ${style.text}`}
              >
                <BadgeIcon className="w-3 h-3" />
                <span className="text-gray-700">{badge.label}</span>
                <span>{badge.status}</span>
              </span>
            )
          })}
        </motion.div>
      </div>

      {/* ---------- WATERFALL BAR ---------- */}
      <div className="px-6 py-4 border-t border-black/[0.06]">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-3">
          Agent Contribution Waterfall
        </p>

        <div className="relative h-10 w-full rounded-lg overflow-hidden bg-black/[0.02] flex">
          {segments.map((seg, i) => {
            const pct = (seg.value / barTotal) * 100
            return (
              <motion.div
                key={seg.label}
                className="relative h-full flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: seg.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{
                  delay: dur === 0 ? 0 : 1.2 + i * 0.15,
                  duration: dur ?? 0.5,
                  ...SPRING,
                }}
              >
                {pct > 8 && (
                  <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-white/90 whitespace-nowrap px-1">
                    {seg.isBase ? seg.value : `+${seg.value}`}
                  </span>
                )}
              </motion.div>
            )
          })}
          {/* Final score label */}
          <motion.div
            className="absolute right-0 top-0 h-full flex items-center pr-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: dur === 0 ? 0 : 2.0, duration: dur ?? 0.3 }}
          >
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold text-white bg-black/40 rounded px-1.5 py-0.5">
              = {finalScore}
            </span>
          </motion.div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2.5 flex-wrap">
          <LegendDot color="#64748b" label={`Baseline: ${beforeScore}`} />
          <LegendDot color="#34d399" label={`AI Guardrails: +${AI_GUARDRAILS_LIFT}`} />
          {agents.map((a) => (
            <LegendDot key={a.id} color={a.color} label={`${a.name.split(' ').slice(0, 2).join(' ')}: +${a.qualityLift}`} />
          ))}
        </div>
      </div>

      {/* ---------- AGENT IMPACT CARDS ---------- */}
      <div className="px-6 pb-6 pt-2 border-t border-black/[0.06] space-y-3">
        <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400 mb-2">
          Agent Impact Breakdown
        </p>

        {agents.map((agent, idx) => {
          const AgentIcon = ICON_MAP[agent.icon] || Shield
          return (
            <motion.div
              key={agent.id}
              className="rounded-lg bg-black/[0.02] border border-black/[0.12] p-4"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: dur === 0 ? 0 : 2.0 + idx * 0.2,
                duration: dur ?? 0.5,
                ...SPRING,
              }}
            >
              {/* Card header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${agent.color}20` }}
                  >
                    <AgentIcon className="w-4 h-4" style={{ color: agent.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                    <p className="text-[10px] font-['JetBrains_Mono'] text-gray-400">{agent.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-500/20 rounded-full px-2.5 py-0.5">
                    {agent.errorsFound} errors caught
                  </span>
                  <span
                    className="font-['JetBrains_Mono'] text-sm font-bold rounded-full px-2.5 py-0.5"
                    style={{
                      color: agent.color,
                      backgroundColor: `${agent.color}15`,
                      border: `1px solid ${agent.color}30`,
                    }}
                  >
                    +{agent.qualityLift} pts
                  </span>
                </div>
              </div>

              {/* Contributions */}
              <div className="space-y-1.5 ml-10">
                {agent.contributions.map((contrib, cIdx) => (
                  <motion.div
                    key={cIdx}
                    className="flex items-center gap-2 text-xs text-gray-700"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: dur === 0 ? 0 : 2.2 + idx * 0.2 + cIdx * 0.1,
                      duration: dur ?? 0.3,
                      ...SPRING,
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: agent.color }}
                    />
                    <span>{contrib}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- Legend Dot ---------- */
function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] text-gray-500 font-medium">{label}</span>
    </div>
  )
}
