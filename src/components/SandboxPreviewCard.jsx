import { useState } from 'react'
import { Eye, ChevronLeft, ChevronRight, Check, X } from 'lucide-react'
import { annotationColors } from '../utils/scoreColors'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'regulatory', label: 'Regulatory' },
  { key: 'terminology', label: 'Domain Precision' },
  { key: 'currency', label: 'Currency' },
  { key: 'cultural', label: 'Cultural' },
]

const BADGE_DETAILS = {
  regulatory: {
    rule: 'Regulatory Compliance Check',
    description: 'Regulatory compliance rule ensuring adherence to local financial reporting standards including J-GAAP, IFRS mappings, and jurisdictional disclosure requirements.',
    confidence: 96,
    agent: 'Compliance Agent',
  },
  terminology: {
    rule: 'Knowledge Match',
    description: 'Knowledge-matched entry verified against the project domain model. Ensures consistent use of approved outputs across all document segments.',
    confidence: 92,
    agent: 'Terminology Agent',
  },
  currency: {
    rule: 'Currency Conversion Rule',
    description: 'Currency conversion applied using ECB reference rates with locale-appropriate formatting, symbol placement, and decimal conventions.',
    confidence: 89,
    agent: 'Deployment Agent',
  },
  cultural: {
    rule: 'Cultural Adaptation',
    description: 'Cultural adaptation adjusting tone, honorifics, date formats, and idiomatic expressions to match the target locale expectations.',
    confidence: 84,
    agent: 'Cultural Agent',
  },
}

function getStatusDot(annotations) {
  if (annotations.some(a => a.type === 'regulatory')) {
    return { color: 'bg-emerald-400', label: 'Verified' }
  }
  if (annotations.some(a => a.type === 'cultural')) {
    return { color: 'bg-amber-400', label: 'Needs Review' }
  }
  return { color: 'bg-blue-400', label: 'Auto-verified' }
}

export default function SandboxPreviewCard({ preview, totalPages }) {
  const [page, setPage] = useState(0)
  const [filter, setFilter] = useState('all')
  const [edits, setEdits] = useState({})
  const [editingIndex, setEditingIndex] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const [expandedBadge, setExpandedBadge] = useState(null)
  const perPage = 2

  // Count segments per category
  const categoryCounts = CATEGORIES.reduce((acc, cat) => {
    acc[cat.key] = cat.key === 'all'
      ? preview.segments.length
      : preview.segments.filter(s => s.annotations.some(a => a.type === cat.key)).length
    return acc
  }, {})

  const filtered = filter === 'all'
    ? preview.segments
    : preview.segments.filter(s => s.annotations.some(a => a.type === filter))

  const totalPgs = Math.ceil(filtered.length / perPage)
  const visible = filtered.slice(page * perPage, (page + 1) * perPage)
  const pageCount = totalPages?.match(/\d+/)?.[0] || '40'

  // Map filtered indices back to original segment indices
  function getOriginalIndex(filteredIdx) {
    const seg = filtered[page * perPage + filteredIdx]
    return preview.segments.indexOf(seg)
  }

  function startEditing(originalIdx, currentText) {
    setEditingIndex(originalIdx)
    setEditDraft(edits[originalIdx] ?? currentText)
  }

  function saveEdit(originalIdx) {
    setEdits(prev => ({ ...prev, [originalIdx]: editDraft }))
    setEditingIndex(null)
    setEditDraft('')
  }

  function cancelEdit() {
    setEditingIndex(null)
    setEditDraft('')
  }

  function toggleBadge(segIdx, annIdx) {
    const key = `${segIdx}-${annIdx}`
    setExpandedBadge(prev => prev === key ? null : key)
  }

  return (
    <div className="rounded-lg border border-black/[0.12] overflow-hidden">
      {/* Header */}
      <div className="bg-gray-100 px-6 py-5 border-b border-black/[0.12]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-straker-50 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-straker-600" />
            </div>
            <h2 className="text-[12px] font-bold uppercase tracking-wider text-gray-500">Sandbox Preview</h2>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-gray-500 font-medium">{preview.scope}</span>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/80 font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
              Preview Complete
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-[11px] font-mono text-gray-500">
            <span>{preview.stats.segmentsProcessed} segments</span>
            <span>{preview.stats.terminologyMatches} knowledge matches</span>
            <span>{preview.stats.guardrailsApplied} guardrails</span>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-4">
          {CATEGORIES.map(cat => {
            const isActive = filter === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => { setFilter(cat.key); setPage(0); setExpandedBadge(null) }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-straker-500 text-white'
                    : 'bg-black/[0.03] text-gray-500 hover:bg-black/[0.08]'
                }`}
              >
                {cat.label}
                <span className={`text-[10px] tabular-nums px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-black/[0.04] text-gray-500'
                }`}>
                  {categoryCounts[cat.key]}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Segments */}
      <div className="divide-y divide-black/[0.06]">
        {visible.map((seg, i) => {
          const originalIdx = getOriginalIndex(i)
          const status = getStatusDot(seg.annotations)
          const hasEdit = edits[originalIdx] !== undefined
          const isEditing = editingIndex === originalIdx
          const displayTarget = edits[originalIdx] ?? seg.target

          return (
            <div key={originalIdx} className="px-6 py-4">
              <div className="flex gap-3">
                {/* Status dot */}
                <div className="flex flex-col items-center pt-4">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${status.color} shrink-0`}
                    title={status.label}
                  />
                </div>

                {/* Segment content */}
                <div className="flex-1 grid grid-cols-2 gap-4">
                  {/* Source */}
                  <div className="p-3.5 bg-gray-100 rounded-lg border border-black/[0.06]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Source (EN)</p>
                    <p className="text-[13px] text-gray-500 leading-relaxed">{seg.source}</p>
                  </div>

                  {/* Target */}
                  <div className="p-3.5 bg-gray-100 rounded-lg border border-black/[0.06]">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Target</p>
                      {hasEdit && !isEditing && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border bg-amber-50 text-amber-400 border-amber-500/20">
                          User Override
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div>
                        <textarea
                          value={editDraft}
                          onChange={e => setEditDraft(e.target.value)}
                          className="w-full bg-white border border-straker-500/30 rounded-lg p-3 text-[13px] text-gray-700 leading-relaxed resize-none focus:outline-none focus:border-straker-500/60"
                          rows={3}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => saveEdit(originalIdx)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-straker-500/20 text-straker-600 text-[11px] font-semibold hover:bg-straker-500/30 transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Save Suggestion
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/[0.03] text-gray-500 text-[11px] font-semibold hover:bg-black/[0.08] transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p
                        className="text-[13px] text-gray-700 leading-relaxed cursor-pointer hover:text-straker-300 transition-colors rounded px-1 -mx-1 hover:bg-black/[0.02]"
                        onClick={() => startEditing(originalIdx, seg.target)}
                        title="Click to edit"
                      >
                        {displayTarget}
                      </p>
                    )}

                    {/* Annotation badges */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {seg.annotations.map((ann, ai) => {
                        const color = annotationColors[ann.type] || annotationColors.terminology
                        const badgeKey = `${originalIdx}-${ai}`
                        const isExpanded = expandedBadge === badgeKey

                        return (
                          <button
                            key={ai}
                            onClick={() => toggleBadge(originalIdx, ai)}
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border cursor-pointer transition-colors ${color.bg} ${color.text} ${color.border} ${
                              isExpanded ? 'ring-1 ring-black/20' : 'hover:brightness-125'
                            }`}
                          >
                            {ann.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Expanded badge detail */}
                    {seg.annotations.map((ann, ai) => {
                      const badgeKey = `${originalIdx}-${ai}`
                      if (expandedBadge !== badgeKey) return null

                      const details = BADGE_DETAILS[ann.type] || BADGE_DETAILS.terminology
                      const color = annotationColors[ann.type] || annotationColors.terminology

                      return (
                        <div
                          key={`detail-${ai}`}
                          className={`mt-3 p-3 rounded-lg border ${color.border} ${color.bg}`}
                        >
                          <p className={`text-[11px] font-bold ${color.text} mb-1`}>{details.rule}</p>
                          <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{details.description}</p>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] text-gray-500">
                              Confidence: <span className={`font-bold ${color.text}`}>{details.confidence}%</span>
                            </span>
                            <span className="text-[10px] text-gray-500">
                              Applied by: <span className="text-gray-700 font-medium">{details.agent}</span>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        {visible.length === 0 && (
          <div className="px-6 py-8 text-center text-[13px] text-gray-500">No segments match this filter.</div>
        )}
      </div>

      {/* Footer with pagination */}
      <div className="px-6 py-3 border-t border-black/[0.06] flex items-center justify-between">
        <p className="text-[11px] text-gray-500">
          Previewing {preview.scope.toLowerCase()}. Full execution processes all {pageCount} pages.
        </p>
        {totalPgs > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-black/[0.04] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <span className="text-[11px] text-gray-500 tabular-nums">{page + 1} / {totalPgs}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPgs - 1, p + 1))}
              disabled={page >= totalPgs - 1}
              className="p-1 rounded hover:bg-black/[0.04] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
