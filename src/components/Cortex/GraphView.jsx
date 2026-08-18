/**
 * Cortex — Graph view.
 *
 * The curated hub-and-node alternative to the starfield: ~30 meaningful
 * nodes, not thousands of dots. Hubs (Terminology · JA, Policies, …) are
 * sized by fact count; satellites are individual verified facts pinned near
 * their hub; agents sit on their own row. Edges carry meaning — solid
 * "membership" ties a fact to its hub, dotted "guides / learned-from" ties
 * a fact or memory hub to the agent that retrieves it.
 *
 * Colors are a 3-hue categorical set drawn from the arbitr ramps (violet /
 * teal / info-blue), CVD-validated with the dataviz skill's checker —
 * deliberately NOT the indigo "amber" token, which the design system
 * reserves for CTAs. Flagged nodes get the amber/warning ramp as a status
 * overlay (icon + pulse + label), not as a fourth identity color.
 *
 * Hover isolates the neighborhood of one node (everything else dims);
 * click opens the Node Inspector with that node's fact; drag pans, wheel
 * zooms (toward the cursor). Labels run through a small collision-relax
 * pass so nothing sits on top of anything else at the default zoom. A
 * light idle drift on each node reads as "alive" — off under
 * prefers-reduced-motion.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Minus, Maximize2 } from 'lucide-react'
import { CLUSTERS, GRAPH_SATELLITES, GRAPH_AGENTS, GRAPH_HUB_FACT_KEYS, FACTS, agentFact } from '../../data/cortex'
import useReducedMotion from '../../hooks/useReducedMotion'

const W = 1000
const H = 560
const PAD = 70
const ZOOM_MIN = 0.6
const ZOOM_MAX = 3

// Categorical identity (validated: node scripts/validate_palette.js — all pass).
// Amber is reserved for the CTA elsewhere in the app, so it's used here only
// as a status overlay on the flagged node, never as a fourth category hue.
const KIND = {
  policy: { fill: '#A38DFF', ring: '#7263B3' },   // rules & policies — violet
  memory: { fill: '#00B887', ring: '#00805A' },   // terms & memory — teal
  agent: { fill: '#0088FF', ring: '#0066CC' },    // agents — info blue
  flagged: { fill: '#FFB000', ring: '#996800' },  // flagged / held — amber (status, not identity)
}

const hubR = n => 20 + Math.sqrt(n) * 1.05
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const px = x => PAD + x * (W - PAD * 2)
const py = y => PAD * 0.6 + y * (H - PAD * 1.2)

// Deterministic per-node pseudo-random (so idle drift differs per node but
// never changes between renders/sessions).
function hash(id) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return Math.abs(h)
}

const charW = { hub: 7.3, label: 6.4 }

// Relax label boxes apart along y so nothing overlaps at rest — cheap
// pairwise pass, fine for ~20 static labels.
function declutterLabels(boxes) {
  const arr = boxes.map(b => ({ ...b }))
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j]
        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
        if (overlapX > 0 && overlapY > 0) {
          const push = overlapY / 2 + 1
          if (a.y <= b.y) { a.y -= push; b.y += push } else { a.y += push; b.y -= push }
        }
      }
    }
  }
  return arr
}

export default function GraphView({ lens, onInspect, onDeselect }) {
  const [hover, setHover] = useState(null)
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } })
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef(null)
  const dragRef = useRef({ dragging: false, moved: false, lastX: 0, lastY: 0 })
  const reduced = useReducedMotion()

  const { nodes, edges } = useMemo(() => {
    const nodeById = new Map()
    const built = []
    const edgeList = []

    for (const c of CLUSTERS) {
      const n = { id: c.id, kind: c.kind, type: 'hub', label: c.label, count: c.n, x: px(c.x), y: py(c.y), r: hubR(c.n), fact: c.rep }
      built.push(n); nodeById.set(n.id, n)
    }
    for (const s of GRAPH_SATELLITES) {
      const fact = FACTS[s.factKey]
      const hub = nodeById.get(s.hub)
      const n = { id: s.id, kind: s.flagged ? 'flagged' : hub.kind, type: 'satellite', label: fact.t, x: px(s.x), y: py(s.y), r: s.flagged ? 11 : 8, fact }
      built.push(n); nodeById.set(n.id, n)
      edgeList.push({ id: `m-${s.id}`, kind: 'membership', color: KIND[hub.kind].ring, a: n, b: hub })
      for (const agentName of fact.agents || []) {
        edgeList.push({ id: `g-${s.id}-${agentName}`, kind: 'guides', color: KIND[hub.kind].ring, agentName, a: n })
      }
    }
    for (const a of GRAPH_AGENTS) {
      const n = { id: a.id, kind: 'agent', type: 'agent', label: a.name, x: px(a.x), y: py(a.y), r: 13, fact: agentFact(a.name) }
      built.push(n); nodeById.set(n.id, n)
    }
    for (const [hubId, factKey] of Object.entries(GRAPH_HUB_FACT_KEYS)) {
      const hub = nodeById.get(hubId)
      for (const agentName of FACTS[factKey].agents || []) {
        edgeList.push({ id: `l-${hubId}-${agentName}`, kind: 'learned-from', color: KIND[hub.kind].ring, agentName, a: hub })
      }
    }
    for (const e of edgeList) {
      if (e.agentName) e.b = nodeById.get(GRAPH_AGENTS.find(a => a.name === e.agentName)?.id)
    }

    const finalNodes = built.filter(Boolean)
    const finalEdges = edgeList.filter(e => e.a && e.b)

    // label boxes → declutter → merge back onto each node as labelY/side
    const boxes = finalNodes.map(n => {
      const isHub = n.type === 'hub'
      const side = n.x < W / 2 ? 'start' : 'end'
      const w = (isHub ? n.label.length * charW.hub : n.label.length * charW.label) + 6
      const h = 14
      const anchorX = isHub ? n.x - w / 2 : (side === 'start' ? n.x + n.r + 7 : n.x - n.r - 7 - w)
      const anchorY = isHub ? n.y + n.r + 4 : n.y - h / 2 + 2
      return { id: n.id, x: anchorX, y: anchorY, w, h, side, isHub }
    })
    const relaxed = declutterLabels(boxes)
    const labelById = new Map(relaxed.map(b => [b.id, b]))
    for (const n of finalNodes) {
      const b = labelById.get(n.id)
      n.labelSide = b.side
      n.labelY = b.y + b.h - 3
      n.labelX = b.isHub ? n.x : (b.side === 'start' ? b.x : b.x + b.w)
    }

    return { nodes: finalNodes, edges: finalEdges }
  }, [])

  const q = (lens || '').trim().toLowerCase()
  const matches = n => !q || n.label.toLowerCase().includes(q)

  const neighborIds = useMemo(() => {
    if (!hover) return null
    const s = new Set([hover])
    for (const e of edges) {
      if (e.a.id === hover) s.add(e.b.id)
      if (e.b.id === hover) s.add(e.a.id)
    }
    return s
  }, [hover, edges])

  const nodeOpacity = n => {
    if (q && !matches(n)) return 0.12
    if (neighborIds) return neighborIds.has(n.id) ? 1 : 0.15
    return 1
  }
  const edgeOpacity = e => {
    if (neighborIds) return neighborIds.has(e.a.id) && neighborIds.has(e.b.id) ? 0.9 : 0.06
    return e.kind === 'membership' ? 0.35 : 0.22
  }

  /* ── zoom (wheel, toward cursor) + pan (drag) ────────────────── */

  // React attaches its wheel listener as passive, so e.preventDefault() inside
  // a normal onWheel prop is a silent no-op (and logs a console warning) — the
  // page scrolls along with the graph. A native, explicitly non-passive
  // listener is the only way to actually stop that.
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const onWheel = e => {
      e.preventDefault()
      const rect = svg.getBoundingClientRect()
      const px_ = (e.clientX - rect.left) / rect.width * W
      const py_ = (e.clientY - rect.top) / rect.height * H
      setView(v => {
        const newZoom = clamp(v.zoom * (1 - e.deltaY * 0.0015), ZOOM_MIN, ZOOM_MAX)
        const cx = (px_ - v.pan.x) / v.zoom
        const cy = (py_ - v.pan.y) / v.zoom
        return { zoom: newZoom, pan: { x: px_ - cx * newZoom, y: py_ - cy * newZoom } }
      })
    }
    svg.addEventListener('wheel', onWheel, { passive: false })
    return () => svg.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = factor => {
    setView(v => {
      const newZoom = clamp(v.zoom * factor, ZOOM_MIN, ZOOM_MAX)
      const cx = (W / 2 - v.pan.x) / v.zoom
      const cy = (H / 2 - v.pan.y) / v.zoom
      return { zoom: newZoom, pan: { x: W / 2 - cx * newZoom, y: H / 2 - cy * newZoom } }
    })
  }
  const resetView = () => setView({ zoom: 1, pan: { x: 0, y: 0 } })

  const handleMouseDown = e => {
    dragRef.current = { dragging: true, moved: false, lastX: e.clientX, lastY: e.clientY }
    setIsDragging(true)
  }
  const handleMouseMove = e => {
    if (!dragRef.current.dragging) return
    const dx = e.clientX - dragRef.current.lastX
    const dy = e.clientY - dragRef.current.lastY
    if (Math.abs(dx) + Math.abs(dy) > 2) dragRef.current.moved = true
    dragRef.current.lastX = e.clientX
    dragRef.current.lastY = e.clientY
    const rect = svgRef.current.getBoundingClientRect()
    const sx = W / rect.width, sy = H / rect.height
    setView(v => ({ ...v, pan: { x: v.pan.x + dx * sx, y: v.pan.y + dy * sy } }))
  }
  const handleMouseUp = () => { dragRef.current.dragging = false; setIsDragging(false) }

  const handleNodeClick = n => {
    if (dragRef.current.moved) return
    onInspect(n.fact)
  }

  // Clicking blank canvas — not a node, not a drag — dismisses the inspector.
  // e.target === e.currentTarget is only true when the click hit the <svg>
  // itself; a node click's target is the circle/text/g it landed on, so this
  // never double-fires alongside handleNodeClick.
  const handleBackgroundClick = e => {
    if (dragRef.current.moved) return
    if (e.target === e.currentTarget) onDeselect?.()
  }

  return (
    <div className="relative w-full h-full bg-[radial-gradient(ellipse_at_50%_40%,#FFFFFF_0%,#F4F5FF_60%,#E9EBFA_100%)]">
      {!reduced && (
        <style>{`
          @keyframes cortexBob0 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2.6px,-3.2px)} }
          @keyframes cortexBob1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-3.1px,2.2px)} }
          @keyframes cortexBob2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(2.2px,3.1px)} }
          @keyframes cortexBob3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-2.5px,-2.4px)} }
        `}</style>
      )}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-full"
        role="img"
        aria-label="Cortex knowledge graph"
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleBackgroundClick}
      >
        <g transform={`translate(${view.pan.x} ${view.pan.y}) scale(${view.zoom})`}>
          <g>
            {edges.map(e => (
              <line
                key={e.id}
                x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
                stroke={e.color}
                strokeWidth={e.kind === 'membership' ? 1.25 : 1}
                strokeDasharray={e.kind === 'membership' ? undefined : '2 4'}
                opacity={edgeOpacity(e)}
                style={{ transition: 'opacity 200ms' }}
              />
            ))}
          </g>
          <g>
            {nodes.map(n => {
              const tone = KIND[n.kind]
              const isHub = n.type === 'hub'
              const isHovered = hover === n.id
              const bobStyle = reduced ? undefined : {
                animation: `cortexBob${hash(n.id) % 4} ${5.5 + (hash(n.id) % 5) * 0.6}s ease-in-out ${(hash(n.id) % 9) * 0.35}s infinite`,
              }
              return (
                <g
                  key={n.id}
                  opacity={nodeOpacity(n)}
                  style={{ transition: 'opacity 200ms', cursor: 'pointer' }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(h => (h === n.id ? null : h))}
                  onClick={() => handleNodeClick(n)}
                >
                  {/* Positional placement is an SVG attribute; the idle bob is a CSS
                      transform on a nested group — a CSS `transform` on the SAME
                      element as the `transform` attribute wins outright and wipes
                      the translate(n.x, n.y), so the two must live on different g's. */}
                  <g transform={`translate(${n.x} ${n.y})`}>
                    <g style={bobStyle}>
                      {n.kind === 'flagged' && (
                        <circle r={n.r + 5} fill="none" stroke={tone.ring} strokeWidth={1.5} opacity={0.55}>
                          <animate attributeName="r" values={`${n.r + 3};${n.r + 9};${n.r + 3}`} dur="2.2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.55;0.05;0.55" dur="2.2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      <circle
                        r={n.r}
                        fill={tone.fill}
                        fillOpacity={isHub ? 0.92 : 1}
                        stroke={tone.ring}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                      />
                      {isHub && (
                        <text y={4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#FFFFFF" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                          {n.count}
                        </text>
                      )}
                    </g>
                  </g>
                  <text
                    x={n.labelX}
                    y={n.labelY}
                    textAnchor={isHub ? 'middle' : n.labelSide}
                    fontSize={isHub ? 12 : 10.5}
                    fontWeight={isHub ? 600 : 500}
                    fill={isHub ? '#0D092A' : '#5E6582'}
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </g>
        </g>
      </svg>

      {/* Zoom controls */}
      <div className="absolute left-4 bottom-4 flex items-center gap-1 bg-white/90 border border-rule rounded-lg p-1 backdrop-blur-sm">
        <button onClick={() => zoomBy(1.35)} aria-label="Zoom in" className="w-7 h-7 flex items-center justify-center rounded-md text-slate hover:text-ink hover:bg-pale cursor-pointer">
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => zoomBy(1 / 1.35)} aria-label="Zoom out" className="w-7 h-7 flex items-center justify-center rounded-md text-slate hover:text-ink hover:bg-pale cursor-pointer">
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button onClick={resetView} aria-label="Reset view" className="w-7 h-7 flex items-center justify-center rounded-md text-slate hover:text-ink hover:bg-pale cursor-pointer">
          <Maximize2 className="w-3 h-3" />
        </button>
      </div>

      <div className="absolute right-4 bottom-4 pointer-events-none">
        <span className="text-[10.5px] text-mist bg-white/85 border border-rule rounded-full px-3 py-1.5 backdrop-blur-sm" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          scroll to zoom · drag to pan · click inspects
        </span>
      </div>
    </div>
  )
}
