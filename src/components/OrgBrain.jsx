import { useState, useCallback, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, TrendingUp, ArrowLeft, Search, Plus, X, Archive, Bot, Sparkles } from 'lucide-react'
import useReducedMotion from '../hooks/useReducedMotion'

const SPRING = { type: 'spring', stiffness: 300, damping: 20 }

/* ---------- Data ---------- */

const STAT_PILLS = [
  { label: 'Knowledge Entries', value: '1,247' },
  { label: 'Patterns', value: '342' },
  { label: 'Segments', value: '1,893' },
  { label: 'Saved', value: '47h' },
]

const DOMAIN_NODES = [
  { id: 'financial', label: 'Financial (J-GAAP)', entries: 412, cx: 180, cy: 150, r: 38, color: '#f59e0b' },
  { id: 'regulatory', label: 'Regulatory (TSE)', entries: 287, cx: 320, cy: 80, r: 30, color: '#3b82f6' },
  { id: 'brand', label: 'Brand Voice', entries: 198, cx: 460, cy: 70, r: 26, color: '#8b5cf6' },
  { id: 'currency', label: 'Currency Patterns', entries: 156, cx: 310, cy: 230, r: 24, color: '#10b981' },
  { id: 'cultural', label: 'Cultural Adaptation', entries: 112, cx: 470, cy: 220, r: 22, color: '#f472b6' },
  { id: 'legal', label: 'Legal Compliance', entries: 82, cx: 140, cy: 260, r: 20, color: '#6b7280' },
]

const DOMAIN_EDGES = [
  { from: 'financial', to: 'regulatory' },
  { from: 'financial', to: 'currency' },
  { from: 'financial', to: 'legal' },
  { from: 'regulatory', to: 'legal', dashed: true },
  { from: 'brand', to: 'cultural' },
  { from: 'currency', to: 'cultural', dashed: true },
]

const GROWTH_DATA = [820, 845, 878, 912, 948, 985, 1020, 1065, 1108, 1152, 1198, 1247]
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const DOMAIN_MODELS = [
  { id: 'JP-FIN-3', name: 'Japanese Financial', version: 'v3.2', entries: 412, trained: 'Dec 10', accuracy: 96, color: '#f59e0b' },
  { id: 'EU-REG-5', name: 'EU Regulatory', version: 'v5.1', entries: 287, trained: 'Dec 8', accuracy: 94, color: '#3b82f6' },
  { id: 'ACME-DT-1', name: 'ACME Brand Voice', version: 'v1.8', entries: 198, trained: 'Dec 12', accuracy: 97, color: '#8b5cf6' },
  { id: 'CN-FIN-2', name: 'Chinese Financial', version: 'v2.4', entries: 156, trained: 'Dec 5', accuracy: 93, color: '#10b981' },
  { id: 'BV-SENT-1', name: 'Sentiment Analysis', version: 'v1.3', entries: 112, trained: 'Dec 11', accuracy: 91, color: '#f472b6' },
  { id: 'JP-LEG-1', name: 'Japanese Legal', version: 'v1.1', entries: 82, trained: 'Nov 28', accuracy: 89, color: '#6b7280' },
]

const TIMELINE_EVENTS = [
  { date: 'Dec 12', description: '23 terms added from Q3 Earnings Report (JA)', color: '#f59e0b' },
  { date: 'Dec 10', description: 'JP-FIN-3 retrained with 3 new J-GAAP entries', color: '#3b82f6' },
  { date: 'Dec 8', description: '12 patterns captured from Product Launch (DE)', color: '#8b5cf6' },
  { date: 'Dec 5', description: 'CN-FIN-2 updated with CSRC regulatory terms', color: '#10b981' },
  { date: 'Nov 28', description: 'Brand voice model refined from employee handbook', color: '#f472b6' },
]

/* ---------- Sage Walkthrough Messages ---------- */

const WALKTHROUGH_MESSAGES = [
  {
    id: 'intro',
    section: 'Overview',
    text: "You're on Org Brain — Step 7 of 7. This is where all of Meridian Capital's translation and localization intelligence lives and grows. Think of it as your organization's translation memory, compliance rulebook, and style guide — all rolled into one, and getting smarter with every project.",
  },
  {
    id: 'stats',
    section: 'Summary Stats',
    text: "At a glance: **1,247 Knowledge Entries** are the specific terms, rules, and patterns the platform has learned. **342 Patterns** are recurring structures it can now anticipate. **1,893 Segments** have been processed to date. And those **47 hours saved**? That's real human effort the platform has absorbed — time your team didn't spend re-translating, re-reviewing, or re-flagging the same issues.",
  },
  {
    id: 'graph',
    section: 'Knowledge Graph',
    text: "The Knowledge Graph maps how Meridian Capital's six intelligence domains relate to each other. **Financial (J-GAAP)** sits at the center with 412 entries — unsurprisingly, given your core business. Notice how it connects to nearly every other domain: financial language shapes regulatory language, brand voice, and even cultural adaptation. Click any node to explore the entries inside it.",
  },
  {
    id: 'growth',
    section: 'Growth Chart',
    text: "This chart shows the Org Brain getting smarter over time. Growth was steady through the first half of the year, then accelerated sharply from August onward. That hockey-stick curve is the compounding effect of intelligence — each project you run feeds new knowledge back in. The longer you use the platform, the more it knows about your organization specifically.",
  },
  {
    id: 'heatmap',
    section: 'Coverage Heatmap',
    text: "The Coverage Heatmap tells you how well each AI model covers each language you work in. **Green cells (>85%)** are strong — JP-FIN-3 hits 97% for Japanese. **Orange cells (70–85%)** are solid but improvable. **Red cells** are gaps: ACME-DT-1 only achieves 58% coverage for Chinese, and BV-SENT-1 is at 64% for Japanese. These gaps are your training priorities.",
  },
  {
    id: 'models',
    section: 'Domain Models',
    text: "These six models are the specialized AI engines trained specifically on Meridian Capital's data — not generic language models. Each card shows the version (how many times it's been refined), when it was last trained, and its accuracy. All models are above 89%. **ACME Brand Voice (v1.8)** is the newest addition and already hits 97% — a strong signal that your brand voice data is high-quality.",
  },
  {
    id: 'timeline',
    section: 'Learning Events',
    text: "The Recent Learning Events feed is the pulse of the Org Brain. Every entry represents the system absorbing something new from a real project — 23 financial terms from Q3 Earnings, 12 patterns from a product launch in Germany, regulatory updates from CSRC. This isn't a static database. It's actively learning every time you process a document.",
  },
  {
    id: 'closing',
    section: 'The Bottom Line',
    text: "Org Brain is what makes Not Verify a platform that **compounds in value**. Unlike a one-off translation tool, every project you run makes the next one faster, more accurate, and less work for your team. All of this institutional knowledge is protected with **SOC 2 Type II** compliance, **AES-256** encryption, and in-region data storage.",
  },
]

/* ---------- Mock knowledge entries per domain ---------- */

const MOCK_ENTRIES = {
  financial: [
    { id: 1, term: 'Keiretsu', translation: '系列', source: 'Q3 Earnings', date: 'Dec 12' },
    { id: 2, term: 'Zaibatsu', translation: '財閥', source: 'Annual Report', date: 'Dec 10' },
    { id: 3, term: 'Genka Shokyaku', translation: '減価償却', source: 'J-GAAP Manual', date: 'Dec 8' },
    { id: 4, term: 'Rieki Jyunjyun Kin', translation: '利益準備金', source: 'Audit Filing', date: 'Dec 5' },
    { id: 5, term: 'Kabunushi Shihon', translation: '株主資本', source: 'Balance Sheet', date: 'Dec 3' },
    { id: 6, term: 'Urikake Kin', translation: '売掛金', source: 'Revenue Report', date: 'Nov 28' },
  ],
  regulatory: [
    { id: 1, term: 'Jyoujou Kisoku', translation: '上場規則', source: 'TSE Handbook', date: 'Dec 8' },
    { id: 2, term: 'Kaiji Gimu', translation: '開示義務', source: 'FSA Circular', date: 'Dec 6' },
    { id: 3, term: 'Naibu Torikeshiki', translation: '内部統制', source: 'SOX-J Guide', date: 'Dec 4' },
    { id: 4, term: 'Tekiji Kaiji', translation: '適時開示', source: 'TSE Rulebook', date: 'Dec 1' },
    { id: 5, term: 'Kantoku Shishin', translation: '監督指針', source: 'JFSA Policy', date: 'Nov 29' },
  ],
  brand: [
    { id: 1, term: 'Tone of Voice', translation: 'Tonalitat', source: 'Brand Guide', date: 'Dec 12' },
    { id: 2, term: 'Empowerment', translation: 'Befohigung', source: 'Messaging Doc', date: 'Dec 9' },
    { id: 3, term: 'Trust Signal', translation: 'Vertrauenssignal', source: 'UX Copy', date: 'Dec 7' },
    { id: 4, term: 'Innovation-Led', translation: 'Innovationsgetrieben', source: 'Tagline', date: 'Dec 4' },
    { id: 5, term: 'Client-Centric', translation: 'Kundenorientiert', source: 'Mission Stmt', date: 'Dec 2' },
    { id: 6, term: 'Seamless', translation: 'Nahtlos', source: 'Product Brief', date: 'Nov 30' },
    { id: 7, term: 'Scalable Growth', translation: 'Skalierbares Wachstum', source: 'Investor Deck', date: 'Nov 28' },
  ],
  currency: [
    { id: 1, term: 'Kawase Soneki', translation: '為替損益', source: 'FX Report', date: 'Dec 5' },
    { id: 2, term: 'Hedging Contract', translation: 'ヘッジ契約', source: 'Treasury Memo', date: 'Dec 3' },
    { id: 3, term: 'Spot Rate', translation: '直物レート', source: 'Market Feed', date: 'Dec 1' },
    { id: 4, term: 'Forward Premium', translation: '先物プレミアム', source: 'Risk Model', date: 'Nov 28' },
    { id: 5, term: 'Cross-Currency Basis', translation: 'クロスカレンシーベーシス', source: 'Swap Desk', date: 'Nov 26' },
  ],
  cultural: [
    { id: 1, term: 'Keigo', translation: '敬語', source: 'Style Guide', date: 'Dec 11' },
    { id: 2, term: 'Aisatsu', translation: '挨拶', source: 'Onboarding', date: 'Dec 8' },
    { id: 3, term: 'Nemawashi', translation: '根回し', source: 'Process Doc', date: 'Dec 5' },
    { id: 4, term: 'Honne/Tatemae', translation: '本音/建前', source: 'Comms Guide', date: 'Dec 2' },
    { id: 5, term: 'Meishi Koukan', translation: '名刺交換', source: 'Protocol Doc', date: 'Nov 29' },
  ],
  legal: [
    { id: 1, term: 'Yakkan', translation: '約款', source: 'Legal Template', date: 'Nov 28' },
    { id: 2, term: 'Keiyaku Jyoukou', translation: '契約条項', source: 'Contract Std', date: 'Nov 25' },
    { id: 3, term: 'Songai Baishou', translation: '損害賠償', source: 'Liability Memo', date: 'Nov 22' },
    { id: 4, term: 'Chuusai', translation: '仲裁', source: 'Dispute Proc', date: 'Nov 20' },
    { id: 5, term: 'Junkyohou', translation: '準拠法', source: 'Governance Doc', date: 'Nov 18' },
    { id: 6, term: 'Himitsu Hoji', translation: '秘密保持', source: 'NDA Template', date: 'Nov 15' },
    { id: 7, term: 'Tekihou Seimei', translation: '適法声明', source: 'Compliance', date: 'Nov 12' },
    { id: 8, term: 'Kenri Houji', translation: '権利放棄', source: 'Waiver Doc', date: 'Nov 10' },
  ],
}

/* ---------- Coverage Heatmap Data ---------- */

const HEATMAP_MODELS = ['JP-FIN-3', 'EU-REG-5', 'ACME-DT-1', 'CN-FIN-2', 'BV-SENT-1', 'JP-LEG-1']
const HEATMAP_LOCALES = ['Japanese', 'German', 'Chinese']

const HEATMAP_DATA = {
  Japanese: { 'JP-FIN-3': 97, 'EU-REG-5': 78, 'ACME-DT-1': 82, 'CN-FIN-2': 71, 'BV-SENT-1': 64, 'JP-LEG-1': 94 },
  German:   { 'JP-FIN-3': 68, 'EU-REG-5': 96, 'ACME-DT-1': 91, 'CN-FIN-2': 59, 'BV-SENT-1': 87, 'JP-LEG-1': 72 },
  Chinese:  { 'JP-FIN-3': 74, 'EU-REG-5': 65, 'ACME-DT-1': 58, 'CN-FIN-2': 95, 'BV-SENT-1': 76, 'JP-LEG-1': 61 },
}

function heatmapColor(pct) {
  if (pct >= 85) return { bg: 'bg-emerald-500/80', text: 'text-emerald-100' }
  if (pct >= 70) return { bg: 'bg-amber-500/70', text: 'text-amber-100' }
  return { bg: 'bg-red-500/70', text: 'text-red-100' }
}

/* ---------- Helpers ---------- */

function getNodeById(id) {
  return DOMAIN_NODES.find((n) => n.id === id)
}

/* ---------- Knowledge Graph ---------- */

function KnowledgeGraph({ prefersReducedMotion, onNodeClick, selectedNodeId }) {
  const dur = prefersReducedMotion ? 0 : undefined

  return (
    <div className="w-full overflow-hidden rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4">
      <svg viewBox="0 0 600 300" className="w-full" style={{ maxHeight: 300 }}>
        <defs>
          {DOMAIN_NODES.map((node) => (
            <radialGradient key={node.id} id={`glow-${node.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={node.color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={node.color} stopOpacity="0" />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {DOMAIN_EDGES.map((edge, i) => {
          const from = getNodeById(edge.from)
          const to = getNodeById(edge.to)
          return (
            <motion.line
              key={`${edge.from}-${edge.to}`}
              x1={from.cx}
              y1={from.cy}
              x2={to.cx}
              y2={to.cy}
              stroke="rgba(0,0,0,0.1)"
              strokeWidth={1.5}
              strokeDasharray={edge.dashed ? '6 4' : undefined}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: dur === 0 ? 0 : 0.3 + i * 0.08, duration: dur ?? 0.6 }}
            />
          )
        })}

        {/* Nodes */}
        {DOMAIN_NODES.map((node, i) => (
          <motion.g
            key={node.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: dur === 0 ? 0 : 0.2 + i * 0.1,
              duration: dur ?? 0.5,
              ...SPRING,
            }}
            style={{ originX: `${node.cx}px`, originY: `${node.cy}px`, cursor: 'pointer' }}
            onClick={() => onNodeClick?.(node.id)}
          >
            {/* Glow */}
            <circle cx={node.cx} cy={node.cy} r={node.r * 1.8} fill={`url(#glow-${node.id})`} />
            {/* Selection ring */}
            {selectedNodeId === node.id && (
              <circle
                cx={node.cx}
                cy={node.cy}
                r={node.r + 6}
                fill="none"
                stroke="#5c7cfa"
                strokeWidth={2}
                strokeDasharray="4 3"
                opacity={0.7}
              />
            )}
            {/* Ring */}
            <circle
              cx={node.cx}
              cy={node.cy}
              r={node.r}
              fill={`${node.color}15`}
              stroke={node.color}
              strokeWidth={2}
              strokeOpacity={selectedNodeId === node.id ? 1 : 0.6}
            />
            {/* Label */}
            <text
              x={node.cx}
              y={node.cy - 4}
              textAnchor="middle"
              className="fill-gray-900 text-[9px] font-medium"
              style={{ fontFamily: 'Inter, sans-serif', pointerEvents: 'none' }}
            >
              {node.label}
            </text>
            {/* Entry count */}
            <text
              x={node.cx}
              y={node.cy + 10}
              textAnchor="middle"
              className="text-[8px]"
              style={{ fontFamily: "'JetBrains Mono', monospace", fill: node.color, pointerEvents: 'none' }}
            >
              {node.entries} entries
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  )
}

/* ---------- Node Detail Panel ---------- */

function NodeDetailPanel({ nodeId, prefersReducedMotion }) {
  const dur = prefersReducedMotion ? 0 : undefined
  const node = getNodeById(nodeId)
  const [searchQuery, setSearchQuery] = useState('')
  const [archivedIds, setArchivedIds] = useState(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [localEntries, setLocalEntries] = useState([])
  const [newEntry, setNewEntry] = useState({ term: '', translation: '', domain: nodeId })

  const baseEntries = MOCK_ENTRIES[nodeId] || []
  const allEntries = useMemo(() => [...baseEntries, ...localEntries], [baseEntries, localEntries])

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return allEntries
    const q = searchQuery.toLowerCase()
    return allEntries.filter(
      (e) =>
        e.term.toLowerCase().includes(q) ||
        e.translation.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
    )
  }, [allEntries, searchQuery])

  const toggleArchive = useCallback((entryId) => {
    setArchivedIds((prev) => {
      const next = new Set(prev)
      if (next.has(entryId)) next.delete(entryId)
      else next.add(entryId)
      return next
    })
  }, [])

  const handleSaveEntry = useCallback(() => {
    if (!newEntry.term.trim() || !newEntry.translation.trim()) return
    const entry = {
      id: Date.now(),
      term: newEntry.term.trim(),
      translation: newEntry.translation.trim(),
      source: 'Manual Entry',
      date: 'Today',
    }
    setLocalEntries((prev) => [entry, ...prev])
    setNewEntry({ term: '', translation: '', domain: nodeId })
    setShowAddForm(false)
  }, [newEntry, nodeId])

  if (!node) return null

  return (
    <motion.div
      className="mt-3 rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4"
      style={{ borderTopWidth: 3, borderTopColor: node.color }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: dur ?? 0.3, ...SPRING }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
            {node.label}
          </h3>
          <p className="text-[10px] font-['JetBrains_Mono'] text-gray-400 mt-0.5">
            {node.entries} entries
          </p>
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5c7cfa]/10 hover:bg-[#5c7cfa]/20 border border-[#5c7cfa]/20 text-[11px] font-medium text-[#5c7cfa] transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Entry
        </button>
      </div>

      {/* Add Entry Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            className="mb-3 p-3 rounded-lg bg-black/[0.02] border border-black/[0.12]"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: dur ?? 0.2 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Term"
                value={newEntry.term}
                onChange={(e) => setNewEntry((v) => ({ ...v, term: e.target.value }))}
                className="px-3 py-1.5 rounded-lg bg-[#ffffff] border border-black/[0.12] text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#5c7cfa]/40"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <input
                type="text"
                placeholder="Translation"
                value={newEntry.translation}
                onChange={(e) => setNewEntry((v) => ({ ...v, translation: e.target.value }))}
                className="px-3 py-1.5 rounded-lg bg-[#ffffff] border border-black/[0.12] text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#5c7cfa]/40"
                style={{ fontFamily: 'Inter, sans-serif' }}
              />
              <select
                value={newEntry.domain}
                onChange={(e) => setNewEntry((v) => ({ ...v, domain: e.target.value }))}
                className="px-3 py-1.5 rounded-lg bg-[#ffffff] border border-black/[0.12] text-xs text-gray-900 outline-none focus:border-[#5c7cfa]/40"
                style={{ fontFamily: 'Inter, sans-serif' }}
              >
                {DOMAIN_NODES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleSaveEntry}
                className="px-3 py-1.5 rounded-lg bg-[#5c7cfa] hover:bg-[#4c6ef5] text-xs font-medium text-white transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewEntry({ term: '', translation: '', domain: nodeId })
                }}
                className="px-3 py-1.5 rounded-lg bg-black/[0.03] hover:bg-black/[0.08] border border-black/[0.12] text-xs font-medium text-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-[#ffffff] border border-black/[0.12] text-xs text-gray-900 placeholder-gray-500 outline-none focus:border-[#5c7cfa]/40"
          style={{ fontFamily: 'Inter, sans-serif' }}
        />
      </div>

      {/* Entry List */}
      <div className="max-h-64 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {filteredEntries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">No entries found</p>
        )}
        {filteredEntries.map((entry) => {
          const isArchived = archivedIds.has(entry.id)
          return (
            <div
              key={entry.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg bg-black/[0.02] hover:bg-black/[0.04] border border-black/[0.06] transition-colors ${isArchived ? 'opacity-50' : ''}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium text-gray-900 ${isArchived ? 'line-through' : ''}`}
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {entry.term}
                  </span>
                  <span
                    className={`text-[11px] text-gray-500 ${isArchived ? 'line-through' : ''}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {entry.translation}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-400">{entry.source}</span>
                  <span className="text-[10px] text-gray-300">{entry.date}</span>
                </div>
              </div>
              <button
                onClick={() => toggleArchive(entry.id)}
                className={`ml-2 p-1.5 rounded-md transition-colors ${isArchived ? 'bg-amber-50 text-amber-600' : 'bg-black/[0.03] hover:bg-black/[0.08] text-gray-400 hover:text-gray-700'}`}
                aria-label={isArchived ? 'Unarchive' : 'Archive'}
              >
                <Archive className="w-3 h-3" />
              </button>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}

/* ---------- Coverage Heatmap ---------- */

function CoverageHeatmap({ prefersReducedMotion }) {
  const dur = prefersReducedMotion ? 0 : undefined

  return (
    <div className="w-full rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
        Coverage Heatmap
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-gray-400 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                Locale
              </th>
              {HEATMAP_MODELS.map((model) => (
                <th key={model} className="px-1.5 py-2 text-center text-gray-400 font-medium whitespace-nowrap">
                  {model}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HEATMAP_LOCALES.map((locale, li) => (
              <motion.tr
                key={locale}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: dur === 0 ? 0 : 0.1 + li * 0.08, duration: dur ?? 0.4, ...SPRING }}
              >
                <td
                  className="py-1.5 pr-3 text-gray-700 font-medium whitespace-nowrap"
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {locale}
                </td>
                {HEATMAP_MODELS.map((model) => {
                  const pct = HEATMAP_DATA[locale]?.[model] ?? 0
                  const { bg, text } = heatmapColor(pct)
                  return (
                    <td key={model} className="px-1.5 py-1.5">
                      <div
                        className={`w-full rounded-md ${bg} flex items-center justify-center py-1.5`}
                      >
                        <span className={`font-bold ${text}`}>{pct}%</span>
                      </div>
                    </td>
                  )
                })}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-black/[0.06]">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/80" />
          <span className="text-[10px] text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            &gt;85%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-amber-500/70" />
          <span className="text-[10px] text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            70-85%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-red-500/70" />
          <span className="text-[10px] text-gray-400" style={{ fontFamily: 'Inter, sans-serif' }}>
            &lt;70%
          </span>
        </div>
      </div>
    </div>
  )
}

/* ---------- Growth Chart ---------- */

function GrowthChart({ prefersReducedMotion }) {
  const dur = prefersReducedMotion ? 0 : undefined

  const padding = { top: 20, right: 20, bottom: 30, left: 40 }
  const width = 600
  const height = 200
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const yMin = 800
  const yMax = 1400

  const points = GROWTH_DATA.map((val, i) => ({
    x: padding.left + (i / (GROWTH_DATA.length - 1)) * innerW,
    y: padding.top + innerH - ((val - yMin) / (yMax - yMin)) * innerH,
  }))

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`

  const lastPoint = points[points.length - 1]

  return (
    <div className="w-full rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-[#5c7cfa]" />
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
          Knowledge Base Growth
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4c6ef5" />
            <stop offset="100%" stopColor="#748ffc" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {[800, 1000, 1200, 1400].map((tick) => {
          const y = padding.top + innerH - ((tick - yMin) / (yMax - yMin)) * innerH
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + innerW}
                y2={y}
                stroke="rgba(0,0,0,0.04)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 6}
                y={y + 3}
                textAnchor="end"
                className="text-[8px] fill-gray-500"
                style={{ fontFamily: "'JetBrains Mono', monospace" }}
              >
                {tick.toLocaleString()}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {MONTH_LABELS.map((month, i) => {
          const x = padding.left + (i / (MONTH_LABELS.length - 1)) * innerW
          return (
            <text
              key={month}
              x={x}
              y={height - 6}
              textAnchor="middle"
              className="text-[8px] fill-gray-500"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {month}
            </text>
          )
        })}

        {/* Area fill */}
        <motion.path
          d={areaPath}
          fill="rgba(92, 124, 250, 0.1)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: dur === 0 ? 0 : 0.4, duration: dur ?? 0.8 }}
        />

        {/* Line */}
        <motion.path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ delay: dur === 0 ? 0 : 0.2, duration: dur ?? 1.2, ease: 'easeOut' }}
        />

        {/* Data dots */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? '#5c7cfa' : 'rgba(92,124,250,0.6)'}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: dur === 0 ? 0 : 0.3 + i * 0.06, duration: dur ?? 0.3, ...SPRING }}
          />
        ))}

        {/* Pulsing ring on current month */}
        {!prefersReducedMotion && (
          <motion.circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4}
            fill="none"
            stroke="#5c7cfa"
            strokeWidth={1.5}
            initial={{ r: 4, opacity: 0.8 }}
            animate={{ r: 12, opacity: 0 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </svg>
    </div>
  )
}

/* ---------- Domain Model Card ---------- */

function DomainModelCard({ model, index, prefersReducedMotion }) {
  const dur = prefersReducedMotion ? 0 : undefined

  const accuracyColor =
    model.accuracy >= 95 ? 'text-emerald-600' : model.accuracy >= 90 ? 'text-amber-600' : 'text-orange-400'

  return (
    <motion.div
      className="rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4 hover:-translate-y-0.5 transition-transform duration-200"
      style={{ borderLeftWidth: 4, borderLeftColor: model.color }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: dur === 0 ? 0 : 0.1 + index * 0.08, duration: dur ?? 0.5, ...SPRING }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{model.name}</p>
          <p className="text-[10px] font-['JetBrains_Mono'] text-gray-400 mt-0.5">{model.id}</p>
        </div>
        <span
          className="text-[10px] font-['JetBrains_Mono'] font-bold rounded-full px-2 py-0.5"
          style={{
            color: model.color,
            backgroundColor: `${model.color}15`,
            border: `1px solid ${model.color}30`,
          }}
        >
          {model.version}
        </span>
      </div>

      <div className="space-y-1.5 mt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Entries</span>
          <span className="text-[11px] font-['JetBrains_Mono'] font-medium text-gray-900">
            {model.entries.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Trained</span>
          <span className="text-[11px] font-['JetBrains_Mono'] font-medium text-gray-700">{model.trained}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-gray-500">Accuracy</span>
          <span className={`text-[11px] font-['JetBrains_Mono'] font-bold ${accuracyColor}`}>
            {model.accuracy}%
          </span>
        </div>
      </div>

      {/* Accuracy bar */}
      <div className="mt-2.5 h-1 rounded-full bg-black/[0.04] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: model.color }}
          initial={{ width: 0 }}
          animate={{ width: `${model.accuracy}%` }}
          transition={{ delay: dur === 0 ? 0 : 0.4 + index * 0.08, duration: dur ?? 0.8, ...SPRING }}
        />
      </div>
    </motion.div>
  )
}

/* ---------- Timeline ---------- */

function LearningTimeline({ prefersReducedMotion }) {
  const dur = prefersReducedMotion ? 0 : undefined

  return (
    <div className="w-full rounded-lg bg-[#ffffff]/60 border border-black/[0.12] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500 mb-4">
        Recent Learning Events
      </p>

      <div className="relative ml-3">
        {/* Vertical line */}
        <div className="absolute left-0 top-1 bottom-1 w-px bg-black/[0.08]" />

        {TIMELINE_EVENTS.map((event, i) => (
          <motion.div
            key={i}
            className="relative pl-6 pb-5 last:pb-0"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: dur === 0 ? 0 : 0.15 + i * 0.1, duration: dur ?? 0.4, ...SPRING }}
          >
            {/* Dot */}
            <div
              className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full -translate-x-[5px] ring-2 ring-[#ffffff]"
              style={{ backgroundColor: event.color }}
            />
            {/* Content */}
            <p className="text-[11px] font-['JetBrains_Mono'] font-medium text-gray-400 mb-0.5">
              {event.date}
            </p>
            <p className="text-xs text-gray-700 leading-relaxed">{event.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

/* ---------- Sage Walkthrough ---------- */

function renderBoldText(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function WalkthroughCard({ msg, index, prefersReducedMotion }) {
  return (
    <motion.div
      className="flex flex-col gap-1.5"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { ...SPRING, delay: index * 0.04 }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-300 px-1">
        {msg.section}
      </p>
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full bg-[#009eda]/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-[#009eda]" />
        </div>
        <div className="bg-gray-50 border border-black/[0.08] rounded-lg rounded-tl-sm px-3.5 py-2.5 text-[13px] leading-relaxed text-gray-700 flex-1">
          {renderBoldText(msg.text)}
        </div>
      </div>
    </motion.div>
  )
}

function SageWalkthroughPanel({ prefersReducedMotion, onClose }) {
  return (
    <motion.div
      role="complementary"
      aria-label="Sage page walkthrough"
      className="w-[340px] shrink-0 flex flex-col bg-white border-l border-black/[0.12]"
      initial={prefersReducedMotion ? false : { x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={prefersReducedMotion ? {} : { x: '100%', opacity: 0 }}
      transition={SPRING}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.08] bg-gray-50 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#009eda]/10 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-[#009eda]" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-900">Sage</p>
            <p className="text-[11px] text-gray-500">Page Walkthrough</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/[0.06] transition-colors cursor-pointer"
          aria-label="Close walkthrough"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {WALKTHROUGH_MESSAGES.map((msg, i) => (
          <WalkthroughCard
            key={msg.id}
            msg={msg}
            index={i}
            prefersReducedMotion={prefersReducedMotion}
          />
        ))}
      </div>
    </motion.div>
  )
}

/* ---------- Main Component ---------- */

export default function OrgBrain({ onClose, onNavigateBack }) {
  const prefersReducedMotion = useReducedMotion()
  const dur = prefersReducedMotion ? 0 : undefined
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [showWalkthrough, setShowWalkthrough] = useState(false)

  const handleNodeClick = useCallback((nodeId) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId))
  }, [])

  useEffect(() => {
    if (!showWalkthrough) return
    const handler = (e) => { if (e.key === 'Escape') setShowWalkthrough(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showWalkthrough])

  return (
    <div className="flex w-full overflow-hidden">
      {/* ── Main Content ── */}
      <div className="flex-1 min-w-0">
      {/* ---------- Page Header ---------- */}
      <div className="px-6 pt-6 pb-4 border-b border-black/[0.12]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#5c7cfa]/10 flex items-center justify-center">
              <Brain className="w-5 h-5 text-[#5c7cfa]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Inter, sans-serif' }}>
                Org Brain
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Your organization's accumulated intelligence
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWalkthrough((v) => !v)}
              aria-expanded={showWalkthrough}
              aria-label={showWalkthrough ? 'Close Sage walkthrough' : 'Explain this page with Sage'}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[13px] font-medium transition-colors cursor-pointer ${
                showWalkthrough
                  ? 'bg-[#009eda]/10 border-[#009eda]/30 text-[#009eda]'
                  : 'bg-black/[0.03] hover:bg-black/[0.07] border-black/[0.12] text-gray-700 hover:text-gray-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Explain with Sage
            </button>
            <button
              onClick={onNavigateBack}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-black/[0.03] hover:bg-black/[0.08] border border-black/[0.12] text-[13px] font-medium text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          </div>
        </div>

        {/* Stat pills */}
        <motion.div
          className="flex items-center gap-2 mt-4 flex-wrap"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: dur === 0 ? 0 : 0.15, duration: dur ?? 0.4, ...SPRING }}
        >
          {STAT_PILLS.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.03] border border-black/[0.12] text-[11px]"
            >
              <span className="font-['JetBrains_Mono'] font-bold text-gray-900">{stat.value}</span>
              <span className="text-gray-500 font-medium">{stat.label}</span>
            </span>
          ))}
        </motion.div>
      </div>

      {/* ---------- Body ---------- */}
      <div className="px-6 py-5 space-y-5">
        {/* Knowledge Graph */}
        <section>
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3">
            Knowledge Graph
          </p>
          <KnowledgeGraph
            prefersReducedMotion={prefersReducedMotion}
            onNodeClick={handleNodeClick}
            selectedNodeId={selectedNodeId}
          />
          <AnimatePresence mode="wait">
            {selectedNodeId && (
              <NodeDetailPanel
                key={selectedNodeId}
                nodeId={selectedNodeId}
                prefersReducedMotion={prefersReducedMotion}
              />
            )}
          </AnimatePresence>
        </section>

        {/* Growth Chart */}
        <section>
          <GrowthChart prefersReducedMotion={prefersReducedMotion} />
        </section>

        {/* Coverage Heatmap */}
        <section>
          <CoverageHeatmap prefersReducedMotion={prefersReducedMotion} />
        </section>

        {/* Active Domain Models */}
        <section>
          <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-3">
            Active Domain Models
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DOMAIN_MODELS.map((model, i) => (
              <DomainModelCard
                key={model.id}
                model={model}
                index={i}
                prefersReducedMotion={prefersReducedMotion}
              />
            ))}
          </div>
        </section>

        {/* Recent Learning Timeline */}
        <section>
          <LearningTimeline prefersReducedMotion={prefersReducedMotion} />
        </section>
      </div>
      </div>

      {/* ── Sage Walkthrough Panel ── */}
      <AnimatePresence>
        {showWalkthrough && (
          <SageWalkthroughPanel
            prefersReducedMotion={prefersReducedMotion}
            onClose={() => setShowWalkthrough(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
