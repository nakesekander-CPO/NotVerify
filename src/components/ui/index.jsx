/**
 * Shared UI primitives — the single source for page headers, tab bars,
 * search inputs, and overlay behavior (DS v2 Split Frame).
 *
 * The 2026-08-18 audit found 5 competing page-header patterns, 11
 * hand-rolled tab bars (none exposed as tab widgets), 13 search inputs
 * with three ellipsis conventions, and 22 keyboard-inescapable overlays.
 * These primitives are the one way to build each of those from now on.
 */

import { ArrowLeft, Search } from 'lucide-react'
import { MonoLabel } from '../HITLVendorWorkflow/shared'

/* ── PageHeader ─────────────────────────────────────────────────
   One header idiom: 40px icon tile · h1 at 20px bold · mono subtitle ·
   actions slot · optional standard Back button. */
export function PageHeader({ icon: Icon, title, subtitle, actions, onBack, backLabel = 'Back' }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-ocean" />
          </div>
        )}
        <div>
          <h1 className="text-[20px] font-bold text-ink leading-tight">{title}</h1>
          {subtitle && <MonoLabel className="mt-0.5 block">{subtitle}</MonoLabel>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {actions}
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-pale border border-rule text-[13px] font-medium text-slate hover:text-ink transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> {backLabel}
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Tabs ───────────────────────────────────────────────────────
   The underline idiom, exposed as a real tab widget (role=tablist /
   tab / aria-selected). Supports an icon, a count badge, and the
   SwiftBridge two-line JA sublabel. */
export function Tabs({ tabs, active, onChange, ariaLabel = 'Sections', className = '' }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={`flex items-center gap-1 border-b border-rule overflow-x-auto ${className}`}>
      {tabs.map(t => {
        const Icon = t.icon
        const selected = active === t.id
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(t.id)}
            className={`px-3.5 py-2.5 -mb-px border-b-2 cursor-pointer whitespace-nowrap text-left transition-colors ${selected ? 'border-ocean' : 'border-transparent hover:bg-pale/50'}`}
          >
            <span className={`flex items-center gap-1.5 text-[12.5px] ${selected ? 'text-ocean font-semibold' : 'text-slate'}`}>
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {t.label}
              {t.badge != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${selected ? 'bg-ocean/10 text-ocean' : 'bg-pale text-mist'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.badge}</span>
              )}
            </span>
            {t.labelJa && (
              <span className="block text-[9.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t.labelJa}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* ── SearchInput ────────────────────────────────────────────────
   One search idiom: labeled, single ellipsis convention, one icon
   offset. */
export function SearchInput({ value, onChange, placeholder = 'Search…', ariaLabel, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search className="w-3.5 h-3.5 text-mist absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder.replace(/…$/, '')}
        className="w-full text-[13px] border border-rule rounded-lg pl-9 pr-3 py-2 bg-white focus:outline-none focus:border-ocean/50"
      />
    </div>
  )
}

// useOverlay lives in ./useOverlay (hooks can't share a fast-refresh
// boundary with component exports) — import it from there directly.
