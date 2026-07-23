/**
 * Cortex — Flow view.
 *
 * "How Cortex gets smarter": the human-verified learning loop as a left-to-
 * right ribbon diagram. Approved sources → AI extraction → human review (the
 * gate) → verified memory → the agents that retrieve from it, with a dashed
 * feedback arc showing reviewer corrections compounding back into memory.
 *
 * Cards are plain DOM; ribbons are an SVG overlay whose bezier paths are
 * computed from the live card rects (ResizeObserver keeps them attached).
 */

import { useCallback, useEffect, useRef } from 'react'
import { FLOW_STAGES, FLOW_RIBBONS, CORTEX_AGENTS, agentFact } from '../../data/cortex'
import useReducedMotion from '../../hooks/useReducedMotion'

const TONE_HEX = { slate: '#A7B0BA', blue: '#2E7FB8', gold: '#D4860A', violet: '#7C5CDB' }

const CARD_TONE = {
  slate: 'border-rule bg-white',
  blue: 'border-ocean/30 bg-ocean/[0.04]',
  gold: 'border-amber/45 bg-amber/[0.07] shadow-[0_0_24px_rgba(212,134,10,0.12)]',
  violet: 'border-violet-500/30 bg-violet-500/[0.05]',
}
const NUM_TONE = { slate: 'text-slate', blue: 'text-ocean', gold: 'text-amber-deep', violet: 'text-violet-700' }

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`
}

function StageCard({ tone, title, n, detail, avatars, dim, onClick, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Inspect ${label}`}
      className={`w-[168px] text-left border rounded-xl px-4 py-3.5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${CARD_TONE[tone]} ${dim ? 'opacity-20' : 'opacity-100'}`}
    >
      <p className="text-[12px] font-semibold text-ink">{title}</p>
      {n != null && (
        <p className={`text-[24px] font-bold leading-tight mt-0.5 ${NUM_TONE[tone]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {n.toLocaleString()}
        </p>
      )}
      <p className="text-[10.5px] text-mist leading-snug mt-1">{detail}</p>
      {avatars && (
        <div className="flex mt-2">
          {avatars.map((a, i) => (
            <span key={a} className={`w-6 h-6 rounded-full bg-ocean text-white text-[9px] font-bold flex items-center justify-center border-2 border-white ${i > 0 ? '-ml-1.5' : ''}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {a}
            </span>
          ))}
        </div>
      )}
    </button>
  )
}

export default function FlowView({ lens, onInspect }) {
  const elRef = useRef(null)
  const svgRef = useRef(null)
  const feedbackRef = useRef(null)
  const cardRefs = useRef({})       // stage id / agent name -> element
  const reduced = useReducedMotion()

  const setCard = (key) => (node) => { if (node) cardRefs.current[key] = node }

  const layout = useCallback(() => {
    const el = elRef.current
    const svg = svgRef.current
    if (!el || !svg) return
    const s = el.getBoundingClientRect()
    svg.setAttribute('viewBox', `0 0 ${s.width} ${s.height}`)
    svg.innerHTML = ''
    const NS = 'http://www.w3.org/2000/svg'

    const edge = (elm, side) => {
      const r = elm.getBoundingClientRect()
      return { x: (side === 'r' ? r.right : r.left) - s.left, y: r.top - s.top + r.height / 2, bottom: r.bottom - s.top }
    }
    const addPath = (d, stroke, width, opts = {}) => {
      const p = document.createElementNS(NS, 'path')
      p.setAttribute('d', d)
      p.setAttribute('stroke', stroke)
      p.setAttribute('stroke-width', width)
      p.setAttribute('stroke-linecap', 'round')
      p.setAttribute('fill', 'none')
      if (opts.dash) p.setAttribute('stroke-dasharray', opts.dash)
      if (opts.cls) p.setAttribute('class', opts.cls)
      svg.appendChild(p)
    }

    const ribbons = [
      ...FLOW_RIBBONS,
      ...CORTEX_AGENTS.map(a => ({ from: 'mem', to: a, w: 6, tone: 'violet' })),
    ]
    for (const rb of ribbons) {
      const c1 = cardRefs.current[rb.from]
      const c2 = cardRefs.current[rb.to]
      if (!c1 || !c2) continue
      const p1 = edge(c1, 'r')
      const p2 = edge(c2, 'l')
      const dx = (p2.x - p1.x) * 0.45
      const d = `M ${p1.x} ${p1.y} C ${p1.x + dx} ${p1.y}, ${p2.x - dx} ${p2.y}, ${p2.x} ${p2.y}`
      const color = TONE_HEX[rb.tone]
      addPath(d, hexA(color, 0.3), rb.w)
      addPath(d, hexA(color, 0.75), 2, reduced ? {} : { dash: '6 14', cls: 'cortex-dash' })
    }

    // feedback arc: last agent card → verified-memory card, swinging below
    const lastAgent = cardRefs.current[CORTEX_AGENTS[CORTEX_AGENTS.length - 1]]
    const mem = cardRefs.current.mem
    if (lastAgent && mem) {
      const aB = edge(lastAgent, 'l')
      const mB = edge(mem, 'r')
      const lowY = Math.max(aB.bottom, mB.bottom) + s.height * 0.14
      const d2 = `M ${aB.x + 20} ${aB.bottom + 8} C ${aB.x - 40} ${lowY}, ${mB.x + 60} ${lowY}, ${mB.x - 6} ${mB.bottom + 6}`
      addPath(d2, hexA(TONE_HEX.gold, 0.55), 2, { dash: '5 6', cls: reduced ? '' : 'cortex-dash cortex-dash-slow' })
      const fb = feedbackRef.current
      if (fb) {
        fb.style.left = `${(aB.x + mB.x) / 2}px`
        fb.style.top = `${lowY - 4}px`
      }
    }
  }, [reduced])

  useEffect(() => {
    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(elRef.current)
    return () => ro.disconnect()
  }, [layout])

  const q = (lens || '').trim().toLowerCase()
  const dimStage = (label) => Boolean(q) && !label.toLowerCase().includes(q)

  return (
    <div ref={elRef} className="relative w-full h-full bg-[linear-gradient(180deg,#FFFDF8_0%,#FAF7EF_100%)]">
      <style>{`
        .cortex-dash { animation: cortexDash 1.4s linear infinite; }
        .cortex-dash-slow { animation-duration: 2.6s; }
        @keyframes cortexDash { to { stroke-dashoffset: -40; } }
      `}</style>
      <svg ref={svgRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true" />

      <div className="relative h-full flex items-center justify-between gap-4 px-8 xl:px-12">
        {FLOW_STAGES.map(st => (
          <div key={st.id} className="flex flex-col items-center gap-2">
            <p className={`text-[10px] uppercase tracking-[0.16em] transition-opacity duration-300 ${dimStage(st.label) ? 'opacity-20' : ''} text-mist`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{st.label}</p>
            <div ref={setCard(st.id)}>
              <StageCard
                tone={st.tone} title={st.title} n={st.n} detail={st.detail} avatars={st.avatars}
                dim={dimStage(st.label)} label={st.label}
                onClick={() => onInspect(st.fact)}
              />
            </div>
          </div>
        ))}

        {/* Agents column */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.16em] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Agents</p>
          <div className="flex flex-col gap-2">
            {CORTEX_AGENTS.map(a => (
              <button
                key={a}
                ref={setCard(a)}
                onClick={() => onInspect(agentFact(a))}
                aria-label={`Inspect ${a}`}
                className={`w-[176px] text-left border rounded-xl px-3.5 py-2.5 cursor-pointer transition-all duration-300 hover:-translate-y-0.5 ${CARD_TONE.violet} ${dimStage(a) ? 'opacity-20' : 'opacity-100'}`}
              >
                <p className="text-[12px] font-semibold text-ink leading-tight">{a}</p>
                <p className="text-[10px] text-mist mt-0.5">retrieves at answer time</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      <span
        ref={feedbackRef}
        className="absolute -translate-x-1/2 text-[10.5px] text-amber-deep bg-white/90 border border-amber/30 rounded-full px-2.5 py-1 pointer-events-none"
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        corrections compound ↩
      </span>
    </div>
  )
}
