import { useState, useMemo } from 'react'
import { ArrowRightLeft, AlertTriangle } from 'lucide-react'
import Drawer from './Drawer'

export default function FindReplaceDrawer({ isOpen, onClose, segments, lockedSegmentIds, onReplace }) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(true)
  const [wholeWord, setWholeWord] = useState(false)
  const [scope, setScope] = useState('document')
  const [overwriteVerified, setOverwriteVerified] = useState(false)

  const matches = useMemo(() => {
    if (!source.trim()) return []
    return segments.filter(seg => {
      if (!seg.translation) return false
      if (!overwriteVerified && lockedSegmentIds.has(seg.id)) return false

      const haystack = caseSensitive ? seg.translation : seg.translation.toLowerCase()
      const needle = caseSensitive ? source : source.toLowerCase()

      if (wholeWord) {
        const regex = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? '' : 'i')
        return regex.test(seg.translation)
      }
      return haystack.includes(needle)
    })
  }, [source, segments, lockedSegmentIds, caseSensitive, wholeWord, overwriteVerified])

  function handleReplace() {
    if (matches.length === 0) return
    const replacements = matches.map(seg => {
      let newTranslation
      if (wholeWord) {
        const regex = new RegExp(`\\b${source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, caseSensitive ? 'g' : 'gi')
        newTranslation = seg.translation.replace(regex, target)
      } else {
        if (caseSensitive) {
          newTranslation = seg.translation.split(source).join(target)
        } else {
          const regex = new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
          newTranslation = seg.translation.replace(regex, target)
        }
      }
      return {
        segId: seg.id,
        previousTranslation: seg.translation,
        newTranslation,
        deterministic: true,
      }
    })
    onReplace(replacements)
    onClose()
  }

  function highlightMatch(text) {
    if (!source.trim()) return text
    try {
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const flags = caseSensitive ? 'g' : 'gi'
      const regex = wholeWord ? new RegExp(`\\b${escaped}\\b`, flags) : new RegExp(escaped, flags)
      const parts = text.split(regex)
      const matched = text.match(regex)
      if (!matched) return text
      return parts.reduce((acc, part, i) => {
        acc.push(<span key={`p${i}`}>{part}</span>)
        if (i < matched.length) {
          acc.push(
            <span key={`m${i}`} className="bg-red-100 text-red-600 px-0.5 rounded line-through">
              {matched[i]}
            </span>
          )
        }
        return acc
      }, [])
    } catch {
      return text
    }
  }

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Find & Replace" width="lg">
      <div className="space-y-5">
        {/* Source / Target inputs */}
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider mb-1.5">
              Find
            </label>
            <input
              type="text"
              value={source}
              onChange={e => setSource(e.target.value)}
              placeholder="Source text to find..."
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#5c7cfa]/50 transition-colors font-mono"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider mb-1.5">
              Replace with
            </label>
            <input
              type="text"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="Target replacement text..."
              className="w-full px-3 py-2 rounded-lg bg-black/[0.03] border border-black/[0.12] text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-[#5c7cfa]/50 transition-colors font-mono"
            />
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="w-3.5 h-3.5 accent-[#5c7cfa] cursor-pointer" />
            <span className="text-xs text-gray-700">Case Sensitive</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} className="w-3.5 h-3.5 accent-[#5c7cfa] cursor-pointer" />
            <span className="text-xs text-gray-700">Whole Word Only</span>
          </label>
        </div>

        {/* Scope */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-gray-900/50 uppercase tracking-wider">Scope</p>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="scope" value="document" checked={scope === 'document'} onChange={() => setScope('document')} className="accent-[#5c7cfa] cursor-pointer" />
              <span className="text-xs text-gray-700">This Document</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" name="scope" value="corpus" checked={scope === 'corpus'} onChange={() => setScope('corpus')} className="accent-[#5c7cfa] cursor-pointer" />
              <span className="text-xs text-gray-700">Entire Corpus</span>
            </label>
          </div>
        </div>

        {/* Overwrite verified */}
        <label className="flex items-start gap-2 cursor-pointer px-3 py-2 rounded-lg bg-amber-50/60 border border-amber-200/40">
          <input type="checkbox" checked={overwriteVerified} onChange={e => setOverwriteVerified(e.target.checked)} className="w-3.5 h-3.5 accent-amber-500 mt-0.5 cursor-pointer" />
          <div>
            <span className="text-xs text-amber-700 font-medium">Include verified segments</span>
            {overwriteVerified && (
              <p className="flex items-center gap-1 text-[10px] text-amber-600 mt-0.5">
                <AlertTriangle className="w-3 h-3" /> This will overwrite human-approved translations
              </p>
            )}
          </div>
        </label>

        {/* Match count */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/[0.02] border border-black/[0.06]">
          <ArrowRightLeft className="w-3.5 h-3.5 text-gray-400" />
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-gray-900">{matches.length}</span> segment{matches.length !== 1 ? 's' : ''} matched
          </p>
        </div>

        {/* Match preview */}
        {matches.length > 0 && (
          <div className="space-y-1.5 max-h-48 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
            <p className="text-[10px] font-semibold text-gray-900/40 uppercase tracking-wider sticky top-0 bg-white py-1">Preview</p>
            {matches.slice(0, 10).map(seg => (
              <div key={seg.id} className="px-3 py-2 rounded-lg bg-black/[0.02] border border-black/[0.06]">
                <span className="font-mono text-[10px] text-gray-400 mr-1.5">SEG-{String(seg.segmentNumber).padStart(3, '0')}</span>
                <span className="text-xs leading-relaxed text-gray-700">{highlightMatch(seg.translation)}</span>
              </div>
            ))}
            {matches.length > 10 && (
              <p className="text-[10px] text-gray-400 text-center py-1">+{matches.length - 10} more</p>
            )}
          </div>
        )}

        {/* Replace button */}
        <button
          onClick={handleReplace}
          disabled={matches.length === 0 || !target.trim()}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 bg-[#5c7cfa] hover:bg-[#4c6ef5] text-white disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          <ArrowRightLeft className="w-4 h-4" /> Replace All ({matches.length})
        </button>
      </div>
    </Drawer>
  )
}
