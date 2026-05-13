/**
 * KeyboardShortcutOverlay — full cheat sheet. Toggle with `?` or `Esc`.
 */

import { X } from 'lucide-react'

const ROWS = [
  { group: 'Adjudicate', items: [
    ['1 · 2 · 3 · 4', 'Select agent proposal'],
    ['A',             'Accept selected (auto-commit in Reviewer Mode)'],
    ['R',             'Refine selected proposal'],
    ['X',             'Reject all proposals'],
    ['Cmd / Ctrl + Enter', 'Commit decision'],
  ]},
  { group: 'Navigate', items: [
    ['J',         'Next segment'],
    ['K',         'Previous segment'],
    ['F',         'Next flagged segment'],
    ['Shift + F', 'Previous flagged segment'],
  ]},
  { group: 'Inspect', items: [
    ['G',     'Toggle Org Brain matches panel'],
    ['B',     'Toggle back-translation panel'],
    ['Q',     'Toggle QA-diff panel'],
    ['T',     'Toggle trust-score explainer'],
    ['E',     'Toggle Edge Cases panel'],
  ]},
  { group: 'Mode', items: [
    ['M',     'Toggle Reviewer Mode'],
    ['Esc',   'Close overlay / exit Reviewer Mode'],
    ['?',     'Show this overlay'],
  ]},
]

export default function KeyboardShortcutOverlay({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-ink/50 flex items-center justify-center" onClick={onClose}>
      <div
        className="w-full max-w-[640px] bg-white rounded-lg border border-rule overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-rule flex items-center justify-between">
          <div>
            <p className="text-[10.5px] uppercase tracking-[0.18em] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Keyboard shortcuts</p>
            <p className="text-[15px] font-semibold text-ink mt-0.5">Reviewer cockpit</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-pale cursor-pointer">
            <X className="w-4 h-4 text-slate" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-5">
          {ROWS.map(g => (
            <div key={g.group}>
              <p className="text-[10.5px] uppercase tracking-wider text-mist mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{g.group}</p>
              <ul className="space-y-1.5">
                {g.items.map(([keys, desc]) => (
                  <li key={keys} className="flex items-center justify-between text-[12.5px]">
                    <span className="text-slate">{desc}</span>
                    <kbd className="px-2 py-0.5 bg-cream border border-rule rounded text-[10.5px] text-ink" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{keys}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="px-5 py-2 border-t border-rule text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          Shortcuts pause while focus is in a text field, except Cmd/Ctrl+Enter.
        </div>
      </div>
    </div>
  )
}
