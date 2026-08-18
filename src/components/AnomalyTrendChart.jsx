import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, AlertTriangle, ArrowRight } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const spring = { type: 'spring', stiffness: 300, damping: 20 }

const GRID_LINES = [75, 80, 85, 90, 95]
const PAD = { left: 45, right: 25, top: 25, bottom: 35 }
const VIEW_W = 500
const VIEW_H = 240
const CHART_W = VIEW_W - PAD.left - PAD.right
const CHART_H = VIEW_H - PAD.top - PAD.bottom
const Y_MIN = 70
const Y_MAX = 100

function scoreToY(score) {
  return PAD.top + CHART_H - ((score - Y_MIN) / (Y_MAX - Y_MIN)) * CHART_H
}

function indexToX(i, total) {
  return PAD.left + (i / (total - 1)) * CHART_W
}

const ANOMALY_META = {
  Jul: {
    month: 'July 2026',
    prevScore: 90,
    score: 77,
    delta: -13,
    rootCause:
      'Drop isolated to Japanese locales. Brand Voice Sentry was disabled during this run due to a configuration override by user@acme.com on Jul 12.',
    impact: [
      { label: 'Domain Precision', pts: -3, detail: 'knowledge base bypass' },
      { label: 'Tone consistency', pts: -7, detail: 'Sentry disabled' },
      { label: 'Cultural mapping', pts: -3, detail: 'calendar unmapped' },
    ],
    action: 'Re-run with Sentry enabled',
    similarPattern:
      'This pattern matches 2 other drops in your org history where Brand Voice agents were disabled. Average recovery: +11 pts.',
  },
}

export default function AnomalyTrendChart({
  currentProjectScore = 88,
  industryAvg = 83,
}) {
  const prefersReduced = useReducedMotion()
  const [activeAnomaly, setActiveAnomaly] = useState(null)
  const [actionQueued, setActionQueued] = useState(false)

  const TREND_DATA = useMemo(
    () => [
      { month: 'Apr', score: 82, projects: 18 },
      { month: 'May', score: 84, projects: 22 },
      { month: 'Jun', score: 90, projects: 19 },
      { month: 'Jul', score: 77, projects: 25, anomaly: true },
      { month: 'Aug', score: 83, projects: 21 },
      { month: 'Sep', score: 86, projects: 20 },
      { month: 'Oct', score: 89, projects: 21 },
      { month: 'Nov', score: currentProjectScore, projects: 24 },
    ],
    [currentProjectScore],
  )

  const points = useMemo(
    () =>
      TREND_DATA.map((d, i) => ({
        x: indexToX(i, TREND_DATA.length),
        y: scoreToY(d.score),
        ...d,
      })),
    [TREND_DATA],
  )

  const linePath = useMemo(
    () => points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' '),
    [points],
  )

  const areaPath = useMemo(() => {
    const bottomY = PAD.top + CHART_H
    return `${linePath} L${points[points.length - 1].x},${bottomY} L${points[0].x},${bottomY} Z`
  }, [linePath, points])

  const benchmarkY = scoreToY(industryAvg)
  const latestScore = TREND_DATA[TREND_DATA.length - 1].score
  const aboveAvg = latestScore > industryAvg
  const pctAbove = Math.round(((latestScore - industryAvg) / industryAvg) * 100)

  const handleDotClick = useCallback(
    (month) => {
      setActiveAnomaly((prev) => (prev === month ? null : month))
    },
    [],
  )

  const handleBackdropClick = useCallback(() => {
    setActiveAnomaly(null)
  }, [])

  const meta = activeAnomaly ? ANOMALY_META[activeAnomaly] : null

  return (
    <div onClick={handleBackdropClick}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-4 h-4 text-gray-500" />
        <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
          Quality Trend
        </h2>
      </div>

      {/* SVG Chart */}
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-label="Quality trend chart with anomaly annotations"
      >
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D16FA" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#3D16FA" stopOpacity="0" />
          </linearGradient>
          {/* Pulse animation for anomaly ring */}
          {!prefersReduced && (
            <>
              <radialGradient id="pulseGlow">
                <stop offset="0%" stopColor="#FFB000" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#FFB000" stopOpacity="0" />
              </radialGradient>
            </>
          )}
        </defs>

        {/* Grid lines */}
        {GRID_LINES.map((val) => {
          const y = scoreToY(val)
          return (
            <g key={val}>
              <line
                x1={PAD.left}
                y1={y}
                x2={VIEW_W - PAD.right}
                y2={y}
                stroke="#D8DCF5"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                className="fill-gray-400"
                style={{ fontSize: 10, fontFamily: "'IBM Plex Sans', sans-serif" }}
              >
                {val}
              </text>
            </g>
          )
        })}

        {/* X-axis month labels */}
        {points.map((p) => (
          <text
            key={p.month}
            x={p.x}
            y={VIEW_H - 8}
            textAnchor="middle"
            className="fill-gray-400"
            style={{ fontSize: 10, fontFamily: "'IBM Plex Sans', sans-serif" }}
          >
            {p.month}
          </text>
        ))}

        {/* Industry benchmark dashed line */}
        <line
          x1={PAD.left}
          y1={benchmarkY}
          x2={VIEW_W - PAD.right}
          y2={benchmarkY}
          stroke="#FFB000"
          strokeWidth="1"
          strokeDasharray="6 4"
          opacity="0.6"
        />
        <text
          x={VIEW_W - PAD.right + 2}
          y={benchmarkY - 5}
          className="fill-[#FFBD59]-500"
          style={{ fontSize: 9, fontFamily: "'IBM Plex Sans', sans-serif" }}
          textAnchor="end"
        >
          Avg {industryAvg}
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaFill)" />

        {/* Trend line */}
        <path
          d={linePath}
          fill="none"
          stroke="#3D16FA"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data dots */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1
          const isAnomaly = p.anomaly
          const isActive = activeAnomaly === p.month

          if (isAnomaly) {
            return (
              <g
                key={p.month}
                onClick={(e) => {
                  e.stopPropagation()
                  handleDotClick(p.month)
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Pulsing outer ring */}
                {!prefersReduced && (
                  <circle cx={p.x} cy={p.y} r="5" fill="none" stroke="#FFB000" strokeWidth="1.5" opacity="0.5">
                    <animate
                      attributeName="r"
                      values="5;12;5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.5;0;0.5"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}
                {/* Amber dot */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#FFB000"
                  stroke={isActive ? '#FFBD59' : '#ffffff'}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {/* AlertTriangle icon above dot */}
                <g transform={`translate(${p.x - 7}, ${p.y - 22})`}>
                  <polygon
                    points="7,0 14,12 0,12"
                    fill="none"
                    stroke="#FFB000"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <line
                    x1="7"
                    y1="4"
                    x2="7"
                    y2="7.5"
                    stroke="#FFB000"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <circle cx="7" cy="9.5" r="0.7" fill="#FFB000" />
                </g>
              </g>
            )
          }

          if (isLast) {
            return (
              <g key={p.month}>
                {/* Outer glow ring */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="9"
                  fill="none"
                  stroke="#00B887"
                  strokeWidth="1"
                  opacity="0.3"
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  fill="#00B887"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )
          }

          return (
            <circle
              key={p.month}
              cx={p.x}
              cy={p.y}
              r="3"
              fill="#3D16FA"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
          )
        })}
      </svg>

      {/* Industry benchmark callout */}
      {aboveAvg && (
        <p className="mt-3 text-[11px] text-gray-500 text-center">
          Your consistency is{' '}
          <span className="text-emerald-600 font-semibold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {pctAbove}%
          </span>{' '}
          higher than the Financial Sector average
        </p>
      )}

      {/* Root-Cause Brief Panel */}
      <AnimatePresence>
        {meta && (
          <motion.div
            key={activeAnomaly}
            initial={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
            animate={prefersReduced ? { opacity: 1 } : { opacity: 1, height: 'auto', y: 0 }}
            exit={prefersReduced ? { opacity: 0 } : { opacity: 0, height: 0, y: -8 }}
            transition={prefersReduced ? { duration: 0 } : spring}
            className="overflow-hidden mt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="rounded-lg border border-amber-500/20 p-5"
              style={{ backgroundColor: 'rgba(245, 158, 11, 0.05)' }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <h3 className="text-sm font-semibold text-amber-600">
                  Anomaly Detected: {meta.month}
                </h3>
              </div>

              {/* Score delta */}
              <p
                className="text-[13px] text-gray-700 mb-4"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Score: {meta.prevScore}{' '}
                <span className="text-gray-400">&rarr;</span>{' '}
                {meta.score}{' '}
                <span className="text-red-600">({meta.delta} pts)</span>
              </p>

              {/* Root cause */}
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Root Cause
                </p>
                <p className="text-[12px] text-gray-700 leading-relaxed">
                  {meta.rootCause}
                </p>
              </div>

              {/* Impact breakdown */}
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Impact Breakdown
                </p>
                <ul className="space-y-1">
                  {meta.impact.map((item) => (
                    <li key={item.label} className="text-[12px] text-gray-700 flex items-start gap-1.5">
                      <span className="text-gray-400 mt-px">&bull;</span>
                      <span>
                        <span className="text-gray-800">{item.label}:</span>{' '}
                        <span
                          className="text-red-600"
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {item.pts} pts
                        </span>{' '}
                        <span className="text-gray-400">({item.detail})</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended action */}
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Recommended Action
                </p>
                <button
                  onClick={() => setActionQueued(true)}
                  disabled={actionQueued}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium text-white transition-colors disabled:opacity-60"
                  style={{ backgroundColor: actionQueued ? '#00805A' : '#3D16FA' }}
                  onMouseEnter={(e) => { if (!actionQueued) e.currentTarget.style.backgroundColor = '#2B0FAF' }}
                  onMouseLeave={(e) => { if (!actionQueued) e.currentTarget.style.backgroundColor = '#3D16FA' }}
                >
                  {actionQueued ? 'Queued \u2713' : meta.action}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Similar patterns */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Similar Patterns
                </p>
                <p className="text-[12px] text-gray-500 leading-relaxed">
                  {meta.similarPattern}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
