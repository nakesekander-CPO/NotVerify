/**
 * JumpToFlagControl — ◀ ⚠ ▶ rail. Skips between flagged segments only.
 * Press `F` / `Shift+F` for the same effect from the keyboard layer.
 */

import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'

export default function JumpToFlagControl({ segments, activeIdx, onJump }) {
  const flagged = segments
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => (s.flagCategories || []).length > 0)
  if (flagged.length === 0) return null
  const flaggedIdxs = flagged.map(f => f.i)
  const cur = flaggedIdxs.indexOf(activeIdx)
  const totalFlagged = flagged.length
  const prevIdx = cur > 0 ? flaggedIdxs[cur - 1] : flaggedIdxs[flaggedIdxs.length - 1]
  const nextIdx = cur >= 0 && cur < flaggedIdxs.length - 1 ? flaggedIdxs[cur + 1] : flaggedIdxs.find(i => i > activeIdx) ?? flaggedIdxs[0]

  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-rule bg-white">
      <button
        type="button"
        onClick={() => onJump(prevIdx)}
        title="Previous flagged segment (Shift+F)"
        className="p-1 rounded-l-md hover:bg-pale cursor-pointer"
      >
        <ChevronLeft className="w-3.5 h-3.5 text-slate" />
      </button>
      <span className="inline-flex items-center gap-1 px-1.5 text-[10.5px] text-[#996800]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <AlertTriangle className="w-3 h-3" />
        {cur === -1 ? totalFlagged : `${cur + 1}/${totalFlagged}`}
      </span>
      <button
        type="button"
        onClick={() => onJump(nextIdx)}
        title="Next flagged segment (F)"
        className="p-1 rounded-r-md hover:bg-pale cursor-pointer"
      >
        <ChevronRight className="w-3.5 h-3.5 text-slate" />
      </button>
    </div>
  )
}
