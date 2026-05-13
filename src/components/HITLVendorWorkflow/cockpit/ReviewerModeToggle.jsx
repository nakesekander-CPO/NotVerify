/**
 * Cockpit Mode toggle. Two modes:
 *   - Reviewer Mode (default) — full three-column cockpit with the rich
 *     right rail expanded. The reviewer-optimised default experience.
 *   - Compact View — keyboard-driven, side-rail collapsed to a vertical
 *     glyph strip, segment list compressed. For power users / dense screens.
 *
 * `M` shortcut toggles. "Standard Mode" is gone — the default IS the
 * reviewer experience, and that's how it's labelled.
 */

import { Eye, Layers } from 'lucide-react'

export default function ReviewerModeToggle({ mode, onToggle, onOpenShortcuts }) {
  // `compact` is the dense view; everything else (including the historic
  // 'standard' value) maps to Reviewer Mode.
  const isCompact = mode === 'compact'
  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        onClick={onToggle}
        title={isCompact ? 'Switch to Reviewer Mode (M)' : 'Switch to Compact View (M)'}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] cursor-pointer transition-colors ${
          isCompact
            ? 'bg-amber text-white border-amber'
            : 'bg-ocean text-white border-ocean'
        }`}
      >
        {isCompact ? <Layers className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        {isCompact ? 'Compact View' : 'Reviewer Mode'}
      </button>
      <button
        onClick={onOpenShortcuts}
        title="Show keyboard shortcuts (?)"
        className="px-2 py-1 rounded-full border border-rule bg-white text-[11px] text-slate hover:border-ocean/30 cursor-pointer"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        ?
      </button>
    </div>
  )
}
