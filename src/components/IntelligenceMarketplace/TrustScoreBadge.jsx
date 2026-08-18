import { motion } from 'framer-motion'
import { getScoreColor } from '../../utils/scoreColors'

const SIZES = {
  sm: { w: 40, r: 15, sw: 3, font: 'text-[11px]' },
  md: { w: 56, r: 22, sw: 3.5, font: 'text-[14px]' },
  lg: { w: 80, r: 32, sw: 4, font: 'text-[20px]' },
}

export default function TrustScoreBadge({ score, size = 'sm', reducedMotion = false }) {
  const s = SIZES[size] || SIZES.sm
  const circ = 2 * Math.PI * s.r
  const offset = circ - (score / 100) * circ
  const color = getScoreColor(score)

  // Map Tailwind class to hex for SVG stroke
  const strokeColor = score >= 85 ? '#00B887' : score >= 70 ? '#FFBD59' : '#E53935'

  return (
    <div className="relative shrink-0" style={{ width: s.w, height: s.w }}>
      <svg width={s.w} height={s.w} viewBox={`0 0 ${s.w} ${s.w}`}>
        <circle
          cx={s.w / 2} cy={s.w / 2} r={s.r}
          fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={s.sw}
        />
        <motion.circle
          cx={s.w / 2} cy={s.w / 2} r={s.r}
          fill="none" stroke={strokeColor} strokeWidth={s.sw} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 80, damping: 15 }}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-mono font-bold ${s.font} ${color.text}`}>{score}</span>
      </div>
    </div>
  )
}
