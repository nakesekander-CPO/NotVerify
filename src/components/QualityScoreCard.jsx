import { motion } from 'framer-motion'
import { Brain, Target, ArrowUpRight } from 'lucide-react'
import { dimensionIcons, getScoreColor, getQualityColor } from '../utils/scoreColors'

const springTransition = { type: 'spring', stiffness: 300, damping: 20 }

export default function QualityScoreCard({ qualityScore }) {
  const color = getQualityColor(qualityScore.overall)

  // Circumference for animated ring
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const fillPercent = qualityScore.overall / 100
  const dashOffset = circumference * (1 - fillPercent)

  return (
    <div className="rounded-lg border border-black/[0.12] overflow-hidden" aria-live="polite">
      <div className="bg-gray-100 px-6 py-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-7 h-7 rounded-lg bg-straker-50 flex items-center justify-center"><Target className="w-3.5 h-3.5 text-straker-600" /></div>
          <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Confidence Score</h2>
        </div>
        <div className="flex items-start gap-6">
          <div className="shrink-0 flex flex-col items-center">
            {/* Animated score ring */}
            <div className="relative w-[88px] h-[88px]" role="img" aria-label={`Confidence score: ${qualityScore.overall} out of 100`}>
              <svg viewBox="0 0 88 88" className="w-full h-full -rotate-90">
                {/* Background ring */}
                <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
                {/* Animated fill ring */}
                <motion.circle
                  cx="44" cy="44" r={radius}
                  fill="none"
                  className={color.stroke}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset: dashOffset }}
                  transition={springTransition}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <motion.span
                  key={qualityScore.overall}
                  className={`text-[32px] font-bold tracking-tight leading-none ${color.text}`}
                  initial={{ scale: 1.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={springTransition}
                >
                  {qualityScore.overall}
                </motion.span>
                <span className="text-[10px] text-gray-500 font-medium mt-0.5">/ 100</span>
              </div>
            </div>
            <motion.span
              key={qualityScore.label}
              className={`text-[10px] font-bold uppercase tracking-wider mt-2 px-2 py-0.5 rounded ${color.badge}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              {qualityScore.label}
            </motion.span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-gray-500 leading-relaxed">{qualityScore.summary}</p>
            <div className="flex items-center gap-2 mt-3">
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400/60" />
              <span className="text-[12px] text-emerald-400/70 font-medium">Up to {qualityScore.potential}/100 achievable with enhancements</span>
            </div>
          </div>
        </div>

        {/* Dimension sub-score bars with spring animation */}
        <div className="mt-5 space-y-3">
          {qualityScore.dimensions.map((dim, i) => {
            const Icon = dimensionIcons[dim.icon] || Brain
            const scoreColor = getScoreColor(dim.score)
            return (
              <div key={i} className="flex items-center gap-4">
                <Icon className="w-4 h-4 text-gray-500 shrink-0" />
                <span className="text-[13px] text-gray-500 w-40 shrink-0">{dim.name}</span>
                <div className="flex-1 h-2 bg-black/[0.03] rounded-full overflow-hidden relative">
                  {/* Potential ghost bar */}
                  <div className={`absolute inset-y-0 left-0 rounded-full ${scoreColor.bar} opacity-20`} style={{ width: `${dim.potential}%` }} />
                  {/* Animated current score bar */}
                  <motion.div
                    className={`absolute inset-y-0 left-0 rounded-full ${scoreColor.bar}`}
                    initial={false}
                    animate={{ width: `${dim.score}%` }}
                    transition={springTransition}
                  />
                </div>
                <div className="flex items-center gap-1.5 w-24 shrink-0 justify-end">
                  <motion.span
                    key={dim.score}
                    className={`text-[13px] font-semibold tabular-nums ${scoreColor.text}`}
                    initial={{ scale: 1.2, opacity: 0.5 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={springTransition}
                  >
                    {dim.score}
                  </motion.span>
                  <span className="text-[11px] text-gray-500">→</span>
                  <span className="text-[13px] font-semibold tabular-nums text-emerald-400/60">{dim.potential}</span>
                </div>
              </div>
            )
          })}
        </div>
        <p className="mt-4 pt-4 border-t border-black/[0.06] text-[11px] text-gray-500 italic">
          Scores are intentionally conservative. Actual results typically exceed estimates by 5–12 points.
        </p>
      </div>
    </div>
  )
}
