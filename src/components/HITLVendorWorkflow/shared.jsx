/**
 * Shared visual primitives for the HITL Vendor Workflow module.
 * Reuses the arbitr brand tokens (ocean / amber / cream / ink / slate / mist / rule).
 */

import { Check, AlertTriangle, Clock, Shield, Lock } from 'lucide-react'

export function MonoLabel({ children, className = '' }) {
  return (
    <span
      className={`uppercase tracking-[0.16em] text-[10px] text-slate font-mono ${className}`}
      style={{ fontFamily: "'IBM Plex Mono', monospace" }}
    >
      {children}
    </span>
  )
}

export function SectionHeading({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between mb-5 border-b border-rule pb-4">
      <div>
        <h2 className="text-[22px] font-semibold text-ink tracking-tight">{title}</h2>
        {subtitle && <p className="text-[13px] text-slate mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '', padding = 'p-5' }) {
  return (
    <div className={`bg-white border border-rule rounded-lg ${padding} ${className}`}>{children}</div>
  )
}

const STATUS_TONE = {
  approved: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  active: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  'in-progress': { bg: 'bg-sky/15', text: 'text-ocean', border: 'border-ocean/20', icon: Clock },
  'in-vendor-review': { bg: 'bg-sky/15', text: 'text-ocean', border: 'border-ocean/20', icon: Clock },
  'awaiting-approval': { bg: 'bg-amber/15', text: 'text-amber-deep', border: 'border-amber/30', icon: AlertTriangle },
  'vendor-assignment-awaiting-approval': { bg: 'bg-amber/15', text: 'text-amber-deep', border: 'border-amber/30', icon: AlertTriangle },
  'vendor-recommended': { bg: 'bg-pale', text: 'text-ocean', border: 'border-ocean/20', icon: Clock },
  'vendor-auto-assigned': { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  pending: { bg: 'bg-rule/50', text: 'text-slate', border: 'border-rule-strong', icon: Clock },
  draft: { bg: 'bg-rule/50', text: 'text-slate', border: 'border-rule-strong', icon: Clock },
  suspended: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30', icon: AlertTriangle },
  archived: { bg: 'bg-rule', text: 'text-mist', border: 'border-rule-strong', icon: Lock },
  // Segment decisions: confirm / edit, plus locked-early (101% ICE match).
  confirmed: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  verified: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  edited: { bg: 'bg-sky/15', text: 'text-ocean', border: 'border-ocean/20', icon: Check },
  'signed-off': { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
  locked: { bg: 'bg-slate/10', text: 'text-slate', border: 'border-slate/30', icon: Lock },
  high: { bg: 'bg-error/10', text: 'text-error', border: 'border-error/30', icon: AlertTriangle },
  critical: { bg: 'bg-error/15', text: 'text-error', border: 'border-error/40', icon: AlertTriangle },
  medium: { bg: 'bg-amber/15', text: 'text-amber-deep', border: 'border-amber/30', icon: AlertTriangle },
  low: { bg: 'bg-teal/10', text: 'text-teal', border: 'border-teal/30', icon: Check },
}

export function StatusBadge({ status, children }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.pending
  const Icon = tone.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${tone.bg} ${tone.text} ${tone.border} text-[11px] font-medium`}>
      <Icon className="w-3 h-3" />
      <span className="capitalize">{children || (status || '').replaceAll('-', ' ')}</span>
    </span>
  )
}

export function SecurityTierBadge({ tier }) {
  const tones = {
    standard: 'bg-rule text-slate border-rule-strong',
    elevated: 'bg-sky/20 text-ocean border-ocean/20',
    high: 'bg-ocean/15 text-ocean border-ocean/30',
    restricted: 'bg-slate/15 text-slate border-slate/30',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${tones[tier] || tones.standard} text-[11px] font-medium`}>
      <Shield className="w-3 h-3" />
      <span className="capitalize">{tier}</span>
    </span>
  )
}

export function PrimaryButton({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${disabled ? 'bg-rule text-mist cursor-not-allowed' : 'bg-amber hover:bg-amber-deep text-white cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, onClick, disabled, type = 'button', className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium border border-rule-strong bg-white hover:bg-pale text-ink transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  )
}

export function DangerButton({ children, onClick, disabled, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold border border-error/30 text-error hover:bg-error/10 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      {children}
    </button>
  )
}

export function KeyValueRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-rule last:border-b-0">
      <span className="text-[11px] uppercase tracking-wider text-mist" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{label}</span>
      <span className={`text-[13px] text-ink ${mono ? 'font-mono' : ''}`} style={mono ? { fontFamily: "'IBM Plex Mono', monospace" } : undefined}>{value}</span>
    </div>
  )
}

export function ScoreBar({ value, max = 100, color = 'amber' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const palette = { amber: 'bg-amber', ocean: 'bg-ocean', teal: 'bg-teal', error: 'bg-error' }
  return (
    <div className="h-1.5 w-full bg-rule rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${palette[color] || palette.amber}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon }) {
  return (
    <div className="border border-dashed border-rule-strong rounded-lg p-10 text-center text-slate bg-cream/50">
      {Icon && <Icon className="w-8 h-8 mx-auto mb-3 text-mist" />}
      <p className="text-[14px] font-semibold text-ink">{title}</p>
      {description && <p className="text-[12px] text-mist mt-1 max-w-md mx-auto">{description}</p>}
    </div>
  )
}
