import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Building2,
  Shield,
  Search,
  Download,
  Power,
  TrendingUp,
  BookOpen,
  Sliders,
  GitCompare,
  Zap,
} from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

/* ─── Icon map (agent.icon string → component) ─── */
const ICON_MAP = {
  Building2,
  Shield,
}

function resolveIcon(iconName) {
  return ICON_MAP[iconName] || Building2
}

/* ─── Mock knowledge entries ─── */
const KNOWLEDGE_ENTRIES = [
  { en: 'Revenue', ja: '収益', source: 'Q2 Earnings Report', domain: 'Financial', date: 'Dec 10, 2025' },
  { en: 'Net income', ja: '純利益', source: 'Annual Report 2024', domain: 'Financial', date: 'Dec 8, 2025' },
  { en: 'Stakeholder', ja: 'ステークホルダー', source: 'IR Presentation', domain: 'Brand Voice', date: 'Dec 5, 2025' },
  { en: 'Operating margin', ja: '営業利益率', source: 'Q3 Financial Summary', domain: 'Financial', date: 'Nov 28, 2025' },
  { en: 'Year-over-year', ja: '前年同期比', source: 'Quarterly Review', domain: 'Financial', date: 'Nov 22, 2025' },
  { en: 'Our company', ja: '当社', source: 'Brand Guidelines v3', domain: 'Brand Voice', date: 'Nov 15, 2025' },
  { en: 'Fiscal year', ja: '会計年度', source: 'Annual Report 2024', domain: 'Financial', date: 'Nov 10, 2025' },
  { en: 'Compliance', ja: 'コンプライアンス', source: 'Regulatory Filing', domain: 'Regulatory', date: 'Oct 30, 2025' },
  { en: 'Bullet points → Full sentences', ja: '体言止め禁止', source: 'Style Guide', domain: 'Formatting', date: 'Oct 25, 2025' },
  { en: 'Consolidated basis', ja: '連結ベース', source: 'Q2 Earnings Report', domain: 'Financial', date: 'Oct 20, 2025' },
  { en: 'Guidance', ja: '業績予想', source: 'IR Presentation', domain: 'Financial', date: 'Oct 15, 2025' },
  { en: 'Board of Directors', ja: '取締役会', source: 'Corporate Governance', domain: 'Regulatory', date: 'Oct 10, 2025' },
]

/* ─── Divergence table data ─── */
const DIVERGENCE_ROWS = [
  { category: 'Currency', baseline: '"$X million"', override: '"¥X百万"', impact: '+4% accuracy' },
  { category: 'Self-reference', baseline: '"We/Our"', override: '"当社"', impact: '+2% tone score' },
  { category: 'Fiscal calendar', baseline: '"Q1/Q2"', override: '"第1/第2四半期"', impact: '+3% cultural' },
  { category: 'Revenue terms', baseline: 'Generic', override: 'ASBJ-specific', impact: '+5% regulatory' },
  { category: 'Formality', baseline: 'Neutral', override: 'Formal keigo', impact: '+6% brand alignment' },
  { category: 'Number format', baseline: 'Western', override: 'Japanese denomination', impact: '+2% accuracy' },
]

/* ─── Brand terms that are never translated ─── */
const PRESERVED_TERMS = ['Meridian Capital', 'arbitr', 'ASBJ', 'J-GAAP', 'TOPIX']

/* ─── Accuracy chart data ─── */
const ACCURACY_DATA = [94, 95, 96, 95, 97, 97, 98, 97]

/* ─── Domain badge colors ─── */
const DOMAIN_COLORS = {
  Financial: { bg: 'rgba(0,136,255,0.15)', text: '#0088FF' },
  'Brand Voice': { bg: 'rgba(163,141,255,0.15)', text: '#A38DFF' },
  Regulatory: { bg: 'rgba(255,176,0,0.15)', text: '#FFBD59' },
  Formatting: { bg: 'rgba(0,184,135,0.15)', text: '#00B887' },
}

/* ─── Simple SVG line chart ─── */
function AccuracyChart({ data }) {
  const width = 360
  const height = 100
  const padding = { top: 10, right: 20, bottom: 20, left: 36 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const minVal = Math.min(...data) - 1
  const maxVal = Math.max(...data) + 1

  const points = data.map((val, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW
    const y = padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH
    return { x, y, val }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaPath = `${linePath} L${points[points.length - 1].x},${padding.top + chartH} L${points[0].x},${padding.top + chartH} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px]">
      {/* Y-axis labels */}
      {[minVal, Math.round((minVal + maxVal) / 2), maxVal].map((v) => {
        const y = padding.top + chartH - ((v - minVal) / (maxVal - minVal)) * chartH
        return (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="rgba(0,0,0,0.06)"
              strokeDasharray="3,3"
            />
            <text
              x={padding.left - 6}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              className="fill-gray-500"
              style={{ fontSize: '9px', fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {v}%
            </text>
          </g>
        )
      })}

      {/* Area fill */}
      <path d={areaPath} fill="rgba(61,22,250,0.1)" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#3D16FA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#3D16FA" stroke="#ffffff" strokeWidth="1.5" />
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={height - 4}
          textAnchor="middle"
          className="fill-gray-500"
          style={{ fontSize: '8px', fontFamily: "'IBM Plex Mono', monospace" }}
        >
          P{i + 1}
        </text>
      ))}
    </svg>
  )
}

/* ─── Stat Card ─── */
function StatCard({ label, value, icon: Icon }) {
  return (
    <div className="flex-1 min-w-[140px] rounded-lg p-4" style={{ backgroundColor: '#EDEFFB' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} className="text-gray-500" />
        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span
        className="text-xl font-bold text-gray-900"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {value}
      </span>
    </div>
  )
}

/* ─── Main Component ─── */
export default function AgentProfile({ isOpen, onClose, agent, onContinueTraining }) {
  const prefersReducedMotion = useReducedMotion()
  const [knowledgeSearch, setKnowledgeSearch] = useState('')

  const spring = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 20 }

  const filteredKnowledge = useMemo(() => {
    if (!knowledgeSearch.trim()) return KNOWLEDGE_ENTRIES
    const q = knowledgeSearch.toLowerCase()
    return KNOWLEDGE_ENTRIES.filter(
      (entry) =>
        entry.en.toLowerCase().includes(q) ||
        entry.ja.includes(q) ||
        entry.source.toLowerCase().includes(q) ||
        entry.domain.toLowerCase().includes(q)
    )
  }, [knowledgeSearch])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!agent) return null

  const AgentIcon = resolveIcon(agent.icon)
  const isActive = agent.status === 'active'

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          style={{ backdropFilter: 'blur(4px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="relative flex flex-col w-[90vw] max-w-[900px] h-[90vh] rounded-lg overflow-hidden"
            style={{ backgroundColor: '#ffffff', fontFamily: "'IBM Plex Sans', sans-serif" }}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={spring}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── 1. Header ── */}
            <div className="flex items-start justify-between px-8 pt-8 pb-5 border-b border-black/[0.12]">
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'rgba(61,22,250,0.15)', color: '#3D16FA' }}
                >
                  <AgentIcon size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">{agent.name}</h2>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'rgba(61,22,250,0.15)',
                        color: '#3D16FA',
                        fontFamily: "'IBM Plex Mono', monospace",
                      }}
                    >
                      {agent.version || 'v1.0'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      <span
                        className="w-2 h-2 rounded-full inline-block"
                        style={{ backgroundColor: isActive ? '#00B887' : '#FFBD59' }}
                      />
                      {isActive ? 'Active' : 'Training'}
                    </span>
                    <span className="text-xs text-gray-500">Created: Oct 15, 2025</span>
                    <span className="text-xs text-gray-500">
                      Source: 42 golden records from Meridian Capital
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-black/[0.06] transition-colors"
                aria-label="Close agent profile"
              >
                <X size={20} />
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-8 pb-8">
              {/* ── 2. Performance Metrics ── */}
              <section className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-[#3D16FA]" />
                  Performance Metrics
                </h3>
                <div className="flex gap-3 flex-wrap">
                  <StatCard label="Projects Deployed" value="24" icon={Zap} />
                  <StatCard label="Segments Processed" value="12,847" icon={BookOpen} />
                  <StatCard label="Accuracy" value="97.2%" icon={TrendingUp} />
                  <StatCard label="Avg Quality Lift" value="+3.4 pts" icon={TrendingUp} />
                </div>

                <div className="mt-5 rounded-lg p-4" style={{ backgroundColor: '#EDEFFB' }}>
                  <span className="text-[11px] text-gray-400 uppercase tracking-wider font-medium block mb-3">
                    Accuracy over last 8 projects
                  </span>
                  <AccuracyChart data={ACCURACY_DATA} />
                </div>
              </section>

              {/* ── 3. Knowledge Inventory ── */}
              <section className="mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <BookOpen size={14} className="text-[#3D16FA]" />
                    Learned Knowledge
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-1"
                      style={{ backgroundColor: 'rgba(61,22,250,0.15)', color: '#3D16FA' }}
                    >
                      {filteredKnowledge.length}
                    </span>
                  </h3>
                </div>

                {/* Search */}
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search terms, sources, or domains..."
                    value={knowledgeSearch}
                    onChange={(e) => setKnowledgeSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-lg text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-1 focus:ring-[#3D16FA]"
                    style={{ backgroundColor: '#EDEFFB', border: '1px solid rgba(0,0,0,0.06)' }}
                  />
                </div>

                {/* Scrollable list */}
                <div
                  className="max-h-[240px] overflow-y-auto rounded-lg"
                  style={{ backgroundColor: '#EDEFFB' }}
                >
                  {filteredKnowledge.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">No entries match your search.</div>
                  ) : (
                    filteredKnowledge.map((entry, i) => {
                      const domainColor = DOMAIN_COLORS[entry.domain] || DOMAIN_COLORS.Financial
                      return (
                        <div
                          key={i}
                          className="flex items-center justify-between px-4 py-3"
                          style={{
                            borderBottom:
                              i < filteredKnowledge.length - 1
                                ? '1px solid rgba(0,0,0,0.04)'
                                : 'none',
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-sm text-gray-700 truncate">{entry.en}</span>
                            <span className="text-gray-600 text-xs shrink-0">&rarr;</span>
                            <span className="text-sm text-gray-900 font-medium truncate">{entry.ja}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className="text-[10px] text-gray-500 hidden sm:inline">{entry.source}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: domainColor.bg, color: domainColor.text }}
                            >
                              {entry.domain}
                            </span>
                            <span
                              className="text-[10px] text-gray-500 hidden md:inline"
                              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                            >
                              {entry.date}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </section>

              {/* ── 4. Tone Configuration ── */}
              <section className="mt-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sliders size={14} className="text-[#3D16FA]" />
                  Voice & Style Profile
                </h3>

                <div className="rounded-lg p-5" style={{ backgroundColor: '#EDEFFB' }}>
                  <div className="space-y-5">
                    {/* Register */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Register</span>
                        <span className="text-xs text-gray-900 font-medium">Formal (丁寧語)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500">Casual</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                          <div className="h-full rounded-full" style={{ width: '85%', backgroundColor: '#3D16FA' }} />
                        </div>
                        <span className="text-[10px] text-gray-500">Formal</span>
                      </div>
                    </div>

                    {/* Self-reference */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">Self-reference</span>
                      <div className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg text-white"
                          style={{ backgroundColor: 'rgba(61,22,250,0.2)' }}
                        >
                          当社
                        </span>
                        <span className="text-[10px] text-gray-500">(not 私たち)</span>
                      </div>
                    </div>

                    {/* Formality level */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-400">Formality level</span>
                        <span
                          className="text-xs text-gray-900 font-bold"
                          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          92/100
                        </span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: '92%', backgroundColor: '#3D16FA' }} />
                      </div>
                    </div>

                    {/* Brand terms preserved */}
                    <div>
                      <span className="text-xs text-gray-400 block mb-2">Brand terms preserved (never translated)</span>
                      <div className="flex flex-wrap gap-2">
                        {PRESERVED_TERMS.map((term) => (
                          <span
                            key={term}
                            className="text-[11px] font-medium px-2.5 py-1 rounded-lg text-gray-800"
                            style={{
                              backgroundColor: 'rgba(0,0,0,0.06)',
                              fontFamily: "'IBM Plex Mono', monospace",
                            }}
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-500 mt-5 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                    Based on analysis of 42 source documents
                  </p>
                </div>
              </section>

              {/* ── 5. Divergence Report ── */}
              <section className="mt-8">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <GitCompare size={14} className="text-[#3D16FA]" />
                  How this agent differs from baseline
                </h3>

                <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#EDEFFB' }}>
                  <table className="w-full text-left">
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        {['Category', 'Baseline Behavior', 'Digital Twin Override', 'Impact'].map((h) => (
                          <th
                            key={h}
                            className="px-4 py-3 text-[10px] text-gray-500 uppercase tracking-wider font-semibold"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DIVERGENCE_ROWS.map((row, i) => (
                        <tr
                          key={row.category}
                          style={{
                            borderBottom:
                              i < DIVERGENCE_ROWS.length - 1
                                ? '1px solid rgba(0,0,0,0.04)'
                                : 'none',
                          }}
                        >
                          <td className="px-4 py-3 text-xs text-gray-700 font-medium">{row.category}</td>
                          <td
                            className="px-4 py-3 text-xs text-gray-500"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {row.baseline}
                          </td>
                          <td
                            className="px-4 py-3 text-xs text-gray-900 font-medium"
                            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                          >
                            {row.override}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] font-semibold text-emerald-600">
                              {row.impact}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* ── 6. Footer Actions ── */}
            <div
              className="flex items-center justify-between px-8 py-5 border-t border-black/[0.12]"
              style={{ backgroundColor: '#ffffff' }}
            >
              <button
                onClick={() => onContinueTraining?.(agent)}
                className="flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-lg text-white transition-colors hover:brightness-110"
                style={{ backgroundColor: '#3D16FA' }}
              >
                <TrendingUp size={16} />
                Continue Training
              </button>

              {/* Export and Deactivate removed — not yet available */}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
