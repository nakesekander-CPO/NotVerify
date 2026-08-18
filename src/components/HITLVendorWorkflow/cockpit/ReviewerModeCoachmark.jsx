/**
 * ReviewerModeCoachmark — small, friendly first-run tooltip pointing
 * at the mode toggle. Sets a localStorage flag on dismiss.
 */

import { useEffect, useState } from 'react'
import { Sparkles, X } from 'lucide-react'

const KEY = 'arbitr.reviewerMode.coachmarkDismissed.v1'

export default function ReviewerModeCoachmark() {
  const [show, setShow] = useState(false)
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true)
    } catch {/* ignore */}
  }, [])
  if (!show) return null
  const dismiss = () => {
    try { localStorage.setItem(KEY, '1') } catch {/* ignore */}
    setShow(false)
  }
  return (
    <div className="absolute top-12 right-2 z-30 w-72 bg-ink text-cream rounded-lg shadow-xl p-3 border border-[#FFB000]/40">
      <div className="flex items-start justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider text-[#FFBD59]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <Sparkles className="w-3 h-3" /> Reviewer Mode
        </div>
        <button onClick={dismiss} className="text-cream/70 hover:text-cream cursor-pointer">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[12.5px] mt-2 leading-relaxed">
        You're in <strong>Reviewer Mode</strong> — the rich three-column cockpit. Press <kbd className="px-1 bg-cream/15 rounded text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>?</kbd> to see every shortcut, or <kbd className="px-1 bg-cream/15 rounded text-[10.5px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>M</kbd> to switch to Compact View.
      </p>
      <button onClick={dismiss} className="mt-3 text-[11px] text-[#FFBD59] hover:text-cream cursor-pointer underline-offset-2 hover:underline">
        Got it
      </button>
    </div>
  )
}
