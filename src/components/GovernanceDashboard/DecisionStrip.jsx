/**
 * Governance dashboard — the decision strip (the page's first row).
 *
 * Operators open this page to act, so the strip leads with the two
 * actions: a prominent check-content drop target (anything you publish —
 * documents, decks, spreadsheets, video) and the single most urgent
 * hold with the page's one primary CTA ("Review"). The weekly stats are
 * deliberately demoted to one muted line underneath — they're reporting,
 * not work, and the full breakdown lives on Analytics. The held count in
 * that line is the one interactive number: it jumps to the queue.
 */

import { Upload, ShieldAlert } from 'lucide-react'
import { Card } from '../HITLVendorWorkflow/shared'
import { isOpen } from '../../data/governanceDashboard'

const pct = (part, total) => (total ? `${((part / total) * 100).toFixed(1)}%` : '0%')

export default function DecisionStrip({
  stats, mode, heldChanges, onOpenDetail, onJumpToQueue,
  dropRef, isDragOver, openFilePicker, onDragOver, onDragLeave, onDrop,
}) {
  const day0 = mode === 'day0'

  // The one item an operator should look at first: the top critical hold,
  // else the oldest open hold (the queue keeps arrival order).
  const urgent = heldChanges.find(c => c.status === 'critical-hold' && isOpen(c))
    || heldChanges.find(c => isOpen(c))

  return (
    <Card padding="p-0">
      <div className="p-4 flex items-stretch gap-3 flex-wrap">
        {/* Check content — the prominent action */}
        <div
          ref={dropRef}
          role="button" tabIndex={0}
          onClick={openFilePicker}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFilePicker() } }}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          aria-label="Check content"
          className={`flex-1 min-w-[260px] flex items-center gap-3.5 rounded-lg border-2 border-dashed px-4 py-3.5 cursor-pointer transition-colors ${isDragOver ? 'border-ocean bg-ocean/5' : 'border-ocean/35 hover:border-ocean bg-ocean/[0.03]'}`}
        >
          <span className="w-10 h-10 rounded-full bg-ocean/10 flex items-center justify-center shrink-0">
            <Upload className="w-4.5 h-4.5 text-ocean" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] font-semibold text-ink">Check content</span>
            <span className="block text-[11.5px] text-slate">
              Drop content or files — documents, decks, spreadsheets, video
              <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}> (.docx · .pdf · .pptx · .xlsx · .mp4)</span>
            </span>
          </span>
        </div>

        {/* Most urgent hold + the page's one primary CTA */}
        {urgent && (
          <div className="flex items-center gap-3 rounded-lg border border-[#FFB000]/40 bg-[#FFF7E6]/60 px-3.5 py-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-[#996800] shrink-0" />
            <span className="min-w-0">
              <span className="block text-[10px] text-[#996800] uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {urgent.status === 'critical-hold' ? 'Critical hold' : 'Next hold'} · {urgent.ruleId}
              </span>
              <span className="block text-[12.5px] font-semibold text-ink truncate max-w-[280px]">{urgent.title}</span>
            </span>
            <button
              onClick={() => onOpenDetail(urgent.id)}
              className="shrink-0 px-3.5 py-2 rounded-lg bg-amber hover:bg-amber-deep text-white text-[12px] font-semibold cursor-pointer"
            >
              Review
            </button>
          </div>
        )}
      </div>

      {/* The week, in one line — reporting, deliberately quiet */}
      <div className="px-4 py-2 border-t border-rule flex items-center gap-x-4 gap-y-1 flex-wrap text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        {day0 ? (
          <span>Stats fill in after your first check.</span>
        ) : (
          <>
            <span><span className="text-slate font-semibold">{stats.checksThisWeek.toLocaleString()}</span> checks</span>
            <span aria-hidden>·</span>
            <span><span className="text-[#996800] font-semibold">{stats.flagsRaised.toLocaleString()}</span> flagged ({pct(stats.flagsRaised, stats.checksThisWeek)})</span>
            <span aria-hidden>·</span>
            <button
              type="button"
              onClick={() => onJumpToQueue?.()}
              className="cursor-pointer text-ocean hover:text-ocean/80 underline underline-offset-2"
            >
              <span className="font-semibold">{stats.heldForReview.toLocaleString()}</span> held for review
            </button>
            <span aria-hidden>·</span>
            <span><span className="text-teal font-semibold">{pct(stats.publishedSafely, stats.checksThisWeek)}</span> published safely</span>
          </>
        )}
      </div>
    </Card>
  )
}
