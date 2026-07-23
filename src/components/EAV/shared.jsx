/**
 * Enterprise AI Visibility — shared UI.
 *
 * Re-exports the arbitr design-system primitives and adds EAV-specific badges:
 * the "Demo data" / provenance labels (so fixture is never mistaken for live),
 * prominence band, accuracy, severity, attribution level, and a dimension bar.
 */

import { FlaskConical, Radio, Hand, Check, AlertTriangle, Circle } from 'lucide-react'
import { BAND_META, ACCURACY_META, ATTRIBUTION_LEVELS } from '../../data/eav'

export {
  MonoLabel, SectionHeading, Card, StatusBadge, PrimaryButton,
  SecondaryButton, DangerButton, KeyValueRow, ScoreBar, EmptyState,
} from '../HITLVendorWorkflow/shared'

const TONE_CLS = {
  teal: 'bg-teal/10 text-teal border-teal/30',
  amber: 'bg-amber/15 text-amber-deep border-amber/30',
  ocean: 'bg-ocean/10 text-ocean border-ocean/25',
  error: 'bg-error/10 text-error border-error/30',
  mist: 'bg-rule/50 text-mist border-rule-strong',
}

function Pill({ tone = 'mist', icon: Icon, children, title }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${TONE_CLS[tone] || TONE_CLS.mist}`}>
      {Icon && <Icon className="w-3 h-3" />}{children}
    </span>
  )
}

/* Provenance — fixture / live / manual. Fixture must always read "Demo data". */
export function ProvenanceBadge({ provenance = 'fixture' }) {
  if (provenance === 'live_api') return <Pill tone="teal" icon={Radio} title="Live API observation">Live</Pill>
  if (provenance === 'manual_import') return <Pill tone="ocean" icon={Hand} title="Manually imported observation">Manual</Pill>
  return <Pill tone="amber" icon={FlaskConical} title="Fixture / demonstration data — not a live observation">Demo data</Pill>
}

export function ProminenceBadge({ band }) {
  const m = BAND_META[band] || BAND_META.absent
  return <Pill tone={m.tone}>{m.label}</Pill>
}

export function AccuracyBadge({ status }) {
  const m = ACCURACY_META[status] || ACCURACY_META['n/a']
  return <Pill tone={m.tone}>{m.label}</Pill>
}

export function SeverityBadge({ severity }) {
  const tone = severity === 'high' || severity === 'critical' ? 'error' : severity === 'medium' || severity === 'major' ? 'amber' : 'mist'
  return <Pill tone={tone} icon={AlertTriangle}>{severity}</Pill>
}

export function AttributionBadge({ level }) {
  const m = ATTRIBUTION_LEVELS[level] || ATTRIBUTION_LEVELS.D
  return <Pill tone={m.tone} title={m.desc}>{level} · {m.label}</Pill>
}

/* EAVI dimension bar with its weight. */
export function DimensionBar({ label, value, weight }) {
  const tone = value >= 80 ? 'bg-teal' : value >= 60 ? 'bg-amber' : 'bg-error'
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1">
        <span className="text-ink">{label} {weight != null && <span className="text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>· {weight}%</span>}</span>
        <span className="text-slate font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{Math.round(value)}</span>
      </div>
      <div className="h-1.5 rounded-full bg-rule/60 overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

/* Big EAVI score with confidence interval. */
export function EAVIScore({ score, interval, trend, size = 'lg' }) {
  const big = size === 'lg' ? 'text-[56px]' : 'text-[34px]'
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <span className={`${big} font-bold text-ink leading-none`} style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{score}<span className="text-mist text-[0.4em] font-medium">/100</span></span>
      {interval && <span className="text-[12px] text-slate mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>95% CI {interval[0]}–{interval[1]}</span>}
      {trend != null && (
        <span className={`text-[12px] mb-2 font-medium ${trend >= 0 ? 'text-teal' : 'text-error'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)} / 90d
        </span>
      )}
    </div>
  )
}

export { Pill, Circle, Check }
