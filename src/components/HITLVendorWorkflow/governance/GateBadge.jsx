import { gateFor } from './gates'

/**
 * Live score + the autonomy gate it sits at.
 * @param score number|null  @param thresholds {escalate,review}
 * @param variant 'full' | 'compact'  @param onClick optional (opens explainer)
 */
export default function GateBadge({ score, thresholds, variant = 'compact', onClick, label }) {
  const gate = gateFor(score, thresholds)
  if (!gate) {
    return <span className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold bg-cream text-mist border border-rule">— Unscored</span>
  }
  const t = thresholds || { escalate: 75, review: 92 }

  if (variant === 'compact') {
    return (
      <button
        type="button" onClick={onClick}
        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-bold border ${gate.chip} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {Math.round(score)} <span className={`w-1.5 h-1.5 rounded-full ${gate.dot}`} /> {gate.short}
      </button>
    )
  }

  return (
    <button
      type="button" onClick={onClick}
      className={`flex flex-col gap-1.5 rounded-xl px-3 py-2.5 border text-left min-w-[168px] ${gate.chip} ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    >
      <span className="flex items-baseline gap-2">
        <span className={`text-2xl font-extrabold leading-none ${gate.text}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{Math.round(score)}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${gate.text}`}>{label || gate.label}</span>
      </span>
      <span className="relative h-1.5 rounded bg-white/60 overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 rounded ${gate.dot}`} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} />
        <span className="absolute top-[-2px] w-0.5 h-2.5 bg-slate/50" style={{ left: `${t.escalate}%` }} />
        <span className="absolute top-[-2px] w-0.5 h-2.5 bg-slate/50" style={{ left: `${t.review}%` }} />
      </span>
      <span className="text-[11px] text-slate/85">{gate.desc}</span>
    </button>
  )
}
