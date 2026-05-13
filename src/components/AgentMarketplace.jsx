import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Megaphone,
  Scale,
  Code,
  Heart,
  Star,
  ArrowRight,
  Eye,
  UserPlus,
  Search,
  Trash2,
  FileText,
  Globe,
  Shield,
  Activity,
  CheckCircle,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

/* ─── Icon map ─── */
const ICON_MAP = {
  Megaphone,
  Scale,
  Code,
  Heart,
  FileText,
  Globe,
  Shield,
  Activity,
}

/* ─── Categories ─── */
const CATEGORIES = ['All', 'Financial', 'Legal', 'Marketing', 'Technical', 'Medical', 'Regional']

/* ─── Test drive sample content per category ─── */
const TEST_DRIVE_SAMPLES = {
  Marketing: {
    before: 'Our innovative solutions will take your business to the next level with cutting-edge technology.',
    after: 'Unlock growth with solutions designed for your market — trusted by 10,000+ businesses worldwide.',
    baselineScore: 78,
    boostedScore: 94,
    metric: 'tone',
  },
  Legal: {
    before: 'This agreement shall be interpreted in accordance with applicable laws and regulations.',
    after: 'This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict-of-law principles.',
    baselineScore: 82,
    boostedScore: 97,
    metric: 'regulatory',
  },
  Technical: {
    before: 'Use the API endpoint to access data with an authentication token.',
    after: 'Authenticate via OAuth 2.0 bearer token. Send GET /api/v2/resources with Authorization: Bearer <token> header. Returns paginated JSON (max 100 items).',
    baselineScore: 75,
    boostedScore: 94,
    metric: 'accuracy',
  },
  Medical: {
    before: 'The clinical trial results showed significant improvement in patient outcomes.',
    after: 'Phase III RCT (n=1,204) demonstrated statistically significant improvement in primary endpoint (p<0.001, 95% CI: 0.42-0.68) vs. placebo at 24 weeks.',
    baselineScore: 80,
    boostedScore: 96,
    metric: 'accuracy',
  },
  Financial: {
    before: 'The company reported its financial results for the quarter ending December 2025.',
    after: 'Per Item 303 of Regulation S-K, the registrant discloses Q4 FY2025 results: net revenue of $4.2B (YoY +12%), GAAP EPS of $3.14, and free cash flow of $890M.',
    baselineScore: 79,
    boostedScore: 96,
    metric: 'regulatory',
  },
  Regional: {
    before: 'Buy now and get free shipping on all orders over $50.',
    after: 'Jetzt bestellen und ab 50 EUR versandkostenfrei erhalten — schnelle Lieferung in 2-3 Werktagen.',
    baselineScore: 72,
    boostedScore: 93,
    metric: 'tone',
  },
}

/* ─── Marketplace agents ─── */
const MARKETPLACE_AGENTS = [
  {
    id: 'MKT-SPEC-1',
    name: 'Marketing Specialist',
    specialty: 'Creative & Marketing Copy',
    icon: 'Megaphone',
    category: 'Marketing',
    scores: { accuracy: 88, speed: 92, tone: 97, regulatory: 65 },
    badges: ['Creative Copy', '8K+ projects', '97% tone match'],
    description:
      'Specializes in transcreation and marketing copy that resonates with local audiences.',
    usedBy: 187,
    rating: 4.8,
  },
  {
    id: 'LEGAL-1',
    name: 'Legal & Compliance Agent',
    specialty: 'Legal Documents & Contracts',
    icon: 'Scale',
    category: 'Legal',
    scores: { accuracy: 96, speed: 78, tone: 82, regulatory: 99 },
    badges: ['Bar Certified', '5K+ contracts', '99.8% compliance'],
    description:
      'Expert in legal terminology, contract law, and regulatory compliance across jurisdictions.',
    usedBy: 143,
    rating: 4.9,
  },
  {
    id: 'TECH-1',
    name: 'Technical Writer',
    specialty: 'API Docs & Technical Manuals',
    icon: 'Code',
    category: 'Technical',
    scores: { accuracy: 94, speed: 95, tone: 75, regulatory: 80 },
    badges: ['API Expert', '12K+ docs', '94% accuracy'],
    description:
      'Optimized for software documentation, API references, and technical specifications.',
    usedBy: 162,
    rating: 4.6,
  },
  {
    id: 'MED-1',
    name: 'Medical & Pharma Agent',
    specialty: 'Clinical & Pharmaceutical',
    icon: 'Heart',
    category: 'Medical',
    scores: { accuracy: 98, speed: 72, tone: 85, regulatory: 97 },
    badges: ['FDA Aligned', '3K+ trials', '98.5% accuracy'],
    description:
      'Trained on clinical trial documentation, pharmaceutical labeling, and medical literature.',
    usedBy: 98,
    rating: 4.7,
  },
  {
    id: 'SEC-1',
    name: 'SEC Filing Specialist',
    specialty: 'US Securities Regulation',
    icon: 'FileText',
    category: 'Financial',
    scores: { accuracy: 96, speed: 82, tone: 78, regulatory: 99 },
    badges: ['SEC Expert', '2K+ filings', '99.2% compliance'],
    description:
      'Deep expertise in SEC filings, 10-K/10-Q reports, and US securities regulation terminology.',
    usedBy: 76,
    rating: 4.5,
  },
  {
    id: 'ECOM-1',
    name: 'E-Commerce Localizer',
    specialty: 'Product Descriptions & UX Copy',
    icon: 'Globe',
    category: 'Regional',
    scores: { accuracy: 88, speed: 95, tone: 92, regulatory: 72 },
    badges: ['UX Copy', '15K+ SKUs', '92% conversion lift'],
    description:
      'Crafts localized product descriptions and UX copy that drive conversions in any market.',
    usedBy: 201,
    rating: 4.4,
  },
  {
    id: 'PATENT-1',
    name: 'Patent & IP Translator',
    specialty: 'Patent Claims & Technical IP',
    icon: 'Shield',
    category: 'Technical',
    scores: { accuracy: 94, speed: 70, tone: 65, regulatory: 97 },
    badges: ['IP Specialist', '4K+ patents', '97% claim accuracy'],
    description:
      'Specialized in patent claims, technical IP documents, and prosecution history translation.',
    usedBy: 54,
    rating: 4.3,
  },
  {
    id: 'HEALTH-1',
    name: 'Healthcare Communications',
    specialty: 'Patient-Facing Medical Content',
    icon: 'Activity',
    category: 'Medical',
    scores: { accuracy: 91, speed: 85, tone: 94, regulatory: 93 },
    badges: ['Plain Language', '6K+ docs', '94% readability'],
    description:
      'Creates clear, empathetic patient-facing medical content that meets health literacy standards.',
    usedBy: 112,
    rating: 4.6,
  },
]

/* ─── Radar / Spider Chart ─── */
const AXES = ['accuracy', 'speed', 'tone', 'regulatory']
const AXIS_LABELS = { accuracy: 'Accuracy', speed: 'Speed', tone: 'Tone', regulatory: 'Regulatory' }
const RADAR_SIZE = 120
const RADAR_CENTER = RADAR_SIZE / 2
const RADAR_RADIUS = 44

function polarToCartesian(angleDeg, radius) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return {
    x: RADAR_CENTER + radius * Math.cos(rad),
    y: RADAR_CENTER + radius * Math.sin(rad),
  }
}

function polygonPoints(values, maxRadius) {
  return AXES.map((axis, i) => {
    const angle = (360 / AXES.length) * i
    const r = (values[axis] / 100) * maxRadius
    const { x, y } = polarToCartesian(angle, r)
    return `${x},${y}`
  }).join(' ')
}

function fullPolygonPoints(maxRadius) {
  return AXES.map((_, i) => {
    const angle = (360 / AXES.length) * i
    const { x, y } = polarToCartesian(angle, maxRadius)
    return `${x},${y}`
  }).join(' ')
}

function RadarChart({ scores, color = '#1B5E8F', size = RADAR_SIZE }) {
  const scale = size / RADAR_SIZE
  const concentricLevels = [0.25, 0.5, 0.75, 1]

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
      className="block mx-auto"
    >
      {concentricLevels.map((level) => (
        <polygon
          key={level}
          points={fullPolygonPoints(RADAR_RADIUS * level)}
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      ))}
      {AXES.map((_, i) => {
        const angle = (360 / AXES.length) * i
        const { x, y } = polarToCartesian(angle, RADAR_RADIUS)
        return (
          <line
            key={i}
            x1={RADAR_CENTER}
            y1={RADAR_CENTER}
            x2={x}
            y2={y}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
        )
      })}
      <polygon
        points={polygonPoints(scores, RADAR_RADIUS)}
        fill={`${color}4D`}
        stroke={color}
        strokeWidth="1.5"
      />
      {AXES.map((axis, i) => {
        const angle = (360 / AXES.length) * i
        const { x, y } = polarToCartesian(angle, RADAR_RADIUS + 14)
        return (
          <text
            key={axis}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-400"
            style={{ fontSize: '8px', fontFamily: 'Inter, sans-serif' }}
          >
            {AXIS_LABELS[axis]}
          </text>
        )
      })}
    </svg>
  )
}

/* ─── Test Drive Panel ─── */
function TestDrivePanel({ agent, onHire, spring, prefersReducedMotion }) {
  const [phase, setPhase] = useState('loading') // loading | result

  useEffect(() => {
    setPhase('loading')
    const timer = setTimeout(() => setPhase('result'), 2000)
    return () => clearTimeout(timer)
  }, [agent.id])

  const sample = TEST_DRIVE_SAMPLES[agent.category] || TEST_DRIVE_SAMPLES.Technical
  const delta = sample.boostedScore - sample.baselineScore

  return (
    <motion.div
      className="mt-6 rounded-lg overflow-hidden"
      style={{ backgroundColor: '#f5f5f5' }}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={spring}
    >
      <div className="p-6">
        <h3 className="text-gray-900 font-semibold text-sm mb-4 flex items-center gap-2">
          <Zap size={16} className="text-[#1B5E8F]" />
          Test Drive: {agent.name}
        </h3>

        {phase === 'loading' ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <motion.div
              className="w-8 h-8 rounded-full border-2 border-t-transparent"
              style={{ borderColor: '#1B5E8F', borderTopColor: 'transparent' }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <span className="text-sm text-gray-400">Running agent on sample content...</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div
                className="rounded-lg p-4"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                    Without Agent
                  </span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#f87171' }}
                  >
                    {sample.baselineScore}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{sample.before}</p>
              </div>

              <div
                className="rounded-lg p-4"
                style={{
                  backgroundColor: 'rgba(52,211,153,0.06)',
                  border: '1px solid rgba(52,211,153,0.15)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-semibold">
                    With {agent.name}
                  </span>
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}
                  >
                    {sample.boostedScore}%
                  </span>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{sample.after}</p>
              </div>
            </div>

            <div className="flex items-center justify-between flex-wrap gap-4">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}
              >
                <ArrowRight size={12} />
                +{delta}% {sample.metric}
              </span>
              <button
                onClick={() => onHire(agent)}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors hover:brightness-110"
                style={{ backgroundColor: '#059669' }}
              >
                <UserPlus size={16} />
                Hire This Agent
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  )
}

/* ─── Comparison Panel ─── */
function ComparisonPanel({ agents, onHire, spring }) {
  const [a, b] = agents
  const winners = {}
  let aWins = 0
  let bWins = 0
  AXES.forEach((axis) => {
    if (a.scores[axis] > b.scores[axis]) {
      winners[axis] = a.id
      aWins++
    } else if (b.scores[axis] > a.scores[axis]) {
      winners[axis] = b.id
      bWins++
    } else {
      winners[axis] = 'tie'
    }
  })
  const overallWinner = aWins > bWins ? a : bWins > aWins ? b : null

  return (
    <motion.div
      className="mt-6 rounded-lg overflow-hidden"
      style={{ backgroundColor: '#f5f5f5' }}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={spring}
    >
      <div className="p-6">
        <h3 className="text-gray-900 font-semibold text-sm mb-5 flex items-center gap-2">
          <BarChart3 size={16} className="text-[#1B5E8F]" />
          Agent Comparison
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Agent A radar */}
          <div className="text-center">
            <p className="text-gray-900 font-semibold text-sm mb-2">{a.name}</p>
            <RadarChart scores={a.scores} color="#1B5E8F" />
          </div>
          {/* Agent B radar */}
          <div className="text-center">
            <p className="text-gray-900 font-semibold text-sm mb-2">{b.name}</p>
            <RadarChart scores={b.scores} color="#f59e0b" />
          </div>
        </div>

        {/* Score comparison table */}
        <div className="rounded-lg overflow-hidden mb-5" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                <th className="text-left text-gray-400 font-medium px-4 py-2.5">Metric</th>
                <th className="text-center text-gray-400 font-medium px-4 py-2.5">{a.name}</th>
                <th className="text-center text-gray-400 font-medium px-4 py-2.5">{b.name}</th>
                <th className="text-center text-gray-400 font-medium px-4 py-2.5">Winner</th>
              </tr>
            </thead>
            <tbody>
              {AXES.map((axis) => (
                <tr key={axis} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <td className="text-gray-700 font-medium px-4 py-2.5">{AXIS_LABELS[axis]}</td>
                  <td className="text-center px-4 py-2.5">
                    <span
                      className="font-mono font-bold"
                      style={{ color: winners[axis] === a.id ? '#34d399' : '#94a3b8' }}
                    >
                      {a.scores[axis]}
                    </span>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    <span
                      className="font-mono font-bold"
                      style={{ color: winners[axis] === b.id ? '#34d399' : '#94a3b8' }}
                    >
                      {b.scores[axis]}
                    </span>
                  </td>
                  <td className="text-center px-4 py-2.5">
                    {winners[axis] === 'tie' ? (
                      <span className="text-gray-500">Tie</span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'rgba(52,211,153,0.15)', color: '#34d399' }}
                      >
                        <CheckCircle size={10} />
                        {winners[axis] === a.id ? a.name.split(' ')[0] : b.name.split(' ')[0]}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {overallWinner && (
          <div className="flex items-center justify-end">
            <button
              onClick={() => onHire(overallWinner)}
              className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors hover:brightness-110"
              style={{ backgroundColor: '#059669' }}
            >
              <UserPlus size={16} />
              Hire {overallWinner.name}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ─── My Agents Tab ─── */
function MyAgentsTab({ hiredAgents, onRemoveAgent, spring, prefersReducedMotion }) {
  if (!hiredAgents || hiredAgents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(27,94,143,0.1)' }}
        >
          <Users size={28} style={{ color: '#1B5E8F' }} />
        </div>
        <p className="text-gray-400 text-sm text-center max-w-xs">
          Visit the marketplace to hire your first agent
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-2">
      {hiredAgents.map((agent, idx) => {
        const AgentIcon = ICON_MAP[agent.icon] || Star
        const iconColorMap = {
          Megaphone: '#f59e0b',
          Scale: '#8b5cf6',
          Code: '#3b82f6',
          Heart: '#ef4444',
          FileText: '#6366f1',
          Globe: '#0ea5e9',
          Shield: '#a855f7',
          Activity: '#ec4899',
        }
        const iconBg = iconColorMap[agent.icon] || '#1B5E8F'
        // Simulated performance data
        const projectsUsed = 12 + Math.floor(agent.id.charCodeAt(0) * 1.7) % 40
        const avgQualityLift = 8 + Math.floor(agent.id.charCodeAt(1) * 0.3) % 15

        return (
          <motion.div
            key={agent.id}
            className="rounded-lg p-5 flex flex-col"
            style={{ backgroundColor: '#f5f5f5' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              ...spring,
              delay: prefersReducedMotion ? 0 : idx * 0.07,
            }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${iconBg}20`, color: iconBg }}
              >
                <AgentIcon size={22} />
              </div>
              <div className="min-w-0">
                <h3 className="text-gray-900 font-semibold text-sm leading-tight truncate">
                  {agent.name}
                </h3>
                <span
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5"
                  style={{
                    backgroundColor: 'rgba(52,211,153,0.15)',
                    color: '#34d399',
                  }}
                >
                  Active
                </span>
              </div>
            </div>

            {/* Performance stats */}
            <div className="rounded-lg p-3 mb-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">
                Performance since hiring
              </p>
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-gray-900 font-bold text-lg font-mono">{projectsUsed}</span>
                  <span className="text-gray-400 text-[10px] block">Projects</span>
                </div>
                <div
                  className="w-px h-8"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                />
                <div>
                  <span className="text-emerald-600 font-bold text-lg font-mono">+{avgQualityLift}%</span>
                  <span className="text-gray-400 text-[10px] block">Avg Quality Lift</span>
                </div>
              </div>
            </div>

            <RadarChart scores={agent.scores} />

            <div className="mt-auto pt-3">
              <button
                onClick={() => onRemoveAgent(agent.id)}
                className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg text-red-600 transition-colors hover:bg-red-50"
                style={{ backgroundColor: 'rgba(239,68,68,0.08)' }}
              >
                <Trash2 size={14} />
                Remove
              </button>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

/* ─── Main Component ─── */
export default function AgentMarketplace({
  isOpen,
  onClose,
  onHireAgent,
  hiredAgents = [],
  onRemoveAgent,
}) {
  const prefersReducedMotion = useReducedMotion()
  const [testDriveAgent, setTestDriveAgent] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [activeTab, setActiveTab] = useState('browse') // browse | myagents
  const [compareSet, setCompareSet] = useState(new Set())

  const spring = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 20 }

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTestDriveAgent(null)
      setSearchQuery('')
      setActiveCategory('All')
      setActiveTab('browse')
      setCompareSet(new Set())
    }
  }, [isOpen])

  const filteredAgents = useMemo(() => {
    let agents = MARKETPLACE_AGENTS

    if (activeCategory !== 'All') {
      agents = agents.filter((a) => a.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      agents = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.specialty.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
      )
    }

    return agents
  }, [searchQuery, activeCategory])

  const comparedAgents = useMemo(() => {
    if (compareSet.size !== 2) return null
    const ids = Array.from(compareSet)
    return ids.map((id) => MARKETPLACE_AGENTS.find((a) => a.id === id)).filter(Boolean)
  }, [compareSet])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleTestDrive = (agent) => {
    setTestDriveAgent((prev) => (prev?.id === agent.id ? null : agent))
  }

  const handleHire = (agent) => {
    onHireAgent(agent)
    onClose()
  }

  const handleCompareToggle = useCallback((agentId) => {
    setCompareSet((prev) => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else if (next.size < 2) {
        next.add(agentId)
      }
      return next
    })
  }, [])

  const IconForAgent = (iconName) => ICON_MAP[iconName] || Star

  const iconColorMap = {
    Megaphone: '#f59e0b',
    Scale: '#8b5cf6',
    Code: '#3b82f6',
    Heart: '#ef4444',
    FileText: '#6366f1',
    Globe: '#0ea5e9',
    Shield: '#a855f7',
    Activity: '#ec4899',
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="relative flex flex-col w-[90vw] h-[90vh] rounded-lg overflow-hidden"
            style={{ backgroundColor: '#ffffff', fontFamily: 'Inter, sans-serif' }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── Header ── */}
            <div className="px-8 pt-8 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                    Agent Marketplace
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Hire specialized agents to enhance your output quality
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-black/5 transition-colors"
                  aria-label="Close marketplace"
                >
                  <X size={20} />
                </button>
              </div>

              {/* ── Search bar ── */}
              <div className="relative mb-4">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search agents by name, specialty, or description..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-shadow"
                  style={{
                    backgroundColor: '#f5f5f5',
                    focusRingColor: '#1B5E8F',
                  }}
                  onFocus={(e) => (e.target.style.boxShadow = '0 0 0 2px #1B5E8F')}
                  onBlur={(e) => (e.target.style.boxShadow = 'none')}
                />
              </div>

              {/* ── Tabs ── */}
              <div className="flex items-center gap-1 mb-4">
                {[
                  { key: 'browse', label: 'Browse Agents' },
                  { key: 'myagents', label: `My Agents${hiredAgents.length > 0 ? ` (${hiredAgents.length})` : ''}` },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    style={{
                      backgroundColor:
                        activeTab === tab.key ? '#1B5E8F' : 'transparent',
                      color: activeTab === tab.key ? '#fff' : '#94a3b8',
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Category pills (browse tab only) ── */}
              {activeTab === 'browse' && (
                <div className="flex items-center gap-2 flex-wrap">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={{
                        backgroundColor:
                          activeCategory === cat
                            ? 'rgba(27,94,143,0.2)'
                            : 'rgba(255,255,255,0.06)',
                        color: activeCategory === cat ? '#1B5E8F' : '#94a3b8',
                        border:
                          activeCategory === cat
                            ? '1px solid rgba(27,94,143,0.3)'
                            : '1px solid transparent',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {activeTab === 'browse' ? (
                <>
                  {/* Agent Grid */}
                  {filteredAgents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                      <Search size={32} className="text-gray-600" />
                      <p className="text-gray-400 text-sm">No agents match your search</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5 mt-2">
                      {filteredAgents.map((agent, idx) => {
                        const AgentIcon = IconForAgent(agent.icon)
                        const iconBg = iconColorMap[agent.icon] || '#1B5E8F'
                        const isComparing = compareSet.has(agent.id)
                        const compareDisabled = !isComparing && compareSet.size >= 2

                        return (
                          <motion.div
                            key={agent.id}
                            className="rounded-lg p-5 flex flex-col"
                            style={{
                              backgroundColor: '#f5f5f5',
                              border: isComparing
                                ? '1px solid rgba(27,94,143,0.4)'
                                : '1px solid transparent',
                            }}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              ...spring,
                              delay: prefersReducedMotion ? 0 : idx * 0.05,
                            }}
                          >
                            {/* Compare checkbox */}
                            <div className="flex items-center justify-between mb-2">
                              <label
                                className="flex items-center gap-1.5 cursor-pointer select-none"
                                style={{ opacity: compareDisabled ? 0.4 : 1 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isComparing}
                                  onChange={() => handleCompareToggle(agent.id)}
                                  disabled={compareDisabled}
                                  className="w-3.5 h-3.5 rounded accent-[#1B5E8F]"
                                />
                                <span className="text-[10px] text-gray-500 font-medium">
                                  Compare
                                </span>
                              </label>
                              {/* Star rating */}
                              <div className="flex items-center gap-1">
                                <Star size={11} fill="#f59e0b" stroke="#f59e0b" />
                                <span
                                  className="text-[11px] font-semibold"
                                  style={{ color: '#f59e0b' }}
                                >
                                  {agent.rating}
                                </span>
                              </div>
                            </div>

                            {/* Icon + Name */}
                            <div className="flex items-center gap-3 mb-3">
                              <div
                                className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                                style={{ backgroundColor: `${iconBg}20`, color: iconBg }}
                              >
                                <AgentIcon size={22} />
                              </div>
                              <div className="min-w-0">
                                <h3 className="text-gray-900 font-semibold text-sm leading-tight truncate">
                                  {agent.name}
                                </h3>
                                <span
                                  className="text-[11px] font-medium px-2 py-0.5 rounded-full inline-block mt-0.5"
                                  style={{
                                    backgroundColor: 'rgba(27,94,143,0.15)',
                                    color: '#1B5E8F',
                                  }}
                                >
                                  {agent.specialty}
                                </span>
                              </div>
                            </div>

                            {/* Description */}
                            <p className="text-xs text-gray-400 leading-relaxed mb-2">
                              {agent.description}
                            </p>

                            {/* Social proof */}
                            <div className="flex items-center gap-1.5 mb-3">
                              <Users size={11} className="text-gray-500" />
                              <span className="text-[10px] text-gray-500">
                                Used by {agent.usedBy} organizations
                              </span>
                            </div>

                            {/* Radar Chart */}
                            <div className="mb-3">
                              <RadarChart scores={agent.scores} />
                            </div>

                            {/* Resume badges */}
                            <div className="flex flex-wrap gap-1.5 mb-4">
                              {agent.badges.map((badge) => (
                                <span
                                  key={badge}
                                  className="text-[10px] font-medium px-2 py-0.5 rounded-full text-gray-700"
                                  style={{
                                    backgroundColor: 'rgba(255,255,255,0.06)',
                                    fontFamily: "'JetBrains Mono', monospace",
                                  }}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>

                            {/* Action buttons */}
                            <div className="mt-auto flex gap-2">
                              <button
                                onClick={() => handleTestDrive(agent)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg text-white transition-colors"
                                style={{
                                  backgroundColor:
                                    testDriveAgent?.id === agent.id
                                      ? '#164D75'
                                      : '#1B5E8F',
                                }}
                              >
                                <Zap size={14} />
                                Test Drive
                              </button>
                              <button
                                onClick={() => handleHire(agent)}
                                className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg text-white transition-colors hover:brightness-110"
                                style={{ backgroundColor: '#059669' }}
                              >
                                <UserPlus size={14} />
                                Hire
                              </button>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}

                  {/* ── Test Drive Panel ── */}
                  <AnimatePresence>
                    {testDriveAgent && (
                      <TestDrivePanel
                        agent={testDriveAgent}
                        onHire={handleHire}
                        spring={spring}
                        prefersReducedMotion={prefersReducedMotion}
                      />
                    )}
                  </AnimatePresence>

                  {/* ── Comparison Panel ── */}
                  <AnimatePresence>
                    {comparedAgents && comparedAgents.length === 2 && (
                      <ComparisonPanel
                        agents={comparedAgents}
                        onHire={handleHire}
                        spring={spring}
                      />
                    )}
                  </AnimatePresence>
                </>
              ) : (
                /* ── My Agents tab ── */
                <MyAgentsTab
                  hiredAgents={hiredAgents}
                  onRemoveAgent={onRemoveAgent}
                  spring={spring}
                  prefersReducedMotion={prefersReducedMotion}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
