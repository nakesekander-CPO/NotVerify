import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield,
  Building2,
  Mic,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const ICON_MAP = { Shield, Building2, Mic }

const BAR_COLORS = {
  'JP-FIN-3': 'bg-[#5c7cfa]',
  'MER-DT-1': 'bg-violet-500',
  'BV-SENT-1': 'bg-amber-500',
}

const BAR_TEXT_COLORS = {
  'JP-FIN-3': 'text-[#5c7cfa]',
  'MER-DT-1': 'text-violet-500',
  'BV-SENT-1': 'text-amber-500',
}

const BADGE_STYLES = {
  regulatory: 'bg-[#5c7cfa]/20 text-[#5c7cfa]',
  terminology: 'bg-emerald-500/20 text-emerald-600',
  brand: 'bg-violet-500/20 text-violet-600',
  tone: 'bg-amber-500/20 text-amber-600',
  formatting: 'bg-cyan-500/20 text-cyan-600',
}

const DEFAULT_AGENTS = [
  {
    id: 'JP-FIN-3',
    name: 'J-GAAP Specialist',
    icon: 'Shield',
    version: 'v4.2',
    segmentsHandled: 47,
    errorsFound: 14,
    errorsMissedByGeneric: 14,
    heavyLiftingPercent: 58,
    topContributions: [
      {
        type: 'regulatory',
        text: 'Mapped ASC 606 \u2192 ASBJ Rule 29 across 8 segments',
        impact: '+12 quality points',
      },
      {
        type: 'terminology',
        text: "Corrected 'Goodwill' \u2192 '\u306e\u308c\u3093' (J-GAAP specific term)",
        impact: '+4 quality points',
      },
      {
        type: 'formatting',
        text: 'Converted $4.2M \u2192 \u00a5630\u767e\u4e07 with fiscal year alignment',
        impact: '+3 quality points',
      },
    ],
    corrections: [
      {
        id: 'c1',
        term: '\u306e\u308c\u3093',
        source: 'Goodwill',
        context: 'J-GAAP financial reporting',
        promoted: false,
      },
      {
        id: 'c2',
        term: '\u53ce\u76ca\u8a8d\u8b58',
        source: 'Revenue Recognition',
        context: 'ASC 606 / ASBJ 29 alignment',
        promoted: false,
      },
      {
        id: 'c3',
        term: '\u6e1b\u640d\u640d\u5931',
        source: 'Impairment Loss',
        context: 'Asset valuation reporting',
        promoted: false,
      },
    ],
  },
  {
    id: 'MER-DT-1',
    name: 'Meridian Capital Digital Twin',
    icon: 'Building2',
    version: 'v2.1',
    segmentsHandled: 47,
    errorsFound: 3,
    errorsMissedByGeneric: 3,
    heavyLiftingPercent: 28,
    topContributions: [
      {
        type: 'brand',
        text: 'Enforced Meridian Capital terminology across 112 knowledge matches',
        impact: '+6 quality points',
      },
      {
        type: 'tone',
        text: 'Maintained formal corporate register in all segments',
        impact: '+2 quality points',
      },
    ],
    corrections: [
      {
        id: 'c4',
        term: '\u5f53\u793e',
        source: 'Our company / We',
        context: 'Meridian Capital formal self-reference',
        promoted: false,
      },
    ],
  },
  {
    id: 'BV-SENT-1',
    name: 'Brand Voice Sentry',
    icon: 'Mic',
    version: 'v1.8',
    segmentsHandled: 47,
    errorsFound: 2,
    errorsMissedByGeneric: 2,
    heavyLiftingPercent: 14,
    topContributions: [
      {
        type: 'tone',
        text: "Adjusted casual 'we believe' \u2192 formal '\u5f53\u793e\u306f\u8a8d\u8b58\u3057\u3066\u304a\u308a\u307e\u3059'",
        impact: '+3 quality points',
      },
    ],
    corrections: [],
  },
]

const spring = { type: 'spring', stiffness: 300, damping: 20 }

export default function GovernanceScorecard({
  agents: externalAgents,
  onPromoteCorrection,
}) {
  const prefersReducedMotion = useReducedMotion()
  const [promotedIds, setPromotedIds] = useState(new Set())

  // Use DEFAULT_AGENTS always — external agents don't have the governance data shape
  const agents = DEFAULT_AGENTS

  const totalErrors = agents.reduce((sum, a) => sum + (a.errorsFound || 0), 0)
  const totalImpact = agents.reduce(
    (sum, a) =>
      sum +
      (a.topContributions || []).reduce((s, c) => {
        const match = (c.impact || '').match(/\+(\d+)/)
        return s + (match ? parseInt(match[1], 10) : 0)
      }, 0),
    0
  )

  function handlePromote(correction) {
    setPromotedIds((prev) => new Set([...prev, correction.id]))
    onPromoteCorrection?.(correction)
  }

  const animateProps = (delay = 0) =>
    prefersReducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { ...spring, delay },
        }

  const barAnimateProps = (delay = 0, widthPercent) =>
    prefersReducedMotion
      ? { style: { width: `${widthPercent}%` } }
      : {
          initial: { width: 0 },
          animate: { width: `${widthPercent}%` },
          transition: { ...spring, delay },
        }

  return (
    <section className="w-full rounded-lg bg-[#ffffff] p-6 font-['Inter']">
      {/* Section Header */}
      <motion.div
        className="mb-6 flex items-center gap-3"
        {...animateProps(0)}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5c7cfa]/20">
          <BarChart3 className="h-5 w-5 text-[#5c7cfa]" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Agent Governance Scorecard
        </h2>
      </motion.div>

      {/* Contribution Bar Chart */}
      <motion.div className="mb-6" {...animateProps(0.1)}>
        <div className="mb-2 flex h-8 w-full overflow-hidden rounded-lg">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              className={`${BAR_COLORS[agent.id]} flex items-center justify-center`}
              {...barAnimateProps(0.2 + i * 0.15, agent.heavyLiftingPercent)}
            >
              <span className="text-xs font-semibold text-white">
                {agent.heavyLiftingPercent}%
              </span>
            </motion.div>
          ))}
        </div>
        <div className="flex gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-1.5">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${BAR_COLORS[agent.id]}`}
              />
              <span className="text-xs text-gray-400">
                {agent.name}{' '}
                <span
                  className={`font-['JetBrains_Mono'] font-medium ${BAR_TEXT_COLORS[agent.id]}`}
                >
                  {agent.heavyLiftingPercent}%
                </span>
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Agent Contribution Cards */}
      <div className="flex flex-col gap-4">
        {agents.map((agent, i) => {
          const IconComponent = ICON_MAP[agent.icon] || Shield

          return (
            <motion.div
              key={agent.id}
              className="rounded-lg bg-[#f5f5f5] p-5"
              {...animateProps(0.3 + i * 0.12)}
            >
              {/* Card Header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${BAR_COLORS[agent.id]}/20`}
                  >
                    <IconComponent
                      className={`h-4.5 w-4.5 ${BAR_TEXT_COLORS[agent.id]}`}
                    />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">
                      {agent.name}
                    </span>
                    <span className="ml-2 font-['JetBrains_Mono'] text-xs text-gray-500">
                      {agent.version}
                    </span>
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-['JetBrains_Mono'] text-xs font-medium ${BAR_COLORS[agent.id]}/20 ${BAR_TEXT_COLORS[agent.id]}`}
                >
                  {agent.heavyLiftingPercent}% Heavy Lifting
                </span>
              </div>

              {/* Key Stat */}
              <p className="mb-4 text-sm text-gray-500">
                <span className="font-bold text-[#34d399]">
                  {agent.errorsFound} errors caught
                </span>{' '}
                that the generic model missed
              </p>

              {/* Top Contributions */}
              <div className="mb-4 flex flex-col gap-2">
                {agent.topContributions.map((contribution, ci) => (
                  <div
                    key={ci}
                    className="flex items-start gap-2 rounded-lg bg-[#ffffff]/60 px-3 py-2"
                  >
                    <span
                      className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${BADGE_STYLES[contribution.type]}`}
                    >
                      {contribution.type}
                    </span>
                    <span className="flex-1 text-sm text-gray-700">
                      {contribution.text}
                    </span>
                    <span className="shrink-0 font-['JetBrains_Mono'] text-xs font-medium text-[#34d399]">
                      {contribution.impact}
                    </span>
                  </div>
                ))}
              </div>

              {/* Learn Section - Corrections */}
              {agent.corrections.length > 0 && (
                <div className="rounded-lg border border-[#5c7cfa]/20 bg-[#ffffff]/40 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-[#5c7cfa]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#5c7cfa]">
                      Learn
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {agent.corrections.map((correction) => {
                      const isPromoted = promotedIds.has(correction.id)
                      return (
                        <div
                          key={correction.id}
                          className="flex items-center justify-between gap-3 rounded-md bg-[#f5f5f5]/80 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-['JetBrains_Mono'] text-gray-400">
                              {correction.source}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-gray-600" />
                            <span className="font-['JetBrains_Mono'] font-medium text-gray-900">
                              {correction.term}
                            </span>
                            <span className="text-xs text-gray-500">
                              {correction.context}
                            </span>
                          </div>
                          {isPromoted ? (
                            <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#34d399]">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Promoted
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePromote(correction)}
                              className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#5c7cfa]/20 px-3 py-1.5 text-xs font-medium text-[#5c7cfa] transition-colors hover:bg-[#5c7cfa]/30"
                            >
                              <Sparkles className="h-3 w-3" />
                              Promote to Org Knowledge
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Summary Footer */}
      <motion.div
        className="mt-6 rounded-lg border border-[#34d399]/20 bg-[#34d399]/5 p-5"
        {...animateProps(0.6)}
      >
        <div className="mb-2 flex items-center gap-4">
          <span className="font-['JetBrains_Mono'] text-lg font-bold text-[#34d399]">
            {totalErrors} errors caught
          </span>
          <span className="text-sm text-gray-400">
            that generic processing would have missed
          </span>
        </div>
        <div className="mb-3 flex items-center gap-4">
          <span className="font-['JetBrains_Mono'] text-lg font-bold text-[#34d399]">
            +{totalImpact} points
          </span>
          <span className="text-sm text-gray-400">
            estimated quality impact
          </span>
        </div>
        <p className="text-sm leading-relaxed text-gray-400">
          These corrections feed back into each agent's training loop, making
          them smarter for your next project.
        </p>
      </motion.div>
    </section>
  )
}
