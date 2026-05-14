/**
 * Command palette — opened by `/` from the Quick Review Workspace.
 *
 * Displays a short list of secondary tools (Intelligence Search, Knowledge
 * Graph, Find in document, Find in corpus, Open glossary, Open TM search,
 * Ask Sage, Show shortcuts). The palette never contains anything that
 * belongs in the default segment-editing loop — it's strictly for tools
 * the reviewer reaches for occasionally.
 *
 * Keyboard
 *   Type to filter · J/K or ↑/↓ to move · Enter to run · Esc to close
 *
 * Many actions are demo stubs in the prototype (search backends are not
 * wired) — they call the provided `onAction(id)` callback so the parent
 * decides what each one does (focus a panel, open a toolbar, toast).
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Search, GitBranch, FileSearch, Globe, BookOpen, FileText,
  Sparkles, Keyboard, X, CornerDownLeft,
} from 'lucide-react'

const COMMANDS = [
  { id: 'intelligence-search', label: 'Intelligence Search',     hint: 'Cross-corpus semantic search',  icon: Search,     keywords: 'intelligence search ai semantic' },
  { id: 'knowledge-graph',     label: 'Search Knowledge Graph',  hint: 'Org Brain entities & relations',icon: GitBranch,  keywords: 'knowledge graph kg org brain entities' },
  { id: 'find-in-document',    label: 'Find in document',         hint: 'Find & Replace · this document',icon: FileSearch, keywords: 'find replace document local' },
  { id: 'find-in-corpus',      label: 'Find in corpus',           hint: 'Find across the entire corpus', icon: Globe,      keywords: 'find replace corpus everywhere' },
  { id: 'open-glossary',       label: 'Open glossary',            hint: 'Focus the Live TB panel',       icon: BookOpen,   keywords: 'glossary tb termbase terms' },
  { id: 'open-tm-search',      label: 'Open TM search',           hint: 'Focus the Live TM panel',       icon: FileText,   keywords: 'tm translation memory search' },
  { id: 'ask-sage',            label: 'Ask Sage',                 hint: 'Open the Sage assistant',       icon: Sparkles,   keywords: 'sage ai assistant ask help' },
  { id: 'show-shortcuts',      label: 'Show keyboard shortcuts',  hint: 'Open the ? shortcut overlay',   icon: Keyboard,   keywords: 'shortcuts keyboard help ?' },
]

export default function CommandPalette({ onClose, onAction }) {
  const [query, setQuery] = useState('')
  const [idx, setIdx] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.hint.toLowerCase().includes(q) ||
      c.keywords.includes(q)
    )
  }, [query])

  useEffect(() => {
    if (idx >= filtered.length) setIdx(Math.max(0, filtered.length - 1))
  }, [filtered, idx])

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); return }
    if (e.key === 'ArrowDown' || (e.key === 'j' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); setIdx(i => Math.min(filtered.length - 1, i + 1)); return
    }
    if (e.key === 'ArrowUp' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
      e.preventDefault(); setIdx(i => Math.max(0, i - 1)); return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const cmd = filtered[idx]
      if (cmd) { onAction?.(cmd.id); onClose() }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-ink/40 flex items-start justify-center pt-[12vh]" onClick={onClose}>
      <div
        className="w-full max-w-[560px] bg-white rounded-lg border border-rule overflow-hidden m-4 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-rule flex items-center gap-2">
          <Search className="w-4 h-4 text-mist" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setIdx(0) }}
            onKeyDown={onKey}
            placeholder="Search tools, actions, glossary…"
            className="flex-1 text-[13.5px] text-ink placeholder:text-mist focus:outline-none bg-transparent"
            spellCheck={false}
          />
          <kbd
            className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-cream border border-rule rounded text-[10px] text-mist"
            style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Esc
          </kbd>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-pale cursor-pointer"
          >
            <X className="w-3.5 h-3.5 text-slate" />
          </button>
        </div>

        <ul className="max-h-[320px] overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-[12px] text-mist">No matching commands.</li>
          ) : filtered.map((c, i) => {
            const Icon = c.icon
            const active = i === idx
            return (
              <li key={c.id}>
                <button
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => { onAction?.(c.id); onClose() }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-3 cursor-pointer ${
                    active ? 'bg-ocean/10 text-ink' : 'hover:bg-pale/40 text-ink'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-ocean' : 'text-slate'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium truncate">{c.label}</span>
                    <span className="block text-[11px] text-mist truncate">{c.hint}</span>
                  </span>
                  {active && <CornerDownLeft className="w-3.5 h-3.5 text-ocean shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>

        <div
          className="px-3 py-1.5 border-t border-rule bg-pale/40 text-[10.5px] text-mist flex items-center gap-3"
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <span>↑/↓ move</span>
          <span>Enter run</span>
          <span>Esc close</span>
        </div>
      </div>
    </div>
  )
}
