import { useMemo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, FileText, ArrowRight } from 'lucide-react'

function findOccurrences(segments, searchText, caseSensitive = true) {
  if (!searchText.trim()) return []

  const needle = caseSensitive ? searchText : searchText.toLowerCase()
  const results = []

  segments.forEach(seg => {
    // Search in source
    const src = caseSensitive ? seg.source : seg.source.toLowerCase()
    let idx = src.indexOf(needle)
    while (idx !== -1) {
      const start = Math.max(0, idx - 30)
      const end = Math.min(seg.source.length, idx + searchText.length + 30)
      results.push({
        segmentId: seg.id,
        segmentNumber: seg.segmentNumber,
        field: 'source',
        matchIndex: idx,
        matchLength: searchText.length,
        contextSnippet: seg.source.substring(start, end),
        fullText: seg.source,
      })
      idx = src.indexOf(needle, idx + 1)
    }

    // Search in translation
    const tgt = caseSensitive ? seg.translation : seg.translation.toLowerCase()
    idx = tgt.indexOf(needle)
    while (idx !== -1) {
      const start = Math.max(0, idx - 30)
      const end = Math.min(seg.translation.length, idx + searchText.length + 30)
      results.push({
        segmentId: seg.id,
        segmentNumber: seg.segmentNumber,
        field: 'translation',
        matchIndex: idx,
        matchLength: searchText.length,
        contextSnippet: seg.translation.substring(start, end),
        fullText: seg.translation,
      })
      idx = tgt.indexOf(needle, idx + 1)
    }
  })

  return results.sort((a, b) => a.segmentNumber - b.segmentNumber)
}

function HighlightedSnippet({ text, searchText, caseSensitive }) {
  try {
    const escaped = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const flags = caseSensitive ? 'g' : 'gi'
    const regex = new RegExp(escaped, flags)
    const parts = text.split(regex)
    const matches = text.match(regex)
    if (!matches) return <span>{text}</span>

    return (
      <span>
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < matches.length && (
              <span className="bg-yellow-200 text-yellow-900 font-semibold px-0.5 rounded">
                {matches[i]}
              </span>
            )}
          </span>
        ))}
      </span>
    )
  } catch {
    return <span>{text}</span>
  }
}

export default function ConcordanceOverlay({ isOpen, onClose, searchText, segments, onNavigate }) {
  const ref = useRef(null)
  const [caseSensitive, setCaseSensitive] = useState(true)

  const occurrences = useMemo(() => {
    if (!isOpen || !searchText) return []
    return findOccurrences(segments, searchText, caseSensitive)
  }, [isOpen, searchText, segments, caseSensitive])

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return
    function handleEsc(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  function handleNavigate(segId) {
    onNavigate(segId)
    onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[55]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            ref={ref}
            className="absolute top-0 right-0 h-full w-full max-w-sm bg-white border-l border-black/[0.12] flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/[0.12] shrink-0">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-500" />
                <h2 className="text-sm font-semibold text-gray-900">Corpus Concordance</h2>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-black/[0.06] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Search term chip + options */}
            <div className="px-4 py-2.5 border-b border-black/[0.06] space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-50 border border-purple-200/50 text-xs font-medium text-purple-700 max-w-[200px] truncate">
                  "{searchText}"
                </span>
                <span className="text-[10px] text-gray-400">
                  {occurrences.length} occurrence{occurrences.length !== 1 ? 's' : ''}
                </span>
              </div>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={e => setCaseSensitive(e.target.checked)}
                  className="w-3 h-3 accent-purple-500 cursor-pointer"
                />
                <span className="text-[10px] text-gray-500">Case Sensitive</span>
              </label>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5" style={{ scrollbarWidth: 'thin' }}>
              {occurrences.length > 0 ? (
                occurrences.map((occ, i) => (
                  <motion.button
                    key={`${occ.segmentId}-${occ.field}-${occ.matchIndex}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12, delay: Math.min(i * 0.02, 0.3) }}
                    onClick={() => handleNavigate(occ.segmentId)}
                    className="w-full text-left p-2.5 rounded-lg bg-black/[0.02] border border-black/[0.06] hover:border-purple-300/50 hover:bg-purple-50/30 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] text-gray-400">
                        SEG-{String(occ.segmentNumber).padStart(3, '0')}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-[8px] font-semibold uppercase ${
                        occ.field === 'source' ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {occ.field}
                      </span>
                      <ArrowRight className="w-2.5 h-2.5 text-gray-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-[11px] text-gray-600 leading-relaxed">
                      <HighlightedSnippet text={occ.contextSnippet} searchText={searchText} caseSensitive={caseSensitive} />
                    </p>
                  </motion.button>
                ))
              ) : (
                <div className="flex flex-col items-center gap-2 py-8">
                  <FileText className="w-6 h-6 text-gray-300" />
                  <p className="text-xs text-gray-400">No occurrences found in corpus</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-black/[0.06] bg-gray-50/50">
              <p className="text-[9px] text-gray-400">
                Searching across all {segments.length} segments • Click to navigate
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}
