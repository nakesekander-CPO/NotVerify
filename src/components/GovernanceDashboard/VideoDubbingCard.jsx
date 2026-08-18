/**
 * Governance dashboard — Video Dubbing status card.
 *
 * Governed video localization surfaced where actions start: language-track
 * rollup with the held count called out (a hold is the product working —
 * here, an expired likeness consent stops a synthetic likeness cold).
 */

import { Clapperboard, ChevronRight } from 'lucide-react'
import { dubbingSummary, DUB_PROJECTS } from '../../data/videoDubbing'
import { Card } from '../HITLVendorWorkflow/shared'

export default function VideoDubbingCard({ onOpenVideoDubbing }) {
  const s = dubbingSummary()
  const heldTrack = DUB_PROJECTS.flatMap(p => p.tracks).find(t => t.status === 'held' && t.stage === 'consent')

  return (
    <Card padding="p-0">
      <button
        onClick={() => onOpenVideoDubbing?.()}
        className="w-full text-left cursor-pointer group"
        aria-label="Open Video Dubbing"
      >
        <div className="px-4 py-3 border-b border-rule flex items-center justify-between gap-2">
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-lg bg-ocean/10 flex items-center justify-center shrink-0">
              <Clapperboard className="w-4 h-4 text-ocean" />
            </span>
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold text-ink">Video Dubbing</span>
              <span className="block text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                one source video · every language
              </span>
            </span>
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-mist shrink-0 group-hover:translate-x-0.5 transition-transform" />
        </div>
        <div className="px-4 py-3 space-y-1.5">
          <p className="text-[11px] text-slate">
            <span className="font-semibold text-ink">{s.projects} projects · {s.tracks} language tracks</span>
            {s.held > 0 && <span className="text-[#996800]"> · {s.held} held</span>}
          </p>
          {heldTrack && (
            <p className="text-[10.5px] text-mist leading-snug">
              Consent gate holding {heldTrack.lang} — no synthetic likeness without a current consent record.
            </p>
          )}
        </div>
      </button>
    </Card>
  )
}
