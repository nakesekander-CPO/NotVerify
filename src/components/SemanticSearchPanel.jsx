import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, Brain, ToggleLeft, ToggleRight, Clock, User, ArrowRight, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

// Stop words to ignore in semantic matching
const STOP_WORDS = new Set(['how', 'do', 'we', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'they', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'of', 'in', 'to', 'for', 'with', 'on', 'at', 'from', 'by', 'about', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or', 'nor', 'not', 'so', 'yet', 'both', 'either', 'neither', 'each', 'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'only', 'own', 'same', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'usually', 'phrase', 'translate', 'say', 'use', 'handle'])

function computeRelevance(rule, query) {
  const q = query.toLowerCase()
  const src = rule.sourceTerm.toLowerCase()
  const tgt = rule.targetTerm.toLowerCase()
  const ctx = (rule.contextNote || '').toLowerCase()

  // Exact substring match
  if (src.includes(q) || tgt.includes(q)) return { score: 1.0, type: 'exact' }
  if (q.includes(src) || q.includes(tgt)) return { score: 0.95, type: 'exact' }
  if (ctx.includes(q)) return { score: 0.85, type: 'exact' }

  // Semantic matching: filter out stop words, then score
  const qWords = q.split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w))
  const ruleText = `${src} ${tgt} ${ctx}`
  const ruleWords = ruleText.split(/[\s—\-/,]+/).filter(w => w.length > 1)

  if (qWords.length === 0) return { score: 0, type: 'semantic' }

  // Check how many query content words appear in rule (direct or partial)
  let directHits = 0
  let partialHits = 0
  qWords.forEach(qw => {
    if (ruleWords.some(rw => rw === qw)) { directHits++; return }
    if (ruleWords.some(rw => rw.includes(qw) || qw.includes(rw))) { partialHits++ }
  })

  // Score based on content word coverage
  const hitRate = (directHits + partialHits * 0.7) / qWords.length

  // Also do Jaccard on all words for broad similarity
  const allQWords = new Set(q.split(/\s+/).filter(Boolean))
  const allRuleWords = new Set(ruleWords)
  let intersection = 0
  allQWords.forEach(w => { if (allRuleWords.has(w)) intersection++ })
  const union = new Set([...allQWords, ...allRuleWords]).size
  const jaccard = union === 0 ? 0 : intersection / union

  const finalScore = Math.min(1, Math.max(hitRate * 0.8, jaccard) + (directHits > 0 ? 0.15 : 0))
  return { score: finalScore, type: 'semantic' }
}

export default function SemanticSearchPanel({ rules, onNavigateToSegment }) {
  const [query, setQuery] = useState('')
  const [exactOnly, setExactOnly] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const inputRef = useRef(null)

  // Debounce query
  useEffect(() => {
    if (!query.trim()) { setDebouncedQuery(''); setIsSearching(false); return }
    setIsSearching(true)
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
      setIsSearching(false)
    }, 400)
    return () => clearTimeout(timer)
  }, [query])

  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return []

    return rules
      .map(rule => {
        const { score, type } = computeRelevance(rule, debouncedQuery)
        return { ...rule, relevanceScore: score, matchType: type }
      })
      .filter(r => {
        if (exactOnly) {
          const q = debouncedQuery.toLowerCase()
          return r.sourceTerm.toLowerCase().includes(q) || r.targetTerm.toLowerCase().includes(q)
        }
        return r.relevanceScore >= 0.25
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20)
  }, [debouncedQuery, rules, exactOnly])

  // Focus search with / key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  // Mock verified-by names
  const verifiers = ['Kenji Tanaka', 'Sarah Chen', 'Alex Chen', 'Yuki Nakamura']
  function getVerifier(rule) {
    return rule.verifiedBy || verifiers[Math.abs(rule.id.charCodeAt(3) || 0) % verifiers.length]
  }

  function formatDate(iso) {
    if (!iso) return 'Unknown'
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-1.5">
        <Brain className="w-3.5 h-3.5 text-purple-500" />
        <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">Intelligence Search</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search rules... ( / )'
          className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-white border border-black/[0.12] text-[11px] text-gray-900 placeholder:text-gray-400 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/20 transition-all"
        />
        {isSearching && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full"
            />
          </div>
        )}
      </div>

      {/* Exact Match toggle */}
      <button
        onClick={() => setExactOnly(!exactOnly)}
        className="flex items-center gap-1.5 text-[10px] text-gray-500 hover:text-gray-700 transition-colors"
      >
        {exactOnly
          ? <ToggleRight className="w-4 h-4 text-purple-500" />
          : <ToggleLeft className="w-4 h-4 text-gray-400" />
        }
        <span className={exactOnly ? 'text-purple-600 font-semibold' : ''}>Exact Match Only</span>
      </button>

      {/* Results */}
      <div className="max-h-52 overflow-y-auto space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
        <AnimatePresence mode="popLayout">
          {results.length > 0 ? (
            results.map((rule, i) => (
              <motion.div
                key={rule.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, delay: i * 0.03 }}
                className="p-2 rounded-lg bg-white border border-black/[0.08] hover:border-purple-300/50 transition-colors cursor-pointer group"
                onClick={() => rule.createdFrom && onNavigateToSegment?.(rule.createdFrom)}
              >
                {/* Source → Target */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-[10px] font-medium text-gray-800 truncate">{rule.sourceTerm}</span>
                  <ArrowRight className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                  <span className="text-[10px] font-medium text-purple-700 truncate">{rule.targetTerm}</span>
                </div>

                {/* Context note */}
                {rule.contextNote && (
                  <p className="text-[9px] text-gray-400 leading-snug mb-1 truncate">{rule.contextNote}</p>
                )}

                {/* Metadata row */}
                <div className="flex items-center gap-2 text-[9px] text-gray-400">
                  <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase ${
                    rule.matchType === 'exact' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'
                  }`}>
                    {rule.matchType}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <User className="w-2.5 h-2.5" />
                    {getVerifier(rule)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" />
                    {formatDate(rule.createdAt)}
                  </span>
                </div>
              </motion.div>
            ))
          ) : debouncedQuery.trim() && !isSearching ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-3"
            >
              <p className="text-[10px] text-gray-400">No matching rules found</p>
            </motion.div>
          ) : !query.trim() ? (
            <div className="flex flex-col items-center gap-1.5 py-3 text-center">
              <Sparkles className="w-4 h-4 text-gray-300" />
              <p className="text-[10px] text-gray-400 leading-snug">
                Query the Knowledge Graph<br />
                <span className="text-gray-300">Exact strings or semantic questions</span>
              </p>
            </div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  )
}
