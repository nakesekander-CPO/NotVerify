/**
 * ShortcutHintFooter — persistent footer at the bottom of the cockpit
 * surfacing the most-used shortcuts and the save status. Replaces the
 * "hidden behind ?" discoverability problem.
 */

export default function ShortcutHintFooter({ savedAgo, mode }) {
  const hints = [
    ['1·2·3', 'Pick proposal'],
    ['A', 'Accept'],
    ['R', 'Refine'],
    ['X', 'Reject'],
    ['⌘↩', 'Commit'],
    ['F', 'Next flag'],
    ['?', 'All shortcuts'],
  ]
  return (
    <footer className="mt-6 -mx-8 px-8 py-2 border-t border-rule bg-cream/50 flex items-center justify-between text-[11px] text-slate" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
      <div className="flex items-center gap-3 flex-wrap">
        {hints.map(([k, l]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-white border border-rule rounded text-[10px] text-ink">{k}</kbd>
            <span className="text-mist">{l}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-mist">Shortcuts pause while typing (except ⌘↩).</span>
        <span className="text-mist">·</span>
        <span className="text-ink">{savedAgo != null ? `Saved ${savedAgo}s ago` : 'No unsaved changes'}</span>
      </div>
    </footer>
  )
}
