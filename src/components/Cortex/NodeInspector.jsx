/**
 * Cortex — Node Inspector.
 *
 * The provenance drawer: every fact in the mesh answers four questions —
 * what is it (identity), who approved it (human provenance), what does it
 * steer (impact radius), and how has it changed (time machine). Slides in
 * from the right edge of the stage; the parent dims/blurs the view behind it.
 */

import { X, FileText, Clock, Bot, BadgeCheck } from 'lucide-react'
import { MonoLabel } from '../HITLVendorWorkflow/shared'

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

// Bold the quantity phrase inside the impact sentence ("Guides 3 agents").
function Impact({ text }) {
  const m = text.match(/(\d[\d,]* (?:agents?|entries|facts)|every agent)/)
  if (!m) return <span>{text}</span>
  const i = m.index
  return (
    <span>
      {text.slice(0, i)}<strong className="text-ink font-semibold">{m[0]}</strong>{text.slice(i + m[0].length)}
    </span>
  )
}

export default function NodeInspector({ fact, onClose }) {
  const open = Boolean(fact)
  return (
    <aside
      aria-hidden={!open}
      className={`absolute inset-y-0 right-0 w-[360px] max-w-full z-20 bg-white/95 backdrop-blur-sm border-l border-rule shadow-[-12px_0_32px_rgba(13,9,42,0.08)] transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
    >
      {fact && (
        <div className="p-5 space-y-5">
          {/* Identity */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B3843E] bg-[#FFBD59]/20 border border-[#FFBD59]/45 rounded-full px-2 py-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  <BadgeCheck className="w-3 h-3" /> Verified
                </span>
                <MonoLabel>{fact.s}</MonoLabel>
              </div>
              <h3 className="text-[17px] font-semibold text-ink leading-snug">{fact.t}</h3>
              {fact.sub && <p className="text-[12.5px] text-slate mt-0.5">{fact.sub}</p>}
            </div>
            <button onClick={onClose} aria-label="Close inspector" className="shrink-0 w-7 h-7 rounded-lg border border-rule text-slate hover:text-ink hover:bg-pale flex items-center justify-center cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Human provenance */}
          <div className="border-t border-rule pt-4">
            <MonoLabel className="block mb-2.5">Human provenance</MonoLabel>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-ocean/10 text-ocean flex items-center justify-center text-[12px] font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                {initials(fact.who)}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-ink">Approved by {fact.who}</p>
                <p className="text-[11.5px] text-mist">{fact.role} · {fact.date}</p>
              </div>
            </div>
            <p className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] text-ocean bg-ocean/[0.06] border border-ocean/15 rounded-lg px-2.5 py-1.5">
              <FileText className="w-3.5 h-3.5" /> {fact.src}
            </p>
          </div>

          {/* Impact radius */}
          <div className="border-t border-rule pt-4">
            <MonoLabel className="block mb-2">Impact radius</MonoLabel>
            <p className="text-[13px] text-slate"><Impact text={fact.impact} /></p>
            {fact.agents?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {fact.agents.map(a => (
                  <span key={a} className="inline-flex items-center gap-1.5 text-[11.5px] text-violet-700 bg-violet-500/[0.08] border border-violet-500/20 rounded-full px-2.5 py-1">
                    <Bot className="w-3 h-3" /> {a}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Time machine */}
          <div className="border-t border-rule pt-4">
            <MonoLabel className="block mb-3"><Clock className="w-3 h-3 inline -mt-0.5 mr-1" />Time machine</MonoLabel>
            <div className="relative">
              <div className="absolute left-0 right-0 top-[5px] h-px bg-rule" />
              <div className="relative flex justify-between">
                {fact.versions.map(v => {
                  const current = v.includes('Current')
                  return (
                    <div key={v} className="flex flex-col items-center gap-1.5">
                      <span className={`w-[11px] h-[11px] rounded-full border-2 ${current ? 'bg-[#FFBD59] border-[#B3843E]' : 'bg-white border-rule'}`} />
                      <span className={`text-[10px] ${current ? 'text-[#B3843E] font-semibold' : 'text-mist'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{v}</span>
                    </div>
                  )
                })}
              </div>
            </div>
            {fact.note && (
              <p className="mt-3.5 text-[12.5px] text-slate leading-relaxed bg-[#FFBD59]/10 border border-[#FFBD59]/35 rounded-lg px-3 py-2.5">
                {fact.note}
                <span className="block text-[10.5px] text-mist mt-1" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>— {fact.versions[fact.versions.length - 1]} change note</span>
              </p>
            )}
          </div>
        </div>
      )}
    </aside>
  )
}
