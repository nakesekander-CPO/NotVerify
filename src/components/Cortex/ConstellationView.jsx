/**
 * Cortex — Constellation view.
 *
 * "How much Cortex knows": every light is one human-verified fact, clustered
 * by domain. Recent facts (last quarter) render brighter and larger — the
 * compounding-memory story told visually. Hovering brightens the nearest
 * cluster; clicking zooms toward it and opens the inspector with its
 * representative fact (zoom eases back when the drawer closes).
 *
 * Canvas + rAF; static single frame under prefers-reduced-motion. The star
 * positions come from a seeded PRNG so the sky is identical every session.
 */

import { useEffect, useMemo, useRef } from 'react'
import { CLUSTERS, generateStars, TOTAL_FACTS, METRICS } from '../../data/cortex'
import useReducedMotion from '../../hooks/useReducedMotion'

const KIND_COLOR = { gold: '#D4860A', blue: '#1B5E8F' }

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
}

export default function ConstellationView({ lens, onInspect }) {
  const elRef = useRef(null)
  const canvasRef = useRef(null)
  const reduced = useReducedMotion()
  const stars = useMemo(() => generateStars(), [])

  // rAF reads these through refs so handlers never restart the loop
  const state = useRef({ hoverCl: null, zoom: { s: 1, x: 0.5, y: 0.5, target: 1 }, lens: '', reduced: false })
  state.current.lens = (lens || '').trim().toLowerCase()
  state.current.reduced = reduced

  const clusterMatch = (clId, q) => {
    if (!q) return true
    const c = CLUSTERS.find(k => k.id === clId)
    return c.label.toLowerCase().includes(q)
  }

  useEffect(() => {
    const el = elRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let running = true
    let raf = 0
    const t0 = performance.now()

    const fit = () => {
      const s = el.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = s.width * dpr
      canvas.height = s.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return s
    }

    const paint = (now) => {
      const st = state.current
      const s = el.getBoundingClientRect()
      ctx.clearRect(0, 0, s.width, s.height)
      const t = (now - t0) / 1000
      st.zoom.s += (st.zoom.target - st.zoom.s) * 0.08
      ctx.save()
      ctx.translate(s.width * st.zoom.x, s.height * st.zoom.y)
      ctx.scale(st.zoom.s, st.zoom.s)
      ctx.translate(-s.width * st.zoom.x, -s.height * st.zoom.y)
      for (const p of stars) {
        const match = clusterMatch(p.cl, st.lens)
        const tw = st.reduced ? 1 : 0.75 + 0.25 * Math.sin(t * 1.4 + p.tw)
        const base = p.recent ? 0.9 : 0.38
        const alpha = base * tw * (match ? 1 : 0.08) * (st.hoverCl && p.cl !== st.hoverCl ? 0.35 : 1)
        const drift = st.reduced ? 0 : Math.sin(t * 0.3 + p.tw) * 0.0016
        ctx.beginPath()
        ctx.fillStyle = hexA(KIND_COLOR[p.kind], Math.min(1, alpha))
        ctx.arc((p.x + drift) * s.width, p.y * s.height, p.r * (p.recent ? 1.5 : 1), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    const frame = (now) => {
      if (!running) return
      paint(now)
      raf = requestAnimationFrame(frame)
    }

    fit()
    if (state.current.reduced) {
      paint(t0)
    } else {
      raf = requestAnimationFrame(frame)
    }

    const ro = new ResizeObserver(() => { fit(); if (state.current.reduced) paint(performance.now()) })
    ro.observe(el)

    // repaint the static frame when lens/hover change under reduced motion
    const staticRepaint = () => { if (state.current.reduced) paint(performance.now()) }
    el.addEventListener('cortex-repaint', staticRepaint)

    return () => {
      running = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      el.removeEventListener('cortex-repaint', staticRepaint)
    }
  }, [stars])

  // trigger a static repaint when the lens changes (reduced-motion path)
  useEffect(() => {
    elRef.current?.dispatchEvent(new Event('cortex-repaint'))
  }, [lens, reduced])

  const nearestCluster = (mx, my, s) => {
    let best = null
    let bd = Infinity
    for (const c of CLUSTERS) {
      const d = Math.hypot(mx - c.x * s.width, my - c.y * s.height)
      if (d < bd) { bd = d; best = c }
    }
    return bd < s.width * 0.16 ? best : null
  }

  const handleMove = (e) => {
    const s = elRef.current.getBoundingClientRect()
    const c = nearestCluster(e.clientX - s.left, e.clientY - s.top, s)
    const id = c ? c.id : null
    if (state.current.hoverCl !== id) {
      state.current.hoverCl = id
      elRef.current.dispatchEvent(new Event('cortex-repaint'))
    }
    elRef.current.style.cursor = c ? 'pointer' : 'default'
  }

  const handleClick = (e) => {
    const s = elRef.current.getBoundingClientRect()
    const c = nearestCluster(e.clientX - s.left, e.clientY - s.top, s)
    if (!c) return
    const z = state.current.zoom
    z.x = c.x; z.y = c.y; z.target = 1.7
    onInspect(c.rep, () => { z.target = 1; elRef.current?.dispatchEvent(new Event('cortex-repaint')) })
    if (state.current.reduced) elRef.current.dispatchEvent(new Event('cortex-repaint'))
  }

  const q = (lens || '').trim().toLowerCase()

  return (
    <div
      ref={elRef}
      className="relative w-full h-full bg-[radial-gradient(ellipse_at_50%_40%,#FFFDF8_0%,#FAF7EF_60%,#F4EFE3_100%)]"
      onMouseMove={handleMove}
      onMouseLeave={() => { state.current.hoverCl = null; elRef.current?.dispatchEvent(new Event('cortex-repaint')) }}
      onClick={handleClick}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

      {/* Cluster labels */}
      {CLUSTERS.map(c => {
        const dim = q && !c.label.toLowerCase().includes(q)
        return (
          <div
            key={c.id}
            className={`absolute -translate-x-1/2 text-center pointer-events-none transition-opacity duration-300 ${dim ? 'opacity-15' : 'opacity-100'}`}
            style={{ left: `${c.x * 100}%`, top: `${(c.y - c.spread * 1.9) * 100}%` }}
          >
            <p className="text-[12px] font-semibold text-ink/80 tracking-tight">{c.label}</p>
            <p className="text-[10px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{c.n.toLocaleString()} facts</p>
          </div>
        )
      })}

      {/* Legend / note chip */}
      <div className="absolute left-4 bottom-4 flex items-center gap-2 pointer-events-none">
        <span className="text-[11px] text-slate bg-white/85 border border-rule rounded-full px-3 py-1.5 backdrop-blur-sm">
          <span className="text-amber-deep font-semibold">{TOTAL_FACTS.toLocaleString()} shown</span> of {METRICS.verifiedEntries.toLocaleString()} verified facts · +{METRICS.compoundingPct}% this quarter · brighter points = recent
        </span>
      </div>
      <div className="absolute right-4 bottom-4 pointer-events-none">
        <span className="text-[10.5px] text-mist bg-white/85 border border-rule rounded-full px-3 py-1.5 backdrop-blur-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          click a cluster to inspect
        </span>
      </div>
    </div>
  )
}
