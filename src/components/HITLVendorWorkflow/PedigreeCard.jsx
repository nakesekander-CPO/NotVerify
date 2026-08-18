/**
 * Intelligence Pedigree Card
 *
 * Two layouts driven by `kind`:
 *   - `segment`  → inline below the segment editor in the workspace
 *   - `document` → top of Final Sign-Off, also exportable to clients
 *
 * Both render the same four-dimension hierarchy:
 *   ① Model Confidence    ② Verification Depth
 *   ③ Provenance Chain    ④ Domain Pedigree
 */

import { Shield, Brain, Workflow, Hash, BadgeCheck, Mic } from 'lucide-react'
import { MonoLabel, ScoreBar, Card } from './shared'
import { documentPedigreeSeries } from '../../services/hitl/cockpit'
import TrustSparkline from './cockpit/TrustSparkline'

const DEPTH_LABEL = {
  untouched: 'Untouched',
  adjudicated: 'Adjudicated',
  authored: 'Authored',
}

const DEPTH_TONE = {
  untouched: 'text-mist',
  adjudicated: 'text-ocean',
  authored: 'text-teal',
}

/* ─── Document-level card (the "wax seal") ─────────────────────── */

export function DocumentPedigreeCard({ pedigree }) {
  if (!pedigree) return null
  const series = documentPedigreeSeries(pedigree.projectId)
  return (
    <div className="bg-white border border-rule rounded-lg overflow-hidden">
      <div className="px-5 pt-5 pb-3 border-b border-rule bg-cream/60">
        <div className="flex items-center justify-between">
          <MonoLabel>Intelligence Pedigree · arbitr</MonoLabel>
          <span className="text-[10.5px] text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{pedigree.provenanceHash}</span>
        </div>
        <div className="mt-3 flex items-end gap-5">
          <div>
            <p className="text-[10.5px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Pedigree Score</p>
            <p className="text-[44px] font-semibold text-ocean leading-none mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{pedigree.composite}</p>
          </div>
          <p className="text-[12.5px] text-slate leading-relaxed pb-2 max-w-md">
            Composite of model confidence, human verification depth, vendor domain pedigree, and certified provenance. Inspect each axis below.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-5 border-b border-rule">
        <Axis
          icon={Brain}
          label="Model Confidence"
          score={(pedigree.modelConfidence * 100).toFixed(1)}
          tone="ocean"
          desc="Composite of accepted agents' confidence on this document."
          sparkline={<TrustSparkline values={series.modelConfidence} color="#3D16FA" />}
        />
        <Axis
          icon={BadgeCheck}
          label="Verification Depth"
          score={pedigree.depthScore.toFixed(1)}
          tone="teal"
          desc={`${pedigree.distribution.untouchedPct}% Untouched · ${pedigree.distribution.adjudicatedPct}% Adjudicated · ${pedigree.distribution.authoredPct}% Authored${pedigree.voiceCount ? ` · ${pedigree.voiceCount} voice rationale${pedigree.voiceCount === 1 ? '' : 's'}` : ''}`}
          sparkline={<TrustSparkline values={series.depthScore.map(v => v / 100)} color="#00805A" />}
        />
      </div>

      <div className="px-5 py-4 grid grid-cols-2 gap-5 border-b border-rule">
        <Axis
          icon={Workflow}
          label="Provenance Chain"
          score={null}
          tone="ocean"
          desc={
            <>
              {pedigree.vendor && <>Routed through <strong className="text-ink">{pedigree.vendor.name}</strong>. </>}
              {pedigree.signOff && <>Signed off by <strong className="text-ink">{pedigree.signOff.actorId}</strong> ({pedigree.signOff.actorRole}) on {new Date(pedigree.signOff.timestamp).toLocaleString()}.</>}
            </>
          }
        />
        <Axis
          icon={Shield}
          label="Domain Pedigree"
          score={pedigree.domainMatch.toFixed(0)}
          tone="amber"
          desc={
            <>
              {pedigree.vendor ? <>{pedigree.vendor.name}: <span className="font-mono" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{pedigree.vendor.securityTier}</span> · {pedigree.vendor.certifications.join(' · ')}</> : 'No vendor on record'}
              {pedigree.routedThrough && <><br />Pool: {pedigree.routedThrough}</>}
            </>
          }
        />
      </div>

      <div className="px-5 py-3 flex items-center justify-between text-[11px] text-mist">
        <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          <Hash className="inline w-3 h-3 mr-1" />
          {pedigree.provenanceHash}
        </span>
        <button className="text-ocean hover:text-ocean-deep cursor-pointer">Verify provenance ↗</button>
      </div>
    </div>
  )
}

/* ─── Segment-level card (inline in workspace) ─────────────────── */

export function SegmentPedigreeCard({ pedigree }) {
  if (!pedigree) return null
  const human = pedigree.humanConfidence
  const sealed = pedigree.depth !== 'untouched' // a ruling has been committed
  return (
    <div className={
      sealed
        ? 'rounded-md p-4 relative overflow-hidden bg-slate text-cream border border-[#FFB000]/40 shadow-[inset_0_0_0_1px_rgba(255,176,0,0.25)]'
        : 'bg-cream/60 border border-rule rounded-md p-4'
    } style={sealed ? { backgroundImage: 'linear-gradient(135deg, #322D5C 0%, #1A1640 100%)' } : undefined}>
      {/* Wax-seal ornament */}
      {sealed && (
        <div className="absolute top-3 right-3 w-8 h-8 rounded-full border-2 border-[#FFB000]/60 flex items-center justify-center text-[#FFBD59]"
             style={{ background: 'radial-gradient(circle at 30% 30%, #B3843E, #805F2D)' }}>
          <span className="text-[10px] font-semibold text-cream" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>ar</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-3 pr-10">
        <span className={`text-[10.5px] uppercase tracking-[0.16em] ${sealed ? 'text-amber/80' : 'text-slate'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {sealed ? 'Segment Pedigree · Sealed' : 'Segment Pedigree'}
        </span>
        <span className={`text-[11px] font-semibold ${sealed ? 'text-[#FFBD59]' : DEPTH_TONE[pedigree.depth]}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {DEPTH_LABEL[pedigree.depth].toUpperCase()} · {pedigree.composite}
        </span>
      </div>

      {/* Dual-track confidence bar — wax-seal styling shifts the human track to gold */}
      <DualTrackBar
        modelLabel="Model Confidence"
        modelValue={pedigree.modelConfidence}
        humanLabel="Human-Verified Confidence"
        humanValue={human}
        sealed={sealed}
      />

      {(pedigree.rationaleTags.length > 0 || pedigree.voiceRationaleId) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {pedigree.rationaleTags.map(t => (
            <span key={t} className={`px-1.5 py-0.5 rounded-full text-[10.5px] ${sealed ? 'bg-[#FFF7E6] text-[#FFBD59] border border-[#FFB000]/40' : 'bg-ocean/10 text-ocean'}`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{t}</span>
          ))}
          {pedigree.voiceRationaleId && <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#FFF7E6] text-[#FFBD59] text-[10.5px]"><Mic className="w-2.5 h-2.5" /> voice rationale</span>}
        </div>
      )}

      <p className={`text-[11px] mt-3 ${sealed ? 'text-cream/80' : 'text-slate'}`}>
        {pedigree.chosenAgent && <>Accepted <strong className={sealed ? 'text-cream' : 'text-ink'}>{pedigree.chosenAgent.name} {pedigree.chosenAgent.version}</strong> ({(pedigree.chosenAgent.confidence * 100).toFixed(0)}%). </>}
        {pedigree.rejectedAgents.length > 0 && <>Considered {pedigree.rejectedAgents.map(a => a.name).join(', ')}. </>}
        {pedigree.vendor && <>Vendor: {pedigree.vendor.name} ({pedigree.vendor.securityTier}). </>}
        {pedigree.provenance[0] && <>By {pedigree.provenance[0].actorId} ({pedigree.provenance[0].actorRole}).</>}
      </p>
    </div>
  )
}

/* ─── Dual-Track Confidence Bar ────────────────────────────────── */

function DualTrackBar({ modelLabel, modelValue, humanLabel, humanValue, sealed }) {
  return (
    <div className="space-y-2.5">
      <Track label={modelLabel} value={modelValue} color="ocean" sealed={sealed} variant="model" />
      <Track label={humanLabel} value={humanValue} color="gold" sealed={sealed} variant="human"
        placeholder={humanValue == null ? 'Untouched — no human ruling' : null} />
    </div>
  )
}

function Track({ label, value, color, placeholder, sealed, variant }) {
  // Sealed = wax-seal aesthetic: charcoal track with a gold fill on the human row.
  const trackBg = sealed ? 'bg-cream/15' : 'bg-rule'
  const fillStyle = sealed && variant === 'human'
    ? { width: `${Math.min(100, (value || 0) * 100)}%`, backgroundImage: 'linear-gradient(90deg, #B3843E, #996800)' }
    : { width: `${Math.min(100, (value || 0) * 100)}%` }
  const fillClass = sealed
    ? (variant === 'human' ? 'h-full rounded-full' : 'h-full rounded-full bg-cream/70')
    : (color === 'gold' ? 'h-full rounded-full bg-amber' : color === 'teal' ? 'h-full rounded-full bg-teal' : 'h-full rounded-full bg-ocean')

  const labelClass = sealed ? 'text-cream/80' : 'text-slate'
  const valueClass = sealed ? 'text-cream' : 'text-ink'

  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className={labelClass}>{label}</span>
        {placeholder ? (
          <span className={sealed ? 'text-cream/60 italic' : 'text-mist italic'}>{placeholder}</span>
        ) : (
          <span className={`${valueClass} font-mono`} style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{value == null ? '—' : `${(value * 100).toFixed(0)}%`}</span>
        )}
      </div>
      <div className={`h-1.5 ${trackBg} rounded-full overflow-hidden`}>
        {value != null && <div className={fillClass} style={fillStyle} />}
      </div>
    </div>
  )
}

/* ─── Axis cell (used in document card) ────────────────────────── */

function Axis({ icon: Icon, label, score, tone, desc, sparkline }) {
  const palette = { ocean: 'text-ocean', teal: 'text-teal', amber: 'text-[#996800]' }
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3.5 h-3.5 ${palette[tone] || palette.ocean}`} />
        <MonoLabel>{label}</MonoLabel>
        {sparkline && <span className="ml-2">{sparkline}</span>}
        {score != null && <span className={`ml-auto text-[14px] font-semibold ${palette[tone] || palette.ocean}`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{score}</span>}
      </div>
      <p className="text-[12px] text-slate mt-1.5 leading-relaxed">{desc}</p>
    </div>
  )
}
