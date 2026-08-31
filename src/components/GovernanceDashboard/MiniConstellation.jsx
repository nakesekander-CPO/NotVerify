/**
 * Governance dashboard — Cortex mini-constellation.
 *
 * Cold-start edition of the Cortex page's starfield: one point per
 * pre-loaded entry, clustered by knowledge base, plus dim placeholder
 * clusters that only fill in once humans start reviewing. Static render
 * (no animation loop); the whole panel is a button that opens Cortex.
 * Extracted from the retired ColdStartDashboard; data lives in
 * src/data/governanceDashboard.js.
 */

import { useEffect, useRef } from 'react'
import { MINI_CLUSTERS, MINI_EMPTY } from '../../data/governanceDashboard'

export default function MiniConstellation({ onOpenCortex }) {
  const elRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const el = elRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let seed = 7
    const paint = () => {
      const s = el.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = s.width * dpr
      canvas.height = s.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed = 7
      const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
      const gauss = () => (rnd() + rnd() + rnd()) / 3 - 0.5
      const hexA = (hex, a) => {
        const n = parseInt(hex.slice(1), 16)
        return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
      }
      ctx.clearRect(0, 0, s.width, s.height)
      for (const c of MINI_CLUSTERS) {
        for (let i = 0; i < c.n; i++) {
          const recent = rnd() < 0.2
          ctx.beginPath()
          ctx.fillStyle = hexA(c.color, recent ? 0.95 : 0.65)
          ctx.arc(
            (c.x + gauss() * c.spread * 2.4) * s.width,
            (c.y + gauss() * c.spread * 2.2) * s.height,
            (1.5 + rnd() * 1.4) * (recent ? 1.4 : 1),
            0, Math.PI * 2,
          )
          ctx.fill()
        }
      }
    }
    paint()
    const ro = new ResizeObserver(paint)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <button
      ref={elRef}
      type="button"
      onClick={() => onOpenCortex?.()}
      aria-label="Open Cortex"
      className="relative w-full h-[210px] rounded-lg border border-rule overflow-hidden cursor-pointer group text-left bg-[radial-gradient(ellipse_at_50%_40%,#FFFFFF_0%,#F4F5FF_60%,#E9EBFA_100%)]"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {MINI_CLUSTERS.map(c => (
        <span
          key={c.label}
          className="absolute -translate-x-1/2 text-center pointer-events-none"
          style={{ left: `${c.x * 100}%`, top: `${(c.y - c.spread * 2.2) * 100}%` }}
        >
          <span className="block text-[10.5px] font-semibold text-slate leading-tight">{c.label}</span>
          <span className="block text-[9px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.n} entries</span>
        </span>
      ))}
      {MINI_EMPTY.map(c => (
        <span
          key={c.label}
          className="absolute -translate-x-1/2 text-center pointer-events-none"
          style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
        >
          <span className="block text-[10px] font-medium text-mist/70 leading-tight">{c.label}</span>
          <span className="block text-[8.5px] text-mist/50" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>grows as you review</span>
        </span>
      ))}
      <span className="absolute right-3 bottom-3 text-[10px] text-mist bg-white/85 border border-rule rounded-full px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        open Cortex →
      </span>
    </button>
  )
}
